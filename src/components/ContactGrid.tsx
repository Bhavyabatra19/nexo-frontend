import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Tag, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, X, Loader2, Filter, Globe, Linkedin, UserPlus, List, History, CheckCircle2, XCircle, GitMerge } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { mockReminders, tagColors, allTags, type Contact, type Reminder } from '@/lib/mockData';
import ContactDetail from './ContactDetail';
import { CreateContactModal } from './CreateContactModal';
import { TagManager } from './TagManager';
import { contactsService, organizeService } from '@/services/api';
import { useDebounce } from '../hooks/use-debounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '../hooks/use-toast';

type SortKey = 'name' | 'company' | 'title';
type SortDir = 'asc' | 'desc';

const sourceIconMap: Record<string, React.ElementType> = {
  google: Globe,
  linkedin: Linkedin,
  manual: UserPlus,
};

const PAGE_SIZE = 50;

const ContactGrid = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const listId = searchParams.get('list');
  const tagId = searchParams.get('tag');

  // Clear filters when switching between lists or normal view
  useEffect(() => {
    setSearchQuery('');
    setSourceFilter('');
  }, [listId, tagId]);

  // Reset to page 1 when search / sort changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, sortKey, sortDir, sourceFilter, listId, tagId]);

  const { data: contactsResponse, isLoading } = useQuery({
    queryKey: ['contacts', debouncedSearchQuery, sortKey, sortDir, page, sourceFilter, listId, tagId],
    queryFn: async () => {
      const offset = (page - 1) * PAGE_SIZE;
      const response = await contactsService.getContacts({
        ...(debouncedSearchQuery ? { q: debouncedSearchQuery } : {}),
        sortBy: sortKey,
        sortOrder: sortDir,
        limit: PAGE_SIZE,
        offset,
        ...(sourceFilter ? { source: sourceFilter } : {}),
        ...(listId ? { listId } : {}),
        ...(tagId ? { tags: tagId } : {})
      });
      const rawContacts = response.contacts || response || [];
      const mapped = rawContacts.map((c: any) => ({
        id: c.id,
        name: c.full_name || c.email || 'Unknown',
        email: c.email || '',
        company: c.company || '',
        title: c.job_title || '',
        phone: c.phone || '',
        avatar: c.photo_url || '',
        tags: c.tags || [],
        lastContacted: c.last_contacted || null,
        notes: c.notes ? [{ id: '1', content: c.notes, createdAt: new Date().toISOString() }] : [],
        source: c.linkedin_url ? 'linkedin' : c.google_contact_id ? 'google' : 'manual',
        createdAt: c.created_at || new Date().toISOString(),
        contactCreatedDate: c.contact_created_date || null,
        linkedinUrl: c.linkedin_url || '',
        bio: c.bio || '',
        address: c.address || '',
        phones: c.phones || [],
        emails: c.emails || [],
        ai_summary: c.ai_summary || null,
        lists: [],
        activities: [],
      })) as Contact[];
      return { contacts: mapped, total: response.pagination?.total ?? mapped.length };
    },
  });

  const apiContacts = contactsResponse?.contacts ?? [];
  const totalContacts = contactsResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalContacts / PAGE_SIZE));

  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    setContacts(apiContacts);
  }, [apiContacts]);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: tagsDataResponse } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => await organizeService.getTags()
  });
  const tagsList = tagsDataResponse?.tags || [];

  const { data: listsDataResponse } = useQuery({
    queryKey: ['lists'],
    queryFn: async () => await organizeService.getLists()
  });
  const userLists = listsDataResponse?.lists || [];

  const { data: syncStatusData } = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => await contactsService.getSyncStatus(),
    refetchInterval: (query) => query.state.data?.isSyncing ? 10000 : false, // Poll if syncing
  });
  const lastSyncTime = syncStatusData?.lastSync?.completed_at;
  const isBackendSyncing = syncStatusData?.isSyncing || false;
  const syncInProgress = isSyncing || isBackendSyncing;
  const syncHistory = syncStatusData?.history || [];

  const allTagsInUse = Array.from(new Set(contacts.flatMap((c) => c.tags.map((t: any) => t.name))));

  const filteredAndSorted = useMemo(() => {
    let result = contacts.filter((contact) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        contact.name.toLowerCase().includes(q) ||
        contact.company.toLowerCase().includes(q) ||
        contact.email.toLowerCase().includes(q) ||
        contact.title.toLowerCase().includes(q);
      const matchesFilter = activeFilter === 'all' || contact.tags.some((t: any) => t.name === activeFilter);
      return matchesSearch && matchesFilter;
    });

    result.sort((a, b) => {
      const cmp = String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [contacts, searchQuery, activeFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSorted.map((c) => c.id)));
    }
  };

  const queryClient = useQueryClient();

  const applyBulkTag = async (tag: any) => {
    try {
      await organizeService.bulkAddTagToContacts(Array.from(selectedIds), tag.id);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    }
  };

  const removeBulkTag = async (tag: any) => {
    try {
      await organizeService.bulkRemoveTagFromContacts(Array.from(selectedIds), tag.id);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    }
  };

  const applyBulkList = async (list: any) => {
    try {
      await organizeService.bulkAddContactsToList(list.id, Array.from(selectedIds));
      toast({
        title: "Added to List",
        description: `Successfully added contacts to ${list.name}.`,
      });
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add contacts to list.",
      });
    }
  };

  const handleContactUpdate = (updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedContact(updated);
  };

  return (
    <div className="flex flex-1 h-screen overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
              <p className="text-sm text-muted-foreground">
                {filteredAndSorted.length} people
                {selectedIds.size > 0 && (
                  <span className="text-primary font-medium"> · {selectedIds.size} selected</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <TagManager />
              <Button variant="outline" disabled={syncInProgress} className="gap-2 h-10 shadow-sm border-border bg-background hover:bg-accent hover:text-accent-foreground" onClick={async () => {
                try {
                  setIsSyncing(true);
                  await contactsService.syncContacts();
                  queryClient.invalidateQueries({ queryKey: ['contacts'] });
                  queryClient.invalidateQueries({ queryKey: ['sync-status'] });
                  toast({
                    title: "Sync Triggered",
                    description: "Google Contacts and Calendar Events sync has started.",
                  });
                } catch (e) {
                  console.error(e);
                  toast({
                    variant: "destructive",
                    title: "Sync Failed",
                    description: "Failed to trigger Google contacts and Calendar events sync.",
                  });
                } finally {
                  setIsSyncing(false);
                }
              }}>
                {syncInProgress ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                )}
                <div className="flex flex-col items-start leading-none mt-0.5">
                  <span className="text-sm border-r border-border/50 pr-2 pb-0.5">Sync Google Contacts/Calendar Events</span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-10 shadow-sm border-border bg-background hover:bg-accent hover:text-accent-foreground"
                onClick={() => router.push('/dashboard/dedup')}
              >
                <GitMerge className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Merge & Fix</span>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 bg-background hover:bg-accent border-border shadow-sm">
                    <History className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <h4 className="text-sm font-semibold">Google Sync History</h4>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {syncHistory.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">No history available</div>
                    ) : (
                      syncHistory.map((item: any) => (
                        <div key={item.id} className="p-3 border-b border-border last:border-0 text-sm flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium flex items-center gap-1.5">
                              {item.status === 'success' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              )}
                              Contacts
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.started_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {item.status === 'success'
                              ? `Added/Updated ${item.contacts_synced} contacts in ${Math.round(item.duration_ms / 1000)}s`
                              : `Failed: ${item.error_message || 'Unknown error'}`}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button size="sm" className="gap-2 h-10 shadow-sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Contact
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, title, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-0"
            />
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {/* Tag Filters */}
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <button
                onClick={() => setActiveFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                  activeFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                All
              </button>
              {allTagsInUse.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveFilter(tag)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                    activeFilter === tag
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-border shrink-0" />

            {/* Source Filters */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {[
                { value: '', label: 'All Sources', icon: null },
                { value: 'google', label: 'Google', icon: Globe },
                { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                { value: 'manual', label: 'Manual', icon: UserPlus },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.value}
                    onClick={() => setSourceFilter(s.value)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
                      sourceFilter === s.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {s.label}
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="px-6 py-2 bg-accent border-b border-border flex items-center gap-3">
            <span className="text-xs font-medium text-accent-foreground">
              {selectedIds.size} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                  <Tag className="w-3 h-3" /> Add Tag
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {tagsList.map((tag: any) => (
                  <DropdownMenuItem key={tag.id} onClick={() => applyBulkTag(tag)}>
                    <span
                      className={cn('w-2 h-2 rounded-full mr-2')}
                      style={{ backgroundColor: tag.color || '#3B82F6' }}
                    />
                    {tag.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                  <List className="w-3 h-3" /> Add to List
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {userLists.map((list: any) => (
                  <DropdownMenuItem key={list.id} onClick={() => applyBulkList(list)}>
                    {list.name}
                  </DropdownMenuItem>
                ))}
                {userLists.length === 0 && (
                  <DropdownMenuItem disabled>No lists found</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                  <X className="w-3 h-3" /> Remove Tag
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {tagsList.map((tag: any) => (
                  <DropdownMenuItem key={tag.id} onClick={() => removeBulkTag(tag)}>
                    {tag.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </Button>
          </div>
        )}

        {/* Grid Header */}
        <div className="grid grid-cols-[40px_1fr_1fr_1fr_140px] gap-0 px-4 py-2 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0}
              onCheckedChange={toggleSelectAll}
            />
          </div>
          <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors px-2">
            Name <SortIcon col="name" />
          </button>
          <button onClick={() => toggleSort('company')} className="flex items-center gap-1 hover:text-foreground transition-colors px-2">
            Company <SortIcon col="company" />
          </button>
          <button onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-foreground transition-colors px-2">
            Title <SortIcon col="title" />
          </button>
          <div className="px-2">Tags</div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {filteredAndSorted.map((contact) => {
            const initials = contact.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
            const isSelected = selectedIds.has(contact.id);
            const isDetailOpen = selectedContact?.id === contact.id;

            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={cn(
                  'grid grid-cols-[40px_1fr_1fr_1fr_140px] gap-0 px-4 py-2.5 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer text-sm',
                  isDetailOpen && 'bg-accent',
                  isSelected && 'bg-primary/5'
                )}
              >
                <div className="flex items-center justify-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(contact.id)} />
                </div>
                <div className="flex items-center gap-2.5 px-2 min-w-0">
                  {contact.avatar ? (
                    <img src={contact.avatar} alt={contact.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-primary/10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                      {initials}
                    </div>
                  )}
                  <span className="truncate font-medium text-foreground">{contact.name}</span>
                  {(() => { const SIcon = sourceIconMap[contact.source]; return SIcon ? <SIcon className="w-3 h-3 text-muted-foreground shrink-0" /> : null; })()}
                </div>
                <div className="flex items-center px-2 text-muted-foreground truncate">{contact.company}</div>
                <div className="flex items-center px-2 text-muted-foreground truncate">{contact.title}</div>
                <div className="flex items-center gap-1 px-2 overflow-hidden">
                  {contact.tags.slice(0, 2).map((tag: any) => (
                    <span
                      key={tag.id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
                      style={{ backgroundColor: tag.color || '#3B82F6', color: tag.text_color || '#FFFFFF' }}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {contact.tags.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{contact.tags.length - 2}</span>
                  )}
                </div>
              </div>
            );
          })}
          {filteredAndSorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No contacts found</p>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-background">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-medium text-foreground">{Math.min(page * PAGE_SIZE, totalContacts)}</span> of{' '}
            <span className="font-medium text-foreground">{totalContacts}</span> contacts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdate={handleContactUpdate}
          onDelete={() => {
            setSelectedContact(null);
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }}
          listId={listId || undefined}
        />
      )}
      
      <CreateContactModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
};

export default ContactGrid;
