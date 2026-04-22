"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { groupsService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function CreateGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const data = await groupsService.createGroup({ name: name.trim(), description: description.trim() || undefined });
      toast({ title: 'Group created!', description: 'Share the invite link to grow your community.' });
      router.push(`/dashboard/groups/${data.group.id}`);
    } catch (err: any) {
      toast({ title: 'Failed to create group', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5 bg-background flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-semibold">Create Community</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Create a shared network for your community. Each member's connections become discoverable.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Community name <span className="text-destructive">*</span></label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Masters Union Cohort 2024"
              maxLength={100}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A brief description of who belongs to this community"
              rows={3}
              maxLength={300}
              className="resize-none"
            />
          </div>

          <Button onClick={handleCreate} disabled={loading || !name.trim()} className="w-full">
            {loading ? 'Creating...' : 'Create Community'}
          </Button>
        </div>
      </div>
    </div>
  );
}
