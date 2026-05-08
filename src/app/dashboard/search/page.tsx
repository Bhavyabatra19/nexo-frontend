"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, Users, Globe, Building2, MapPin, ArrowRight, Sparkles, UserCheck, Mic, ChevronDown } from 'lucide-react';
import { groupsService, searchService } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import IntroRequestModal from '@/components/IntroRequestModal';
import { ChannelPill, type Channel } from '@/components/ChannelPill';
import { ChannelToggleRow } from '@/components/nexo/ChannelToggleRow';
import { Pill } from '@/components/nexo/Pill';
import { NexoAvatar } from '@/components/nexo/NexoAvatar';

const ALL_CHANNELS: Channel[] = ['own', 'community', 'public', 'friends'];
const CHANNEL_GROUP_LABEL: Record<Channel, string> = {
  own: 'From your network',
  community: 'Via communities',
  public: 'Via public',
  friends: 'Via friends',
};

type SearchScope = 'personal' | 'group' | 'all';

interface SearchResult {
  id: string;
  full_name: string;
  job_title?: string;
  company?: string;
  photo_url?: string;
  connection_tier?: string;
  confidence_score?: number;
  confidence_label?: string;
  enrichment_status?: string;
  ranking_score?: number;
  is_own?: boolean;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  via?: { owner_id: string; owner_name: string };
  intro_paths?: any[];
  intro_quality?: string;
  location?: string;
}

function ConfidenceDot({ score }: { score?: number }) {
  if (!score) return null;
  const color = score >= 0.7 ? 'bg-green-500' : score >= 0.4 ? 'bg-yellow-500' : 'bg-gray-400';
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full shrink-0', color)}
      title={`Confidence: ${Math.round((score || 0) * 100)}%`}
    />
  );
}

function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return null;
  const config: Record<string, { label: string; cls: string }> = {
    close:        { label: 'Close',        cls: 'bg-purple-100 text-purple-700 border-purple-200' },
    acquaintance: { label: 'Acquaintance', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    social:       { label: 'Social',       cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  };
  const c = config[tier] || config.social;
  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', c.cls)}>
      {c.label}
    </span>
  );
}

// Derive the brief's 4-channel taxonomy from existing search-result signals.
// Refine when the backend ships a first-class `channel` field.
function deriveChannel(result: SearchResult, scope: SearchScope): Channel {
  if (result.is_own) return 'own';
  if (scope === 'group' || scope === 'all') return 'community';
  if (result.via) return 'community';
  return 'public';
}

function ResultCard({
  result,
  scope,
  showChannelPill = true,
  onRequestIntro,
}: {
  result: SearchResult;
  scope: SearchScope;
  showChannelPill?: boolean;
  onRequestIntro: (r: SearchResult) => void;
}) {
  const channel = deriveChannel(result, scope);
  return (
    <div className="flex items-start gap-3 p-4 border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
      <NexoAvatar name={result.full_name} photoUrl={result.photo_url} size={40} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{result.full_name}</span>
          {showChannelPill && <ChannelPill channel={channel} />}
          <ConfidenceDot score={result.confidence_score} />
          {result.is_own && <TierBadge tier={result.connection_tier} />}
        </div>

        {(result.job_title || result.company) && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {result.job_title}
            {result.job_title && result.company ? ' · ' : ''}
            {result.company}
          </p>
        )}

        {result.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {result.location}
          </p>
        )}

        {!result.is_own && result.via && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCheck className="w-3 h-3 shrink-0" />
            <span>
              Via <span className="font-medium text-foreground">{result.via.owner_name}</span>
            </span>
            {result.intro_quality && result.intro_quality !== 'none' && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] h-4 px-1',
                  result.intro_quality === 'strong' ? 'border-green-300 text-green-700' :
                  result.intro_quality === 'medium' ? 'border-blue-300 text-blue-700' : ''
                )}
              >
                {result.intro_quality} path
              </Badge>
            )}
          </div>
        )}

        {result.is_own && result.linkedin_url && (
          <a
            href={result.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-1 inline-block"
          >
            LinkedIn ↗
          </a>
        )}
      </div>

      {!result.is_own && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-xs h-8 gap-1"
          onClick={() => onRequestIntro(result)}
        >
          <ArrowRight className="w-3 h-3" />
          Intro
        </Button>
      )}
    </div>
  );
}

type ViewMode = 'grouped' | 'unified';

