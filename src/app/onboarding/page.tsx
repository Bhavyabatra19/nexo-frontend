"use client";

import { useEffect, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowRight, ArrowLeft, Check, X, Loader2, ShieldCheck, Linkedin, Users, Pencil,
    Sparkles, Building2, GraduationCap, Award, Languages as LanguagesIcon, Trophy,
    Quote, Activity, Link as LinkIcon, User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { profileService, groupsService, authService } from '@/services/api';
import { toast } from 'sonner';

// ─── Types (kept local — these aren't exported from api.ts on this branch) ──

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

const ONBOARDING_SKIPPED_KEY = 'nexo_onboarding_skipped';

type Step = 'welcome' | 'linkedin' | 'sections' | 'done';

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
    const [step, setStep] = useState<Step>('welcome');
    const [isLoading, setIsLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [profile, setProfile] = useState<ClaimedProfile | null>(null);
    const [sectionIdx, setSectionIdx] = useState(0);

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.replace('/');
            return;
        }
        (async () => {
            try {
                const me = await profileService.getMe().catch(() => null);
                if (me?.profile) setProfile(me.profile);
                const disc = await groupsService.listDiscoverable().catch(() => null);
                setSuggestions(disc?.communities || disc?.groups || []);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [router]);

    function handleSkipAll() {
        try { localStorage.setItem(ONBOARDING_SKIPPED_KEY, '1'); } catch { /* ignore */ }
        router.replace('/dashboard/contacts');
    }

    function finish() {
        try { localStorage.setItem(ONBOARDING_SKIPPED_KEY, '1'); } catch { /* ignore */ }
        router.replace('/dashboard/contacts');
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b border-border">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="text-sm font-semibold tracking-tight">Welcome to Nexo</div>
                    <button
                        onClick={handleSkipAll}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Skip setup →
                    </button>
                </div>
            </header>

            <main className="flex-1">
                <div className="max-w-3xl mx-auto px-6 py-10">
                    {step === 'welcome' && (
                        <WelcomeStep
                            suggestions={suggestions}
                            onContinue={() => setStep('linkedin')}
                        />
                    )}
                    {step === 'linkedin' && (
                        <LinkedinStep
                            existingProfile={profile}
                            onClaimed={(p) => { setProfile(p); setStep('sections'); }}
                            onSkip={() => setStep(profile ? 'sections' : 'done')}
                            onBack={() => setStep('welcome')}
                        />
                    )}
                    {step === 'sections' && profile && (
                        <SectionsStep
                            profile={profile}
                            currentIdx={sectionIdx}
                            onUpdateProfile={setProfile}
                            onAdvance={() => {
                                if (sectionIdx + 1 >= SECTIONS.length) setStep('done');
                                else setSectionIdx(sectionIdx + 1);
                            }}
                            onBack={() => {
                                if (sectionIdx === 0) setStep('linkedin');
                                else setSectionIdx(sectionIdx - 1);
                            }}
                            onFinish={() => setStep('done')}
                        />
                    )}
                    {step === 'done' && <DoneStep onContinue={finish} profile={profile} />}
                </div>
            </main>
        </div>
    );
}

function WelcomeStep({
    suggestions, onContinue,
}: {
    suggestions: Suggestion[];
    onContinue: () => void;
}) {
    const [joiningId, setJoiningId] = useState<string | null>(null);

    async function handleJoin(c: Suggestion) {
        setJoiningId(c.id);
        try {
            const res = await groupsService.requestJoin(c.id);
            if (res?.joined) {
                toast.success('Joined', { description: `Welcome to ${c.name}.` });
            } else if (res?.request) {
                toast.info('Request sent', { description: 'An admin will review your join request.' });
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Could not request to join';
            toast.error('Join failed', { description: message });
        } finally {
            setJoiningId(null);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Let&apos;s get you set up</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    A two-minute walkthrough so Nexo can pre-populate your profile and connect you with the right communities.
                </p>
            </div>

            {suggestions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            Communities you can join
                        </CardTitle>
                        <CardDescription>
                            We found {suggestions.length} {suggestions.length === 1 ? 'community' : 'communities'} that match your email domain.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {suggestions.map((c) => (
                            <div
                                key={c.id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors"
                            >
                                {c.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={c.logo_url} alt={c.name} className="w-10 h-10 rounded-md object-cover bg-muted shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                                        {c.name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{c.name}</div>
                                    {c.description && (
                                        <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleJoin(c)}
                                    disabled={joiningId === c.id}
                                >
                                    {joiningId === c.id && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                                    Join
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {suggestions.length === 0 && (
                <Card>
                    <CardContent className="py-6 text-sm text-muted-foreground">
                        No matching communities found for your email domain — that&apos;s okay, you can join one later via invite code.
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end">
                <Button onClick={onContinue}>
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}

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
            if (message.toLowerCase().includes('no matching contact')) {
                setNotFound(true);
            } else {
                toast.error('Claim failed', { description: message || 'Try again.' });
            }
        } finally {
            setIsClaiming(false);
        }
    }

    return (
        <div className="space-y-6">
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Connect your LinkedIn</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    If anyone has imported you into a community, we&apos;ll match it and pre-fill your profile.
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
        <div className="space-y-6">
            <ProgressBar current={currentIdx + 1} total={SECTIONS.length} />

            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <section.icon className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{section.label}</h1>
                    <p className="text-sm text-muted-foreground">
                        Step {currentIdx + 1} of {SECTIONS.length}
                    </p>
                </div>
                {status === 'verified' && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10">
                        <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                )}
                {status === 'incorrect' && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-destructive uppercase tracking-wider px-2 py-1 rounded bg-destructive/10">
                        <X className="w-3 h-3" /> Reported
                    </span>
                )}
            </div>

            <Card>
                <CardContent className="py-6">
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
                </CardContent>
            </Card>

            {!isEditing && (
                <div className="flex flex-wrap gap-2 justify-between">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onAdvance()}
                            disabled={isSaving}
                        >
                            Skip
                        </Button>
                        {section.key === 'basics' && (
                            <Button
                                variant="outline"
                                onClick={() => setIsEditing(true)}
                                disabled={isSaving}
                            >
                                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Update
                            </Button>
                        )}
                        {section.key !== 'basics' && (
                            <Button
                                variant="outline"
                                onClick={() => setStatus('incorrect')}
                                disabled={isSaving}
                            >
                                Looks wrong
                            </Button>
                        )}
                    </div>
                    <Button
                        onClick={() => setStatus('verified')}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                        Verify & next
                    </Button>
                </div>
            )}

            <div className="text-center text-xs text-muted-foreground">
                <button onClick={onFinish} className="underline hover:text-foreground">
                    Finish setup early
                </button>
            </div>
        </div>
    );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
    const pct = (current / total) * 100;
    return (
        <div className="space-y-1">
            <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="text-[10px] text-muted-foreground text-right">
                {current} / {total}
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
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Bio</div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                    </div>
                )}
            </div>
        );
    }

    const arr = arrayFor(profile, section);
    if (!arr || arr.length === 0) {
        return <p className="text-sm text-muted-foreground">No data on file. You can skip this section.</p>;
    }

    return (
        <ul className="space-y-3 text-sm">
            {arr.slice(0, 8).map((item: Record<string, unknown>, idx: number) => (
                <li key={idx} className="border-l-2 border-border pl-3">
                    <ItemRow item={item} section={section} />
                </li>
            ))}
            {arr.length > 8 && (
                <li className="text-xs text-muted-foreground">… and {arr.length - 8} more</li>
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
            {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
            {dates && <div className="text-muted-foreground/70 text-xs mt-0.5">{dates}</div>}
            {item.description ? (
                <p className="text-xs text-muted-foreground/80 mt-1 whitespace-pre-wrap line-clamp-3">
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
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="col-span-2 text-sm">{value || <span className="text-muted-foreground/60">—</span>}</div>
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
                >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save & verify
                </Button>
            </div>
        </div>
    );
}

function DoneStep({ onContinue, profile }: { onContinue: () => void; profile: ClaimedProfile | null }) {
    const verifiedCount = profile
        ? Object.values(profile.section_verification || {}).filter((v) => v === 'verified').length
        : 0;

    return (
        <div className="space-y-6 text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Check className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">You&apos;re all set</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    {verifiedCount > 0
                        ? `${verifiedCount} ${verifiedCount === 1 ? 'section' : 'sections'} verified. You can edit anything later from your profile.`
                        : 'You can fill out your profile any time from the dashboard.'}
                </p>
            </div>
            <Button onClick={onContinue}>
                Go to dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </div>
    );
}
