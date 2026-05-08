import { cn } from '@/lib/utils';

export type Channel = 'own' | 'community' | 'friends' | 'public';

const labels: Record<Channel, string> = {
  own: 'OWN',
  community: 'COMMUNITY',
  friends: 'FRIENDS',
  public: 'PUBLIC',
};

interface ChannelPillProps {
  channel: Channel;
  label?: string;
  count?: number | null;
  className?: string;
}

export function ChannelPill({ channel, label, count, className }: ChannelPillProps) {
  const text = label ?? labels[channel];
  return (
    <span className={cn('channel-pill', `channel-pill-${channel}`, className)}>
      {text}
      {count != null && <span className="opacity-70">·&nbsp;{count}</span>}
    </span>
  );
}
