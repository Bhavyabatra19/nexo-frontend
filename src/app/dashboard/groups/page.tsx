"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Copy, Check, ArrowRight, Crown } from 'lucide-react';
import { groupsService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Copy invite link">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function GroupCard({ group }: { group: any }) {
  const router = useRouter();
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${group.invite_code}`;

  return (
    <div
      className="rounded-xl border border-border bg-card p-5 hover:bg-accent/20 transition-colors cursor-pointer"
      onClick={() => router.push(`/dashboard/groups/${group.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {group.logo_url ? (
              <img src={group.logo_url} alt={group.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Users className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{group.name}</span>
              {group.role === 'admin' && (
                <Crown className="w-3.5 h-3.5 text-yellow-500" title="You are admin" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
      </div>

      {group.description && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{group.description}</p>
      )}

      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
          {inviteUrl}
        </span>
        <CopyButton text={inviteUrl} />
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.listGroups(),
  });
  const groups = data?.groups || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5 bg-background flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Communities</h1>
        </div>
        <Button size="sm" onClick={() => router.push('/dashboard/groups/create')} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Create Group
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">No communities yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Create a group and invite your community. Your collective network becomes searchable.
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard/groups/create')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create your first group
            </Button>
          </div>
        )}

        {groups.length > 0 && (
          <div className="flex flex-col gap-3 max-w-2xl">
            {groups.map((g: any) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
