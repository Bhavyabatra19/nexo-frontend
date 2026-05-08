import { cn } from '@/lib/utils';

export function Logo({
  size = 18,
  withWord = true,
  className,
}: {
  size?: number;
  withWord?: boolean;
  className?: string;
}) {
  const mark = Math.round(size * 0.85);
  return (
    <span
      className={cn('inline-flex items-center gap-2 font-semibold tracking-tight text-foreground', className)}
      style={{ fontSize: size, letterSpacing: '-0.02em' }}
    >
      <span
        className="inline-block rounded-[4px] relative shrink-0"
        style={{ width: mark, height: mark, background: 'hsl(var(--primary))' }}
      >
        <span
          className="absolute inset-[22%] bg-white rounded-[2px]"
          style={{
            clipPath:
              'polygon(0 0, 100% 0, 100% 30%, 30% 30%, 30% 100%, 0 100%)',
          }}
        />
      </span>
      {withWord && <span>nexo</span>}
    </span>
  );
}
