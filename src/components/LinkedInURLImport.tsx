"use client";

import React, { useState, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Link, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { authService } from '@/services/api';

const LINKEDIN_RE = /^https?:\/\/(www\.)?linkedin\.com\/in\/[^/\s]+/i;
const MAX_URLS    = 100;

type Status = 'idle' | 'running' | 'done' | 'error';

interface Result {
  imported: number;
  enriched: number;
  errors:   number;
}

export default function LinkedInURLImport() {
  const [raw,       setRaw]       = useState('');
  const [status,    setStatus]    = useState<Status>('idle');
  const [message,   setMessage]   = useState('');
  const [progress,  setProgress]  = useState(0);
  const [total,     setTotal]     = useState(0);
  const [result,    setResult]    = useState<Result | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');
  const abortRef = useRef<(() => void) | null>(null);

  // Parse valid LinkedIn URLs from the textarea
  const parsedUrls = React.useMemo(() => {
    const lines = raw.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
    return lines
      .map(l => l.split('?')[0].replace(/\/$/, ''))
      .filter(l => LINKEDIN_RE.test(l));
  }, [raw]);

  const invalidCount = raw.split(/[\n,]+/).map(l => l.trim()).filter(l => l && !LINKEDIN_RE.test(l.split('?')[0])).length;

  async function runImport() {
    if (!parsedUrls.length) return;
    setStatus('running');
    setProgress(0);
    setTotal(parsedUrls.length);
    setMessage('Submitting to Bright Data…');
    setResult(null);
    setErrorMsg('');

    try {
      const fetchPromise = fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/linkedin/import-by-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authService.getAccessToken()}`,
          },
          body: JSON.stringify({ urls: parsedUrls }),
        }
      );

      const response = await fetchPromise;
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${response.status}`);
      }

      // Parse SSE stream
      const reader  = response.body!.getReader();
      const decoder = new TextDecoder();
      let   buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'start')    { setTotal(evt.total); }
            if (evt.type === 'status')   { setMessage(evt.message); }
            if (evt.type === 'progress') {
              setProgress(evt.processed);
              setTotal(evt.total);
              setMessage(`Enriched ${evt.processed} of ${evt.total}…`);
            }
            if (evt.type === 'done') {
              setResult({ imported: evt.imported, enriched: evt.enriched, errors: evt.errors });
              setStatus('done');
            }
            if (evt.type === 'error') {
              throw new Error(evt.message);
            }
          } catch (e: any) {
            if (e.message && !e.message.startsWith('Unexpected token')) throw e;
          }
        }
      }

    } catch (err: any) {
      setErrorMsg(err.name === 'AbortError' ? 'Import cancelled.' : (err.message || 'Import failed'));
      setStatus('error');
    }
  }

  function reset() {
    setRaw('');
    setStatus('idle');
    setMessage('');
    setProgress(0);
    setTotal(0);
    setResult(null);
    setErrorMsg('');
  }

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Import by LinkedIn URL</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Paste up to {MAX_URLS} LinkedIn profile URLs (one per line or comma-separated).
          Profiles are fetched and enriched instantly via Bright Data.
        </p>
      </div>

      {/* Input */}
      {status === 'idle' && (
        <div className="space-y-3">
          <textarea
            className="w-full h-44 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
            placeholder={
              'https://www.linkedin.com/in/satya-nadella\nhttps://www.linkedin.com/in/jensen-huang\nhttps://www.linkedin.com/in/...'
            }
            value={raw}
            onChange={e => setRaw(e.target.value)}
            disabled={status !== 'idle'}
            spellCheck={false}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {parsedUrls.length > 0 && (
                <span className="text-foreground font-medium">{parsedUrls.length} valid URL{parsedUrls.length !== 1 ? 's' : ''}</span>
              )}
              {invalidCount > 0 && (
                <span className="text-destructive ml-2">{invalidCount} invalid (will be skipped)</span>
              )}
              {!raw.trim() && 'Paste LinkedIn profile URLs above'}
            </span>
            {parsedUrls.length > MAX_URLS && (
              <span className="text-destructive font-medium">Max {MAX_URLS} URLs per import</span>
            )}
          </div>

          <Button
            onClick={runImport}
            disabled={parsedUrls.length === 0 || parsedUrls.length > MAX_URLS}
            className="w-full"
          >
            <Link className="w-4 h-4 mr-2" />
            Import {parsedUrls.length > 0 ? `${Math.min(parsedUrls.length, MAX_URLS)} Profiles` : 'Profiles'}
          </Button>
        </div>
      )}

      {/* Running */}
      {status === 'running' && (
        <div className="space-y-4 rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message || 'Connecting to Bright Data…'}</p>
              {total > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{progress} of {total} profiles enriched</p>
              )}
            </div>
          </div>
          {total > 0 && (
            <Progress value={pct} className="h-2" />
          )}
          <p className="text-xs text-muted-foreground">
            This may take 1–3 minutes. Bright Data fetches live LinkedIn data for each profile.
          </p>
        </div>
      )}

      {/* Done */}
      {status === 'done' && result && (
        <div className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold">Import complete</p>
              <p className="text-sm text-muted-foreground">Profiles saved to your contacts</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold">{result.imported}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Imported</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{result.enriched}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enriched</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{result.errors}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Errors</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={reset}>
              Import More
            </Button>
            <Button className="flex-1" onClick={() => window.location.href = '/dashboard/contacts'}>
              View Contacts
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Import failed</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            </div>
          </div>
          <Button variant="outline" onClick={reset} className="w-full">
            <X className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Attribution */}
      <p className="text-xs text-muted-foreground text-center">
        Profile data fetched via{' '}
        <a href="https://brightdata.com" target="_blank" rel="noopener noreferrer" className="underline">
          Bright Data
        </a>
        {' '}— live LinkedIn data, no cookies required.
      </p>
    </div>
  );
}
