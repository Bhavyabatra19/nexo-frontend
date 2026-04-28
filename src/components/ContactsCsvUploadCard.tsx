"use client";

import { useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, RefreshCw } from "lucide-react";
import { groupsService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  full_name:    "Full name",
  first_name:   "First name",
  last_name:    "Last name",
  email:        "Email",
  phone:        "Phone",
  linkedin_url: "LinkedIn URL",
  company:      "Company",
  job_title:    "Job title",
};

const FIELD_ORDER = ["full_name", "first_name", "last_name", "email", "linkedin_url", "company", "job_title", "phone"];

type Mapping = Record<string, string | null>;
type Row = Record<string, string>;

type Stage =
  | { kind: "idle" }
  | { kind: "previewing" }
  | {
      kind: "preview-ready";
      columns: string[];
      sampleRows: Row[];
      rows: Row[];
      totalRows: number;
      truncated: boolean;
      mapping: Mapping;
    }
  | { kind: "importing" }
  | {
      kind: "done";
      total: number;
      inserted: number;
      updated: number;
      skipped_duplicates: number;
      skipped_invalid: number;
      errors: { row: number; reason: string }[];
    }
  | { kind: "error"; message: string };

function hasIdentifier(m: Mapping): boolean {
  if (m.full_name) return true;
  if (m.first_name && m.last_name) return true;
  if (m.email) return true;
  if (m.linkedin_url) return true;
  return false;
}

export default function ContactsCsvUploadCard({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [fileName, setFileName] = useState<string | null>(null);

  function reset() {
    setStage({ kind: "idle" });
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setStage({ kind: "previewing" });
    try {
      const res = await groupsService.previewContactsCsv(groupId, f);
      if (!res.success) {
        setStage({ kind: "error", message: res.error || "Failed to read CSV" });
        return;
      }
      setStage({
        kind: "preview-ready",
        columns: res.columns,
        sampleRows: res.sample_rows,
        rows: res.rows,
        totalRows: res.total_rows,
        truncated: res.truncated,
        mapping: { ...res.suggested_mapping },
      });
    } catch (err: any) {
      setStage({ kind: "error", message: err?.message || "Network error" });
    }
  }

  function setMappingFor(field: string, column: string) {
    setStage((s) => {
      if (s.kind !== "preview-ready") return s;
      const next: Mapping = { ...s.mapping };
      // The same column can only be mapped once. If a different field already
      // claims this column, clear that field first.
      if (column) {
        for (const f of Object.keys(next)) if (next[f] === column && f !== field) next[f] = null;
      }
      next[field] = column || null;
      return { ...s, mapping: next };
    });
  }

  async function doImport() {
    if (stage.kind !== "preview-ready") return;
    if (!hasIdentifier(stage.mapping)) {
      toast({
        title: "Map at least one identifier",
        description: "Pick a column for Full name, Email, or LinkedIn URL before importing.",
        variant: "destructive",
      });
      return;
    }
    const { rows, mapping } = stage;
    setStage({ kind: "importing" });
    try {
      const res = await groupsService.importContactsCsv(groupId, { rows, mapping });
      if (!res.success) {
        setStage({ kind: "error", message: res.error || "Import failed" });
        return;
      }
      setStage({
        kind: "done",
        total: res.total,
        inserted: res.inserted,
        updated: res.updated,
        skipped_duplicates: res.skipped_duplicates,
        skipped_invalid: res.skipped_invalid,
        errors: res.errors || [],
      });
      toast({
        title: "Import complete",
        description: `${res.inserted} added, ${res.updated} updated, ${res.skipped_duplicates} duplicates.`,
      });
    } catch (err: any) {
      setStage({ kind: "error", message: err?.message || "Network error" });
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4" />
        Upload contacts CSV
      </h2>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Bulk-import contacts you want associated with this community. We'll preview the file, suggest column mappings, and dedupe against your existing contacts before importing.
        </p>

        {stage.kind === "idle" && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="hidden"
            />
            <Button onClick={() => fileRef.current?.click()} size="sm" className="gap-2">
              <Upload className="w-3.5 h-3.5" />
              Choose CSV file
            </Button>
          </>
        )}

        {stage.kind === "previewing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Parsing {fileName}…
          </div>
        )}

        {stage.kind === "preview-ready" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate" title={fileName || ""}>{fileName}</span>
                <span className="text-xs text-muted-foreground shrink-0">· {stage.totalRows} rows</span>
                {stage.truncated && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                    capped
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Map columns</p>
              <p className="text-xs text-muted-foreground mb-3">
                We've guessed where each column goes. Adjust below if anything's off. At minimum, map a Full name (or Email or LinkedIn URL).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FIELD_ORDER.map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <label className="text-xs font-medium w-28 shrink-0 text-muted-foreground">
                      {FIELD_LABELS[field]}
                    </label>
                    <select
                      value={stage.mapping[field] || ""}
                      onChange={(e) => setMappingFor(field, e.target.value)}
                      className="flex-1 h-8 px-2 rounded-md border border-border bg-background text-xs"
                    >
                      <option value="">— Don't import —</option>
                      {stage.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Preview (first {stage.sampleRows.length} of {stage.totalRows})</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="text-xs w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      {stage.columns.map((col) => (
                        <th key={col} className="text-left font-medium px-2 py-1.5 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stage.sampleRows.map((row, ri) => (
                      <tr key={ri} className="border-t border-border">
                        {stage.columns.map((col) => (
                          <td key={col} className="px-2 py-1.5 text-muted-foreground whitespace-nowrap max-w-[200px] truncate" title={row[col] || ""}>
                            {row[col] || ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button onClick={doImport} disabled={!hasIdentifier(stage.mapping)} size="sm" className="gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Import {stage.totalRows} rows
              </Button>
              <Button onClick={reset} variant="outline" size="sm" className="gap-1">
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {stage.kind === "importing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Importing — this may take a moment for large files…
          </div>
        )}

        {stage.kind === "done" && (
          <div className="space-y-3">
            <div className={cn(
              "flex items-start gap-3 p-3 rounded-lg border",
              stage.inserted + stage.updated > 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            )}>
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Import complete</p>
                <p className="text-xs mt-1">
                  {stage.inserted} added · {stage.updated} updated · {stage.skipped_duplicates} duplicates · {stage.skipped_invalid} skipped of {stage.total} rows
                </p>
              </div>
            </div>

            {stage.errors.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {stage.errors.length} skipped row{stage.errors.length === 1 ? "" : "s"} — show details
                </summary>
                <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-2">
                  {stage.errors.map((e, i) => (
                    <li key={i} className="text-muted-foreground">Row {e.row}: {e.reason}</li>
                  ))}
                </ul>
              </details>
            )}

            <Button onClick={reset} size="sm" variant="outline" className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Upload another file
            </Button>
          </div>
        )}

        {stage.kind === "error" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Couldn't import that file.</p>
                <p className="text-xs mt-1">{stage.message}</p>
              </div>
            </div>
            <Button onClick={reset} size="sm" variant="outline" className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
