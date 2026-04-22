"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, Users, Globe, Building2, MapPin, ArrowRight, Sparkles, UserCheck } from 'lucide-react';
import { groupsService, searchService } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import IntroRequestModal from '@/components/IntroRequestModal';

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
    <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', color)} title={`Confidence: ${Math.round((score || 0) * 100)}%`} />
  );
}

function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return null;
  const config: Record<string, { label: string; class: string }> = {
    close: { label: 'Close', class: 'bg-purple-100 text-purple-700 border-purple-200' },
    acquaintance: { label: 'Acquaintance', class: 'bg-blue-100 text-blue-700 border-blue-200' },
    social: { label: 'Social', class: 'bg-gray-100 text-gray-600 border-gray-200' },
  };
  const c = config[tier] || config.social;
  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', c.class)}>{c.label}</span>
  );
}

function ResultCard({ result, onRequestIntro }: { result: SearchResult; onRequestIntro: (r: SearchResult) => void }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {result.photo_url ? (
          <img src={result.photo_url} alt={result.full_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">
            {result.full_name?.charAt(0)?.toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{result.full_name}</span>
          <ConfidenceDot score={result.confidence_score} />
          {result.is_own && <TierBadge tier={result.connection_tier} />}
        </div>

        {(result.job_title || result.company) && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {result.job_title}{result.job_title && result.company ? ' · ' : ''}{result.company}
          </p>
        )}

        {result.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />{result.location}
          </p>
        )}

        {!result.is_own && result.via && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCheck className="w-3 h-3 shrink-0" />
            <span>Via <span className="font-medium text-foreground">{result.via.owner_name}</span></span>
            {result.intro_quality && result.intro_quality !== 'none' && (
              <Badge variant="outline" className={cn(
                'text-[10px] h-4 px-1',
                result.intro_quality === 'strong' ? 'border-green-300 text-green-700' :
                result.intro_quality === 'medium' ? 'border-blue-300 text-blue-700' : ''
              )}>
                {result.intro_quality} path
              </Badge>
            )}
          </div>
        )}

        {result.is_own && result.linkedin_url && (
          <a href={result.linkedin_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 inline-block">
            LinkedIn ↗
          </a>
        )}
      </div>

      {/* Action */}
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

function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>((searchParams.get('scope') as SearchScope) || 'personal');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(searchParams.get('group_id') || '');
  const [introTarget, setIntroTarget] = useState<SearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // If arriving from a group detail page, focus the search bar
  useEffect(() => {
    if (searchParams.get('scope') === 'group' || searchParams.get('group_id')) {
      inputRef.current?.focus();
    }
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

  const handleSearch = useCallback(() => {
    if (query.trim().length >= 2) setSubmittedQuery(query.trim());
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const scopeOptions = [
    { value: 'personal', label: 'My Network', icon: Users },
    ...(groups.length > 0 ? [{ value: 'group', label: 'Group', icon: Building2 }] : []),
    ...(groups.length > 1 ? [{ value: 'all', label: 'All Groups', icon: Globe }] : []),
  ] as { value: SearchScope; label: string; icon: any }[];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-5 bg-background">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Network Search</h1>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "React developers in Bangalore" or "fintech investors who went to IIT"'
              className="pl-9 pr-4"
            />
          </div>
          <Button onClick={handleSearch} disabled={query.trim().length < 2 || isFetching}>
            {isFetching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Scope selector */}
        <div className="flex gap-2 mt-3">
          {scopeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setScope(opt.value);
                if (opt.value === 'group' && groups.length > 0 && !selectedGroupId) {
                  setSelectedGroupId(groups[0].id);
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                scope === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              )}
            >
              <opt.icon className="w-3 h-3" />
              {opt.label}
            </button>
          ))}

          {scope === 'group' && groups.length > 1 && (
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="text-xs border border-border rounded-full px-3 py-1.5 bg-background text-foreground"
            >
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!submittedQuery && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-medium text-lg">Search your network</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Find people using natural language. Try job titles, skills, companies, or locations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['VCs in Mumbai', 'ex-Google engineers', 'fintech founders', 'designers in Bangalore'].map(ex => (
                <button
                  key={ex}
                  onClick={() => { setQuery(ex); setSubmittedQuery(ex); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {submittedQuery && isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {submittedQuery && !isLoading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
            <p className="font-medium">No results found</p>
            <p className="text-sm text-muted-foreground">Try different keywords or switch search scope</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {results.length} results
                {elapsed ? ` · ${elapsed}ms` : ''}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {results.map(r => (
                <ResultCard key={r.id} result={r} onRequestIntro={setIntroTarget} />
              ))}
            </div>
          </>
        )}
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

import { Suspense } from 'react';

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}>
      <SearchPage />
    </Suspense>
  );
}
