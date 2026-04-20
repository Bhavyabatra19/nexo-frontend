import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { organizeService } from '@/services/api';
import { ConfirmDialog, useConfirmDialog } from '@/components/ConfirmDialog';

export function TagManager() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', color: '#3B82F6', textColor: '#FFFFFF' });
    const confirmDialog = useConfirmDialog();

    const { data: tagsData, isLoading } = useQuery({
        queryKey: ['tags'],
        queryFn: async () => await organizeService.getTags()
    });
    const tags = tagsData?.tags || [];

    const createMutation = useMutation({
        mutationFn: async (payload: any) => organizeService.createTag(payload.name, payload.color, payload.textColor),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
            setForm({ name: '', color: '#3B82F6', textColor: '#FFFFFF' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: any) => organizeService.updateTag(payload.id, payload.name, payload.color, payload.textColor),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
            setEditingId(null);
            setForm({ name: '', color: '#3B82F6', textColor: '#FFFFFF' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => organizeService.deleteTag(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] })
    });

    const handleSave = () => {
        if (!form.name.trim()) return;
        if (editingId) {
            updateMutation.mutate({ id: editingId, ...form });
        } else {
            createMutation.mutate(form);
        }
    };

    const handleEdit = (t: any) => {
        setEditingId(t.id);
        setForm({ name: t.name, color: t.color || '#3B82F6', textColor: t.text_color || '#FFFFFF' });
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 h-10 shadow-sm border-border bg-background hover:bg-accent hover:text-accent-foreground">
                        <Tag className="w-4 h-4" />
                        Manage Tags
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manage Tags</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 mb-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Tag name..."
                                value={form.name}
                                onChange={(e: any) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                className="flex-1"
                            />
                            {editingId ? (
                                <>
                                    <Button onClick={handleSave} disabled={updateMutation.isPending || !form.name.trim()} size="sm" className="h-10">
                                        Save
                                    </Button>
                                    <Button onClick={() => { setEditingId(null); setForm({ name: '', color: '#3B82F6', textColor: '#FFFFFF' }); }} variant="ghost" size="sm" className="h-10 px-2">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={handleSave} disabled={createMutation.isPending || !form.name.trim()} size="sm" className="h-10">
                                    <Plus className="w-4 h-4" /> Add
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <label className="text-xs text-muted-foreground">Tag</label>
                                <Input
                                    type="color"
                                    value={form.color}
                                    onChange={(e: any) => setForm(prev => ({ ...prev, color: e.target.value }))}
                                    className="w-9 h-8 p-0.5 cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-xs text-muted-foreground">Text</label>
                                <Input
                                    type="color"
                                    value={form.textColor}
                                    onChange={(e: any) => setForm(prev => ({ ...prev, textColor: e.target.value }))}
                                    className="w-9 h-8 p-0.5 cursor-pointer"
                                />
                            </div>
                            {form.name.trim() && (
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: form.color, color: form.textColor }}>
                                    {form.name}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                        ) : tags.length === 0 ? (
                            <p className="text-sm text-center text-muted-foreground py-4">No tags created yet.</p>
                        ) : (
                            tags.map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between p-2 rounded-md border border-border bg-card">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full truncate" style={{ backgroundColor: t.color || '#3B82F6', color: t.text_color || '#FFFFFF' }}>{t.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(t)}>
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => confirmDialog.open({ title: 'Delete Tag', description: `Are you sure you want to delete the tag "${t.name}"? It will be removed from all contacts.`, confirmLabel: 'Delete', onConfirm: () => deleteMutation.mutateAsync(t.id) })} disabled={deleteMutation.isPending}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <ConfirmDialog {...confirmDialog.props} />
        </>
    );
}
