"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, MapPin, ArrowRight, AlertCircle, Network, Search } from "lucide-react";
import { scanService, ScanRecord, ScanResult } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const POLL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

const EXAMPLE_PROMPTS = [
  "Who can intro me to a Series B fintech founder in NYC?",
  "Anyone in my network leading product at a healthtech startup?",
  "Who do I know at climate-tech companies in San Francisco?",
];

interface ScanState {
  scanId: string | null;
  scan: ScanRecord | null;
  results: ScanResult[];
  parsed: Record<string, any> | null;
  status: "idle" | "submitting" | "running" | "done" | "error";
  error: string | null;
  durationMs: number | null;
}

const initialState: ScanState = {
  scanId: null,
  scan: null,
  results: [],
  parsed: null,
  status: "idle",
  error: null,
  durationMs: null,
};

function ParsedFiltersBar({ parsed }: { parsed: Record<string, any> | null }) {
  if (!parsed) return null;
  const chips: { label: string; value: string }[] = [];
  if (parsed.role) chips.push({ label: "Role", value: parsed.role });
  if (parsed.industry) chips.push({ label: "Industry", value: parsed.industry });
  if (parsed.stage) chips.push({ label: "Stage", value: parsed.stage });
  if (parsed.geo) chips.push({ label: "Where", value: parsed.geo });
  if (Array.isArray(parsed.keywords) && parsed.keywords.length) {
    chips.push({ label: "Keywords", value: parsed.keywords.join(", ") });
  }
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3 mb-2">
      {chips.map((c) => (
        <span
          key={c.label}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/40 border border-border text-xs text-foreground"
        >
          <span className="font-medium text-muted-foreground">{c.label}:</span>
          <span>{c.value}</span>
        </span>
      ))}
    </div>
  );
}

function Avatar({ name, photo, size = 10 }: { name?: string; photo?: string | null; size?: number }) {
  const dim = `w-${size} h-${size}`;
  return (
    <div className={cn(dim, "rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden")}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={name || ""} className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-semibold text-muted-foreground">
          {(name || "?").charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function WarmthChip({ score }: { score?: number | null }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const cls =
    score >= 0.7
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : score >= 0.4
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
  const label = score >= 0.7 ? "Hot" : score >= 0.4 ? "Warm" : "Cold";
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", cls)}>
      {label} · {pct}
    </span>
  );
}

function DegreeBadge({ degree }: { degree: 1 | 2 }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
        degree === 1
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-indigo-100 text-indigo-700 border-indigo-200"
      )}
    >
      {degree === 1 ? "1st" : "2nd"}
    </span>
  );
}

function ResultCard({ r }: { r: ScanResult }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors">
      <Avatar name={r.full_name} photo={r.photo_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{r.full_name}</span>
          <DegreeBadge degree={r.degree} />
          {typeof r.score === "number" && (
            <span className="text-[10px] text-muted-foreground">match {r.score.toFixed(2)}</span>
          )}
        </div>

        {(r.job_title || r.company) && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {r.job_title}
            {r.job_title && r.company ? " · " : ""}
            {r.company}
          </p>
        )}

        {r.address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {r.address}
          </p>
        )}

        {r.degree === 2 && r.bridge && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">via</span>
            <Avatar name={r.bridge.owner_name} photo={r.bridge.owner_photo} size={5} />
            <span className="font-medium">{r.bridge.owner_name}</span>
            <WarmthChip score={r.bridge.confidence_score} />
          </div>
        )}

        {r.degree === 1 && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">in your contacts</span>
            <WarmthChip score={r.confidence_score} />
          </div>
        )}
      </div>

      <Button size="sm" variant="outline" className="shrink-0" disabled>
        <ArrowRight className="w-3.5 h-3.5 mr-1" />
        Request intro
      </Button>
    </div>
  );
}

export default function ScanPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ScanState>(initialState);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  async function poll(scanId: string) {
    if (Date.now() - startedAtRef.current > POLL_TIMEOUT_MS) {
      setState((s) => ({ ...s, status: "error", error: "Scan is taking too long. Try again." }));
      return;
    }
    try {
      const res = await scanService.results(scanId);
      if (res.status === "completed") {
        setState((s) => ({
          ...s,
          status: "done",
          results: res.results || [],
          parsed: res.parsed || null,
          durationMs: res.duration_ms ?? null,
        }));
        return;
      }
      if (res.status === "failed") {
        setState((s) => ({ ...s, status: "error", error: "Scan failed. Try rephrasing your ask." }));
        return;
      }
      // Still running — keep going.
      pollRef.current = setTimeout(() => poll(scanId), POLL_MS);
    } catch (err: any) {
      setState((s) => ({ ...s, status: "error", error: err?.message || "Network error" }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (pollRef.current) clearTimeout(pollRef.current);

    setState({ ...initialState, status: "submitting" });
    startedAtRef.current = Date.now();

    try {
      const res = await scanService.submit(q);
      if (!res?.success || !res.scan_id) {
        setState({ ...initialState, status: "error", error: (res as any)?.error || "Failed to start scan" });
        return;
      }
      setState((s) => ({ ...s, scanId: res.scan_id, status: "running" }));
      pollRef.current = setTimeout(() => poll(res.scan_id), POLL_MS);
    } catch (err: any) {
      setState({ ...initialState, status: "error", error: err?.message || "Network error" });
    }
  }

  function handleExample(p: string) {
    setQuery(p);
    inputRef.current?.focus();
  }

  const isWorking = state.status === "submitting" || state.status === "running";
  const showEmptyHero = state.status === "idle";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="px-6 py-4 border-b border-border flex items-center gap-3 shrink-0">
        <Network className="w-5 h-5 text-primary" />
        <h1 className="font-semibold">Network Scan</h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Ask in plain English. Get ranked intros from your network.
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 w-full">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Who can intro me to a Series B fintech founder in NYC?"
                className="pl-9 h-11"
                disabled={isWorking}
                maxLength={500}
              />
            </div>
            <Button type="submit" disabled={isWorking || !query.trim()} className="h-11">
              {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="ml-2 hidden sm:inline">Scan</span>
            </Button>
          </form>

          {showEmptyHero && (
            <div className="mt-10 text-center">
              <Sparkles className="w-10 h-10 mx-auto text-primary/60" />
              <h2 className="mt-3 text-lg font-semibold">Ask your network anything.</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Nexo searches your contacts and your communities, then ranks the best paths to the people you want to reach.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleExample(p)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent/40 transition-colors text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.status === "submitting" && (
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting your ask…
            </div>
          )}

          {state.status === "running" && (
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning your network — parsing your ask, searching contacts and communities…
            </div>
          )}

          {state.status === "error" && (
            <div className="mt-8 flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Couldn't run that scan.</p>
                <p className="text-xs mt-1">{state.error}</p>
              </div>
            </div>
          )}

          {state.status === "done" && (
            <div className="mt-6">
              <ParsedFiltersBar parsed={state.parsed} />
              <div className="flex items-center justify-between mt-2">
                <h3 className="text-sm font-semibold">
                  {state.results.length} {state.results.length === 1 ? "result" : "results"}
                </h3>
                {state.durationMs != null && (
                  <span className="text-xs text-muted-foreground">
                    in {(state.durationMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {state.results.length === 0 ? (
                <div className="mt-6 p-8 text-center border border-dashed border-border rounded-xl text-sm text-muted-foreground">
                  No matches yet. Try widening your ask, or import more contacts.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {state.results.map((r) => (
                    <ResultCard key={r.contact_id} r={r} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
