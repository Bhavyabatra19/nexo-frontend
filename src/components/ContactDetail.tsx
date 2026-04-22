import { X, Mail, Phone, Building2, Briefcase, Calendar, MessageSquare, Tag, Send, Bell, Edit2, Trash2, CheckCircle, Circle, Clock, Plus, UserPlus, RefreshCw, Loader2, Gift, Heart, Cake, Repeat, MapPin, FileText, Sparkles, ChevronDown } from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { type Contact, type ActivityEvent, type ActivityType, tagColors, allTags } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { notesService, remindersService, activitiesService, organizeService, contactsService, calendarService } from '@/services/api';
import { ConfirmDialog, useConfirmDialog } from '@/components/ConfirmDialog';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';

interface ContactDetailProps {
  contact: Contact;
  onClose: () => void;
  onUpdate: (contact: Contact) => void;
  onDelete?: (contactId: string) => void;
  listId?: string;
}

const sourceLabels: Record<string, string> = {
  google: 'Google Contacts',
  linkedin: 'LinkedIn',
  manual: 'Manual Entry',
};

const activityIcons: Record<string, typeof Clock> = {
  note_added: MessageSquare,
  note_deleted: Trash2,
  reminder_created: Bell,
  reminder_completed: CheckCircle,
  reminder_deleted: Trash2,
  tag_changed: Tag,
  contact_created: UserPlus,
  contact_updated: RefreshCw,
};

