import { useState, useEffect } from 'react';
import { Bell, Check, Clock, Plus, User, Pencil, Trash2, X, Loader2, Repeat } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebounce } from '../hooks/use-debounce';
import { ConfirmDialog, useConfirmDialog } from '@/components/ConfirmDialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remindersService, contactsService } from '@/services/api';

const PAGE_SIZE = 10;

const RemindersView = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ contactId: '', contactName: '', title: '', dueDate: '', dueTime: '09:00', recurrence: '', customDays: '' });
  const [comboOpen, setComboOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const debouncedSearch = useDebounce(contactSearch, 300);
  const confirmDialog = useConfirmDialog();
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'past' | 'completed' | 'recurring'>('upcoming');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Fetch all reminders globally
  const { data: remindersData, isLoading: loadingReminders } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const res = await remindersService.getAllReminders();
      return res.reminders || [];
    },
  });

  // Fetch minimal contact payload for dropdown assignment with query
  const { data: contactsData } = useQuery({
    queryKey: ['contacts-min', debouncedSearch],
    queryFn: async () => {
      const payload: any = { limit: 50 };
      if (debouncedSearch) payload.q = debouncedSearch;
      const res = await contactsService.getContacts(payload);
      return res.contacts || [];
    },
  });

  const reminders = remindersData || [];
  const contacts = contactsData || [];

  const updateMutation = useMutation({
    mutationFn: async ({ id, contactId, title, dueDate, isCompleted, recurrence }: any) => {
      return await remindersService.updateReminder(id, title, dueDate, isCompleted, contactId, recurrence);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const toggleComplete = (id: string, isCompleted: boolean) => {
    updateMutation.mutate({ id, isCompleted: !isCompleted });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await remindersService.createReminder(payload.contactId, payload.title, payload.dueDate, payload.recurrence || undefined);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await remindersService.deleteReminder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ contactId: '', contactName: '', title: '', dueDate: '', dueTime: '09:00', recurrence: '', customDays: '' });
    setContactSearch('');
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    const d = new Date(r.dueDate);
    setForm({
      contactId: String(r.contactId),
      contactName: r.contactName || '',
      title: r.title,
      dueDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      dueTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      recurrence: r.recurrence?.startsWith('custom_') ? 'custom' : (r.recurrence || ''),
      customDays: r.recurrence?.startsWith('custom_') ? r.recurrence.replace('custom_', '') : ''
    });
    setContactSearch('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Keep as absolute local string format (YYYY-MM-DDTHH:mm:ss) 
    // to strictly prevent Postgres from subtracting timezone offsets
    const fullDueDate = form.dueDate
      ? `${form.dueDate}T${form.dueTime || '09:00'}:00`
      : form.dueDate;
    if (editing) {
      const recurrenceVal = form.recurrence === 'custom' && form.customDays ? `custom_${form.customDays}` : (form.recurrence || null);
      await updateMutation.mutateAsync({
        id: editing.id,
        contactId: form.contactId,
        title: form.title,
        dueDate: fullDueDate,
        recurrence: recurrenceVal
      });
    } else {
      const recurrenceVal = form.recurrence === 'custom' && form.customDays ? `custom_${form.customDays}` : (form.recurrence || undefined);
      await createMutation.mutateAsync({ ...form, dueDate: fullDueDate, recurrence: recurrenceVal });
    }
    setDialogOpen(false);
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const timeStr = format(date, 'h:mm a');
    if (isToday(date)) return `Today ${timeStr}`;
    if (isTomorrow(date)) return `Tomorrow ${timeStr}`;
    return `${format(date, 'MMM d, yyyy')} ${timeStr}`;
  };

  const now = new Date();
  const sortAsc = (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  const recurring = reminders.filter((r: any) => !!r.recurrence).sort(sortAsc);
  const upcoming = reminders.filter((r: any) => !r.isCompleted && !r.recurrence && !isPast(new Date(r.dueDate))).sort(sortAsc);
  const past = reminders.filter((r: any) => !r.isCompleted && !r.recurrence && isPast(new Date(r.dueDate))).sort(sortAsc);
  const completed = reminders.filter((r: any) => r.isCompleted && !r.recurrence).sort(sortAsc);

  const filterCounts = { upcoming: upcoming.length, past: past.length, completed: completed.length, recurring: recurring.length };
  const filteredList = activeFilter === 'upcoming' ? upcoming : activeFilter === 'past' ? past : activeFilter === 'recurring' ? recurring : completed;
  const visibleList = filteredList.slice(0, visibleCount);
  const hasMore = filteredList.length > visibleCount;

  // Reset visible count when filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeFilter]);

  return (
    <div className="flex-1 h-screen overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Reminders</h1>
            <p className="text-sm text-muted-foreground">
              {upcoming.length} upcoming, {past.length} overdue
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New Reminder
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mb-6">
          {([
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Overdue' },
            { key: 'recurring', label: 'Recurring' },
            { key: 'completed', label: 'Completed' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                activeFilter === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {label} {filterCounts[key] > 0 && <span className="ml-1">({filterCounts[key]})</span>}
            </button>
          ))}
        </div>

        {loadingReminders ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className={cn("space-y-2", activeFilter === 'completed' && "opacity-60")}>
              {visibleList.map((reminder: any) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onToggle={() => toggleComplete(reminder.id, reminder.isCompleted)}
                  onEdit={() => openEdit(reminder)}
                  onDelete={() => confirmDialog.open({ title: 'Delete Reminder', description: 'Are you sure you want to delete this reminder? This action cannot be undone.', confirmLabel: 'Delete', onConfirm: () => deleteMutation.mutateAsync(reminder.id) })}
                  getDateLabel={getDateLabel}
                />
              ))}
              {filteredList.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {activeFilter === 'upcoming' ? 'No upcoming reminders' : activeFilter === 'past' ? 'No overdue reminders' : activeFilter === 'recurring' ? 'No recurring reminders' : 'No completed reminders'}
                  </p>
                </div>
              )}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="text-xs"
                >
                  Load more ({filteredList.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Reminder' : 'New Reminder'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Contact</label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="w-full justify-between font-normal text-muted-foreground"
                  >
                    {form.contactId
                      ? form.contactName || contacts.find((c: any) => String(c.id) === String(form.contactId))?.full_name || "Unknown"
                      : "Select a contact..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search contact..."
                      value={contactSearch}
                      onValueChange={setContactSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No contact found.</CommandEmpty>
                      {contacts.map((c: any) => (
                        <CommandItem
                          key={c.id}
                          onSelect={() => {
                            setForm(f => ({ ...f, contactId: String(c.id), contactName: c.full_name || c.email }));
                            setComboOpen(false);
                          }}
                        >
                          <span className="truncate">{c.full_name || c.email || 'Unknown'}</span>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0",
                              form.contactId === String(c.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Task Title</label>
              <Input
                value={form.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="What do you need to do?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Time</label>
                <Input
                  type="time"
                  value={form.dueTime}
                  onChange={(e) => setForm((f) => ({ ...f, dueTime: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Recurrence</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '', label: 'None' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'custom', label: 'Custom' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, recurrence: opt.value }))}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      form.recurrence === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-muted-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {opt.value && <Repeat className="w-3 h-3 inline mr-1" />}
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.recurrence === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Every</span>
                  <Input
                    type="number"
                    min="1"
                    value={form.customDays}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, customDays: e.target.value }))}
                    className="h-7 w-16 text-xs text-center"
                    placeholder="7"
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.contactId || !form.title || !form.dueDate || createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Save Changes' : 'Create Reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...confirmDialog.props} />
    </div>
  );
};

const ReminderCard = ({
  reminder,
  onToggle,
  onEdit,
  onDelete,
  getDateLabel,
}: {
  reminder: any;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getDateLabel: (d: string) => string;
}) => {
  const isOverdue = isPast(new Date(reminder.dueDate)) && !reminder.isCompleted;

  return (
    <div className="glass-card rounded-xl px-4 py-3 flex items-start gap-3 group">
      <button
        onClick={onToggle}
        className={cn(
          'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          reminder.isCompleted
            ? 'bg-success border-success'
            : 'border-border hover:border-primary'
        )}
      >
        {reminder.isCompleted && <Check className="w-3 h-3 text-success-foreground" />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            reminder.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
          )}
        >
          {reminder.title}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            {reminder.contactName || 'Contact'}
          </span>
          <span
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
            )}
          >
            <Clock className="w-3 h-3" />
            {getDateLabel(reminder.dueDate)}
          </span>
          {reminder.recurrence && (
            <span className="flex items-center gap-1 text-xs text-primary/80 font-medium">
              <Repeat className="w-3 h-3" />
              {reminder.recurrence?.startsWith('custom_')
                ? `Every ${reminder.recurrence.replace('custom_', '')} days`
                : reminder.recurrence.charAt(0).toUpperCase() + reminder.recurrence.slice(1)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 rounded hover:bg-muted transition-colors">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
    </div>
  );
};

export default RemindersView;