function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>(
    (searchParams.get('scope') as SearchScope) || 'personal'
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    searchParams.get('group_id') || ''
  );
  const [introTarget, setIntroTarget] = useState<SearchResult | null>(null);
  const [activeChannels, setActiveChannels] = useState<Channel[]>(ALL_CHANNELS);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get('scope') === 'group' || searchParams.get('group_id')) {
      inputRef.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.listGroups(),
  });
  const groups = groupsData?.groups || [];

  const { data: searchData, isLoading, isFetching } = useQuery({
    queryKey: ['search', submittedQuery, scope, selectedGroupId],
    queryFn: () => searchService.search(submittedQuery, scope, selectedGroupId || undefined),
    enabled: submittedQuery.length >= 2,
  });

  const results: SearchResult[] = searchData?.results || [];
  const elapsed = searchData?.elapsed_ms;

  const counts = results.reduce<Record<Channel, number>>(
    (acc, r) => {
      const ch = deriveChannel(r, scope);
      acc[ch] = (acc[ch] || 0) + 1;
      return acc;
    },
    { own: 0, community: 0, public: 0, friends: 0 },
  );
  const filteredResults = results.filter((r) => activeChannels.includes(deriveChannel(r, scope)));
  const totalVisible = filteredResults.length;

  const toggleChannel = (c: Channel) => {
    setActiveChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const handleSearch = useCallback(() => {
    if (query.trim().length >= 2) setSubmittedQuery(query.trim());
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const scopeOptions = [
    { value: 'personal' as SearchScope, label: 'My Network', icon: Users },
    ...(groups.length > 0 ? [{ value: 'group' as SearchScope, label: 'Group', icon: Building2 }] : []),
    ...(groups.length > 1 ? [{ value: 'all' as SearchScope, label: 'All Groups', icon: Globe }] : []),
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[880px] mx-auto px-6 md:px-12 py-10">
          {!submittedQuery && (
            <div className="mb-4">
              <h1 className="text-[34px] leading-tight font-semibold tracking-tight text-foreground">
                Who are you looking for?
              </h1>
              <p className="text-[15px] text-muted-foreground mt-2">
                Search across your network, communities, public profiles, and friends&rsquo; networks.
              </p>
            </div>
          )}

          <div className={cn('relative', submittedQuery ? 'mb-3' : 'mt-8 mb-4')}>
            <Search className="absolute left-[18px] top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Find fintech founders who raised Series A…"
              className="w-full h-14 pl-[52px] pr-[56px] rounded-xl border border-border bg-card text-[16px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={query.trim().length < 2 || isFetching}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              aria-label="Search"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ChannelToggleRow
              active={activeChannels}
              counts={submittedQuery ? counts : undefined}
              onToggle={toggleChannel}
            />
            {scopeOptions.length > 1 && (
              <div className="ml-auto flex items-center gap-1 text-[12px] text-muted-foreground">
                {scopeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setScope(opt.value);
                      if (opt.value === 'group' && groups.length > 0 && !selectedGroupId) {
                        setSelectedGroupId(groups[0].id);
                      }
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border transition-colors',
                      scope === opt.value
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-border hover:text-foreground',
                    )}
                  >
                    <opt.icon className="w-3 h-3" />
                    {opt.label}
                  </button>
                ))}
                {scope === 'group' && groups.length > 1 && (
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="h-7 text-[12px] border border-border rounded-full px-2 bg-background text-foreground"
                  >
                    {groups.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {!submittedQuery && (
            <div className="mt-20 px-6 py-12 border border-dashed border-border rounded-xl text-center text-muted-foreground">
              <Sparkles className="w-7 h-7 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-foreground font-semibold text-base">Try a search</h3>
              <p className="text-[14px] mt-2 mb-6">
                Be specific. &ldquo;D2C founders in Bangalore who raised Series A&rdquo; works better than &ldquo;founders.&rdquo;
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Senior backend engineers, payments, Bangalore',
                  'D2C founders with Series A',
                  'Designers from MU ’22',
                  'VCs who fund consumer',
                ].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setQuery(ex); setSubmittedQuery(ex); }}
                    className="h-8 px-3 rounded text-[12px] bg-muted text-muted-foreground border border-border hover:bg-muted/70 hover:text-foreground transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {submittedQuery && (
            <>
              <div className="flex items-center justify-between mt-6 mb-3">
                <p className="text-[13px] text-muted-foreground">
                  {totalVisible} result{totalVisible === 1 ? '' : 's'}
                  {elapsed ? ` · ${(elapsed / 1000).toFixed(1)}s` : ''}
                  {totalVisible !== results.length && (
                    <span className="ml-1">({results.length - totalVisible} hidden by filter)</span>
                  )}
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grouped')}
                    className={cn(
                      'h-7 px-3 rounded text-[12px] border transition-colors',
                      viewMode === 'grouped'
                        ? 'bg-muted text-foreground border-border'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground',
                    )}
                  >
                    Grouped by channel
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('unified')}
                    className={cn(
                      'h-7 px-3 rounded text-[12px] border transition-colors',
                      viewMode === 'unified'
                        ? 'bg-muted text-foreground border-border'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground',
                    )}
                  >
                    Unified ranking
                  </button>
                </div>
              </div>

              {isLoading && (
                <div className="flex flex-col gap-2 mt-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              )}

              {!isLoading && totalVisible === 0 && (
                <div className="mt-4 px-6 py-12 border border-dashed border-border rounded-xl text-center text-muted-foreground">
                  <p className="text-foreground font-semibold">No results</p>
                  <p className="text-[13px] mt-1">
                    {results.length === 0
                      ? 'Try different keywords or switch scope.'
                      : 'All results are hidden by your channel filter. Toggle a channel back on above.'}
                  </p>
                </div>
              )}

              {!isLoading && totalVisible > 0 && viewMode === 'grouped' && (
                <div className="flex flex-col gap-4">
                  {ALL_CHANNELS.map((ch) => {
                    if (!activeChannels.includes(ch)) return null;
                    const groupResults = filteredResults.filter((r) => deriveChannel(r, scope) === ch);
                    if (!groupResults.length) return null;
                    return (
                      <div key={ch} className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/40">
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                            {CHANNEL_GROUP_LABEL[ch]}
                          </span>
                          <Pill kind={ch}>{groupResults.length}</Pill>
                        </div>
                        {groupResults.map((r) => (
                          <ResultCard
                            key={r.id}
                            result={r}
                            scope={scope}
                            showChannelPill={false}
                            onRequestIntro={setIntroTarget}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {!isLoading && totalVisible > 0 && viewMode === 'unified' && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {filteredResults.map((r) => (
                    <ResultCard
                      key={r.id}
                      result={r}
                      scope={scope}
                      onRequestIntro={setIntroTarget}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {introTarget && (
        <IntroRequestModal
          target={introTarget}
          groups={groups}
          onClose={() => setIntroTarget(null)}
        />
      )}
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    }>
      <SearchPage />
    </Suspense>
  );
}
