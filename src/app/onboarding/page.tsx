"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
const EXT_DOWNLOAD = `${API_BASE?.replace('/api', '')}/public/nexo-extension.zip`;

type Step = 'extension' | 'linkedin' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('extension');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ imported?: number; created?: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [extToken, setExtToken] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) router.push('/');
  }, [router]);

  useEffect(() => {
    // Pre-fetch extension token so it's ready on step 1
    fetch(`${API_BASE}/settings/extension-token`, {
      headers: authService.getAuthHeaders(),
    })
      .then(r => r.json())
      .then(d => { if (d.token) setExtToken(d.token); })
      .catch(() => {});
  }, []);

  async function handleLinkedInSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const headers = authService.getAuthHeaders();
      const res = await fetch(`${API_BASE}/linkedin/bulk-enrich`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      setSyncResult(data);
      setStep('done');
    } catch (err: any) {
      setSyncError('Sync failed. You can do this later from the dashboard.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {(['extension', 'linkedin', 'done'] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step === s ? 'bg-[#0047AB]' : i < ['extension', 'linkedin', 'done'].indexOf(step) ? 'bg-[#0047AB]/40' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-md">
        {step === 'extension' && <ExtensionStep onNext={() => setStep('linkedin')} downloadUrl={EXT_DOWNLOAD} extToken={extToken} />}
        {step === 'linkedin' && (
          <LinkedInStep
            onSync={handleLinkedInSync}
            onSkip={() => router.push('/dashboard/contacts')}
            syncing={syncing}
            error={syncError}
          />
        )}
        {step === 'done' && <DoneStep result={syncResult} onFinish={() => router.push('/dashboard/contacts')} />}
      </div>
    </div>
  );
}

function ExtensionStep({ onNext, downloadUrl, extToken }: { onNext: () => void; downloadUrl: string; extToken: string | null }) {
  const [copied, setCopied] = useState(false);

  function copyToken() {
    if (!extToken) return;
    navigator.clipboard.writeText(extToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-[#0047AB]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-[#0047AB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Install the Nexo Extension</h1>
      <p className="text-gray-500 mb-8 text-sm leading-relaxed">
        The extension captures your LinkedIn connections as you browse — work history, education, and more. No bulk scraping, just passive capture.
      </p>

      <div className="bg-gray-50 rounded-xl p-5 text-left mb-8 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">How to install</p>
        {[
          'Download the extension zip below',
          'Open Chrome → chrome://extensions',
          'Enable "Developer mode" (top right toggle)',
          'Drag & drop the zip file onto the page',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#0047AB] text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">
              {i + 1}
            </span>
            <span className="text-sm text-gray-600">{step}</span>
          </div>
        ))}
      </div>

      <a
        href={downloadUrl}
        download
        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#0047AB] text-white rounded-xl font-semibold text-sm hover:bg-[#003682] transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Extension
      </a>

      {extToken && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your API Token</p>
          <p className="text-xs text-gray-500 mb-3">After installing, the extension will ask for this token. Copy it now.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono truncate text-gray-700">
              {extToken}
            </code>
            <button
              onClick={copyToken}
              className="shrink-0 px-3 py-2 bg-[#0047AB] text-white text-xs font-semibold rounded-lg hover:bg-[#003682] transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <button onClick={onNext} className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors">
        I'll install it later →
      </button>
    </div>
  );
}

function LinkedInStep({
  onSync, onSkip, syncing, error,
}: {
  onSync: () => void; onSkip: () => void; syncing: boolean; error: string | null;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sync your LinkedIn network</h1>
      <p className="text-gray-500 mb-6 text-sm leading-relaxed">
        The extension will automatically sync your connections as you browse LinkedIn. Click the extension icon and hit <strong>"Sync Now"</strong> to pull all your connections immediately.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      <div className="bg-gray-50 rounded-xl p-5 text-left mb-6 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">How it works</p>
        {[
          'Open LinkedIn in your browser',
          'Click the Nexo extension icon in your toolbar',
          'Hit "Sync Now" — pulls all your connections',
          'Nexo enriches each profile with work history & education',
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#0A66C2] text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">{i + 1}</span>
            <span className="text-sm text-gray-600">{s}</span>
          </div>
        ))}
      </div>

      <a
        href="https://www.linkedin.com"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#0A66C2] text-white rounded-xl font-semibold text-sm hover:bg-[#004182] transition-colors mb-3"
      >
        Open LinkedIn →
      </a>
      <button onClick={onSkip} className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors">
        I'll do this later →
      </button>
    </div>
  );
}

function DoneStep({ result, onFinish }: { result: any; onFinish: () => void }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h1>
      <p className="text-gray-500 mb-8 text-sm">
        {result?.queued
          ? `Enriching ${result.queued} contacts in the background. Check back in a few minutes.`
          : 'Your network is ready. Browse LinkedIn to keep it growing.'}
      </p>
      <button
        onClick={onFinish}
        className="w-full py-3 px-6 bg-[#0047AB] text-white rounded-xl font-semibold text-sm hover:bg-[#003682] transition-colors"
      >
        Go to dashboard →
      </button>
    </div>
  );
}
