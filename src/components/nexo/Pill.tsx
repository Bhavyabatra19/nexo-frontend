import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type PillKind =
  | 'ghost'
  | 'outline'
  | 'success'
  | 'warning'
  | 'accent'
  | 'own'
  | 'community'
  | 'public'
  | 'friends';

const kindClass: Record<PillKind, string> = {
  ghost: 'bg-muted text-muted-foreground border border-border',
  outline: 'bg-background text-muted-foreground border border-border',
  accent: 'border border-transparent bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]',
  success: 'border border-transparent bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]',
  warning: 'border border-transparent bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]',
  own: 'border border-transparent bg-[hsl(var(--ch-own-soft))] text-[hsl(var(--ch-own))]',
  community: 'border border-transparent bg-[hsl(var(--ch-community-soft))] text-[hsl(var(--ch-community))]',
  public: 'border border-transparent bg-[hsl(var(--ch-public-soft))] text-[hsl(var(--ch-public))]',
  friends: 'border border-transparent bg-[hsl(var(--ch-friends-soft))] text-[hsl(var(--ch-friends))]',
};

export function Pill({
  kind = 'ghost',
  children,
  icon,
  className,
}: {
  kind?: PillKind;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2 rounded text-[12px] font-medium leading-none whitespace-nowrap',
        kindClass[kind],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
