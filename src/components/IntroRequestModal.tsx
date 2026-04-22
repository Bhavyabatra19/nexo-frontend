"use client";

import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { introsService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface IntroTarget {
  id: string;
  full_name: string;
  job_title?: string;
  company?: string;
  via?: { owner_id: string; owner_name: string };
}

interface Props {
  target: IntroTarget;
  groups: any[];
  onClose: () => void;
}

export default function IntroRequestModal({ target, groups, onClose }: Props) {
  const [context, setContext] = useState('');
  const [method, setMethod] = useState<'email' | 'whatsapp' | 'linkedin'>('email');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!context.trim() || context.length < 10) {
      toast({ title: 'Add some context', description: 'Tell them why you want to connect (min 10 chars)', variant: 'destructive' });
      return;
    }
    if (!target.via?.owner_id) {
      toast({ title: 'Cannot request intro', description: 'No connector found for this contact', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await introsService.requestIntro({
        connector_id: target.via.owner_id,
        target_contact_id: target.id,
        context: context.trim(),
        preferred_method: method,
        group_id: groupId || undefined,
      });
      toast({ title: 'Intro requested!', description: `${target.via.owner_name} has been notified.` });
      onClose();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message || 'Could not send request', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold">Request Introduction</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              To <span className="font-medium text-foreground">{target.full_name}</span>
              {target.job_title ? ` · ${target.job_title}` : ''}
              {target.company ? ` @ ${target.company}` : ''}
            </p>
            {target.via && (
              <p className="text-xs text-muted-foreground mt-1">
                Via <span className="font-medium text-foreground">{target.via.owner_name}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Why do you want to connect? <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={context}
            onChange={e => setContext(e.target.value.slice(0, 300))}
            placeholder="e.g. I'm building a fintech product and would love Rahul's perspective on the payment stack at Razorpay."
            rows={4}
            className="resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground text-right">{context.length}/300</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preferred method</label>
          <div className="flex gap-2">
            {(['email', 'whatsapp', 'linkedin'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-1.5 rounded-full text-xs border capitalize transition-colors ${
                  method === m
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {groups.length > 1 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Group context</label>
            <select
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
            >
              <option value="">No group</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2">
          <Send className="w-4 h-4" />
          {loading ? 'Sending...' : 'Send Request'}
        </Button>
      </div>
    </div>
  );
}
