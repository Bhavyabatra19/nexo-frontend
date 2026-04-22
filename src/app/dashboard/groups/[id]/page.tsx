"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Copy, Check, Crown, Users, Search, BarChart2,
  Linkedin, Globe, UserCheck, AlertCircle
} from 'lucide-react';
import { groupsService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

function StatCard({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value ?? '—'}</span>
    </div>
  );
}

function MemberRow({ member, isAdmin, onRemove }: { member: any; isAdmin: boolean; onRemove?: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {member.profile_picture ? (
          <img src={member.profile_picture} alt={member.full_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">
            {member.full_name?.charAt(0)?.toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{member.full_name}</span>
          {member.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{member.contact_count || 0} contacts</span>
          {member.linkedin_uploaded && (
            <span className="text-xs flex items-center gap-0.5 text-blue-600"><Linkedin className="w-2.5 h-2.5" /> LinkedIn</span>
          )}
          {member.google_synced && (
            <span className="text-xs flex items-center gap-0.5 text-green-600"><Globe className="w-2.5 h-2.5" /> Google</span>
          )}
          {!member.consent_given && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 border-orange-300 text-orange-600">
              No consent
            </Badge>
          )}
        </div>
      </div>
      {isAdmin && member.role !== 'admin' && onRemove && (
        <button
          onClick={() => onRemove(member.id)}
          className="text-xs text-destructive hover:underline px-2 py-1"
        >
          Remove
        </button>
      )}
    </div>
  );
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [givingConsent, setGivingConsent] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsService.getGroup(id),
    enabled: !!id,
  });

  const { data: membersData } = useQuery({
    queryKey: ['group-members', id],
    queryFn: () => groupsService.getMembers(id),
    enabled: !!id,
  });

  const group = data?.group;
  const stats = data?.stats;
  const myRole = data?.myRole;
  const consentGiven = data?.consentGiven;
  const inviteUrl = data?.inviteUrl || '';
  const members = membersData?.members || [];

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGiveConsent = async () => {
    setGivingConsent(true);
    try {
      await groupsService.giveConsent(id);
      toast({ title: 'Consent given!', description: 'You can now participate in group search.' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setGivingConsent(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await groupsService.removeMember(id, memberId);
      toast({ title: 'Member removed' });
      qc.invalidateQueries({ queryKey: ['group-members', id] });
      refetch();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="font-medium">Group not found</p>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/groups')} className="mt-2">
            Back to groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-5 bg-background">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/dashboard/groups')} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {group.logo_url ? (
                <img src={group.logo_url} alt={group.name} className="w-full h-full object-cover" />
              ) : (
                <Users className="w-4 h-4 text-primary" />
              )}
            </div>
            <h1 className="text-lg font-semibold truncate">{group.name}</h1>
            {myRole === 'admin' && <Crown className="w-4 h-4 text-yellow-500 shrink-0" />}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/dashboard/search?scope=group&group_id=${id}`)}
            className="gap-1.5 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            Search network
          </Button>
        </div>

        {/* Consent banner */}
        {!consentGiven && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Consent required for group search</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                Your contacts' names, titles, and companies will be visible to group members. Your notes and messages stay private.
              </p>
            </div>
            <Button size="sm" onClick={handleGiveConsent} disabled={givingConsent} className="shrink-0">
              {givingConsent ? 'Saving...' : 'Give consent'}
            </Button>
          </div>
        )}

        {/* Invite link */}
        <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-muted">
          <span className="text-xs text-muted-foreground font-mono truncate flex-1">{inviteUrl}</span>
          <button onClick={handleCopyInvite} className="flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors shrink-0">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Members" value={stats?.member_count} icon={Users} />
          <StatCard label="Total contacts" value={stats?.total_contacts} icon={UserCheck} />
          <StatCard label="Enriched" value={stats?.enriched_contacts} icon={BarChart2} />
          <StatCard label="Searches (7d)" value={stats?.searches_this_week} icon={Search} />
        </div>

        {/* Members */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Members ({members.length})
          </h2>
          <div className="rounded-xl border border-border bg-card px-4">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No members yet</p>
            ) : (
              members.map((m: any) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isAdmin={myRole === 'admin'}
                  onRemove={handleRemoveMember}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
