"use client";

import { ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Channel } from '@/components/ChannelPill';

interface ChannelDef {
  id: Channel;
  label: string;
  drop?: boolean;
  lock?: boolean;
}

const CHANNELS: ChannelDef[] = [
  { id: 'own', label: 'Own network' },
  { id: 'community', label: 'Communities', drop: true },
  { id: 'public', label: 'Public network' },
  { id: 'friends', label: 'Friends’ networks' },
];

interface ChannelToggleRowProps {
  active: Channel[];
  counts?: Partial<Record<Channel, number>>;
  onToggle?: (channel: Channel) => void;
  className?: string;
}

export function ChannelToggleRow({ active, counts = {}, onToggle, className }: ChannelToggleRowProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {CHANNELS.map((c) => {
        const on = active.includes(c.id);
        const onStyle = on
          ? {
              backgroundColor: `hsl(var(--ch-${c.id}-soft))`,
              color: `hsl(var(--ch-${c.id}))`,
              borderColor: `hsl(var(--ch-${c.id}))`,
            }
          : undefined;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle?.(c.id)}
            style={onStyle}
            className={cn(
              'inline-flex items-center gap-2 h-8 px-3 rounded text-[13px] font-medium border transition-colors',
              on ? '' : 'bg-background text-muted-foreground border-border hover:bg-muted',
            )}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: `hsl(var(--ch-${c.id}))` }}
            />
            <span>{c.label}</span>
            {counts[c.id] != null && <span className="font-semibold tabular-nums">{counts[c.id]}</span>}
            {c.lock && <Lock className="w-3 h-3" />}
            {c.drop && <ChevronDown className="w-3 h-3" />}
          </button>
        );
      })}
    </div>
  );
}
