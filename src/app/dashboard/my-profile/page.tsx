"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { profileService } from '@/services/api';
import { Loader2, Linkedin, CheckCircle2, XCircle, AlertCircle, ShieldCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type SectionStatus = 'verified' | 'incorrect' | null | undefined;

type Section = {
  key: string;
  label: string;
  description: string;
  hasData: (p: any) => boolean;
  render: (p: any) => React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    key: 'basics',
    label: 'Basics',
    description: 'Name, headline, current role, bio, location, photo',
    hasData: p => !!(p?.full_name || p?.bio || p?.job_title || p?.company || p?.photo_url),
    render: p => (
      <div className="flex gap-4 items-start">
        {p.photo_url && (
          <img src={p.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="font-semibold">{p.full_name || `${p.first_name || ''} ${p.last_name || ''}`}</div>
          <div className="text-sm text-muted-foreground">
            {p.job_title}{p.job_title && p.company ? ' at ' : ''}{p.company}
          </div>
          {p.bio && <p className="text-xs text-muted-foreground/90 leading-relaxed line-clamp-3">{p.bio}</p>}
          {p.address && <div className="text-xs text-muted-foreground/70">{p.address}</div>}
        </div>
      </div>
    ),
  },
  {
    key: 'work',
    label: 'Work history',
    description: 'Past roles and companies',
    hasData: p => Array.isArray(p?.experience) && p.experience.length > 0,
    render: p => (
      <ul className="space-y-2 text-sm">
        {(p.experience || []).map((e: any, i: number) => (
          <li key={i} className="border-l-2 border-border pl-3">
            <div className="font-medium">{e.title}{e.company ? ` · ${e.company}` : ''}</div>
            <div className="text-xs text-muted-foreground">{e.start || ''}{e.end ? ' – ' + e.end : ''}</div>
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'education',
    label: 'Education',
    description: 'Schools and degrees',
    hasData: p => Array.isArray(p?.education) && p.education.length > 0,
    render: p => (
      <ul className="space-y-2 text-sm">
        {(p.education || []).map((e: any, i: number) => (
          <li key={i} className="border-l-2 border-border pl-3">
            <div className="font-medium">{e.school || <span className="italic text-muted-foreground/70">School not provided</span>}</div>
            <div className="text-xs text-muted-foreground">
              {[e.degree, e.field].filter(Boolean).join(' · ')}
              {e.start || e.end ? ` · ${e.start || ''}${e.end ? '-' + e.end : ''}` : ''}
            </div>
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'skills',
    label: 'Skills',
    description: 'Areas of expertise',
    hasData: p => Array.isArray(p?.skills) && p.skills.length > 0,
    render: p => (
      <div className="flex flex-wrap gap-1.5">
        {(p.skills || []).map((s: string, i: number) => (
          <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-secondary">{s}</span>
        ))}
      </div>
    ),
  },
  {
    key: 'languages',
    label: 'Languages',
    description: 'Languages and proficiency',
    hasData: p => Array.isArray(p?.languages) && p.languages.length > 0,
    render: p => (
      <ul className="text-sm space-y-1">
        {(p.languages || []).map((l: any, i: number) => (
          <li key={i}><span className="font-medium">{l.title}</span>{l.proficiency ? ` · ${l.proficiency}` : ''}</li>
        ))}
      </ul>
    ),
  },
  {
    key: 'certifications',
    label: 'Certifications',
    description: 'Issued credentials',
    hasData: p => Array.isArray(p?.certifications) && p.certifications.length > 0,
    render: p => (
      <ul className="space-y-2 text-sm">
        {(p.certifications || []).map((c: any, i: number) => (
          <li key={i}>
            <div className="font-medium">{c.title}</div>
            <div className="text-xs text-muted-foreground">{c.issuer}{c.issued ? ` · ${c.issued}` : ''}</div>
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'honors',
    label: 'Honors & awards',
    description: 'Awards and recognitions',
    hasData: p => Array.isArray(p?.honors_and_awards) && p.honors_and_awards.length > 0,
    render: p => (
      <ul className="space-y-2 text-sm">
        {(p.honors_and_awards || []).map((h: any, i: number) => (
          <li key={i}>
            <div className="font-medium">{h.title}</div>
            <div className="text-xs text-muted-foreground">{h.issuer}{h.issued ? ` · ${h.issued}` : ''}</div>
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'recommendations',
    label: 'Recommendations',
    description: 'Endorsements and testimonials',
    hasData: p => Array.isArray(p?.recommendations) && p.recommendations.length > 0,
    render: p => (
      <ul className="space-y-2 text-sm">
        {(p.recommendations || []).slice(0, 3).map((r: any, i: number) => (
          <li key={i} className="border-l-2 border-border pl-3 text-muted-foreground/90 line-clamp-3">{r.text}</li>
        ))}
      </ul>
    ),
  },
  {
    key: 'activity',
    label: 'Recent activity',
    description: 'Recent posts, likes, and comments',
    hasData: p => Array.isArray(p?.recent_activity) && p.recent_activity.length > 0,
    render: p => (
      <ul className="space-y-1 text-sm">
        {(p.recent_activity || []).slice(0, 5).map((a: any, i: number) => (
          <li key={i} className="text-xs">
            <span className="text-muted-foreground/70 mr-1">{a.interaction || ''}</span>
            <span>{a.title}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'links',
    label: 'Links, projects & publications',
    description: 'External links, projects, publications, courses, patents',
    hasData: p =>
      (p?.bio_links?.length || 0) +
      (p?.projects?.length || 0) +
      (p?.publications?.length || 0) +
      (p?.courses?.length || 0) +
      (p?.patents?.length || 0) > 0,
    render: p => (
      <div className="space-y-3 text-sm">
        {p.bio_links?.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Links</div>
            <div className="flex flex-wrap gap-1.5">
              {p.bio_links.map((l: any, i: number) => (
                <a key={i} href={l.url} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-xs">{l.title || l.url}</a>
              ))}
            </div>
          </div>
        )}
        {p.projects?.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Projects</div>
            <ul className="space-y-1">{p.projects.slice(0, 5).map((x: any, i: number) => <li key={i} className="text-xs">{x.title}</li>)}</ul>
          </div>
        )}
        {p.publications?.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Publications</div>
            <ul className="space-y-1">{p.publications.map((x: any, i: number) => <li key={i} className="text-xs">{x.title}{x.publisher ? ` · ${x.publisher}` : ''}</li>)}</ul>
          </div>
        )}
      </div>
    ),
  },
];

export default function MyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ user: any; profile: any | null } | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await profileService.getMe();
        if (alive) setMe({ user: r.user, profile: r.profile });
      } catch (e: any) {
        toast({ title: 'Failed to load profile', description: e.message, variant: 'destructive' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [toast]);

  const profile = me?.profile;
  const sv: Record<string, SectionStatus> = useMemo(() => profile?.section_verification || {}, [profile]);
  const verifiedCount = useMemo(() => Object.values(sv).filter(v => v === 'verified').length, [sv]);

  async function handleClaim() {
    if (!linkedinUrl) return;
    setBusy(true);
    try {
      const r = await profileService.claim(linkedinUrl);
      setMe(prev => prev ? { ...prev, profile: r.profile } : prev);
      toast({ title: 'Profile claimed', description: 'You can now mark sections as verified or incorrect.' });
    } catch (e: any) {
      toast({ title: 'Claim failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function setSection(section: string, status: SectionStatus) {
    setBusy(true);
    try {
      const r = await profileService.verifySection(section, status === undefined ? null : status);
      setMe(prev => prev ? { ...prev, profile: r.profile } : prev);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">My profile</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            We auto-discover public LinkedIn data. Mark each section as correct or incorrect to build a verified
            profile — search results from your network will trust your verified info instead of the public scrape.
          </p>
        </header>

        {!profile ? (
          <div className="glass-card p-6 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Linkedin className="w-4 h-4 text-primary" />
              <span className="font-medium">Claim your profile</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste your LinkedIn URL. We'll match it to scraped data we have on you (or your account email) so you can
              verify it.
            </p>
            <div className="flex gap-2">
              <Input
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/your-handle"
                className="flex-1"
              />
              <Button onClick={handleClaim} disabled={busy || !linkedinUrl}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-4 glass-card rounded-xl text-sm">
              {profile.is_self_verified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {profile.is_self_verified
                    ? `Profile partially verified — ${verifiedCount} of ${SECTIONS.length} sections confirmed`
                    : 'No sections verified yet'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Until you mark sections, network scan results will tag this profile as a public footprint.
                </div>
              </div>
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                  LinkedIn <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="space-y-3">
              {SECTIONS.map(s => {
                const status = sv[s.key];
                const has = s.hasData(profile);
                return (
                  <section key={s.key} className="glass-card p-4 rounded-xl space-y-3">
                    <header className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold">{s.label}</h3>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSection(s.key, status === 'verified' ? null : 'verified')}
                          disabled={busy || !has}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                            status === 'verified'
                              ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                              : 'border-border hover:bg-secondary'
                          } ${!has ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Correct
                        </button>
                        <button
                          onClick={() => setSection(s.key, status === 'incorrect' ? null : 'incorrect')}
                          disabled={busy || !has}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                            status === 'incorrect'
                              ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                              : 'border-border hover:bg-secondary'
                          } ${!has ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <XCircle className="w-3 h-3" /> Incorrect
                        </button>
                      </div>
                    </header>
                    <div className={!has ? 'opacity-50' : ''}>
                      {has ? s.render(profile) : (
                        <div className="text-xs text-muted-foreground italic">No data found for this section.</div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
