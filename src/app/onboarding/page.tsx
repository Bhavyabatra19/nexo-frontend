"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, contactsService, groupsService } from '@/services/api';
import {
  Linkedin, Mail, Twitter, Instagram, Sparkles, Check, Bell, Download,
  ArrowRight, Loader2, Users, Building2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
const EXT_DOWNLOAD = `${API_BASE?.replace('/api', '')}/public/nexo-extension.zip`;
const STATE_KEY = 'nexo_onboarding_state';

type Step = 'welcome' | 'connect' | 'extension' | 'sync' | 'recs' | 'done';
type Role = 'founder' | 'recruiter' | 'sales' | 'investor' | 'other';

type PersistedState = {
  step: Step;
  role: Role | null;
  notifyConnectors: string[]; // ids of "coming soon" connectors user wants notify on
};

const DEFAULT_STATE: PersistedState = { step: 'welcome', role: null, notifyConnectors: [] };

function loadState(): PersistedState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s: PersistedState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const STEP_ORDER: Step[] = ['welcome', 'connect', 'extension', 'sync', 'recs', 'done'];

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) { router.push('/'); return; }
    setState(loadState());
    setHydrated(true);
  }, [router]);

  useEffect(() => { if (hydrated) saveState(state); }, [state, hydrated]);

  function go(step: Step) { setState((s) => ({ ...s, step })); }

  function finish() {
    try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
    router.push('/dashboard/contacts');
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#0047AB]" />
      </div>
    );
  }

  const stepIdx = STEP_ORDER.indexOf(state.step);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-12">
      <ProgressDots current={stepIdx} total={STEP_ORDER.length} />

      <div className="w-full max-w-lg mt-10">
        {state.step === 'welcome' && (
          <WelcomeStep
            role={state.role}
            onPick={(role) => setState((s) => ({ ...s, role }))}
            onContinue={() => go('connect')}
          />
        )}

        {state.step === 'connect' && (
          <ConnectStep
            notifyConnectors={state.notifyConnectors}
            onToggleNotify={(id) => setState((s) => ({
              ...s,
              notifyConnectors: s.notifyConnectors.includes(id)
                ? s.notifyConnectors.filter((c) => c !== id)
                : [...s.notifyConnectors, id],
            }))}
            onLinkedIn={() => go('extension')}
          />
        )}

        {state.step === 'extension' && (
          <ExtensionStep onNext={() => go('sync')} onBack={() => go('connect')} />
        )}

        {state.step === 'sync' && (
          <SyncStep onNext={() => go('recs')} onBack={() => go('extension')} />
        )}

        {state.step === 'recs' && (
          <RecommendationsStep onFinish={() => go('done')} onBack={() => go('sync')} />
        )}

        {state.step === 'done' && <DoneStep onFinish={finish} />}
      </div>
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? 'w-8 bg-[#0047AB]' : i < current ? 'w-1.5 bg-[#0047AB]/40' : 'w-1.5 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Welcome / role ────────────────────────────────────────────────

