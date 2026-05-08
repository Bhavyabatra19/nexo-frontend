import { cn } from '@/lib/utils';

export type WarmthLevel = 'cool' | 'warm' | 'hot';

const fill: Record<WarmthLevel, [boolean, boolean, boolean]> = {
  cool: [true, false, false],
  warm: [true, true, false],
  hot: [true, true, true],
};

const tone: Record<WarmthLevel, string> = {
  cool: 'warmth-seg-cool',
  warm: 'warmth-seg-warm',
  hot: 'warmth-seg-hot',
};

export function Warmth({ level, className }: { level: WarmthLevel; className?: string }) {
  const segs = fill[level];
  return (
    <div className={cn('warmth-track', className)} title={`Warmth: ${level}`}>
      {segs.map((on, i) => (
        <span key={i} className={cn('warmth-seg', on && tone[level])} />
      ))}
    </div>
  );
}
