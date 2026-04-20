import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Loader2, Search, ChevronDown, ChevronRight, Check, Trash, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { linkedinService } from '@/services/api';
import JSZip from 'jszip';

const CONNECTIONS_RE = /^connections\.csv$/i;

// Legacy key — clear on load
const LEGACY_KEY = 'nexo_linkedin_state';

const CSVImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [displaySize, setDisplaySize] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'preview' | 'importing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [analysis, setAnalysis] = useState<any>(null);
  const [importPayload, setImportPayload] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'new' | 'duplicates'>('duplicates');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Poll the LinkedIn analysis job until it moves to pending_review in DB
  const runAnalysis = useCallback(async (jobId: string) => {
    try {
      while (true) {
        const status = await linkedinService.getJobStatus(jobId);
        if (status.status === 'processing') {
          if (status.progress) setAnalyzeProgress(status.progress);
          await new Promise(r => setTimeout(r, 2000));
        } else if (status.status === 'done') {
          // Job moved to pending_review in DB — fetch full result from /status
          const dbStatus = await linkedinService.getStatus();
          if (dbStatus.status === 'pending_review') {
            setAnalysis(dbStatus.analysis);
            setImportPayload(dbStatus.importData);
            if (dbStatus.fileName) setDisplayName(dbStatus.fileName);
            if (dbStatus.fileSize) setDisplaySize(dbStatus.fileSize);
            setImportStatus('preview');
            setActiveTab('duplicates');
          }
          break;
        } else {
          throw new Error(status.error || 'Analysis failed');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis failed');
      setImportStatus('error');
    }
  }, []);

  // On mount: check DB for any active/pending job and restore state
  useEffect(() => {
    // Clear legacy localStorage key
    localStorage.removeItem(LEGACY_KEY);

    const checkDbStatus = async () => {
      try {
        const res = await linkedinService.getStatus();

        if (res.status === 'pending_review') {
          setAnalysis(res.analysis);
          setImportPayload(res.importData);
          if (res.fileName) setDisplayName(res.fileName);
          if (res.fileSize) setDisplaySize(res.fileSize);
          setImportStatus('preview');
          setActiveTab('duplicates');
        } else if (res.status === 'processing' && res.jobId) {
          setImportStatus('analyzing');
          if (res.progress) setAnalyzeProgress(res.progress);
          if (res.fileName) setDisplayName(res.fileName);
          if (res.fileSize) setDisplaySize(res.fileSize);
          runAnalysis(res.jobId);
        }
      } catch {
        // Network error — show idle
      } finally {
        setCheckingStatus(false);
      }
    };

    checkDbStatus();
  }, [runAnalysis]);

  const extractCsvFromZip = async (zipFile: File): Promise<File | null> => {
    const zip = await JSZip.loadAsync(zipFile);
    for (const [path, entry] of Object.entries(zip.files)) {
      const fileName = path.split('/').pop() || '';
      if (!entry.dir && CONNECTIONS_RE.test(fileName)) {
        const blob = await entry.async('blob');
        return new File([blob], fileName, { type: 'text/csv' });
      }
    }
    return null;
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (droppedFile.name.toLowerCase().endsWith('.zip')) {
      try {
        const csv = await extractCsvFromZip(droppedFile);
        if (!csv) {
          setErrorMsg('No connections.csv found in the ZIP file.');
          setImportStatus('error');
          return;
        }
        processFile(csv);
      } catch {
        setErrorMsg('Failed to read ZIP file.');
        setImportStatus('error');
      }
      return;
    }

    if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
      if (droppedFile.size > 10 * 1024 * 1024) {
        setErrorMsg('File size exceeds 10MB limit.');
        setImportStatus('error');
        return;
      }
      processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.name.toLowerCase().endsWith('.zip')) {
      try {
        const csv = await extractCsvFromZip(selectedFile);
        if (!csv) {
          setErrorMsg('No connections.csv found in the ZIP file.');
          setImportStatus('error');
          return;
        }
        processFile(csv);
      } catch {
        setErrorMsg('Failed to read ZIP file.');
        setImportStatus('error');
      }
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit.');
      setImportStatus('error');
      return;
    }
    processFile(selectedFile);
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      if (CONNECTIONS_RE.test(files[i].name)) {
        processFile(files[i]);
        return;
      }
    }
    setErrorMsg('No connections.csv found in the selected folder.');
    setImportStatus('error');
  };

  const processFile = async (f: File) => {
    setFile(f);
    setDisplayName(f.name);
    setDisplaySize(f.size);
    setErrorMsg('');
    setAnalyzeProgress(null);
    setImportStatus('uploading');

    try {
      const uploadResponse = await linkedinService.uploadCsv(f);
      if (!uploadResponse.success) {
        setErrorMsg(uploadResponse.error || 'Failed to process file');
        setImportStatus('error');
        return;
      }

      setImportStatus('analyzing');
      await runAnalysis(uploadResponse.jobId);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'An error occurred during upload');
      setImportStatus('error');
    }
  };

  const handleImport = async () => {
    setImportStatus('importing');
    setProgress(30);
    try {
      const response = await linkedinService.importData(importPayload);
      setProgress(100);
      if (response.success) {
        setImportResult(response.result);
        setImportStatus('done');
      } else {
        setErrorMsg(response.error || 'Failed to import contacts');
        setImportStatus('error');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'An error occurred during import');
      setImportStatus('error');
    }
  };

  const reset = () => {
    setFile(null);
    setDisplayName('');
    setDisplaySize(0);
    setAnalysis(null);
    setImportPayload(null);
    setImportResult(null);
    setImportStatus('idle');
    setProgress(0);
    setAnalyzeProgress(null);
    setErrorMsg('');
    setSearchQuery('');
    setExpandedRows(new Set());
    // Fire-and-forget cancel to clean up DB job (if any)
    linkedinService.cancel().catch(() => { });
  };

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const rejectDuplicate = (index: number) => {
    setImportPayload((prev: any) => {
      const itemToReject = prev.duplicateDetails[index];
      return {
        ...prev,
        duplicateDetails: prev.duplicateDetails.filter((_: any, i: number) => i !== index),
        uniqueContacts: [...prev.uniqueContacts, itemToReject.incoming]
      };
    });
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const removeNewContact = (index: number) => {
    setImportPayload((prev: any) => ({
      ...prev,
      uniqueContacts: prev.uniqueContacts.filter((_: any, i: number) => i !== index)
    }));
  };

  const incomingFieldMap: Record<string, string> = {
    full_name: 'fullName',
    job_title: 'jobTitle',
    linkedin_url: 'linkedinUrl',
    email: 'email',
    company: 'company',
    phone: 'phone'
  };

  const handleFieldResolve = (dIndex: number, cIndex: number, choice: 'A' | 'B' | 'Both') => {
    setImportPayload((prev: any) => {
      const clone = { ...prev };
      const duplicates = [...clone.duplicateDetails];
      const row = { ...duplicates[dIndex] };
      const merged = { ...row.merged };
      const changes = [...row.changes];
      const change = { ...changes[cIndex] };

      const exKey = change.field;
      const inKey = incomingFieldMap[change.field] || change.field;

      const valA = row.existing[exKey];
      const valB = row.incoming[inKey];

      if (choice === 'A') {
        merged[exKey] = valA;
        change.to = valA;
      } else if (choice === 'B') {
        merged[exKey] = valB;
        change.to = valB;
      } else if (choice === 'Both') {
        merged[exKey] = valB;
        change.to = `${valB} (+ kept A)`;
      }

      change.resolution = choice;
      changes[cIndex] = change;
      row.merged = merged;
      row.changes = changes;
      duplicates[dIndex] = row;
      clone.duplicateDetails = duplicates;
      return clone;
    });
  };

  const filteredDuplicates = useMemo(() => {
    if (!importPayload?.duplicateDetails) return [];
    return importPayload.duplicateDetails.map((item: any, originalIndex: number) => ({ ...item, originalIndex }))
      .filter((d: any) => {
        const q = searchQuery.toLowerCase();
        return (
          (d.existing.full_name || '').toLowerCase().includes(q) ||
          (d.incoming.fullName || '').toLowerCase().includes(q) ||
          (d.existing.email || '').toLowerCase().includes(q) ||
          (d.incoming.email || '').toLowerCase().includes(q) ||
          (d.existing.company || '').toLowerCase().includes(q)
        );
      });
  }, [importPayload, searchQuery]);

  const filteredUniques = useMemo(() => {
    if (!importPayload?.uniqueContacts) return [];
    return importPayload.uniqueContacts.map((item: any, originalIndex: number) => ({ ...item, originalIndex }))
      .filter((c: any) => {
        const q = searchQuery.toLowerCase();
        return (
          (c.fullName || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.jobTitle || '').toLowerCase().includes(q)
        );
      });
  }, [importPayload, searchQuery]);

  return (
    <div className="flex-1 h-screen overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">Import LinkedIn Connections</h1>
          <p className="text-sm text-muted-foreground">
            Upload your LinkedIn Connections CSV to enrich and add to your contacts.
          </p>
        </div>

        {/* Initial status check */}
        {checkingStatus && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Checking import status...</p>
          </div>
        )}

        {/* Upload Zone */}
        {!checkingStatus && importStatus === 'idle' && (
          <>
            <div className="glass-card rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-foreground mb-2">How to export from LinkedIn:</h3>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>
                  Go to{' '}
                  <a
                    href="https://www.linkedin.com/mypreferences/d/download-my-data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    LinkedIn Data Export Page ↗
                  </a>
                </li>
                <li>Select "Download larger data archive"</li>
                <li>Wait for LinkedIn to prepare your file (usually a few minutes)</li>
                <li>Download the Archive and upload the ZIP directly, or extract "Connections.csv"</li>
              </ol>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
                isDragging
                  ? 'border-primary bg-accent'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drop your CSV or ZIP file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-3">Supports Connections.csv or LinkedIn ZIP archive (max 10MB)</p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={(e) => { e.stopPropagation(); document.getElementById('folder-input')?.click(); }}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Upload Folder
                </Button>
              </div>
              <input id="csv-input" type="file" accept=".csv,.zip" className="hidden" onChange={handleFileSelect} />
              <input id="folder-input" type="file" className="hidden" onChange={handleFolderSelect} {...{ webkitdirectory: '', directory: '' } as any} />
            </div>
          </>
        )}

        {/* Uploading */}
        {!checkingStatus && importStatus === 'uploading' && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-sm font-medium text-foreground mb-1">Uploading file...</p>
            <p className="text-xs text-muted-foreground">Parsing CSV contacts.</p>
          </div>
        )}

        {/* Analyzing */}
        {!checkingStatus && importStatus === 'analyzing' && (
          <div className="text-center py-16 glass-card rounded-xl px-8">
            <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-sm font-medium text-foreground mb-1">Running AI deduplication...</p>
            {analyzeProgress && analyzeProgress.total > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Analyzing batch {analyzeProgress.current} of {analyzeProgress.total}
                </p>
                <div className="max-w-xs mx-auto">
                  <Progress
                    value={Math.round((analyzeProgress.current / analyzeProgress.total) * 100)}
                    className="h-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round((analyzeProgress.current / analyzeProgress.total) * 100)}% complete
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Starting analysis — this may take a few minutes for large files.</p>
            )}
            <Button variant="ghost" size="sm" onClick={reset} className="mt-6 text-muted-foreground">
              Cancel
            </Button>
          </div>
        )}

        {/* Error */}
        {!checkingStatus && importStatus === 'error' && (
          <div className="text-center py-12 glass-card rounded-xl">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">Import Error</p>
            <p className="text-xs text-muted-foreground mb-6">{errorMsg}</p>
            <Button onClick={reset} variant="outline">Try Again</Button>
          </div>
        )}

        {/* Preview Container */}
        {!checkingStatus && importStatus === 'preview' && importPayload && (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{displayName || 'LinkedIn Connections'}</p>
                    <p className="text-xs text-muted-foreground">
                      {displaySize ? `${(displaySize / 1024).toFixed(1)} KB · ` : ''}{analysis?.totalInCSV} total rows
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Will Import</p>
                    <p className="text-sm font-medium text-foreground">
                      {importPayload.uniqueContacts.length} New · {importPayload.duplicateDetails.length} Updates
                    </p>
                  </div>
                  <button onClick={reset} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Toolbar: Tabs & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex space-x-1 bg-secondary p-1 rounded-lg inline-flex">
                  <button
                    className={cn(
                      "px-4 py-1.5 text-xs font-medium rounded-md transition-colors",
                      activeTab === 'duplicates' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => setActiveTab('duplicates')}
                  >
                    Updates ({importPayload.duplicateDetails.length})
                  </button>
                  <button
                    className={cn(
                      "px-4 py-1.5 text-xs font-medium rounded-md transition-colors",
                      activeTab === 'new' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => setActiveTab('new')}
                  >
                    New Contacts ({importPayload.uniqueContacts.length})
                  </button>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-xs bg-muted/50"
                  />
                </div>
              </div>

              {/* Data Table Area */}
              <div className="border border-border rounded-lg overflow-hidden bg-background">

                {/* DUPLICATES TAB */}
                {activeTab === 'duplicates' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="w-8 px-3 py-2"></th>
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Match Type</th>
                          <th className="px-3 py-2 font-medium">Updates</th>
                          <th className="px-3 py-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredDuplicates.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">No matches found</td>
                          </tr>
                        ) : (
                          filteredDuplicates.map((d: any) => {
                            const isExpanded = expandedRows.has(d.originalIndex);
                            return (
                              <React.Fragment key={d.originalIndex}>
                                <tr className="hover:bg-muted/30 transition-colors group">
                                  <td className="px-2 py-2 text-center">
                                    <button
                                      onClick={() => toggleRow(d.originalIndex)}
                                      className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                                    >
                                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 font-medium text-foreground">{d.existing.full_name}</td>
                                  <td className="px-3 py-2">
                                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase text-[9px] font-bold tracking-wider">
                                      {d.matchType.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">
                                    {d.changes.length > 0 ? d.changes.map((c: any) => c.field).join(', ') : 'None'}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => rejectDuplicate(d.originalIndex)}
                                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      title="Reject Update"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </Button>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-secondary/30">
                                    <td colSpan={5} className="px-10 py-4 border-t border-border/50 shadow-inner">
                                      <div className="grid grid-cols-3 gap-6">
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                          <h5 className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Existing Data</h5>
                                          <dl className="space-y-1 text-xs">
                                            <div className="flex gap-2"><dt className="w-16 text-muted-foreground">Name:</dt><dd className="truncate" title={d.existing.full_name}>{d.existing.full_name}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-muted-foreground">Email:</dt><dd className="truncate" title={d.existing.email}>{d.existing.email || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-muted-foreground">Company:</dt><dd className="truncate" title={d.existing.company}>{d.existing.company || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-muted-foreground">Title:</dt><dd className="truncate" title={d.existing.job_title}>{d.existing.job_title || '—'}</dd></div>
                                          </dl>
                                        </div>
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                          <h5 className="text-[10px] uppercase font-bold text-primary mb-2">Incoming Data</h5>
                                          <dl className="space-y-1 text-xs">
                                            <div className="flex gap-2"><dt className="w-16 text-primary/70">Name:</dt><dd className="font-medium truncate" title={d.incoming.fullName}>{d.incoming.fullName}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-primary/70">Email:</dt><dd className="font-medium truncate" title={d.incoming.email}>{d.incoming.email || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-primary/70">Company:</dt><dd className="font-medium truncate" title={d.incoming.company}>{d.incoming.company || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-primary/70">Title:</dt><dd className="font-medium truncate" title={d.incoming.jobTitle}>{d.incoming.jobTitle || '—'}</dd></div>
                                          </dl>
                                        </div>
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                          <div className="flex justify-between items-center mb-2">
                                            <h5 className="text-[10px] uppercase font-bold text-foreground">Changes</h5>
                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                              {d.similarity ? `${Math.round(d.similarity)}% AI Match` : 'Match'}
                                            </span>
                                          </div>
                                          <ul className="space-y-4 text-xs">
                                            {d.changes.map((c: any, idx: number) => {
                                              const inKey = incomingFieldMap[c.field] || c.field;
                                              const valB = d.incoming[inKey];
                                              const hasConflict = c.from !== '(empty)' && c.from && valB && c.from !== valB;
                                              const isArrayField = c.field === 'email' || c.field === 'phone';

                                              return (
                                                <li key={idx} className="flex flex-col gap-1.5 p-2 rounded border border-border/50 bg-muted/20">
                                                  <span className="font-semibold text-muted-foreground text-[10px] uppercase">{c.field.replace('_', ' ')}</span>
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    {c.from && c.from !== '(empty)' && (
                                                      <span className="line-through text-muted-foreground truncate max-w-[100px]" title={c.from}>{c.from}</span>
                                                    )}
                                                    {c.from && c.from !== '(empty)' && <span className="text-muted-foreground">→</span>}
                                                    <span className="text-green-600 font-medium bg-green-500/10 px-1.5 py-0.5 rounded truncate max-w-[150px]" title={c.to}>{c.to}</span>
                                                  </div>

                                                  {hasConflict && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                      <Button
                                                        size="sm"
                                                        variant={(!c.resolution || c.resolution === 'B') ? 'default' : 'outline'}
                                                        className="h-6 px-2 text-[10px]"
                                                        onClick={() => handleFieldResolve(d.originalIndex, idx, 'B')}
                                                      >Use B</Button>
                                                      <Button
                                                        size="sm"
                                                        variant={c.resolution === 'A' ? 'default' : 'outline'}
                                                        className="h-6 px-2 text-[10px]"
                                                        onClick={() => handleFieldResolve(d.originalIndex, idx, 'A')}
                                                      >Use A</Button>
                                                      {isArrayField && (
                                                        <Button
                                                          size="sm"
                                                          title="Will keep B as primary and push A as secondary"
                                                          variant={c.resolution === 'Both' ? 'default' : 'outline'}
                                                          className="h-6 px-2 text-[10px] border-primary/20 hover:bg-primary/5"
                                                          onClick={() => handleFieldResolve(d.originalIndex, idx, 'Both')}
                                                        >Keep Both</Button>
                                                      )}
                                                    </div>
                                                  )}
                                                </li>
                                              );
                                            })}
                                            {d.changes.length === 0 && <li className="text-muted-foreground italic">No data changes.</li>}
                                          </ul>
                                        </div>
                                      </div>
                                      <div className="mt-4 flex justify-end gap-3 border-t border-border/50 pt-4">
                                        <Button size="sm" variant="outline" onClick={() => rejectDuplicate(d.originalIndex)} className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 shadow-none">
                                          Reject Merge (Add as New)
                                        </Button>
                                        <Button size="sm" onClick={() => toggleRow(d.originalIndex)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                                          Accept Merge
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* NEW CONTACTS TAB */}
                {activeTab === 'new' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Email</th>
                          <th className="px-3 py-2 font-medium">Company</th>
                          <th className="px-3 py-2 font-medium">Position</th>
                          <th className="px-3 py-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredUniques.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">No matches found</td>
                          </tr>
                        ) : (
                          filteredUniques.map((c: any) => (
                            <tr key={c.originalIndex} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2 text-foreground font-medium">{c.fullName}</td>
                              <td className="px-3 py-2 text-muted-foreground">{c.email || '—'}</td>
                              <td className="px-3 py-2 text-muted-foreground">{c.company || '—'}</td>
                              <td className="px-3 py-2 text-muted-foreground">{c.jobTitle || '—'}</td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeNewContact(c.originalIndex)}
                                  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Reject Contact"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleImport} className="min-w-[150px]">
                Import Contacts
              </Button>
            </div>
          </div>
        )}

        {/* Importing with progress */}
        {!checkingStatus && importStatus === 'importing' && (
          <div className="text-center py-16 glass-card rounded-xl">
            <div className="max-w-xs mx-auto mb-6">
              <Progress value={Math.min(progress, 100)} className="h-2" />
            </div>
            <p className="text-sm font-medium text-foreground">Importing contacts...</p>
            <p className="text-xs text-muted-foreground">Updating records and applying new connections.</p>
          </div>
        )}

        {/* Done */}
        {!checkingStatus && importStatus === 'done' && importResult && (
          <div className="text-center py-16 glass-card rounded-xl">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">Import Successful!</p>
            <div className="flex justify-center gap-8 text-sm mb-8 text-muted-foreground">
              <div>
                <p className="text-2xl font-semibold text-foreground">{importResult.uniqueAdded}</p>
                <p>New Added</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{importResult.duplicatesUpdated}</p>
                <p>Updated</p>
              </div>
            </div>
            <Button onClick={reset} variant="outline">Import Another File</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSVImport;
