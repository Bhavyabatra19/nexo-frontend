"use client";

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Clock, CheckCircle, XCircle, Sparkles, Copy, Check } from 'lucide-react';
import { introsService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; icon: any; class: string }> = {
  pending:  { label: 'Pending',  icon: Clock,        class: 'border-yellow-300 text-yellow-700 bg-yellow-50' },
  approved: { label: 'Approved', icon: CheckCircle,  class: 'border-green-300 text-green-700 bg-green-50' },
  denied:   { label: 'Denied',   icon: XCircle,      class: 'border-red-300 text-red-700 bg-red-50' },
  expired:  { label: 'Expired',  icon: Clock,        class: 'border-gray-300 text-gray-500 bg-gray-50' },
  sent:     { label: 'Sent',     icon: CheckCircle,  class: 'border-blue-300 text-blue-700 bg-blue-50' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 gap-1', cfg.class)}>
      <cfg.icon className="w-2.5 h-2.5" />
      {cfg.label}
    </Badge>
  );
}

function SentIntroCard({ intro }: { intro: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            To <span className="text-foreground">{intro.target_name}</span>
            <span className="text-muted-foreground"> via </span>
            <span className="text-foreground">{intro.connector_name}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{intro.context}</p>
        </div>
        <StatusBadge status={intro.status} />
      </div>
      <p className="text-xs text-muted-foreground">
        {new Date(intro.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

function ReceivedIntroCard({ intro, onAction }: { intro: any; onAction: () => void }) {
  const [note, setNote] = useState('');
  const [showDraft, setShowDraft] = useState(false);
  const [loading, setLoading] = useState<'approve' | 'deny' | null>(null);
  const [aiDraft, setAiDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    setLoading('approve');
    try {
      const data = await introsService.approveIntro(intro.id, note || undefined);
      setAiDraft(data.ai_draft || '');
      setShowDraft(true);
      toast({ title: 'Approved!', description: 'AI intro draft generated.' });
      onAction();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleDeny = async () => {
    setLoading('deny');
    try {
      await introsService.denyIntro(intro.id);
      toast({ title: 'Request declined' });
      onAction();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <ArrowRight className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            <span className="text-foreground">{intro.requester_name}</span>
            <span className="text-muted-foreground"> wants to meet </span>
            <span className="text-foreground">{intro.target_name}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 italic">"{intro.context}"</p>
          <p className="text-xs text-muted-foreground mt-1">
            Preferred: <span className="font-medium capitalize">{intro.preferred_method}</span>
          </p>
        </div>
      </div>

      {showDraft ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            AI-drafted intro
          </div>
          <div className="relative">
            <div className="text-xs bg-muted rounded-lg p-3 pr-8 whitespace-pre-wrap leading-relaxed">
              {aiDraft}
            </div>
            <button onClick={handleCopy} className="absolute top-2 right-2 p-1 hover:bg-accent rounded">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>
      ) : (
        <>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a personal note for the AI draft (optional)"
            rows={2}
            className="resize-none text-xs"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={!!loading}
              className="flex-1 gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {loading === 'approve' ? 'Approving...' : 'Approve & Draft Intro'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeny}
              disabled={!!loading}
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {loading === 'deny' ? 'Declining...' : 'Decline'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function IntrosPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['intros'],
    queryFn: () => introsService.listIntros(),
  });

  const sent: any[] = data?.sent || [];
  const received: any[] = data?.received || [];

  const [tab, setTab] = useState<'received' | 'sent'>('received');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5 bg-background">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRight className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Introductions</h1>
        </div>

        <div className="flex gap-1">
          {[
            { key: 'received', label: 'Received', count: received.length },
            { key: 'sent', label: 'Sent', count: sent.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && tab === 'received' && (
          received.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
              <p className="font-medium">No pending requests</p>
              <p className="text-sm text-muted-foreground">Introduction requests from group members will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-2xl">
              {received.map(intro => (
                <ReceivedIntroCard key={intro.id} intro={intro} onAction={refetch} />
              ))}
            </div>
          )
        )}

        {!isLoading && tab === 'sent' && (
          sent.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
              <p className="font-medium">No sent requests</p>
              <p className="text-sm text-muted-foreground">When you request introductions from search, they'll appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-2xl">
              {sent.map(intro => (
                <SentIntroCard key={intro.id} intro={intro} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
