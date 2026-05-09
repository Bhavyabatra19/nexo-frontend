"use client";

import React, { useEffect, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import {
    Linkedin, Mail, Twitter, Instagram, Sparkles, Check, X, Bell, Download,
    ArrowRight, ArrowLeft, Loader2, Users, Building2, ShieldCheck, Pencil,
    GraduationCap, Award, Languages as LanguagesIcon, Trophy,
    Quote, Activity, Link as LinkIcon, User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
    authService, contactsService, groupsService, profileService,
} from '@/services/api';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
const EXT_DOWNLOAD = `${API_BASE?.replace('/api', '')}/public/nexo-extension.zip`;

const STATE_KEY   = 'nexo_onboarding_state';
const SKIPPED_KEY = 'nexo_onboarding_skipped';

// ─── Step ordering (Connect-first, Verify-after) ────────────────────────────
const STEP_ORDER = [
    'welcome', 'connect', 'extension', 'sync', 'linkedin', 'sections', 'done',
] as const;
type Step = typeof STEP_ORDER[number];

type Role = 'founder' | 'recruiter' | 'sales' | 'investor' | 'other';

type SectionStatus = 'verified' | 'incorrect' | null;
type ProfileSection =
    | 'basics' | 'work' | 'education' | 'skills' | 'languages'
    | 'certifications' | 'honors' | 'recommendations' | 'activity' | 'links';

type ClaimedProfile = {
    id: string;
    full_name: string | null;
    email: string | null;
    linkedin_url: string | null;
    bio: string | null;
    job_title: string | null;
    company: string | null;
    address: string | null;
    photo_url: string | null;
    skills: unknown;
    experience: unknown;
    education: unknown;
    languages: unknown;
    certifications: unknown;
    honors_and_awards: unknown;
    recommendations: unknown;
    recent_activity: unknown;
    bio_links: unknown;
    section_verification: Partial<Record<ProfileSection, SectionStatus>>;
    is_self_verified: boolean;
};

type Suggestion = {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    member_count?: number;
    match?: { rule_type?: string; pattern?: string; auto_approve?: boolean };
};

type PersistedState = {
    step: Step;
    role: Role | null;
    notifyConnectors: string[];
    sectionIdx: number;
};

const DEFAULT_STATE: PersistedState = {
    step: 'welcome', role: null, notifyConnectors: [], sectionIdx: 0,
};

function loadState(): PersistedState {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
        const raw = localStorage.getItem(STATE_KEY);
        if (!raw) return DEFAULT_STATE;
        return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch { return DEFAULT_STATE; }
}

function saveState(s: PersistedState) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const SECTIONS: { key: ProfileSection; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { key: 'basics',          label: 'Basic info',     icon: User },
    { key: 'work',            label: 'Work history',   icon: Building2 },
    { key: 'education',       label: 'Education',      icon: GraduationCap },
    { key: 'skills',          label: 'Skills',         icon: Sparkles },
    { key: 'languages',       label: 'Languages',      icon: LanguagesIcon },
    { key: 'certifications',  label: 'Certifications', icon: Award },
    { key: 'honors',          label: 'Honors',         icon: Trophy },
    { key: 'recommendations', label: 'Recommendations',icon: Quote },
    { key: 'activity',        label: 'Recent activity',icon: Activity },
    { key: 'links',           label: 'Links',          icon: LinkIcon },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
    const [hydrated, setHydrated] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [profile, setProfile] = useState<ClaimedProfile | null>(null);

    useEffect(() => {
        if (!authService.isAuthenticated()) { router.push('/'); return; }
        setState(loadState());
        setHydrated(true);
        // Surface a previously-claimed profile + email-domain community matches.
        Promise.all([
            profileService.getMe().catch(() => null),
            groupsService.listDiscoverable().catch(() => null),
        ]).then(([me, disc]: [unknown, unknown]) => {
            const meRes = me as { profile?: ClaimedProfile } | null;
            if (meRes?.profile) setProfile(meRes.profile);
            const discRes = disc as { communities?: Suggestion[]; groups?: Suggestion[] } | null;
            setSuggestions(discRes?.communities || discRes?.groups || []);
        });
    }, [router]);

    useEffect(() => { if (hydrated) saveState(state); }, [state, hydrated]);

    function go(step: Step) { setState((s) => ({ ...s, step })); }
    function setSectionIdx(i: number) { setState((s) => ({ ...s, sectionIdx: i })); }

    function finish() {
        try {
            localStorage.removeItem(STATE_KEY);
            localStorage.setItem(SKIPPED_KEY, '1');
        } catch { /* ignore */ }
        router.push('/dashboard/contacts');
    }

    function skipAll() {
        try { localStorage.setItem(SKIPPED_KEY, '1'); } catch { /* ignore */ }
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
        <div className="min-h-screen bg-white flex flex-col items-center px-4 py-8">
            <div className="w-full max-w-lg flex items-center justify-between mb-6">
                <ProgressDots current={stepIdx} total={STEP_ORDER.length} />
                <button
                    onClick={skipAll}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                    Skip setup →
                </button>
            </div>

            <div className="w-full max-w-lg">
                {state.step === 'welcome' && (
                    <WelcomeStep
                        role={state.role}
                        suggestions={suggestions}
                        onPick={(r) => setState((s) => ({ ...s, role: r }))}
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
                        onBack={() => go('welcome')}
                        onLinkedIn={() => go('extension')}
                    />
                )}

                {state.step === 'extension' && (
                    <ExtensionStep onNext={() => go('sync')} onBack={() => go('connect')} />
                )}

                {state.step === 'sync' && (
                    <SyncStep onNext={() => go('linkedin')} onBack={() => go('extension')} />
                )}

                {state.step === 'linkedin' && (
                    <LinkedinStep
                        existingProfile={profile}
                        onClaimed={(p) => { setProfile(p); go('sections'); }}
                        onSkip={() => go(profile ? 'sections' : 'done')}
                        onBack={() => go('sync')}
                    />
                )}

                {state.step === 'sections' && profile && (
                    <SectionsStep
                        profile={profile}
                        currentIdx={state.sectionIdx}
                        onUpdateProfile={setProfile}
                        onAdvance={() => {
                            if (state.sectionIdx + 1 >= SECTIONS.length) go('done');
                            else setSectionIdx(state.sectionIdx + 1);
                        }}
                        onBack={() => {
                            if (state.sectionIdx === 0) go('linkedin');
                            else setSectionIdx(state.sectionIdx - 1);
                        }}
                        onFinish={() => go('done')}
                    />
                )}

                {/* Sections step requires a claimed profile — if user landed here without one,
                    auto-bounce to the LinkedIn step. */}
                {state.step === 'sections' && !profile && (
                    <LinkedinStep
                        existingProfile={null}
                        onClaimed={(p) => { setProfile(p); /* stay on sections */ }}
                        onSkip={() => go('done')}
                        onBack={() => go('sync')}
                    />
                )}

                {state.step === 'done' && <DoneStep profile={profile} onFinish={finish} />}
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
                        i === current ? 'w-8 bg-[#0047AB]'
                            : i < current ? 'w-1.5 bg-[#0047AB]/40'
                            : 'w-1.5 bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );
}

// ─── Step 1: Welcome (role + community suggestions) ─────────────────────────

function WelcomeStep({
    role, suggestions, onPick, onContinue,
}: {
    role: Role | null;
    suggestions: Suggestion[];
    onPick: (r: Role) => void;
    onContinue: () => void;
}) {
    const roles: { id: Role; label: string; sub: string }[] = [
        { id: 'founder',   label: 'Founder',         sub: 'fundraising, hiring, intros' },
        { id: 'recruiter', label: 'Recruiter',       sub: 'sourcing, candidate outreach' },
        { id: 'sales',     label: 'Sales',           sub: 'warm intros, prospect research' },
        { id: 'investor',  label: 'Investor',        sub: 'deal flow, founder discovery' },
        { id: 'other',     label: 'Something else',  sub: 'general networking' },
    ];

    return (
        <div className="text-center">
            <div className="w-14 h-14 bg-[#0047AB]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-7 h-7 text-[#0047AB]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Nexo</h1>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                Search your network with AI. First — what brings you here? We&apos;ll tune the experience.
            </p>

            <div className="grid grid-cols-1 gap-2 mb-6 text-left">
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

            {suggestions.length > 0 && (
                <div className="text-left bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 mb-8">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> {suggestions.length} matching {suggestions.length === 1 ? 'community' : 'communities'}
                    </p>
                    <p className="text-xs text-emerald-700/80 mb-3">
                        We found communities that match your email domain. You can join them after the walkthrough.
                    </p>
                    <ul className="space-y-1.5">
                        {suggestions.slice(0, 3).map((c) => (
                            <li key={c.id} className="text-xs text-gray-700 flex items-center gap-2">
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate">{c.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

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

// ─── Step 2: Connector grid ─────────────────────────────────────────────────

type Connector = {
    id: string;
    name: string;
    blurb: string;
    icon: React.ReactNode;
    brand: string;
    status: 'active' | 'soon';
};

const CONNECTORS: Connector[] = [
    { id: 'linkedin',  name: 'LinkedIn',          blurb: 'Capture connections + work history via the Nexo extension.', icon: <Linkedin className="w-5 h-5" />,  brand: '#0A66C2', status: 'active' },
    { id: 'google',    name: 'Google Contacts',   blurb: 'Sync your Google address book + Gmail correspondents.',     icon: <Mail className="w-5 h-5" />,      brand: '#EA4335', status: 'soon' },
    { id: 'twitter',   name: 'X (Twitter)',       blurb: 'Pull in followers, mutuals, and DM contacts.',                icon: <Twitter className="w-5 h-5" />,   brand: '#000000', status: 'soon' },
    { id: 'instagram', name: 'Instagram',         blurb: 'Mutuals + people you message regularly.',                     icon: <Instagram className="w-5 h-5" />, brand: '#E1306C', status: 'soon' },
];

function ConnectStep({
    notifyConnectors, onToggleNotify, onLinkedIn, onBack,
}: {
    notifyConnectors: string[];
    onToggleNotify: (id: string) => void;
    onLinkedIn: () => void;
    onBack: () => void;
}) {
    return (
        <div>
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect your network</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                    The more sources you plug in, the better Nexo gets at finding the right person. Start with LinkedIn — the rest are coming soon.
                </p>
            </div>

            <div className="space-y-3 mb-6">
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

            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    ← Back
                </button>
                <button
                    onClick={onLinkedIn}
                    className="flex-1 py-3 px-6 bg-[#0047AB] text-white rounded-xl font-semibold text-sm hover:bg-[#003682] transition-colors inline-flex items-center justify-center gap-2"
                >
                    Continue with LinkedIn <ArrowRight className="w-4 h-4" />
                </button>
            </div>
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
                    {notifyEnabled ? "We'll let you know" : 'Notify me'}
                </button>
            )}
        </div>
    );
}

// ─── Step 3: Install extension ──────────────────────────────────────────────

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

// ─── Step 4: Sync ───────────────────────────────────────────────────────────

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
            setError("Sync didn't kick off — you can run it later from the dashboard.");
        } finally {
            setSyncing(false);
        }
    }

    return (
        <div className="text-center">
            <div className="w-14 h-14 bg-[#0A66C2]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Linkedin className="w-7 h-7 text-[#0A66C2]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Populate your CRM</h1>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                Open LinkedIn, click the Nexo extension, hit <strong>Sync now</strong>. Or kick off a backend enrichment of contacts you&apos;ve already captured.
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

// ─── Step 5: LinkedIn URL → claim ───────────────────────────────────────────

function LinkedinStep({
    existingProfile, onClaimed, onSkip, onBack,
}: {
    existingProfile: ClaimedProfile | null;
    onClaimed: (p: ClaimedProfile) => void;
    onSkip: () => void;
    onBack: () => void;
}) {
    const [url, setUrl] = useState(existingProfile?.linkedin_url || '');
    const [isClaiming, setIsClaiming] = useState(false);
    const [notFound, setNotFound] = useState(false);

    async function handleClaim() {
        const trimmed = url.trim();
        if (!trimmed) return;
        setIsClaiming(true);
        setNotFound(false);
        try {
            const res = await profileService.claim(trimmed);
            if (res?.success && res.profile) {
                toast.success('Profile matched', { description: 'We pre-filled your profile from existing data.' });
                onClaimed(res.profile);
            } else {
                setNotFound(true);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : '';
            if (message.toLowerCase().includes('no matching contact')) setNotFound(true);
            else toast.error('Claim failed', { description: message || 'Try again.' });
        } finally {
            setIsClaiming(false);
        }
    }

    return (
        <div>
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="text-center mb-8">
                <div className="w-14 h-14 bg-[#0A66C2]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Linkedin className="w-7 h-7 text-[#0A66C2]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim your profile</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                    If anyone has imported you into a community, we&apos;ll match you and pre-fill your own profile.
                </p>
            </div>

            <Card>
                <CardContent className="py-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium flex items-center gap-1.5">
                            <Linkedin className="w-3.5 h-3.5" /> LinkedIn profile URL
                        </label>
                        <Input
                            placeholder="https://www.linkedin.com/in/your-handle"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleClaim(); }}
                            autoFocus
                        />
                    </div>

                    {notFound && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
                            No matching profile found in any community you&apos;re a member of. You can still continue and we&apos;ll set up your profile from scratch.
                        </div>
                    )}

                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={onSkip}>
                            Skip
                        </Button>
                        <Button onClick={handleClaim} disabled={!url.trim() || isClaiming}>
                            {isClaiming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Match my profile <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Step 6: Section walkthrough ────────────────────────────────────────────

function SectionsStep({
    profile, currentIdx, onUpdateProfile, onAdvance, onBack, onFinish,
}: {
    profile: ClaimedProfile;
    currentIdx: number;
    onUpdateProfile: (p: ClaimedProfile) => void;
    onAdvance: () => void;
    onBack: () => void;
    onFinish: () => void;
}) {
    const section = SECTIONS[currentIdx];
    const status: SectionStatus = (profile.section_verification?.[section.key] as SectionStatus) ?? null;
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    async function setStatus(newStatus: SectionStatus, overrides?: Record<string, unknown>) {
        setIsSaving(true);
        try {
            const res = await profileService.verifySection(section.key, newStatus, overrides);
            if (res?.profile) onUpdateProfile(res.profile);
            onAdvance();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Update failed';
            toast.error('Could not save', { description: message });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="space-y-5">
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0047AB]/10 flex items-center justify-center text-[#0047AB]">
                    <section.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-semibold text-gray-900">{section.label}</h1>
                    <p className="text-xs text-gray-500">
                        Section {currentIdx + 1} of {SECTIONS.length}
                    </p>
                </div>
                {status === 'verified' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 uppercase tracking-wider px-2 py-1 rounded bg-emerald-100">
                        <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                )}
                {status === 'incorrect' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 uppercase tracking-wider px-2 py-1 rounded bg-red-100">
                        <X className="w-3 h-3" /> Reported
                    </span>
                )}
            </div>

            <div className="border-2 border-gray-100 rounded-xl p-5">
                {isEditing && section.key === 'basics' ? (
                    <BasicsEditor
                        profile={profile}
                        saving={isSaving}
                        onCancel={() => setIsEditing(false)}
                        onSave={async (overrides) => {
                            await setStatus('verified', overrides);
                            setIsEditing(false);
                        }}
                    />
                ) : (
                    <SectionPreview profile={profile} section={section.key} />
                )}
            </div>

            {!isEditing && (
                <div className="flex flex-wrap gap-2 justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onAdvance()} disabled={isSaving}>
                            Skip
                        </Button>
                        {section.key === 'basics' && (
                            <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isSaving}>
                                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Update
                            </Button>
                        )}
                        {section.key !== 'basics' && (
                            <Button variant="outline" onClick={() => setStatus('incorrect')} disabled={isSaving}>
                                Looks wrong
                            </Button>
                        )}
                    </div>
                    <Button onClick={() => setStatus('verified')} disabled={isSaving} className="bg-[#0047AB] hover:bg-[#003682]">
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                        Verify & next
                    </Button>
                </div>
            )}

            <div className="text-center">
                <button onClick={onFinish} className="text-xs text-gray-400 hover:text-gray-600 underline">
                    Finish setup early
                </button>
            </div>
        </div>
    );
}

function SectionPreview({ profile, section }: { profile: ClaimedProfile; section: ProfileSection }) {
    if (section === 'basics') {
        return (
            <div className="space-y-3 text-sm">
                <Field label="Name"      value={profile.full_name} />
                <Field label="Job title" value={profile.job_title} />
                <Field label="Company"   value={profile.company} />
                <Field label="Location"  value={profile.address} />
                {profile.bio && (
                    <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Bio</div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                    </div>
                )}
            </div>
        );
    }

    const arr = arrayFor(profile, section);
    if (!arr || arr.length === 0) {
        return <p className="text-sm text-gray-500">No data on file. You can skip this section.</p>;
    }

    return (
        <ul className="space-y-3 text-sm">
            {arr.slice(0, 8).map((item: Record<string, unknown>, idx: number) => (
                <li key={idx} className="border-l-2 border-gray-200 pl-3">
                    <ItemRow item={item} section={section} />
                </li>
            ))}
            {arr.length > 8 && (
                <li className="text-xs text-gray-500">… and {arr.length - 8} more</li>
            )}
        </ul>
    );
}

function arrayFor(profile: ClaimedProfile, section: ProfileSection): Record<string, unknown>[] | null {
    const map: Record<ProfileSection, unknown> = {
        basics: null,
        work: profile.experience,
        education: profile.education,
        skills: profile.skills,
        languages: profile.languages,
        certifications: profile.certifications,
        honors: profile.honors_and_awards,
        recommendations: profile.recommendations,
        activity: profile.recent_activity,
        links: profile.bio_links,
    };
    const v = map[section];
    return Array.isArray(v) ? (v as Record<string, unknown>[]) : null;
}

function ItemRow({ item, section }: { item: Record<string, unknown>; section: ProfileSection }) {
    if (section === 'skills') {
        return <span className="font-medium">{String(item.title || item.name || item)}</span>;
    }
    const title = String(item.title || item.school || item.name || '');
    const sub   = String(item.company || item.degree || item.field || item.issuer || item.publisher || item.author || '');
    const dates = formatDates(item);
    return (
        <div>
            {title && <div className="font-medium">{title}</div>}
            {sub && <div className="text-gray-500 text-xs">{sub}</div>}
            {dates && <div className="text-gray-400 text-xs mt-0.5">{dates}</div>}
            {item.description ? (
                <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-3">
                    {String(item.description)}
                </p>
            ) : null}
        </div>
    );
}

function formatDates(item: Record<string, unknown>): string {
    const start = item.start || item.start_date || item.start_year || item.issued || '';
    const end   = item.end   || item.end_date   || item.end_year   || '';
    if (!start && !end) return '';
    if (!end || item.current) return `${start} — Present`;
    return `${start} — ${end}`;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div className="grid grid-cols-3 gap-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
            <div className="col-span-2 text-sm">{value || <span className="text-gray-400">—</span>}</div>
        </div>
    );
}

function BasicsEditor({
    profile, saving, onCancel, onSave,
}: {
    profile: ClaimedProfile;
    saving: boolean;
    onCancel: () => void;
    onSave: (overrides: Record<string, unknown>) => void | Promise<void>;
}) {
    const [bio, setBio] = useState(profile.bio || '');
    const [jobTitle, setJobTitle] = useState(profile.job_title || '');
    const [company, setCompany] = useState(profile.company || '');
    const [address, setAddress] = useState(profile.address || '');

    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-xs font-medium">Job title</label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium">Company</label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium">Location</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium">Bio</label>
                <Textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button
                    onClick={() => onSave({
                        bio: bio.trim() || null,
                        job_title: jobTitle.trim() || null,
                        company: company.trim() || null,
                        address: address.trim() || null,
                    })}
                    disabled={saving}
                    className="bg-[#0047AB] hover:bg-[#003682]"
                >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save & verify
                </Button>
            </div>
        </div>
    );
}

// ─── Step 7: Done ───────────────────────────────────────────────────────────

function DoneStep({ profile, onFinish }: { profile: ClaimedProfile | null; onFinish: () => void }) {
    const verifiedCount = profile
        ? Object.values(profile.section_verification || {}).filter((v) => v === 'verified').length
        : 0;

    return (
        <div className="text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Check className="w-7 h-7 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">You&apos;re all set</h1>
            <p className="text-gray-500 mb-3 text-sm leading-relaxed">
                Nexo is indexing your network in the background. Head to the dashboard to start searching in natural language.
            </p>
            {verifiedCount > 0 && (
                <p className="text-xs text-emerald-700 mb-10 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {verifiedCount} profile {verifiedCount === 1 ? 'section' : 'sections'} verified
                </p>
            )}
            {!verifiedCount && <div className="mb-10" />}
            <button
                onClick={onFinish}
                className="w-full py-3 px-6 bg-[#0047AB] text-white rounded-xl font-semibold text-sm hover:bg-[#003682] transition-colors inline-flex items-center justify-center gap-2"
            >
                Go to dashboard <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
}