const ContactDetail = ({ contact, onClose, onUpdate, onDelete, listId }: ContactDetailProps) => {
  const [activeTab, setActiveTab] = useState('details');
  const confirmDialog = useConfirmDialog();
  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editNoteTitle, setEditNoteTitle] = useState('');

  // Reminders state
  const [reminders, setReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderRecurrence, setReminderRecurrence] = useState('');
  const [customRecurrenceDays, setCustomRecurrenceDays] = useState('');
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editReminderMessage, setEditReminderMessage] = useState('');
  const [editReminderDate, setEditReminderDate] = useState('');
  const [editReminderTime, setEditReminderTime] = useState('09:00');
  const [editReminderRecurrence, setEditReminderRecurrence] = useState('');
  const [editCustomRecurrenceDays, setEditCustomRecurrenceDays] = useState('');

  // Activities state
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Calendar events state
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loadingCalendarEvents, setLoadingCalendarEvents] = useState(false);

  // Important dates state
  const [importantDates, setImportantDates] = useState<{ label: string; date: string }[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [showDateForm, setShowDateForm] = useState(false);
  const [newDateLabel, setNewDateLabel] = useState('Birthday');
  const [newDateValue, setNewDateValue] = useState('');
  const [newDateCustomName, setNewDateCustomName] = useState('');
  const [editingDateIdx, setEditingDateIdx] = useState<number | null>(null);

  // Main details edit state
  const [isEditingMain, setIsEditingMain] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isUpdatingMain, setIsUpdatingMain] = useState(false);

  // Delete state
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isAiOverviewOpen, setIsAiOverviewOpen] = useState(false);

  useEffect(() => {
    const handleAiSummary = async () => {
      setAiSummary(contact.ai_summary || null);
      if (!contact.ai_summary) {
        setLoadingSummary(true);
        try {
          const res = await contactsService.generateAiSummary(contact.id);
          if (res.success && res.ai_summary) {
            setAiSummary(res.ai_summary);
            onUpdate({ ...contact, ai_summary: res.ai_summary });
          }
        } catch (e) {
          console.error("Failed to generate AI summary", e);
        } finally {
          setLoadingSummary(false);
        }
      }
    };
    handleAiSummary();
  }, [contact.id, contact.ai_summary]);

  useEffect(() => {
    if (isEditingMain) {
      setEditFormData({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        title: contact.title || '',
        linkedinUrl: contact.linkedinUrl || '',
        instagramUrl: contact.instagramUrl || contact.instagram_url || '',
        bio: contact.bio || '',
        address: contact.address || '',
        phones: contact.phones?.length ? [...contact.phones] : [{ value: contact.phone || '', label: 'Mobile' }],
        emails: contact.emails?.length ? [...contact.emails] : [{ value: contact.email || '', label: 'Work' }],
        customLinks: contact.customLinks || contact.custom_links || [],
      });
    }
  }, [isEditingMain, contact]);

  const initials = contact.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '';

  const { data: tagsDataResponse } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => await organizeService.getTags()
  });
  const systemTags = tagsDataResponse?.tags || [];

  useEffect(() => {
    if (activeTab === 'notes') fetchNotes();
    if (activeTab === 'reminders') fetchReminders();
    if (activeTab === 'timeline') fetchActivities();
    if (activeTab === 'calendar') fetchCalendarEvents();
  }, [contact.id, activeTab]);

  // Refresh everything quietly when a new contact is loaded
  useEffect(() => {
    setNotes([]);
    setReminders([]);
    setActivities([]);
    setCalendarEvents([]);
    setImportantDates([]);
    fetchImportantDates();
    if (activeTab === 'notes') fetchNotes();
    if (activeTab === 'reminders') fetchReminders();
    if (activeTab === 'timeline') fetchActivities();
    if (activeTab === 'calendar') fetchCalendarEvents();
  }, [contact.id]);

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await notesService.getNotes(contact.id);
      if (res.success) setNotes(res.notes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchReminders = async () => {
    setLoadingReminders(true);
    try {
      const res = await remindersService.getReminders(contact.id);
      if (res.success) setReminders(res.reminders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReminders(false);
    }
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await activitiesService.getActivities(contact.id);
      if (res.success) setActivities(res.activities);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchCalendarEvents = async () => {
    const email = contact.email;
    if (!email) return;
    setLoadingCalendarEvents(true);
    try {
      const res = await calendarService.getEventsByAttendee(email);
      if (res.success) setCalendarEvents(res.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCalendarEvents(false);
    }
  };

  // --- Important Dates Actions ---
  const fetchImportantDates = async () => {
    setLoadingDates(true);
    try {
      const res = await contactsService.getImportantDates(contact.id);
      if (res.success) setImportantDates(res.importantDates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDates(false);
    }
  };

  const handleUpdateMain = async () => {
    setIsUpdatingMain(true);
    try {
      // Filter out empty phone/email/link entries
      const cleanedPhones = (editFormData.phones || []).filter((p: any) => p.value.trim());
      const cleanedEmails = (editFormData.emails || []).filter((e: any) => e.value.trim());
      const cleanedLinks = (editFormData.customLinks || []).filter((l: any) => l.url.trim());

      // Set primary email/phone from first entries
      const payload = {
        ...editFormData,
        phones: cleanedPhones,
        emails: cleanedEmails,
        customLinks: cleanedLinks,
        email: cleanedEmails[0]?.value || editFormData.email || '',
        phone: cleanedPhones[0]?.value || editFormData.phone || '',
      };

      const res = await contactsService.updateContact(contact.id, payload);
      if (res.success) {
        onUpdate({
          ...contact,
          ...payload
        });
        setIsEditingMain(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingMain(false);
    }
  };

  const handleDeleteContact = async () => {
    setIsDeletingContact(true);
    setShowDeleteOptions(false);
    try {
      const res = await contactsService.deleteContact(contact.id);
      if (res.success) {
        onDelete?.(contact.id);
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
    } finally {
      setIsDeletingContact(false);
    }
  };

  const handleRemoveFromList = async () => {
    if (!listId) return;
    setIsDeletingContact(true);
    setShowDeleteOptions(false);
    try {
      await organizeService.removeContactFromList(listId, contact.id);
      onDelete?.(contact.id);
      onClose();
    } catch (error) {
      console.error('Failed to remove from list:', error);
    } finally {
      setIsDeletingContact(false);
    }
  };

  const saveImportantDates = async (updated: { label: string; date: string }[]) => {
    try {
      const res = await contactsService.updateImportantDates(contact.id, updated);
      if (res.success) setImportantDates(res.importantDates || updated);
    } catch (e) {
      console.error(e);
    }
  };

  const addDate = async () => {
    if (!newDateValue) return;
    const finalLabel = newDateLabel === 'Custom' && newDateCustomName.trim() ? newDateCustomName.trim() : newDateLabel;
    const updated = [...importantDates, { label: finalLabel, date: newDateValue }];
    await saveImportantDates(updated);

    // Also create a yearly recurring reminder for this important date
    try {
      const dueDate = new Date(`${newDateValue}T09:00:00`).toISOString();
      await remindersService.createReminder(contact.id, `${finalLabel} - ${contact.name}`, dueDate, 'yearly');
      if (activeTab === 'reminders') fetchReminders();
    } catch (e) {
      console.error('Failed to create reminder for important date:', e);
    }

    setNewDateValue('');
    setNewDateCustomName('');
    setShowDateForm(false);
  };

  const deleteDate = async (idx: number) => {
    const updated = importantDates.filter((_, i) => i !== idx);
    await saveImportantDates(updated);
  };

  const startEditDate = (idx: number) => {
    setEditingDateIdx(idx);
    setNewDateLabel(importantDates[idx].label);
    setNewDateValue(importantDates[idx].date);
  };

  const saveEditDate = async (idx: number) => {
    if (!newDateValue) return;
    const finalLabel = newDateLabel === 'Custom' && newDateCustomName.trim() ? newDateCustomName.trim() : newDateLabel;
    const updated = importantDates.map((d, i) => i === idx ? { label: finalLabel, date: newDateValue } : d);
    await saveImportantDates(updated);
    setEditingDateIdx(null);
    setNewDateCustomName('');
  };

  // --- Notes Actions ---
  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      const res = await notesService.createNote(contact.id, newNote.trim(), newNoteTitle.trim() || undefined);
      if (res.success) {
        setNotes([res.note, ...notes]);
        setNewNote('');
        setNewNoteTitle('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await notesService.deleteNote(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (e) {
      console.error(e);
    }
  };

  const startEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
    setEditNoteTitle(note.title || '');
  };

  const saveEditNote = async () => {
    if (!editingNoteId || !editNoteContent.trim()) return;
    try {
      const res = await notesService.updateNote(editingNoteId, editNoteContent.trim(), editNoteTitle.trim() || undefined);
      if (res.success) {
        setNotes(notes.map((n) => (n.id === editingNoteId ? res.note : n)));
        setEditingNoteId(null);
        setEditNoteContent('');
        setEditNoteTitle('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Reminders Actions ---
  const getRecurrenceValue = (recurrence: string, customDays: string) => {
    if (recurrence === 'custom' && customDays) return `custom_${customDays}`;
    return recurrence || undefined;
  };

  const parseRecurrence = (recurrence: string) => {
    if (recurrence?.startsWith('custom_')) {
      return { type: 'custom', days: recurrence.replace('custom_', '') };
    }
    return { type: recurrence || '', days: '' };
  };

  const addReminder = async () => {
    if (!reminderMessage.trim() || !reminderDate) return;
    try {
      const recurrenceVal = getRecurrenceValue(reminderRecurrence, customRecurrenceDays);
      const fullDueDate = `${reminderDate}T${reminderTime || '09:00'}:00`;
      const res = await remindersService.createReminder(contact.id, reminderMessage.trim(), fullDueDate, recurrenceVal);
      if (res.success) {
        setReminders([...reminders, res.reminder].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
        setReminderMessage('');
        setReminderDate('');
        setReminderTime('09:00');
        setReminderRecurrence('');
        setCustomRecurrenceDays('');
        setShowReminderForm(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleReminderComplete = async (reminder: any) => {
    try {
      const res = await remindersService.updateReminder(reminder.id, undefined, undefined, !reminder.isCompleted);
      if (res.success) {
        setReminders(reminders.map((r) => (r.id === reminder.id ? res.reminder : r)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await remindersService.deleteReminder(id);
      setReminders(reminders.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const startEditReminder = (r: any) => {
    setEditingReminderId(r.id);
    setEditReminderMessage(r.title);
    const dateObj = new Date(r.dueDate);
    setEditReminderDate(`${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`);
    setEditReminderTime(`${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`);
    const parsed = parseRecurrence(r.recurrence);
    setEditReminderRecurrence(parsed.type);
    setEditCustomRecurrenceDays(parsed.days);
  };

  const saveEditReminder = async () => {
    if (!editingReminderId) return;
    try {
      const recurrenceVal = getRecurrenceValue(editReminderRecurrence, editCustomRecurrenceDays) || null;
      const fullDueDate = `${editReminderDate}T${editReminderTime || '09:00'}:00`;
      const res = await remindersService.updateReminder(editingReminderId, editReminderMessage.trim(), fullDueDate, false, undefined, recurrenceVal);
      if (res.success) {
        let updatedReminders = reminders.map((r) => (r.id === editingReminderId ? res.reminder : r));
        updatedReminders.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setReminders(updatedReminders);
        setEditingReminderId(null);
        setEditCustomRecurrenceDays('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Tags ---
  const toggleTag = async (tag: any) => {
    const isPresent = contact.tags.some((t: any) => t.id === tag.id);
    try {
      if (isPresent) {
        await organizeService.removeTagFromContact(contact.id, tag.id);
        const tags = contact.tags.filter((t: any) => t.id !== tag.id);
        onUpdate({ ...contact, tags });
      } else {
        await organizeService.addTagToContact(contact.id, tag.id);
        const tags = [...contact.tags, tag];
        onUpdate({ ...contact, tags });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const timeStr = format(d, 'h:mm a');
    if (isToday(d)) return `Today ${timeStr}`;
    if (isPast(d)) return `Overdue · ${format(d, 'MMM d')} ${timeStr}`;
    return format(d, 'MMM d, yyyy');
  };

  return (
    <div className="w-[480px] border-l border-border bg-card h-full flex flex-col overflow-hidden shadow-2xl z-50 transition-all">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border shrink-0 bg-background/50 backdrop-blur">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {contact.avatar ? (
              <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full object-cover shadow-sm bg-primary/5 border border-primary/10 shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-base font-semibold text-primary shadow-sm shrink-0">
                {initials}
              </div>
            )}
            {isEditingMain ? (
              <div className="space-y-1.5 flex-1 min-w-0">
                <Input
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Full Name"
                  className="font-semibold text-base h-8"
                />
                <Input
                  value={editFormData.title}
                  onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Job Title"
                  className="h-7 text-xs"
                />
                <Input
                  value={editFormData.company}
                  onChange={e => setEditFormData({ ...editFormData, company: e.target.value })}
                  placeholder="Company"
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">{contact.name}</h2>
                <p className="text-xs text-muted-foreground truncate">
                  {contact.title}{contact.title && contact.company ? ' at ' : ''}{contact.company}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2 relative">
            <button
              onClick={() => {
                if (listId) {
                  setShowDeleteOptions(prev => !prev);
                } else {
                  confirmDialog.open({
                    title: 'Delete Contact',
                    description: `Once deleted, "${contact.name}" cannot be recovered. All notes, reminders, and AI data will be permanently removed.`,
                    confirmLabel: 'Delete Permanently',
                    onConfirm: () => handleDeleteContact(),
                  });
                }
              }}
              disabled={isDeletingContact}
              className="p-1.5 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete contact"
            >
              {isDeletingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            {showDeleteOptions && listId && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-1.5 min-w-[180px]">
                <button
                  onClick={handleRemoveFromList}
                  className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-muted transition-colors text-foreground"
                >
                  Remove from list
                </button>
                <button
                  onClick={() => {
                    setShowDeleteOptions(false);
                    confirmDialog.open({
                      title: 'Delete Contact',
                      description: `Once deleted, "${contact.name}" cannot be recovered. All notes, reminders, and AI data will be permanently removed.`,
                      confirmLabel: 'Delete Permanently',
                      onConfirm: () => handleDeleteContact(),
                    });
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-destructive/10 transition-colors text-destructive"
                >
                  Delete permanently
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isEditingMain ? (
          <div className="space-y-2 mb-2 ml-[60px]">
            <Textarea
              value={editFormData.bio}
              onChange={e => setEditFormData({ ...editFormData, bio: e.target.value })}
              placeholder="Short bio..."
              className="text-sm resize-none min-h-[60px]"
            />
          </div>
        ) : contact.bio ? (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed ml-[60px]">{contact.bio}</p>
        ) : null}

        {/* AI Overview */}
        {!isEditingMain && (
          loadingSummary ? (
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating AI Overview...
            </div>
          ) : aiSummary ? (
            <Collapsible open={isAiOverviewOpen} onOpenChange={setIsAiOverviewOpen} className="mt-4 rounded-lg bg-primary/5 border border-primary/10">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-3 hover:bg-primary/10 rounded-lg transition-colors">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Overview
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-primary transition-transform duration-200", isAiOverviewOpen ? "rotate-180" : "")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                <div className="px-3 pb-3 max-h-[120px] overflow-y-auto pr-1 prose prose-sm max-w-none text-xs text-foreground/90 prose-p:leading-relaxed prose-headings:text-xs prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-foreground">
                  <ReactMarkdown>
                    {aiSummary}
                  </ReactMarkdown>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : null
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {contact.tags.map((tag: any) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag)}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: tag.color || '#3B82F6', color: tag.text_color || '#FFFFFF' }}
              title="Click to remove"
            >
              {tag.name}
            </button>
          ))}
          <div className="flex gap-1 flex-wrap mt-0.5">
            {systemTags
              .filter((t: any) => !contact.tags.some((ct: any) => ct.id === t.id))
              .slice(0, 3)
              .map((tag: any) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border"
                >
                  + {tag.name}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setIsAiOverviewOpen(false); }} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-6 mt-4 mb-2 h-9 bg-muted/50 shrink-0 p-1">
          {[
            { value: 'details', label: 'Details', count: 0 },
            { value: 'notes', label: 'Notes', count: notes.length },
            { value: 'reminders', label: 'Tasks', count: reminders.length },
            { value: 'timeline', label: 'Timeline', count: activities.length },
            { value: 'calendar', label: 'Events', count: calendarEvents.length },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs px-2 flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="data-[state=active]:flex data-[state=active]:flex-col flex-1 mt-0 outline-none overflow-hidden">
          <div className="overflow-y-auto px-6 py-4 space-y-5">
            <div className="space-y-3.5 glass-card p-4 rounded-xl relative">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Info</h3>
                {isEditingMain ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setIsEditingMain(false)}>Cancel</Button>
                    <Button size="sm" className="h-6 text-xs px-2" disabled={isUpdatingMain} onClick={handleUpdateMain}>
                      {isUpdatingMain ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsEditingMain(true)}>
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>

              {isEditingMain ? (
                <div className="space-y-4">
                  {/* Emails */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Emails</label>
                    {(editFormData.emails || []).map((em: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={em.label}
                          onChange={e => {
                            const updated = [...editFormData.emails];
                            updated[idx] = { ...updated[idx], label: e.target.value };
                            setEditFormData({ ...editFormData, emails: updated });
                          }}
                          className="bg-secondary text-xs rounded px-2 py-1.5 border border-border w-[90px]"
                        >
                          {['Work', 'Personal', 'Other'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <Input
                          className="h-8 text-sm flex-1"
                          value={em.value}
                          onChange={e => {
                            const updated = [...editFormData.emails];
                            updated[idx] = { ...updated[idx], value: e.target.value };
                            setEditFormData({ ...editFormData, emails: updated });
                          }}
                          type="email"
                          placeholder="email@example.com"
                        />
                        <button
                          onClick={() => {
                            const updated = editFormData.emails.filter((_: any, i: number) => i !== idx);
                            setEditFormData({ ...editFormData, emails: updated });
                          }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditFormData({ ...editFormData, emails: [...(editFormData.emails || []), { value: '', label: 'Work' }] })}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <Plus className="w-3 h-3" /> Add email
                    </button>
                  </div>

                  {/* Phones */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Phones</label>
                    {(editFormData.phones || []).map((ph: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={ph.label}
                          onChange={e => {
                            const updated = [...editFormData.phones];
                            updated[idx] = { ...updated[idx], label: e.target.value };
                            setEditFormData({ ...editFormData, phones: updated });
                          }}
                          className="bg-secondary text-xs rounded px-2 py-1.5 border border-border w-[90px]"
                        >
                          {['Mobile', 'Work', 'Home', 'Other'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <Input
                          className="h-8 text-sm flex-1"
                          value={ph.value}
                          onChange={e => {
                            const updated = [...editFormData.phones];
                            updated[idx] = { ...updated[idx], value: e.target.value };
                            setEditFormData({ ...editFormData, phones: updated });
                          }}
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                        />
                        <button
                          onClick={() => {
                            const updated = editFormData.phones.filter((_: any, i: number) => i !== idx);
                            setEditFormData({ ...editFormData, phones: updated });
                          }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditFormData({ ...editFormData, phones: [...(editFormData.phones || []), { value: '', label: 'Mobile' }] })}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <Plus className="w-3 h-3" /> Add phone
                    </button>
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Address</label>
                    <Input className="h-8 text-sm" value={editFormData.address} onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} placeholder="123 Main St, City, Country" />
                  </div>

                  {/* LinkedIn */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">LinkedIn Profile URL</label>
                    <Input className="h-8 text-sm" value={editFormData.linkedinUrl} onChange={e => setEditFormData({ ...editFormData, linkedinUrl: e.target.value })} type="url" placeholder="https://linkedin.com/in/..." />
                  </div>

                  {/* Instagram */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Instagram</label>
                    <Input className="h-8 text-sm" value={editFormData.instagramUrl} onChange={e => setEditFormData({ ...editFormData, instagramUrl: e.target.value })} type="url" placeholder="https://instagram.com/username" />
                  </div>

                  {/* Custom Links */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Custom Links</label>
                    {(editFormData.customLinks || []).map((link: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          className="h-8 text-sm w-[100px]"
                          value={link.label}
                          onChange={e => {
                            const updated = [...editFormData.customLinks];
                            updated[idx] = { ...updated[idx], label: e.target.value };
                            setEditFormData({ ...editFormData, customLinks: updated });
                          }}
                          placeholder="Label"
                        />
                        <Input
                          className="h-8 text-sm flex-1"
                          value={link.url}
                          onChange={e => {
                            const updated = [...editFormData.customLinks];
                            updated[idx] = { ...updated[idx], url: e.target.value };
                            setEditFormData({ ...editFormData, customLinks: updated });
                          }}
                          type="url"
                          placeholder="https://..."
                        />
                        <button
                          onClick={() => {
                            const updated = editFormData.customLinks.filter((_: any, i: number) => i !== idx);
                            setEditFormData({ ...editFormData, customLinks: updated });
                          }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditFormData({ ...editFormData, customLinks: [...(editFormData.customLinks || []), { label: '', url: '' }] })}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <Plus className="w-3 h-3" /> Add link
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Emails display */}
                  {(contact.emails && contact.emails.length > 0) ? (
                    contact.emails.map((em: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm group">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                        <a href={`mailto:${em.value}`} className="text-foreground hover:text-primary transition-colors truncate">{em.value}</a>
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{em.label}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-3 text-sm group">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-foreground hover:text-primary transition-colors truncate">{contact.email}</a>
                      ) : (
                        <span className="text-muted-foreground">No email provided</span>
                      )}
                    </div>
                  )}

                  {/* Phones display */}
                  {(contact.phones && contact.phones.length > 0) ? (
                    contact.phones.map((ph: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm group">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                        <span className="text-foreground flex-1">{ph.value}</span>
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{ph.label}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-3 text-sm group">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                      <span className="text-foreground flex-1">{contact.phone || 'No phone provided'}</span>
                    </div>
                  )}

                  {/* Address */}
                  {contact.address && (
                    <div className="flex items-center gap-3 text-sm group">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                      <span className="text-foreground flex-1">{contact.address}</span>
                    </div>
                  )}

                  {/* LinkedIn */}
                  {(contact.linkedinUrl || contact.source === 'linkedin') && (
                    <div className="flex items-center gap-3 text-sm group">
                      <svg className="w-4 h-4 fill-muted-foreground group-hover:fill-primary transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                      {contact.linkedinUrl ? (
                        <a href={contact.linkedinUrl.startsWith('http') ? contact.linkedinUrl : `https://${contact.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary truncate transition-colors border-b border-transparent hover:border-primary">
                          {contact.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
                        </a>
                      ) : (
                        <span className="text-muted-foreground truncate">Imported from LinkedIn</span>
                      )}
                    </div>
                  )}

                  {/* Instagram */}
                  {(contact.instagramUrl || contact.instagram_url) && (
                    <div className="flex items-center gap-3 text-sm group">
                      <svg className="w-4 h-4 fill-muted-foreground group-hover:fill-primary transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      <a href={(contact.instagramUrl || contact.instagram_url).startsWith('http') ? (contact.instagramUrl || contact.instagram_url) : `https://${contact.instagramUrl || contact.instagram_url}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary truncate transition-colors border-b border-transparent hover:border-primary">
                        {(contact.instagramUrl || contact.instagram_url).replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}
                      </a>
                    </div>
                  )}

                  {/* Custom Links */}
                  {(contact.customLinks || contact.custom_links || []).filter((l: any) => l.url).map((link: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-sm group">
                      <svg className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      <a href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary truncate transition-colors border-b border-transparent hover:border-primary">
                        {link.label || link.url.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="space-y-3.5 glass-card p-4 rounded-xl">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Metdata</h3>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">
                  Last Contact: {contact.lastContacted ? format(new Date(contact.lastContacted), 'MMM d, yyyy') : ''}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Source: {sourceLabels[contact.source] || contact.source}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Imported: {contact.createdAt ? format(new Date(contact.createdAt), 'MMM d, yyyy') : '—'}</span>
              </div>
              {contact.contactCreatedDate && (
                <div className="flex items-center gap-3 text-sm">
                  <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Created: {format(new Date(contact.contactCreatedDate), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            {/* Important Dates */}
            <div className="space-y-3.5 glass-card p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Important Dates</h3>
                <button
                  onClick={() => { setShowDateForm(true); setEditingDateIdx(null); setNewDateLabel('Birthday'); setNewDateValue(''); setNewDateCustomName(''); }}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {loadingDates ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {importantDates.map((d, idx) => {
                    const DateIcon = d.label === 'Birthday' ? Cake : d.label === 'Anniversary' ? Heart : Gift;
                    if (editingDateIdx === idx) {
                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={newDateLabel}
                              onChange={(e) => setNewDateLabel(e.target.value)}
                              className="bg-secondary text-xs rounded px-2 py-1.5 border border-border"
                            >
                              {['Birthday', 'Anniversary', 'Work Anniversary', 'Custom'].map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                            <Input
                              type="date"
                              value={newDateValue}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDateValue(e.target.value)}
                              className="flex-1 h-8 text-xs"
                            />
                          </div>
                          {newDateLabel === 'Custom' && (
                            <Input
                              placeholder="Custom date name..."
                              value={newDateCustomName}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDateCustomName(e.target.value)}
                              className="h-8 text-xs"
                            />
                          )}
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingDateIdx(null)} className="px-2 py-1 rounded text-xs hover:bg-muted text-muted-foreground">Cancel</button>
                            <Button size="sm" className="h-7 text-xs px-3" onClick={() => saveEditDate(idx)}>Save</Button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="flex items-center gap-3 text-sm group">
                        <DateIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-muted-foreground text-xs">{d.label}: </span>
                          <span className="text-foreground">{format(new Date(d.date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditDate(idx)} className="p-1 rounded hover:bg-muted"><Edit2 className="w-3 h-3 text-muted-foreground" /></button>
                          <button onClick={() => confirmDialog.open({ title: 'Delete Date', description: 'Are you sure you want to delete this important date?', confirmLabel: 'Delete', onConfirm: () => deleteDate(idx) })} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3 h-3 text-destructive" /></button>
                        </div>
                      </div>
                    );
                  })}
                  {importantDates.length === 0 && !showDateForm && (
                    <p className="text-xs text-muted-foreground">No important dates added yet.</p>
                  )}
                  {showDateForm && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <select
                          value={newDateLabel}
                          onChange={(e) => setNewDateLabel(e.target.value)}
                          className="bg-secondary text-xs rounded px-2 py-1.5 border border-border"
                        >
                          {['Birthday', 'Anniversary', 'Work Anniversary', 'Custom'].map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        <Input
                          type="date"
                          value={newDateValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDateValue(e.target.value)}
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                      {newDateLabel === 'Custom' && (
                        <Input
                          placeholder="Custom date name..."
                          value={newDateCustomName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDateCustomName(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                      )}
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowDateForm(false)} className="px-2 py-1 rounded text-xs hover:bg-muted text-muted-foreground">Cancel</button>
                        <Button size="sm" className="h-7 text-xs px-3" onClick={addDate}>Add Date</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Experience (from LinkedIn extension / Bright Data) */}
            {contact.experience && contact.experience.length > 0 && (
              <div className="space-y-3 glass-card p-4 rounded-xl">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Experience</h3>
                <div className="space-y-3">
                  {contact.experience.map((role, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {role.title || 'Role'}
                          {role.current && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary">CURRENT</span>
                          )}
                        </div>
                        {role.company && <div className="text-muted-foreground truncate">{role.company}</div>}
                        {role.dates && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{role.dates}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {contact.education && contact.education.length > 0 && (
              <div className="space-y-3 glass-card p-4 rounded-xl">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Education</h3>
                <div className="space-y-3">
                  {contact.education.map((edu, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{edu.school || 'School'}</div>
                        {edu.degree && <div className="text-muted-foreground truncate">{edu.degree}</div>}
                        {edu.dates && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{edu.dates}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {contact.skills && contact.skills.length > 0 && (
              <div className="space-y-3 glass-card p-4 rounded-xl">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {contact.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-secondary-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="data-[state=active]:flex data-[state=active]:flex-col flex-1 mt-0 outline-none overflow-hidden">
          <div className="px-6 py-2 shrink-0 border-b border-border/50 bg-background/50">
            <div className="space-y-2">
              <Input
                value={newNoteTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewNoteTitle(e.target.value)}
                placeholder="Note title (optional)"
                className="h-8 text-sm bg-secondary/50 border-0 focus:ring-1 focus:ring-primary/20 rounded-lg"
              />
              <div className="relative">
                <Textarea
                  value={newNote}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
                  placeholder="Log a call, meeting, or detail..."
                  className="min-h-[80px] bg-secondary/50 border-0 resize-none text-sm pr-10 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50 transition-all rounded-xl"
                  onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      addNote();
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="default"
                  className="absolute bottom-2 right-2 h-7 w-7 rounded-lg shadow-sm"
                  onClick={addNote}
                  disabled={!newNote.trim()}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative">
            {loadingNotes ? (
              <div className="flex justify-center items-center h-20"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
            ) : notes.map((note) => (
              <div key={note.id} className="bg-background rounded-xl p-4 border border-border shadow-sm group hover:border-primary/20 transition-colors">
                {editingNoteId === note.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editNoteTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditNoteTitle(e.target.value)}
                      placeholder="Note title (optional)"
                      className="h-8 text-sm font-medium"
                    />
                    <Textarea
                      value={editNoteContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditNoteContent(e.target.value)}
                      className="min-h-[80px] text-sm resize-none bg-secondary/30 rounded-lg"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={saveEditNote}>Save Note</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {note.title && (
                      <h4 className="text-sm font-semibold text-foreground mb-1.5">{note.title}</h4>
                    )}
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={() => startEditNote(note)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => confirmDialog.open({ title: 'Delete Note', description: 'Are you sure you want to delete this note? This action cannot be undone.', confirmLabel: 'Delete', onConfirm: () => deleteNote(note.id) })} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {!loadingNotes && notes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-60">
                <MessageSquare className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-xs text-muted-foreground font-medium">No notes recorded yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="data-[state=active]:flex data-[state=active]:flex-col flex-1 mt-0 outline-none overflow-hidden">
          <div className="px-6 py-2 shrink-0 border-b border-border/50 flex flex-col gap-3">
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                variant={showReminderForm ? "secondary" : "default"}
                className={cn("h-7 text-xs gap-1", showReminderForm ? "" : "shadow-sm")}
                onClick={() => setShowReminderForm(!showReminderForm)}
              >
                {showReminderForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showReminderForm ? 'Cancel' : 'New Task'}
              </Button>
            </div>

            {showReminderForm && (
              <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5 mb-2 shadow-inner">
                <Input
                  placeholder="What needs to be done?"
                  value={reminderMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderMessage(e.target.value)}
                  className="h-9 text-sm border-0 bg-background shadow-sm"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={reminderDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderDate(e.target.value)}
                    className="h-9 text-sm border-0 bg-background shadow-sm"
                  />
                  <Input
                    type="time"
                    value={reminderTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderTime(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Repeat</label>
                  <div className="flex flex-wrap gap-1.5">
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
                        onClick={() => setReminderRecurrence(opt.value)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors',
                          reminderRecurrence === opt.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                        )}
                      >
                        {opt.value && <Repeat className="w-2.5 h-2.5 inline mr-0.5" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {reminderRecurrence === 'custom' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Every</span>
                      <Input
                        type="number"
                        min="1"
                        value={customRecurrenceDays}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomRecurrenceDays(e.target.value)}
                        className="h-7 w-16 text-xs text-center"
                        placeholder="7"
                      />
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button size="sm" className="h-8 text-xs font-medium" onClick={addReminder} disabled={!reminderMessage.trim() || !reminderDate}>
                    Create Task
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {loadingReminders ? (
              <div className="flex justify-center items-center h-20"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
            ) : reminders.map((r) => {
              const overdue = !r.isCompleted && isPast(new Date(r.dueDate)) && !isToday(new Date(r.dueDate));
              return (
                <div key={r.id} className={cn("bg-background border border-border rounded-xl p-3.5 group shadow-sm transition-all", r.isCompleted && 'opacity-60 bg-muted/30')}>
                  {editingReminderId === r.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editReminderMessage}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditReminderMessage(e.target.value)}
                        className="h-9 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={editReminderDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditReminderDate(e.target.value)}
                          className="h-9 text-sm"
                        />
                        <Input
                          type="time"
                          value={editReminderTime}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditReminderTime(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Repeat</label>
                        <div className="flex flex-wrap gap-1.5">
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
                              onClick={() => setEditReminderRecurrence(opt.value)}
                              className={cn(
                                'px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors',
                                editReminderRecurrence === opt.value
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                              )}
                            >
                              {opt.value && <Repeat className="w-2.5 h-2.5 inline mr-0.5" />}
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {editReminderRecurrence === 'custom' && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">Every</span>
                            <Input
                              type="number"
                              min="1"
                              value={editCustomRecurrenceDays}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCustomRecurrenceDays(e.target.value)}
                              className="h-7 w-16 text-xs text-center"
                              placeholder="7"
                            />
                            <span className="text-xs text-muted-foreground">days</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingReminderId(null)}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={saveEditReminder}>Save Changes</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => toggleReminderComplete(r)} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
                        {r.isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium transition-colors', r.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground')}>
                          {r.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 font-bold tracking-wide uppercase',
                            r.isCompleted ? 'bg-secondary text-muted-foreground' :
                              overdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                          )}>
                            <Calendar className="w-2.5 h-2.5 inline" /> {getDateLabel(r.dueDate)}
                          </span>
                          {r.recurrence && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 font-bold tracking-wide uppercase bg-violet-500/10 text-violet-600">
                              <Repeat className="w-2.5 h-2.5" /> {r.recurrence?.startsWith('custom_') ? `Every ${r.recurrence.replace('custom_', '')} days` : r.recurrence}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 shrink-0">
                        <button onClick={() => startEditReminder(r)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => confirmDialog.open({ title: 'Delete Reminder', description: 'Are you sure you want to delete this reminder? This action cannot be undone.', confirmLabel: 'Delete', onConfirm: () => deleteReminder(r.id) })} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!loadingReminders && reminders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-60">
                <CheckCircle className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-xs text-muted-foreground font-medium">All caught up! No tasks left.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Google Calendar Events Tab */}
        <TabsContent value="calendar" className="data-[state=active]:flex data-[state=active]:flex-col flex-1 mt-0 outline-none overflow-hidden">
          <div className="overflow-y-auto px-6 py-4 flex-1">
            {loadingCalendarEvents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !contact.email ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No email address on this contact.</p>
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No events found</p>
                <p className="text-xs mt-1 opacity-70">No shared calendar events with {contact.name}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calendarEvents.map((event: any) => {
                  const startTime = event.start_time ? new Date(event.start_time) : null;
                  const endTime = event.end_time ? new Date(event.end_time) : null;
                  const isPastEvent = startTime ? startTime < new Date() : false;
                  return (
                    <div key={event.id} className={cn(
                      "glass-card rounded-xl p-3.5 space-y-1.5",
                      isPastEvent ? "opacity-70" : ""
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{event.summary || 'Untitled Event'}</p>
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                          isPastEvent
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        )}>
                          {isPastEvent ? 'Past' : 'Upcoming'}
                        </span>
                      </div>
                      {startTime && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            {format(startTime, 'MMM d, yyyy')}
                            {!event.is_all_day && endTime && (
                              <> &middot; {format(startTime, 'h:mm a')} – {format(endTime, 'h:mm a')}</>
                            )}
                          </span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      {event.meeting_link && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Send className="w-3 h-3 shrink-0 text-primary" />
                          <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                            Join meeting
                          </a>
                        </div>
                      )}
                      {event.status === 'cancelled' && (
                        <span className="text-[10px] text-destructive font-medium">Cancelled</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="data-[state=active]:flex data-[state=active]:flex-col flex-1 mt-0 outline-none overflow-hidden">
          <div className="overflow-y-auto px-6 py-4 flex-1">
            <div className="relative">
              {loadingActivities ? (
                <div className="flex justify-center items-center py-10 opacity-60"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
              ) : (() => {
                let list = [...activities];
                if (contact.contactCreatedDate) {
                  list.push({
                    id: 'contact_created_date_event',
                    type: 'contact_created',
                    description: contact.source === 'linkedin' ? 'Connected on LinkedIn' : 'Contact Originated',
                    timestamp: contact.contactCreatedDate
                  });
                }
                list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                if (list.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 opacity-60">
                      <Clock className="w-8 h-8 text-muted-foreground mb-3" />
                      <p className="text-xs text-muted-foreground font-medium">No activity history recorded.</p>
                    </div>
                  );
                }

                return list.map((event, i) => {
                  const Icon = activityIcons[event.type] || Clock;
                  return (
                    <div key={event.id} className="flex relative items-start">
                      {/* Vertical line connector */}
                      {i < list.length - 1 && (
                        <div className="absolute left-[17px] top-9 bottom-[-24px] w-px bg-border/60" />
                      )}
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-[34px] h-[34px] rounded-full bg-secondary/80 text-muted-foreground flex items-center justify-center shrink-0 z-10">
                          <Icon className="w-[15px] h-[15px]" strokeWidth={2.5} />
                        </div>
                      </div>
                      <div className="pb-8 min-w-0 flex-1 pt-1">
                        <p className="text-[15px] text-foreground font-normal tracking-tight leading-snug">{event.description}</p>
                        <p className="text-[13px] text-muted-foreground/80 mt-1.5">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <ConfirmDialog {...confirmDialog.props} />
    </div >
  );
};

export default ContactDetail;
