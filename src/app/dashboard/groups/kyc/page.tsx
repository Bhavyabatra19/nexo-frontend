"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ArrowLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { communityService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

type Submission = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  full_legal_name: string;
  org_name: string;
  org_email: string;
  org_role: string | null;
  id_document_url: string | null;
  proof_of_org_url: string | null;
  notes: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

export default function KycPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
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

  const submission: Submission | null = data?.submission || null;

  const [form, setForm] = useState({
    full_legal_name: '',
    org_name: '',
    org_email: '',
    org_role: '',
    id_document_url: '',
    proof_of_org_url: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const showForm = !submission || submission.status === 'rejected';

  const onSubmit = async () => {
    if (!form.full_legal_name.trim() || !form.org_name.trim() || !form.org_email.trim()) {
      toast({ title: 'Name, organization, and work email are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await communityService.submitKyc({
        full_legal_name: form.full_legal_name.trim(),
        org_name: form.org_name.trim(),
        org_email: form.org_email.trim(),
        org_role: form.org_role.trim() || undefined,
        id_document_url: form.id_document_url.trim() || undefined,
        proof_of_org_url: form.proof_of_org_url.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      if (res.success) {
        toast({ title: 'KYC submitted', description: 'A platform admin will review your submission.' });
        queryClient.invalidateQueries({ queryKey: ['community', 'kyc', 'me'] });
      } else {
        toast({ title: 'Submission failed', description: res.error || '', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5 bg-background flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Community Creator Verification</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          {isLoading && <div className="h-40 rounded-xl bg-muted animate-pulse" />}

          {!isLoading && submission && submission.status === 'pending' && (
            <StatusCard
              icon={<Clock className="w-6 h-6 text-amber-500" />}
              title="Pending review"
              description="A platform admin will review your submission. We typically respond within a business day."
              tone="amber"
            />
          )}

          {!isLoading && submission && submission.status === 'approved' && (
            <>
              <StatusCard
                icon={<CheckCircle2 className="w-6 h-6 text-green-500" />}
                title="Verified"
                description="You can now create communities and set membership rules."
                tone="green"
              />
              <Button className="w-full" onClick={() => router.push('/dashboard/groups/create')}>
                Create a community
              </Button>
            </>
          )}

          {!isLoading && submission && submission.status === 'rejected' && (
            <StatusCard
              icon={<XCircle className="w-6 h-6 text-destructive" />}
              title="Rejected"
              description={submission.rejection_reason || 'Please update your details and resubmit.'}
              tone="red"
            />
          )}

          {!isLoading && showForm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Verify your identity to create a community. Submissions are reviewed manually by a platform admin.
              </p>

              <Field label="Full legal name" required>
                <Input value={form.full_legal_name} onChange={(e) => setForm({ ...form, full_legal_name: e.target.value })} />
              </Field>

              <Field label="Organization" required>
                <Input value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} placeholder="e.g. Masters Union" />
              </Field>

              <Field label="Work email at the organization" required>
                <Input
                  type="email"
                  value={form.org_email}
                  onChange={(e) => setForm({ ...form, org_email: e.target.value })}
                  placeholder="you@mastersunion.in"
                />
              </Field>

              <Field label="Your role">
                <Input value={form.org_role} onChange={(e) => setForm({ ...form, org_role: e.target.value })} placeholder="e.g. Alumni Director" />
              </Field>

              <Field label="ID document link" hint="Public URL to a govt ID. Optional but speeds up review.">
                <Input value={form.id_document_url} onChange={(e) => setForm({ ...form, id_document_url: e.target.value })} placeholder="https://..." />
              </Field>

              <Field label="Proof of organization" hint="Letter/badge/website link confirming your role.">
                <Input value={form.proof_of_org_url} onChange={(e) => setForm({ ...form, proof_of_org_url: e.target.value })} placeholder="https://..." />
              </Field>

              <Field label="Notes for the reviewer">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </Field>

              <Button onClick={onSubmit} disabled={submitting} className="w-full">
                {submitting ? 'Submitting...' : 'Submit for review'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatusCard({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: 'amber' | 'green' | 'red';
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-50 border-amber-200'
      : tone === 'green'
      ? 'bg-green-50 border-green-200'
      : 'bg-red-50 border-red-200';
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${toneClass}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}