function WelcomeStep({
  role, onPick, onContinue,
}: { role: Role | null; onPick: (r: Role) => void; onContinue: () => void }) {
  const roles: { id: Role; label: string; sub: string }[] = [
    { id: 'founder',   label: 'Founder',   sub: 'fundraising, hiring, intros' },
    { id: 'recruiter', label: 'Recruiter', sub: 'sourcing, candidate outreach' },
    { id: 'sales',     label: 'Sales',     sub: 'warm intros, prospect research' },
    { id: 'investor',  label: 'Investor',  sub: 'deal flow, founder discovery' },
    { id: 'other',     label: 'Something else', sub: 'general networking' },
  ];

  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-[#0047AB]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-7 h-7 text-[#0047AB]" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Nexo</h1>
      <p className="text-gray-500 mb-10 text-sm leading-relaxed">
        Search your network with AI. First — what brings you here? We'll tune the experience.
      </p>

      <div className="grid grid-cols-1 gap-2 mb-8">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => onPick(r.id)}
            className={`flex items-center justify-between text-left px-4 py-3 rounded-xl border transition-colors ${
              role === r.id
                ? 'border-[#0047AB] bg-[#0047AB]/5'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">{r.label}</p>
              <p className="text-xs text-gray-500">{r.sub}</p>
            </div>
            {role === r.id && <Check className="w-4 h-4 text-[#0047AB]" />}
          </button>
        ))}
      </div>

      <button
        disabled={!role}
        onClick={onContinue}
        className="w-full py-3 px-6 bg-[#0047AB] text-white rounded-xl font-semibold text-sm hover:bg-[#003682] transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Step 2: Connector grid ────────────────────────────────────────────────

type Connector = {
  id: string;
  name: string;
  blurb: string;
  icon: React.ReactNode;
  brand: string;
  status: 'active' | 'soon';
};

const CONNECTORS: Connector[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    blurb: 'Capture connections + work history via the Nexo extension.',
    icon: <Linkedin className="w-5 h-5" />,
    brand: '#0A66C2',
    status: 'active',
  },
  {
    id: 'google',
    name: 'Google Contacts',
    blurb: 'Sync your Google address book + Gmail correspondents.',
    icon: <Mail className="w-5 h-5" />,
    brand: '#EA4335',
    status: 'soon',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    blurb: 'Pull in followers, mutuals, and DM contacts.',
    icon: <Twitter className="w-5 h-5" />,
    brand: '#000000',
    status: 'soon',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    blurb: 'Mutuals + people you message regularly.',
    icon: <Instagram className="w-5 h-5" />,
    brand: '#E1306C',
    status: 'soon',
  },
];

function ConnectStep({
  notifyConnectors, onToggleNotify, onLinkedIn,
}: {
  notifyConnectors: string[];
  onToggleNotify: (id: string) => void;
  onLinkedIn: () => void;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect your network</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          The more sources you plug in, the better Nexo gets at finding the right person. Start with LinkedIn — the rest are coming soon.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {CONNECTORS.map((c) => (
          <ConnectorCard
            key={c.id}
            connector={c}
            notifyEnabled={notifyConnectors.includes(c.id)}
            onToggleNotify={() => onToggleNotify(c.id)}
            onActivate={c.id === 'linkedin' ? onLinkedIn : undefined}
          />
        ))}
      </div>

      <button
        onClick={onLinkedIn}
        className="w-full py-3 px-6 bg-[#0047AB] text-white rounded-xl font-semibold text-sm hover:bg-[#003682] transition-colors inline-flex items-center justify-center gap-2"
      >
        Continue with LinkedIn <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ConnectorCard({
  connector, notifyEnabled, onToggleNotify, onActivate,
}: {
  connector: Connector;
  notifyEnabled: boolean;
  onToggleNotify: () => void;
  onActivate?: () => void;
}) {
  const isActive = connector.status === 'active';
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${isActive ? 'border-gray-200 bg-white hover:border-gray-300' : 'border-gray-100 bg-gray-50/50'}`}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white"
        style={{ backgroundColor: connector.brand }}
      >
        {connector.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{connector.name}</p>
          {!isActive && (
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
              Coming soon
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{connector.blurb}</p>
      </div>
      {isActive ? (
        <button
          onClick={onActivate}
          className="text-xs font-semibold text-white bg-[#0A66C2] px-3 py-1.5 rounded-lg hover:bg-[#004182] transition-colors shrink-0"
        >
          Connect
        </button>
      ) : (
        <button
          onClick={onToggleNotify}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
            notifyEnabled
              ? 'bg-[#0047AB]/10 text-[#0047AB]'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {notifyEnabled ? <Check className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
          {notifyEnabled ? 'We\'ll let you know' : 'Notify me'}
        </button>
      )}
    </div>
  );
}

// ─── Step 3: Install extension ─────────────────────────────────────────────

function ExtensionStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [extToken, setExtToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings/extension-token`, {
      credentials: 'include',
      headers: authService.getAuthHeaders(),
    })
      .then((r) => r.json())
      .then((d) => { if (d.token) setExtToken(d.token); })
      .catch(() => {});
  }, []);

  function copyToken() {
    if (!extToken) return;
    navigator.clipboard.writeText(extToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-[#0A66C2]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Linkedin className="w-7 h-7 text-[#0A66C2]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Install the Nexo Extension</h1>
      <p className="text-gray-500 mb-8 text-sm leading-relaxed">
        Captures your LinkedIn connections passively as you browse. No bulk scraping, no banner — just your existing network, indexed.
      </p>

      <div className="bg-gray-50 rounded-xl p-5 text-left mb-6 space-y-3">
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
        href={EXT_DOWNLOAD}
        download
        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#0047AB] text-white rounded-xl font-semibold text-sm hover:bg-[#003682] transition-colors mb-3"
      >
        <Download className="w-4 h-4" />
        Download Extension
      </a>

      {extToken && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
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

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Back</button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0047AB] hover:text-[#003682] transition-colors"
        >
          Installed → Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Sync ──────────────────────────────────────────────────────────

function SyncStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ queued?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSync() {
    setSyncing(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/linkedin/bulk-enrich`, {
        method: 'POST',
        credentials: 'include',
        headers: authService.getAuthHeaders(),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Sync didn\'t kick off — you can run it later from the dashboard.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-[#0A66C2]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Linkedin className="w-7 h-7 text-[#0A66C2]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sync your LinkedIn network</h1>
      <p className="text-gray-500 mb-6 text-sm leading-relaxed">
        Open LinkedIn, click the Nexo extension, hit <strong>Sync now</strong>. Or kick off a backend enrichment of contacts you've already captured.
      </p>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      {result && (
        <div className="bg-emerald-50 text-emerald-800 text-sm rounded-lg px-4 py-3 mb-4 inline-flex items-center gap-2">
          <Check className="w-4 h-4" />
          {result.queued
            ? `Enriching ${result.queued} contacts in the background.`
            : 'Sync started. Check back in a minute.'}
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-5 text-left mb-6 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">What happens next</p>
        {[
          'Open LinkedIn — the widget appears on profile pages',
          'Click the Nexo extension → "Sync now" pulls all connections',
          'Nexo enriches each profile with work history, education, and tags',
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
      <button
        onClick={runSync}
        disabled={syncing}
        className="w-full py-2.5 px-6 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2 mb-6"
      >
        {syncing ? <><Loader2 className="w-4 h-4 animate-spin" /> Enriching…</> : 'Or enrich existing contacts now'}
      </button>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Back</button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0047AB] hover:text-[#003682] transition-colors"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Recommendations ───────────────────────────────────────────────

function RecommendationsStep({ onFinish, onBack }: { onFinish: () => void; onBack: () => void }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      contactsService.getContacts({ limit: 6 }).catch(() => ({ contacts: [] })),
      groupsService.listDiscoverable().catch(() => ({ communities: [] })),
    ]).then(([c, g]: any[]) => {
      if (!alive) return;
      setContacts(c?.contacts || c?.data || []);
      setCommunities((g?.communities || []).slice(0, 3));
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const hasAnything = contacts.length > 0 || communities.length > 0;

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-7 h-7 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your network, ready to search</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          A taste of what Nexo just indexed. Everything you import becomes searchable in natural language.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && contacts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From your network</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {contacts.slice(0, 6).map((c, i) => (
              <ContactPreview key={c.id ?? i} contact={c} />
            ))}
          </div>
        </div>
      )}

      {!loading && communities.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Communities you can join</p>
          </div>
          <div className="space-y-2">
            {communities.map((g) => <CommunityRow key={g.id} community={g} />)}
          </div>
        </div>
      )}

      {!loading && !hasAnything && (
        <div className="bg-gray-50 rounded-xl p-6 text-center mb-8">
          <p className="text-sm text-gray-600 mb-2">No contacts indexed yet.</p>
          <p className="text-xs text-gray-500">
            That's expected if the extension is still syncing. They'll show up on the dashboard within a minute.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-6 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onFinish}
          className="flex-1 py-3 px-6 bg-[#0047AB] text-white rounded-xl font-semibold text-sm hover:bg-[#003682] transition-colors inline-flex items-center justify-center gap-2"
        >
          Looks great <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ContactPreview({ contact }: { contact: any }) {
  const name = contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown';
  const sub = [contact.job_title, contact.company].filter(Boolean).join(' · ');
  const initials = name.split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-white">
      <div className="w-8 h-8 rounded-full bg-[#0047AB]/10 text-[#0047AB] text-xs font-bold flex items-center justify-center shrink-0">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">{name}</p>
        {sub && <p className="text-[11px] text-gray-500 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function CommunityRow({ community }: { community: any }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        {community.logo_url ? (
          <img src={community.logo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Building2 className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{community.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {community.member_count} members · {community.match?.auto_approve ? 'Auto-join' : 'Request to join'}
        </p>
      </div>
    </div>
  );
}

// ─── Step 6: Done ──────────────────────────────────────────────────────────

function DoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Check className="w-7 h-7 text-emerald-500" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">You're all set</h1>
      <p className="text-gray-500 mb-10 text-sm leading-relaxed">
        Nexo is indexing in the background. Head to the dashboard to start searching your network in natural language.
      </p>
      <button
        onClick={onFinish}
        className="w-full py-3 px-6 bg-[#0047AB] text-white rounded-xl font-semibold text-sm hover:bg-[#003682] transition-colors inline-flex items-center justify-center gap-2"
      >
        Go to dashboard <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
