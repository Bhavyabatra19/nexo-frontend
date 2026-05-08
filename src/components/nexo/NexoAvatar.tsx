import { cn } from '@/lib/utils';

const tones: Array<[string, string]> = [
  ['hsl(var(--ch-own-soft))', 'hsl(var(--ch-own))'],
  ['hsl(var(--ch-community-soft))', 'hsl(var(--ch-community))'],
  ['hsl(var(--ch-friends-soft))', 'hsl(var(--ch-friends))'],
  ['hsl(var(--success-soft))', 'hsl(var(--success))'],
  ['hsl(var(--warning-soft))', 'hsl(var(--warning))'],
  ['hsl(var(--ch-public-soft))', 'hsl(var(--ch-public))'],
];

function pickTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31 + name.charCodeAt(i)) >>> 0);
  return tones[h % tones.length];
}

const sizeMap = {
  24: 'w-6 h-6 text-[10px]',
  32: 'w-8 h-8 text-[12px]',
  40: 'w-10 h-10 text-[14px]',
  48: 'w-12 h-12 text-[16px]',
  72: 'w-[72px] h-[72px] text-[22px]',
} as const;

export function NexoAvatar({
  name = '?',
  photoUrl,
  size = 40,
  className,
}: {
  name?: string;
  photoUrl?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?';
  const [bg, fg] = pickTone(name);

  if (photoUrl) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full overflow-hidden border border-border shrink-0',
          sizeMap[size],
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold border border-border shrink-0',
        sizeMap[size],
        className,
      )}
      style={{ background: bg, color: fg }}
    >
      {initials}
    </div>
  );
}
