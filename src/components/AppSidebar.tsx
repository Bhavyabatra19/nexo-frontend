"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Users, Bell, Upload, Settings, LogOut, ChevronDown, ChevronRight, ChevronLeft, Plus, List as ListIcon, Pencil, Sparkles, Tag, GitMerge, Linkedin, Search, ArrowRight, ShieldCheck, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService, organizeService } from '@/services/api';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const navItems = [
  { id: 'search', label: 'Search', icon: Search, href: '/dashboard/search' },
  { id: 'groups', label: 'Communities', icon: Users, href: '/dashboard/groups' },
  { id: 'discover', label: 'Discover', icon: Compass, href: '/dashboard/groups/discover' },
  { id: 'intros', label: 'Introductions', icon: ArrowRight, href: '/dashboard/intros' },
  { id: 'nexo-ai', label: 'Nexo AI', icon: Sparkles, href: '/dashboard/nexo-ai' },
  { id: 'reminders', label: 'Reminders', icon: Bell, href: '/dashboard/reminders' },
  { id: 'dedup', label: 'Merge & Fix', icon: GitMerge, href: '/dashboard/dedup' },
  { id: 'linkedin', label: 'LinkedIn Setup', icon: Linkedin, href: '/onboarding' },
  { id: 'import', label: 'Import', icon: Upload, href: '/dashboard/import' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

const adminNavItem = { id: 'admin-kyc', label: 'KYC Review', icon: ShieldCheck, href: '/dashboard/admin/kyc' };

const AppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentListId = searchParams.get('list');
  const currentTagId = searchParams.get('tag');

  const queryClient = useQueryClient();
  const [isContactsOpen, setIsContactsOpen] = useState(true);
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [dedupBadge, setDedupBadge] = useState<'running' | 'pending' | null>(null);
  const [importBadge, setImportBadge] = useState<'running' | 'pending' | null>(null);

  const checkBadges = useCallback(async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE;
      if (!authService.isAuthenticated()) return;

      const [ds, ls] = await Promise.all([
        fetch(`${apiBase}/dedup/status`, { credentials: 'include' }).then(r => r.json()).catch(() => null),
        fetch(`${apiBase}/linkedin/status`, { credentials: 'include' }).then(r => r.json()).catch(() => null),
      ]);

      if (ds?.status === 'processing') setDedupBadge('running');
      else if (ds?.status === 'pending_review') setDedupBadge('pending');
      else setDedupBadge(null);

      if (ls?.status === 'processing') setImportBadge('running');
      else if (ls?.status === 'pending_review') setImportBadge('pending');
      else setImportBadge(null);
    } catch {}
  }, []);

  useEffect(() => {
    checkBadges();
    window.addEventListener('focus', checkBadges);
    return () => window.removeEventListener('focus', checkBadges);
  }, [checkBadges]);

  // Re-check badges whenever navigation happens (user may have acted on a job)
  useEffect(() => {
    checkBadges();
  }, [pathname, checkBadges]);

  const getNavBadge = (id: string) => {
    if (id === 'dedup') return dedupBadge;
    if (id === 'import') return importBadge;
    return null;
  };

  const { data: listsDataResponse } = useQuery({
    queryKey: ['lists'],
    queryFn: async () => await organizeService.getLists()
  });
  const userLists = listsDataResponse?.lists || [];

  const { data: tagsDataResponse } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => await organizeService.getTags()
  });
  const userTags = tagsDataResponse?.tags || [];

  const handleLogout = () => {
    authService.logout();
  };

  const { data: userData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => await authService.getCurrentUser(),
    refetchInterval: 30000, // Refetch periodically to update credits
  });

  const aiUsed = userData?.statistics?.ai_tokens_used || 0;
  const aiLimit = 100000;
  const aiPercent = Math.min((aiUsed / aiLimit) * 100, 100);
  const aiRemaining = Math.max(aiLimit - aiUsed, 0);

  return (
    <aside className={cn("relative h-screen bg-[hsl(var(--sidebar-bg))] flex flex-col border-r border-[hsl(var(--sidebar-border))] shrink-0 transition-all duration-300", isCollapsed ? "w-[80px]" : "w-[260px]")}>
      {/* Logo */}
      <div className={cn("px-5 py-5 flex items-center justify-between", isCollapsed && "justify-center px-0")}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden shadow-sm">
            <img src="/Nexo-Logo.jpg" alt="Nexo Logo" className="w-full h-full object-cover" />
          </div>
          {!isCollapsed && <span className="text-lg font-semibold text-[hsl(var(--sidebar-fg-active))]">Nexo</span>}
        </div>
        {!isCollapsed && (
          <button onClick={() => setIsCollapsed(true)} className="p-1 rounded-md hover:bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-fg))]">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {isCollapsed && (
          <button onClick={() => setIsCollapsed(false)} className="absolute -right-3 top-6 bg-[hsl(var(--sidebar-bg))] border border-[hsl(var(--sidebar-border))] rounded-full p-1 text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] z-10 hidden md:block">
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {/* AI Credits Widget (Pure High Contrast Version) */}
        {!isCollapsed && (
          <div className="mb-4 px-3 py-3 bg-white/5 rounded-lg border border-white/10 shadow-sm mx-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-slate-100" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-100">Daily AI Credits</span>
              </div>
              <span className="text-[10px] font-bold text-white">{Math.round(aiPercent)}%</span>
            </div>
            
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  aiPercent > 90 ? "bg-red-500" : aiPercent > 70 ? "bg-orange-500" : "bg-white"
                )}
                style={{ width: `${aiPercent}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-white">
                {aiRemaining.toLocaleString()} <span className="text-[9px] text-slate-400 uppercase font-normal ml-1">tokens left</span>
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="flex justify-center mb-4">
            <div 
              className={cn(
                "w-2 h-10 rounded-full bg-black/40 dark:bg-white/5 relative overflow-hidden border border-white/10 shadow-inner",
                aiPercent > 90 ? "border-red-500/30" : ""
              )}
              title={`AI Usage: ${Math.round(aiPercent)}% (${aiRemaining.toLocaleString()} tokens left)`}
            >
              <div 
                className={cn(
                  "absolute bottom-0 left-0 w-full transition-all duration-700 ease-in-out",
                  aiPercent > 90 ? "bg-red-500" : aiPercent > 70 ? "bg-orange-500" : "bg-white"
                )}
                style={{ height: `${aiPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Contacts Menu */}
        <div>
          <div
            className={cn(
              'sidebar-item w-full flex items-center py-2 px-3 rounded-md transition-colors cursor-pointer',
              isCollapsed ? 'justify-center' : 'justify-between',
              pathname.includes('/dashboard/contacts')
                ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-fg-active))] font-medium'
                : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-fg-active))]'
            )}
            onClick={() => setIsContactsOpen(!isContactsOpen)}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Contacts</span>}
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1 group">
                {isContactsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            )}
          </div>

          {/* Submenu */}
          {isContactsOpen && !isCollapsed && (
            <div className="mt-1 ml-4 pl-4 border-l border-border/50 flex flex-col gap-1">
              <Link
                href="/dashboard/contacts"
                className={cn(
                  'flex items-center gap-2 py-1.5 px-3 rounded-md text-sm transition-colors',
                  pathname === '/dashboard/contacts' && !currentListId && !currentTagId
                    ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-fg-active))] font-medium'
                    : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-fg-active))]'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Contacts</span>
              </Link>

              {userLists.map((list: any) => {
                const isActive = currentListId === list.id;

                return (
                  <Link
                    key={list.id}
                    href={`/dashboard/contacts?list=${list.id}`}
                    className={cn(
                      'group flex items-center justify-between py-1.5 px-3 rounded-md text-sm transition-colors relative',
                      isActive
                        ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-fg-active))] font-medium'
                        : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-fg-active))]'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate pr-6">
                      <ListIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{list.name}</span>
                    </div>

                    <div className="flex items-center absolute right-2">
                      {/* Edit Icon on hover */}
                      <div
                        onClick={(e) => { e.preventDefault(); router.push(`/dashboard/contacts/lists/${list.id}/edit`); }}
                        className="hidden group-hover:flex p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[hsl(var(--sidebar-fg))] hover:text-[hsl(var(--sidebar-fg-active))] cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </div>

                      {/* Default Count (Hidden on hover) */}
                      {list.contact_count > 0 && !list.criteria && (
                        <span className="text-[10px] bg-[hsl(var(--sidebar-accent))] px-1.5 rounded-full text-[hsl(var(--sidebar-fg))] border border-[hsl(var(--sidebar-border))] group-hover:hidden">
                          {list.contact_count}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}

              {/* Create Custom List Button */}
              <Link
                href="/dashboard/contacts/lists/create"
                className="flex items-center gap-2 py-1.5 px-3 rounded-md text-sm text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-fg-active))] transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create List</span>
              </Link>
            </div>
          )}
        </div>

        {/* Tags Section */}
        {!isCollapsed && (
          <div>
            <div
              className={cn(
                'sidebar-item w-full flex items-center py-2 px-3 rounded-md transition-colors cursor-pointer justify-between',
                currentTagId
                  ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-fg-active))] font-medium'
                  : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-fg-active))]'
              )}
              onClick={() => setIsTagsOpen(!isTagsOpen)}
            >
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 shrink-0" />
                <span>Tags</span>
              </div>
              <div className="flex items-center gap-1">
                {isTagsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>

            {isTagsOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-border/50 flex flex-col gap-1">
                {userTags.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1.5 px-3">No tags yet</p>
                ) : (
                  userTags.map((tag: any) => {
                    const isActive = currentTagId === tag.id;
                    return (
                      <Link
                        key={tag.id}
                        href={`/dashboard/contacts?tag=${tag.id}`}
                        className={cn(
                          'flex items-center gap-2 py-1.5 px-3 rounded-md text-sm transition-colors',
                          isActive
                            ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-fg-active))] font-medium'
                            : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-fg-active))]'
                        )}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: tag.color || '#3B82F6' }}
                        />
                        <span className="truncate">{tag.name}</span>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
        {isCollapsed && (
          <div
            title="Tags"
            className="sidebar-item w-full flex items-center justify-center py-2 px-0 rounded-md transition-colors text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-fg-active))] cursor-pointer"
          >
            <Tag className="w-4 h-4 shrink-0" />
          </div>
        )}

        {[
          ...navItems,
          ...(userData?.user?.isPlatformAdmin ? [adminNavItem] : []),
        ].map((item) => {
          const badge = getNavBadge(item.id);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'sidebar-item relative w-full flex items-center gap-3 py-2 px-3 rounded-md transition-colors',
                isCollapsed && 'justify-center px-0',
                pathname.includes(item.id)
                  ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-fg-active))] font-medium'
                  : 'text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-fg-active))]'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {isCollapsed && badge && (
                <span className={cn(
                  'absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full',
                  badge === 'running' ? 'bg-orange-400 animate-pulse' : 'bg-primary animate-pulse'
                )} />
              )}
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {badge && (
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      badge === 'running' ? 'bg-orange-400 animate-pulse' : 'bg-primary animate-pulse'
                    )} />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[hsl(var(--sidebar-border))] space-y-1">
        <button onClick={handleLogout} title={isCollapsed ? "Log out" : undefined} className={cn("sidebar-item sidebar-item-inactive w-full flex items-center gap-3 py-2 px-3 rounded-md text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-fg-active))] transition-colors", isCollapsed && "justify-center px-0")}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
