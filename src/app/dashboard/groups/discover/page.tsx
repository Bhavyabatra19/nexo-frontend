"use client";

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Compass, Users, ShieldCheck } from 'lucide-react';
import { groupsService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

export default function DiscoverCommunitiesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['groups', 'discoverable'],
    queryFn: () => groupsService.listDiscoverable(),
  });
  const communities = data?.communities || [];

  const onJoin = async (id: string) => {
    const res = await groupsService.requestJoin(id);
    if (!res.success) {
      toast({ title: 'Could not join', description: res.error || '', variant: 'destructive' });
      return;
    }
    if (res.alreadyMember) {
      router.push(`/dashboard/groups/${id}`);
      return;
    }
    if (res.joined) {
      toast({ title: 'Joined!', description: 'Give consent on the community page to enable network search.' });
      router.push(`/dashboard/groups/${id}`);
      return;
    }
    toast({ title: 'Request sent', description: 'A community admin will review your request.' });
    qc.invalidateQueries({ queryKey: ['groups', 'discoverable'] });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5 bg-background flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Compass className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Discover communities</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-2xl">
          <p className="text-sm text-muted-foreground mb-4">
            Communities you're eligible to join based on your email domain.
          </p>

          {isLoading && (
            <div className="flex flex-col gap-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && communities.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Compass className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium text-sm">No matching communities yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                You'll see communities here when one opens to your email domain. Have an invite link? Open it directly to join.
              </p>
            </div>
          )}

          {!isLoading && communities.length > 0 && (
            <div className="flex flex-col gap-3">
              {communities.map((c: any) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Users className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.member_count} member{c.member_count === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <ActionButton community={c} onJoin={() => onJoin(c.id)} />
                  </div>

                  {c.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{c.description}</p>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Matched: <span className="font-mono">{c.match.pattern}</span>
                    </span>
                    <Badge
                      variant={c.match.auto_approve ? 'default' : 'outline'}
                      className="ml-auto text-[10px] h-5"
                    >
                      {c.match.auto_approve ? 'auto-approve' : 'manual review'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ community, onJoin }: { community: any; onJoin: () => void }) {
  if (community.my_role) {
    return <Badge variant="outline">Already a member</Badge>;
  }
  if (community.my_request_status === 'pending') {
    return <Badge variant="outline" className="text-amber-700 border-amber-300">Request pending</Badge>;
  }
  if (community.my_request_status === 'rejected') {
    return <Badge variant="outline" className="text-destructive border-destructive/40">Rejected</Badge>;
  }
  return (
    <Button size="sm" onClick={onJoin}>
      {community.match.auto_approve ? 'Join' : 'Request to join'}
    </Button>
  );
}
