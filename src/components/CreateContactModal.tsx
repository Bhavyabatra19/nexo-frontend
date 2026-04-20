import React, { useState } from 'react';
import { X, Loader2, User, Mail, Phone, Building2, Briefcase, Linkedin, AlignLeft, Tag, List, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { contactsService, organizeService } from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateContactModal({ isOpen, onClose }: CreateContactModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    linkedinUrl: '',
    bio: ''
  });
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [selectedListId, setSelectedListId] = useState<string>('');

  const { data: tagsDataResponse } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => await organizeService.getTags(),
    enabled: isOpen,
  });
  const tagsList = tagsDataResponse?.tags || [];

  const { data: listsDataResponse } = useQuery({
    queryKey: ['lists'],
    queryFn: async () => await organizeService.getLists(),
    enabled: isOpen,
  });
  const userLists = listsDataResponse?.lists || [];

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev);
      next.has(tagId) ? next.delete(tagId) : next.add(tagId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await contactsService.createContact(formData);
      const contactId = result?.contact?.id;

      if (contactId) {
        const promises: Promise<any>[] = [];

        // Add selected tags
        for (const tagId of selectedTagIds) {
          promises.push(organizeService.addTagToContact(contactId, tagId));
        }

        // Add to selected list
        if (selectedListId) {
          promises.push(organizeService.bulkAddContactsToList(selectedListId, [contactId]));
        }

        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }
      }

      toast({
        title: "Contact Created",
        description: "Your contact has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        title: '',
        linkedinUrl: '',
        bio: ''
      });
      setSelectedTagIds(new Set());
      setSelectedListId('');
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create contact.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div
          className="bg-card w-full max-w-lg rounded-xl shadow-lg border border-border overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 shrink-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Add New Contact
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <form id="create-contact-form" onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs text-muted-foreground">Full Name <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="pl-9 h-10"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="jane@example.com"
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="company" className="text-xs text-muted-foreground">Company</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Acme Corp"
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-xs text-muted-foreground">Job Title</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Software Engineer"
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="linkedinUrl" className="text-xs text-muted-foreground">LinkedIn Profile</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/janedoe"
                    className="pl-9 h-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="bio" className="text-xs text-muted-foreground">Bio</Label>
                <div className="relative mt-2">
                  <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Initial thoughts or comments..."
                    className="pl-9 min-h-[100px] resize-y"
                  />
                </div>
              </div>

              {/* Tags Selection */}
              {tagsList.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tagsList.map((tag: any) => {
                      const isSelected = selectedTagIds.has(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 border',
                            isSelected
                              ? 'border-transparent shadow-sm'
                              : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                          )}
                          style={isSelected ? { backgroundColor: tag.color || '#3B82F6', color: tag.text_color || '#FFFFFF' } : undefined}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* List Selection */}
              {userLists.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <List className="w-3.5 h-3.5" /> Add to List
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {userLists.map((list: any) => {
                      const isSelected = selectedListId === list.id;
                      return (
                        <button
                          key={list.id}
                          type="button"
                          onClick={() => setSelectedListId(isSelected ? '' : list.id)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 border',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
                              : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {list.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-muted/40 gap-3 shrink-0">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-contact-form" disabled={!formData.name.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Contact
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
