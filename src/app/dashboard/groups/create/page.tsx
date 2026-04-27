"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { groupsService, communityService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function CreateGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: ['community', 'kyc', 'me'],
    queryFn: async () => {
      try {
        return await communityService.getMyKyc();
      } catch {
        return { success: false };
      }
    },
    retry: false,
  });

  const submission = kycData?.submission;
  const isApproved = submission?.status === 'approved';

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const data = await groupsService.createGroup({ name: name.trim(), description: description.trim() || undefined });
      if (!data.success) {
        if (data.code === 'KYC_REQUIRED') {
          toast({ title: 'Verification required', description: 'Submit a KYC application first.' });
          router.push('/dashboard/groups/kyc');
          return;
        }
        toast({ title: 'Failed to create group', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Group created!', description: 'Share the invite link or set membership rules.' });
      router.push(`/dashboard/groups/${data.group.id}`);
    } catch (err: any) {
      toast({ title: 'Failed to create group', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5 bg-background flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-semibold">Create Community</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Create a shared network for your community. Each member's connections become discoverable.
            </p>
          </div>

          {kycLoading && <div className="h-20 rounded-xl bg-muted animate-pulse" />}

          {!kycLoading && !isApproved && (
            <KycGate submission={submission} onAction={() => router.push('/dashboard/groups/kyc')} />
          )}

          {!kycLoading && isApproved && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Community name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Masters Union Cohort 2024"
                  maxLength={100}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Description <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of who belongs to this community"
                  rows={3}
                  maxLength={300}
                  className="resize-none"
                />
              </div>

              <Button onClick={handleCreate} disabled={loading || !name.trim()} className="w-full">
                {loading ? 'Creating...' : 'Create Community'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KycGate({ submission, onAction }: { submission: any; onAction: () => void }) {
  if (!submission) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <p className="font-semibold text-sm">Verification required</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Anyone with a verified identity can create a community. Submit a quick KYC and a platform admin will review it.
        </p>
        <Button onClick={onAction} className="w-full">
          Start verification
        </Button>
      </div>
    );
  }
  if (submission.status === 'pending') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Pending review</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your KYC is in the queue. You'll be able to create a community once it's approved.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onAction}>
            View submission
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
      <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-sm">KYC rejected</p>
        <p className="text-sm text-muted-foreground mt-1">
          {submission.rejection_reason || 'Please update your details and resubmit.'}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onAction}>
          Update and resubmit
        </Button>
      </div>
    </div>
  );
}
