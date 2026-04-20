"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { organizeService, aiService } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, List as ListIcon, Filter, Trash2, Sparkles } from 'lucide-react';
import { ConfirmDialog, useConfirmDialog } from '@/components/ConfirmDialog';

export default function EditListPage() {
    const router = useRouter();
    const params = useParams();
    const listId = params.id as string;
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const confirmDialog = useConfirmDialog();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Criteria states
    const [source, setSource] = useState('');
    const [systemFilter, setSystemFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // AI Query Builder states
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiBuilding, setIsAiBuilding] = useState(false);

    const handleAiBuild = async () => {
        if (!aiPrompt.trim()) return;
        setIsAiBuilding(true);
        try {
            const result = await aiService.queryBuilder(aiPrompt);
            if (result.success && result.criteria) {
                const { criteria } = result;
                if (criteria.source !== undefined) setSource(criteria.source || '');
                if (criteria.filter !== undefined) setSystemFilter(criteria.filter || '');
                if (criteria.query !== undefined) setSearchQuery(criteria.query || '');
                
                toast({
                    title: "Filters Updated",
                    description: "AI has successfully refined your list criteria.",
                });
            } else {
                throw new Error(result.error || "Failed to build query");
            }
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "AI Builder Error",
                description: err.message || "Something went wrong with the AI assistant.",
            });
        } finally {
            setIsAiBuilding(false);
        }
    };

    const { data: tagsDataResponse } = useQuery({
        queryKey: ['tags'],
        queryFn: async () => await organizeService.getTags()
    });
    const tagsList = tagsDataResponse?.tags || [];

    const { data, isLoading } = useQuery({
        queryKey: ['list', listId],
        queryFn: async () => await organizeService.getList(listId),
        retry: false
    });

    useEffect(() => {
        if (data?.list) {
            setName(data.list.name);
            setDescription(data.list.description || '');
            const criteria = data.list.criteria || {};
            setSource(criteria.source || '');
            setSystemFilter(criteria.filter || '');
            setSearchQuery(criteria.query || '');
            setSelectedTags(criteria.tags ? criteria.tags.split(',') : []);
        }
    }, [data]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            const criteria: any = {};
            if (source) criteria.source = source;
            if (systemFilter) criteria.filter = systemFilter;
            if (searchQuery.trim()) criteria.query = searchQuery.trim();
            if (selectedTags.length > 0) criteria.tags = selectedTags.join(',');

            await organizeService.updateList(
                listId,
                name.trim(),
                description.trim() || undefined,
                Object.keys(criteria).length > 0 ? criteria : null
            );

            queryClient.invalidateQueries({ queryKey: ['lists'] });
            queryClient.invalidateQueries({ queryKey: ['list', listId] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });

            toast({
                title: "List Updated",
                description: `Successfully updated list "${name.trim()}".`,
            });

            router.push(`/dashboard/contacts?list=${listId}`);
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Failed to update list",
                description: err.message || "Please try again later.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await organizeService.deleteList(listId);
            queryClient.invalidateQueries({ queryKey: ['lists'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            toast({
                title: "List Deleted",
                description: "The list was removed completely.",
            });
            router.push('/dashboard/contacts');
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Failed to delete list",
                description: err.message || "Please try again later.",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pl-16 md:pl-6 pr-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                    <h1 className="text-xl font-bold flex flex-1 items-center gap-2">
                        <ListIcon className="w-5 h-5 text-muted-foreground" />
                        Edit List
                    </h1>
                </div>
                <Button variant="destructive" size="sm" onClick={() => confirmDialog.open({ title: 'Delete List', description: 'Are you sure you want to delete this list? This will NOT delete the contacts in it.', confirmLabel: 'Delete List', onConfirm: handleDelete })} className="gap-2">
                    <Trash2 className="w-4 h-4" /> Delete List
                </Button>
            </div>

            <div className="p-6 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">List Name <span className="text-red-500">*</span></label>
                            <Input
                                autoFocus
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Investors, Founders, Google Contacts"
                                className="mt-1"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Description (Optional)</label>
                            <Input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="What is this list for?"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="bg-accent/50 border border-accent rounded-lg p-5 space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Filter className="w-4 h-4 text-primary" />
                            Predefined Filters (Dynamic List)
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            If you set filters below, clicking this list will instantly show all contacts that match the criteria. Leave these blank to create a manual list.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1">Source</label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={source}
                                    onChange={e => setSource(e.target.value)}
                                >
                                    <option value="">Any Source</option>
                                    <option value="google">Google</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="manual">Manual (No Source)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium block mb-1">Status</label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={systemFilter}
                                    onChange={e => setSystemFilter(e.target.value)}
                                >
                                    <option value="">All Contacts</option>
                                    <option value="stale">Stale (Not contacted ~30 days)</option>
                                    <option value="favorites">Favorites Only</option>
                                    <option value="no-calendar">No Calendar Interaction</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-accent/20">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-3 h-3" />
                                AI Query Assistant
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                    placeholder="e.g. Find senior managers at Google from LinkedIn..."
                                    className="bg-background/50 border-primary/20 focus:border-primary/50"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAiBuild();
                                        }
                                    }}
                                />
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="shrink-0 border-primary/20 hover:bg-primary/5 text-primary"
                                    onClick={handleAiBuild}
                                    disabled={isAiBuilding || !aiPrompt.trim()}
                                >
                                    {isAiBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Build
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                                Describe the contacts you want to group. AI will set the filters below for you.
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-1">Generated Search Syntax (Read-only)</label>
                            <Input
                                value={searchQuery}
                                readOnly
                                placeholder="Generated by AI Query Assistant above..."
                                className="bg-muted cursor-default"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Technical syntax: title, company, name. Use (and) / (or) for multiple conditions.
                            </p>
                        </div>

                        {tagsList.length > 0 && (
                            <div>
                                <label className="text-sm font-medium block mb-2">Must Have Tags (Any)</label>
                                <div className="flex flex-wrap gap-2">
                                    {tagsList.map((tag: any) => {
                                        const isSelected = selectedTags.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTags(prev =>
                                                        isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                                                    )
                                                }}
                                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent border-border text-foreground'
                                                    }`}
                                            >
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3">
                        <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name.trim() || isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </div>

                </form>
            </div>
            <ConfirmDialog {...confirmDialog.props} />
        </div>
    );
}
