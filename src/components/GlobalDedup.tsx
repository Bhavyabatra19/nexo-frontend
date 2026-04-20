"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  GitMerge, CheckCircle2, AlertCircle, Loader2, Search,
  ChevronDown, ChevronRight, Trash, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { dedupService } from '@/services/api';

// localStorage only stores rejected rows (local UI preference, not in DB)
const REJECTED_KEY = 'nexo_dedup_rejected';
// Legacy key — clear it on load so old stale data doesn't interfere
const LEGACY_KEY = 'nexo_dedup_state';

type DedupStatus = 'idle' | 'scanning' | 'preview' | 'applying' | 'done' | 'error';

const GlobalDedup = () => {
  const [status, setStatus] = useState<DedupStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateDetails, setDuplicateDetails] = useState<any[]>([]);
  const [applyResult, setApplyResult] = useState<any>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [rejectedRows, setRejectedRows] = useState<Set<number>>(new Set());
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Poll a running job until it moves to pending_review in DB
  const runScan = useCallback(async (jobId: string) => {
    try {
      while (true) {
        const statusRes = await dedupService.getJobStatus(jobId);
        if (statusRes.status === 'processing') {
          if (statusRes.progress) setProgress(statusRes.progress);
          await new Promise(r => setTimeout(r, 2000));
        } else if (statusRes.status === 'done') {
          // Job moved to pending_review in DB — fetch full result from /status
          const dbStatus = await dedupService.getStatus();
          if (dbStatus.status === 'pending_review') {
            const details = dbStatus.duplicateDetails || [];
            setDuplicateDetails(details);
            localStorage.removeItem(REJECTED_KEY);
            setRejectedRows(new Set());
            setStatus('preview');
          }
          break;
        } else {
          throw new Error(statusRes.error || 'Scan failed');
        }
      }
    } catch (err: any) {
      const msg = err.message || 'An error occurred during scan';
      setErrorMsg(msg);
      setStatus('error');
    }
  }, []);

  // On mount: check DB for any active/pending job and restore state
  useEffect(() => {
    // Clear legacy localStorage key
    localStorage.removeItem(LEGACY_KEY);

    const checkDbStatus = async () => {
      try {
        const res = await dedupService.getStatus();

        if (res.status === 'pending_review') {
          const details = res.duplicateDetails || [];
          setDuplicateDetails(details);
          // Restore rejected rows from localStorage (local UI state)
          try {
            const saved = JSON.parse(localStorage.getItem(REJECTED_KEY) || 'null');
            if (saved?.rejectedRows) setRejectedRows(new Set(saved.rejectedRows));
          } catch {}
          setStatus('preview');
        } else if (res.status === 'processing' && res.jobId) {
          setStatus('scanning');
          if (res.progress) setProgress(res.progress);
          runScan(res.jobId);
        }
        // 'idle' (possibly with notice) → just stay idle, no action needed
      } catch {
        // Network error or not authenticated yet — show idle
      } finally {
        setCheckingStatus(false);
      }
    };

    checkDbStatus();
  }, [runScan]);

  // Sync rejectedRows to localStorage whenever they change during preview
  useEffect(() => {
    if (status !== 'preview') return;
    try {
      localStorage.setItem(REJECTED_KEY, JSON.stringify({ rejectedRows: Array.from(rejectedRows) }));
    } catch {}
  }, [rejectedRows, status]);

  const reset = () => {
    setStatus('idle');
    setProgress(null);
    setErrorMsg('');
    setDuplicateDetails([]);
    setApplyResult(null);
    setSearchQuery('');
    setExpandedRows(new Set());
    setSelectedRows(new Set());
    setRejectedRows(new Set());
    localStorage.removeItem(REJECTED_KEY);
    // Fire-and-forget cancel to clean up DB job (if any)
    dedupService.cancel().catch(() => {});
  };

  const startScan = async () => {
    setStatus('scanning');
    setProgress(null);
    setErrorMsg('');
    setDuplicateDetails([]);
    setRejectedRows(new Set());
    localStorage.removeItem(REJECTED_KEY);

    try {
      const startRes = await dedupService.startGlobalDedup();
      if (!startRes.success) throw new Error(startRes.error || 'Failed to start scan');
      await runScan(startRes.jobId);
    } catch (err: any) {
      const msg = err.message || 'An error occurred';
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const toggleSelect = (index: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const filteredDetails = useMemo(() => {
    return duplicateDetails
      .map((item, i) => ({ ...item, originalIndex: i }))
      .filter(d => {
        if (rejectedRows.has(d.originalIndex)) return false;
        const q = searchQuery.toLowerCase();
        return (
          (d.existing?.full_name || '').toLowerCase().includes(q) ||
          (d.incoming?.fullName || '').toLowerCase().includes(q) ||
          (d.existing?.email || '').toLowerCase().includes(q) ||
          (d.existing?.company || '').toLowerCase().includes(q)
        );
      });
  }, [duplicateDetails, searchQuery, rejectedRows]);

  const allVisibleIndices = filteredDetails.map(d => d.originalIndex);
  const allSelected = allVisibleIndices.length > 0 && allVisibleIndices.every(i => selectedRows.has(i));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows(prev => {
        const next = new Set(prev);
        allVisibleIndices.forEach(i => next.delete(i));
        return next;
      });
    } else {
      setSelectedRows(prev => {
        const next = new Set(prev);
        allVisibleIndices.forEach(i => next.add(i));
        return next;
      });
    }
  };

  const rejectRow = (index: number) => {
    setRejectedRows(prev => new Set(prev).add(index));
    setSelectedRows(prev => { const next = new Set(prev); next.delete(index); return next; });
    setExpandedRows(prev => { const next = new Set(prev); next.delete(index); return next; });
  };

  const rejectSelected = () => {
    selectedRows.forEach(i => rejectRow(i));
    setSelectedRows(new Set());
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
    setDuplicateDetails(prev => {
      const clone = [...prev];
      const row = { ...clone[dIndex] };
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
        merged[exKey] = valB; // keep B as primary, backend already merged arrays
        change.to = `${valB} (+ kept A)`;
      }

      change.resolution = choice;
      changes[cIndex] = change;
      row.merged = merged;
      row.changes = changes;
      clone[dIndex] = row;
      return clone;
    });
  };

  const pendingCount = filteredDetails.length;
  const acceptedCount = duplicateDetails.length - rejectedRows.size;

  const handleApply = async () => {
    setStatus('applying');
    try {
      const acceptedMerges = duplicateDetails
        .filter((_, i) => !rejectedRows.has(i))
        .map(d => ({
          existingId: d.existing.id,
          incomingId: d.incoming.id,
          mergedData: d.merged,
        }));

      const result = await dedupService.applyMerges(acceptedMerges);
      setApplyResult(result);
      setStatus('done');
      localStorage.removeItem(REJECTED_KEY);
    } catch (err: any) {
      const msg = err.message || 'Failed to apply merges';
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">Merge & Fix</h1>
          <p className="text-sm text-muted-foreground">
            Scan your entire contact list for duplicates and merge them into clean, unified records.
          </p>
        </div>

        {/* Initial status check */}
        {checkingStatus && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Checking status...</p>
          </div>
        )}

        {/* Idle */}
        {!checkingStatus && status === 'idle' && (
          <div className="glass-card rounded-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GitMerge className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-2">Ready to scan for duplicates</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Nexo AI will compare all your contacts using email, phone, LinkedIn, and name similarity to find duplicate records.
            </p>
            <Button onClick={startScan} className="min-w-[160px]">
              <GitMerge className="w-4 h-4 mr-2" />
              Start Merge & Fix Scan
            </Button>
          </div>
        )}

        {/* Scanning */}
        {!checkingStatus && status === 'scanning' && (
          <div className="text-center py-16 glass-card rounded-xl px-8">
            <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-sm font-medium text-foreground mb-1">Running Merge & Fix scan...</p>
            {progress && progress.total > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Analyzing batch {progress.current} of {progress.total}
                </p>
                <div className="max-w-xs mx-auto">
                  <Progress value={Math.round((progress.current / progress.total) * 100)} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round((progress.current / progress.total) * 100)}% complete
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Scanning contacts — this may take a moment.</p>
            )}
            <Button variant="ghost" size="sm" onClick={reset} className="mt-6 text-muted-foreground">
              Cancel
            </Button>
          </div>
        )}

        {/* Error */}
        {!checkingStatus && status === 'error' && (
          <div className="text-center py-12 glass-card rounded-xl">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">Scan Error</p>
            <p className="text-xs text-muted-foreground mb-6">{errorMsg}</p>
            <Button onClick={reset} variant="outline">Try Again</Button>
          </div>
        )}

        {/* Preview */}
        {!checkingStatus && status === 'preview' && (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Scan Complete</p>
                  <p className="text-xs text-muted-foreground">
                    {duplicateDetails.length} duplicate pair{duplicateDetails.length !== 1 ? 's' : ''} found
                    {rejectedRows.size > 0 && ` · ${rejectedRows.size} rejected`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Will Merge</p>
                    <p className="text-sm font-medium text-foreground">{acceptedCount} pair{acceptedCount !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={reset} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  {selectedRows.size > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg">
                      <span className="text-xs font-medium text-primary">{selectedRows.size} selected</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={rejectSelected}
                        className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash className="w-3 h-3 mr-1" />
                        Reject Selected
                      </Button>
                    </div>
                  )}
                  {selectedRows.size === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {pendingCount > 0 ? `${pendingCount} pending review` : 'All reviewed'}
                    </p>
                  )}
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-xs bg-muted/50"
                  />
                </div>
              </div>

              {/* Table */}
              {duplicateDetails.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No duplicates found!</p>
                  <p className="text-xs text-muted-foreground">Your contacts look clean.</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="w-8 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              className="rounded border-border cursor-pointer"
                            />
                          </th>
                          <th className="w-8 px-2 py-2"></th>
                          <th className="px-3 py-2 font-medium">Contact A (Keep)</th>
                          <th className="px-3 py-2 font-medium">Platform</th>
                          <th className="px-3 py-2 font-medium">Contact B (Merge in)</th>
                          <th className="px-3 py-2 font-medium">Platform</th>
                          <th className="px-3 py-2 font-medium">Match</th>
                          <th className="px-3 py-2 font-medium">Changes</th>
                          <th className="px-3 py-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredDetails.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-muted-foreground">No matches found</td>
                          </tr>
                        ) : (
                          filteredDetails.map((d) => {
                            const isExpanded = expandedRows.has(d.originalIndex);
                            const isSelected = selectedRows.has(d.originalIndex);
                            return (
                              <React.Fragment key={d.originalIndex}>
                                <tr className={cn("hover:bg-muted/30 transition-colors", isSelected && "bg-primary/5")}>
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelect(d.originalIndex)}
                                      className="rounded border-border cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <button
                                      onClick={() => toggleRow(d.originalIndex)}
                                      className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                                    >
                                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 font-medium text-foreground">{d.existing?.full_name}</td>
                                  <td className="px-3 py-2">
                                    <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[9px] font-medium capitalize">
                                      {d.existing?.source || 'manual'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">{d.incoming?.fullName}</td>
                                  <td className="px-3 py-2">
                                    <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[9px] font-medium capitalize">
                                      {d.incoming?.source || 'manual'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase text-[9px] font-bold tracking-wider">
                                      {(d.matchType || '').replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[180px]">
                                    {d.changes?.length > 0 ? d.changes.map((c: any) => c.field).join(', ') : 'None'}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => rejectRow(d.originalIndex)}
                                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      title="Reject — keep both contacts separate"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </Button>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-secondary/30">
                                    <td colSpan={9} className="px-10 py-4 border-t border-border/50 shadow-inner">
                                      <div className="grid grid-cols-3 gap-6">
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                          <h5 className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Contact A — Will Keep</h5>
                                          <dl className="space-y-1 text-xs">
                                            <div className="flex gap-2"><dt className="w-16 text-muted-foreground">Name:</dt><dd className="truncate">{d.existing?.full_name}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-muted-foreground">Email:</dt><dd className="truncate">{d.existing?.email || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-muted-foreground">Company:</dt><dd className="truncate">{d.existing?.company || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-muted-foreground">Title:</dt><dd className="truncate">{d.existing?.job_title || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-muted-foreground">Source:</dt><dd className="capitalize">{d.existing?.source || 'manual'}</dd></div>
                                          </dl>
                                        </div>
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                          <h5 className="text-[10px] uppercase font-bold text-primary mb-2">Contact B — Will Merge In & Delete</h5>
                                          <dl className="space-y-1 text-xs">
                                            <div className="flex gap-2"><dt className="w-16 text-primary/70">Name:</dt><dd className="font-medium truncate">{d.incoming?.fullName}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-primary/70">Email:</dt><dd className="font-medium truncate">{d.incoming?.email || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-primary/70">Company:</dt><dd className="font-medium truncate">{d.incoming?.company || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-primary/70">Title:</dt><dd className="font-medium truncate">{d.incoming?.jobTitle || '—'}</dd></div>
                                            <div className="flex gap-2"><dt className="w-16 text-primary/70">Source:</dt><dd className="font-medium capitalize">{d.incoming?.source || 'manual'}</dd></div>
                                          </dl>
                                        </div>
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                          <div className="flex justify-between items-center mb-2">
                                            <h5 className="text-[10px] uppercase font-bold text-foreground">Changes Applied</h5>
                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                              {d.similarity ? `${Math.round(d.similarity)}% Match` : 'Match'}
                                            </span>
                                          </div>
                                          <ul className="space-y-4 text-xs">
                                            {d.changes?.map((c: any, idx: number) => {
                                              const inKey = incomingFieldMap[c.field] || c.field;
                                              const valB = d.incoming[inKey];
                                              const hasConflict = c.from && valB && c.from !== valB;
                                              const isArrayField = c.field === 'email' || c.field === 'phone';

                                              return (
                                                <li key={idx} className="flex flex-col gap-1.5 p-2 rounded border border-border/50 bg-muted/20">
                                                  <span className="font-semibold text-muted-foreground text-[10px] uppercase">{c.field.replace('_', ' ')}</span>
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    {c.from && <span className="line-through text-muted-foreground truncate max-w-[100px]" title={c.from}>{c.from}</span>}
                                                    {c.from && <span className="text-muted-foreground">→</span>}
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
                                            {(!d.changes || d.changes.length === 0) && <li className="text-muted-foreground italic">No data changes.</li>}
                                          </ul>
                                        </div>
                                      </div>
                                      <div className="mt-4 flex justify-end gap-3 border-t border-border/50 pt-4">
                                        <Button size="sm" variant="outline" onClick={() => rejectRow(d.originalIndex)} className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 shadow-none">
                                          Reject — Keep Both
                                        </Button>
                                        <Button size="sm" onClick={() => toggleRow(d.originalIndex)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                                          <Check className="w-3.5 h-3.5 mr-1" />
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
                </div>
              )}
            </div>

            {duplicateDetails.length > 0 && (
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button onClick={handleApply} disabled={acceptedCount === 0} className="min-w-[150px]">
                  <GitMerge className="w-4 h-4 mr-2" />
                  Merge {acceptedCount} Contact{acceptedCount !== 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Applying */}
        {!checkingStatus && status === 'applying' && (
          <div className="text-center py-16 glass-card rounded-xl">
            <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-sm font-medium text-foreground">Merging contacts...</p>
            <p className="text-xs text-muted-foreground mt-1">Applying golden profiles and migrating related data.</p>
          </div>
        )}

        {/* Done */}
        {!checkingStatus && status === 'done' && applyResult && (
          <div className="text-center py-16 glass-card rounded-xl">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">Merge & Fix Complete!</p>
            <div className="flex justify-center gap-8 text-sm mb-8 text-muted-foreground">
              <div>
                <p className="text-2xl font-semibold text-foreground">{applyResult.merged}</p>
                <p>Contacts Merged</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{applyResult.skipped ?? 0}</p>
                <p>Rejected</p>
              </div>
            </div>
            <Button onClick={reset} variant="outline">Scan Again</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalDedup;
