"use client";

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ExternalLink, Clock } from 'lucide-react';
import { adminService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function AdminKycPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'kyc', 'pending'],
    queryFn: () => adminService.listPendingKyc(),
    retry: false,
  });

  const submissions = data?.submissions || [];
  const isForbidden = data && !data.success && data.error === 'Platform admin only';

  const onApprove = async (id: string) => {
    const r = await adminService.approveKyc(id);
    if (r.success) {
      toast({ title: 'Approved' });
      qc.invalidateQueries({ queryKey: ['admin', 'kyc', 'pending'] });
    } else {
      toast({ title: 'Failed', description: r.error, variant: 'destructive' });
    }
  };

  const onReject = async (id: string, reason: string) => {
    if (!reason.trim()) {
      toast({ title: 'Reason required', variant: 'destructive' });
      return;
    }
    const r = await adminService.rejectKyc(id, reason.trim());
    if (r.success) {
      toast({ title: 'Rejected' });
      qc.invalidateQueries({ queryKey: ['admin', 'kyc', 'pending'] });
    } else {
      toast({ title: 'Failed', description: r.error, variant: 'destructive' });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5 bg-background flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">KYC review queue</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-3xl space-y-4">
          {isLoading && <div className="h-32 rounded-xl bg-muted animate-pulse" />}

          {!isLoading && (isForbidden || (error as any)) && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-sm">Platform admin only</p>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have permission to view this page.
              </p>
            </div>
          )}

          {!isLoading && !isForbidden && submissions.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium text-sm">Queue is empty</p>
              <p className="text-xs text-muted-foreground mt-1">No pending KYC submissions.</p>
            </div>
          )}

          {!isLoading && submissions.map((s: any) => (
            <SubmissionCard key={s.id} submission={s} onApprove={onApprove} onReject={onReject} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SubmissionCard({
  submission,
  onApprove,
  onReject,
}: {
  submission: any;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">{submission.full_legal_name}</p>
          <p className="text-xs text-muted-foreground">
            Account: {submission.user_full_name} · {submission.user_email}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          Submitted {new Date(submission.submitted_at).toLocaleDateString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Organization" value={submission.org_name} />
        <Field label="Work email" value={submission.org_email} />
        <Field label="Domain" value={submission.org_domain} mono />
        <Field label="Role" value={submission.org_role || '—'} />
      </div>

      {(submission.id_document_url || submission.proof_of_org_url) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {submission.id_document_url && (
            <a
              href={submission.id_document_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              ID document <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {submission.proof_of_org_url && (
            <a
              href={submission.proof_of_org_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Proof of org <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {submission.notes && (
        <p className="text-sm text-muted-foreground border-l-2 border-border pl-3 italic">
          {submission.notes}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={() => onApprove(submission.id)}>Approve</Button>
        <Button size="sm" variant="outline" onClick={() => setShowReject((v) => !v)}>
          {showReject ? 'Cancel' : 'Reject'}
        </Button>
      </div>

      {showReject && (
        <div className="space-y-2 pt-2 border-t border-border">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (shown to the user)"
            rows={2}
            className="resize-none"
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => onReject(submission.id, reason)}
          >
            Reject submission
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
