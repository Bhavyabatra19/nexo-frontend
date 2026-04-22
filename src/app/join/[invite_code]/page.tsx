"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, ArrowRight, Shield, Lock } from 'lucide-react';
import { groupsService, authService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function JoinGroupPage() {
  const { invite_code } = useParams<{ invite_code: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [joining, setJoining] = useState(false);
  const isLoggedIn = authService.isAuthenticated();

  // Store invite code so we can use it after login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pending_invite_code', invite_code);
    }
  }, [invite_code]);

  // After login redirect, auto-join
  useEffect(() => {
    const pending = typeof window !== 'undefined' ? sessionStorage.getItem('pending_invite_code') : null;
    if (isLoggedIn && pending) {
      sessionStorage.removeItem('pending_invite_code');
      handleJoin();
    }
  }, [isLoggedIn]);

  const handleJoin = async () => {
    if (!isLoggedIn) {
      const authUrl = await authService.getGoogleAuthUrl();
      window.location.href = authUrl;
      return;
    }
    setJoining(true);
    try {
      const data = await groupsService.joinGroup(invite_code);
      if (data.alreadyMember) {
        toast({ title: 'Already a member', description: `You are already in ${data.group?.name}` });
        router.push(`/dashboard/groups/${data.group.id}`);
        return;
      }
      const groupId = data.group?.id;
      if (data.needsConsent) {
        await groupsService.giveConsent(groupId);
      }
      toast({ title: 'Joined!', description: `Welcome to ${data.group?.name}` });
      router.push(`/dashboard/groups/${groupId}`);
    } catch (err: any) {
      toast({ title: 'Failed to join', description: err.message || 'Invalid invite link', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Join on Nexo</h1>
          <p className="text-muted-foreground mt-2">
            You've been invited to join a community network.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Collective network search</p>
                <p className="text-xs text-muted-foreground">Find people in your community's combined network using natural language.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Privacy first</p>
                <p className="text-xs text-muted-foreground">Only names, titles, and companies are shared. Your notes and messages stay private.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">You control your data</p>
                <p className="text-xs text-muted-foreground">Mark any contact as private to exclude them from group search at any time.</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleJoin}
            disabled={joining}
            className="w-full gap-2 h-11"
          >
            <ArrowRight className="w-4 h-4" />
            {joining ? 'Joining...' : isLoggedIn ? 'Join community' : 'Sign in with Google & Join'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By joining, you agree that your contacts' names, titles, and companies will be visible to other members of this community.
          </p>
        </div>
      </div>
    </div>
  );
}
