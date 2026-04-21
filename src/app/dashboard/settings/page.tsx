"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, MessageCircle, Save, Loader2, Trash2, Send, Puzzle, Copy, Check, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { settingsService, authService } from '@/services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

const COUNTRY_CODES = [
    { code: '+91', label: 'IN +91' },
    { code: '+1', label: 'US +1' },
    { code: '+44', label: 'UK +44' },
    { code: '+61', label: 'AU +61' },
    { code: '+971', label: 'AE +971' },
    { code: '+65', label: 'SG +65' },
    { code: '+49', label: 'DE +49' },
    { code: '+33', label: 'FR +33' },
    { code: '+81', label: 'JP +81' },
    { code: '+86', label: 'CN +86' },
    { code: '+55', label: 'BR +55' },
    { code: '+27', label: 'ZA +27' },
    { code: '+234', label: 'NG +234' },
    { code: '+254', label: 'KE +254' },
    { code: '+62', label: 'ID +62' },
    { code: '+60', label: 'MY +60' },
    { code: '+63', label: 'PH +63' },
    { code: '+82', label: 'KR +82' },
    { code: '+39', label: 'IT +39' },
    { code: '+34', label: 'ES +34' },
    { code: '+7', label: 'RU +7' },
    { code: '+52', label: 'MX +52' },
    { code: '+966', label: 'SA +966' },
    { code: '+974', label: 'QA +974' },
    { code: '+90', label: 'TR +90' },
];

const formSchema = z.object({
    notificationEmail: z.boolean().default(true),
    notificationWhatsapp: z.boolean().default(false),
    countryCode: z.string().default('+91'),
    whatsappNumber: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.notificationWhatsapp) {
        if (!data.countryCode || data.countryCode.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Country code is required",
                path: ["countryCode"]
            });
        }
        if (!data.whatsappNumber || data.whatsappNumber.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "WhatsApp number is required if WhatsApp notifications are enabled",
                path: ["whatsappNumber"]
            });
        }
    }
});

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [extensionToken, setExtensionToken] = useState<string | null>(null);
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);
    const [tokenCopied, setTokenCopied] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            notificationEmail: true,
            notificationWhatsapp: false,
            countryCode: '+91',
            whatsappNumber: '',
        },
    });

    const watchWhatsapp = form.watch("notificationWhatsapp");

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await settingsService.getSettings();
                if (response.success && response.settings) {
                    // Parse existing saved number into country code + number
                    let savedCode = '+91';
                    let savedNumber = response.settings.whatsappNumber || '';
                    if (savedNumber) {
                        const match = COUNTRY_CODES.sort((a, b) => b.code.length - a.code.length)
                            .find(c => savedNumber.startsWith(c.code) || savedNumber.startsWith(c.code.replace('+', '')));
                        if (match) {
                            const prefix = savedNumber.startsWith('+') ? match.code : match.code.replace('+', '');
                            savedCode = match.code;
                            savedNumber = savedNumber.slice(prefix.length);
                        }
                    }
                    form.reset({
                        notificationEmail: response.settings.notificationEmail !== false,
                        notificationWhatsapp: !!response.settings.notificationWhatsapp,
                        countryCode: savedCode,
                        whatsappNumber: savedNumber,
                    });
                }
            } catch (error) {
                toast.error("Failed to load settings.");
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true);
        try {
            const fullNumber = values.whatsappNumber ? `${values.countryCode}${values.whatsappNumber.replace(/^0+/, '')}` : '';
            const response = await settingsService.updateSettings({
                notificationEmail: values.notificationEmail,
                notificationWhatsapp: values.notificationWhatsapp,
                whatsappNumber: fullNumber,
            });

            if (response.success) {
                toast.success("Settings saved successfully.");
            } else {
                toast.error(response.error || "Failed to save settings.");
            }
        } catch (error) {
            toast.error("An error occurred while saving.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }

    const handleTestWhatsapp = async () => {
        setIsSendingTest(true);
        try {
            const response = await settingsService.sendTestWhatsapp();
            if (response.success) {
                toast.success('Test notification sent! Check your WhatsApp.');
            } else {
                toast.error(response.error || 'Failed to send test notification.');
            }
        } catch (error) {
            toast.error('Failed to send test notification. Save your settings first.');
            console.error(error);
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleGenerateToken = async () => {
        setIsGeneratingToken(true);
        try {
            const response = await settingsService.getExtensionToken();
            if (response.success) {
                setExtensionToken(response.token);
            } else {
                toast.error(response.error || 'Failed to generate token.');
            }
        } catch {
            toast.error('Failed to generate token. Please try again.');
        } finally {
            setIsGeneratingToken(false);
        }
    };

    const handleCopyToken = () => {
        if (!extensionToken) return;
        navigator.clipboard.writeText(extensionToken);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return;
        setIsDeleting(true);
        try {
            const response = await settingsService.deleteAccount();
            if (response.success) {
                toast.success('Account deleted. Goodbye!');
                authService.logout();
            } else {
                toast.error(response.error || 'Failed to delete account.');
            }
        } catch (error) {
            toast.error('An error occurred. Please try again.');
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-2">Manage your account settings and notification preferences.</p>
            </div>

            <div className="space-y-6">
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <BellIcon className="h-5 w-5 text-primary" />
                            Notifications
                        </CardTitle>
                        <CardDescription>
                            Choose where you want to receive your reminders.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                {/* Email Option */}
                                <FormField
                                    control={form.control}
                                    name="notificationEmail"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 shadow-sm bg-background">
                                            <div className="space-y-0.5 max-w-[80%]">
                                                <FormLabel className="flex items-center gap-2 text-base font-medium">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    Email Notifications
                                                </FormLabel>
                                                <FormDescription>
                                                    Receive reminders and alerts directly to your account email.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {/* WhatsApp Option */}
                                <div className="space-y-4 rounded-lg border border-border p-4 shadow-sm bg-background">
                                    <FormField
                                        control={form.control}
                                        name="notificationWhatsapp"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between">
                                                <div className="space-y-0.5 max-w-[80%]">
                                                    <FormLabel className="flex items-center gap-2 text-base font-medium">
                                                        <MessageCircle className="h-4 w-4 text-green-600" />
                                                        WhatsApp Notifications
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Receive reminders as direct messages on WhatsApp.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        className="data-[state=checked]:bg-green-600"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {watchWhatsapp && (
                                        <div className="pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 space-y-4">
                                            <div>
                                                <FormLabel className="text-sm font-medium">WhatsApp Number</FormLabel>
                                                <div className="flex gap-2 mt-2 max-w-md">
                                                    <FormField
                                                        control={form.control}
                                                        name="countryCode"
                                                        render={({ field }) => (
                                                            <FormItem className="w-[120px] shrink-0">
                                                                <FormControl>
                                                                    <select
                                                                        value={field.value}
                                                                        onChange={field.onChange}
                                                                        className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                                    >
                                                                        {COUNTRY_CODES.map(c => (
                                                                            <option key={c.code} value={c.code}>{c.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="whatsappNumber"
                                                        render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormControl>
                                                                    <Input placeholder="9876543210" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <p className="text-[0.8rem] text-muted-foreground mt-2">
                                                    Select your country code and enter your number without leading zeros.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground">
                                                    Say hi to <a href="https://wa.me/918383857927" target="_blank" rel="noopener noreferrer" className="font-medium text-green-600 hover:underline">8383857927</a> on WhatsApp first, or click below to send a test notification.
                                                </p>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={!form.watch('whatsappNumber')?.trim() || isSendingTest}
                                                    onClick={handleTestWhatsapp}
                                                    className="gap-2"
                                                >
                                                    {isSendingTest ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Send className="h-4 w-4" />
                                                    )}
                                                    {isSendingTest ? 'Sending...' : 'Send Test Notification'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-start">
                                    <Button type="submit" disabled={isSaving} className="min-w-[140px]">
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Preferences
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Chrome Extension */}
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Puzzle className="h-5 w-5 text-primary" />
                            Chrome Extension
                        </CardTitle>
                        <CardDescription>
                            Connect the Nexo Chrome extension to sync your LinkedIn network automatically.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                            <div>
                                <p className="font-medium text-sm text-foreground">Download Extension</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Load unpacked in Chrome → Developer Mode → Load unpacked
                                </p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <a href={`${process.env.NEXT_PUBLIC_API_BASE?.replace('/api', '')}/public/nexo-extension.zip`} download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </a>
                            </Button>
                        </div>

                        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                            <div>
                                <p className="font-medium text-sm text-foreground">Extension Token</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Generate a token, then paste it into the extension popup to connect your account.
                                </p>
                            </div>

                            {extensionToken ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={extensionToken}
                                            className="font-mono text-xs"
                                            onClick={e => (e.target as HTMLInputElement).select()}
                                        />
                                        <Button variant="outline" size="sm" onClick={handleCopyToken} className="shrink-0">
                                            {tokenCopied
                                                ? <><Check className="h-4 w-4 mr-1 text-green-500" />Copied</>
                                                : <><Copy className="h-4 w-4 mr-1" />Copy</>
                                            }
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Valid for 90 days. Keep this token private — it grants access to your Nexo account.
                                    </p>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGenerateToken}
                                    disabled={isGeneratingToken}
                                >
                                    {isGeneratingToken
                                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                                        : 'Generate Token'
                                    }
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/50 bg-card">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Irreversible actions that permanently affect your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                            <div>
                                <p className="font-medium text-sm text-foreground">Delete Account</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Permanently delete your account and all associated data — contacts, notes, reminders, tags, and more.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="ml-4 shrink-0"
                                onClick={() => { setDeleteConfirmText(''); setShowDeleteDialog(true); }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Account
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Account Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!isDeleting) setShowDeleteDialog(open); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Delete Account Permanently
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3 pt-1">
                                <p>This action <span className="font-semibold text-foreground">cannot be undone</span>. The following will be permanently deleted:</p>
                                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                                    <li>All contacts and their data</li>
                                    <li>All notes, reminders, and activities</li>
                                    <li>All tags, lists, and calendar data</li>
                                    <li>Your account and login credentials</li>
                                </ul>
                                <div className="pt-2">
                                    <p className="text-sm font-medium text-foreground mb-2">
                                        Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-destructive">DELETE</span> to confirm
                                    </p>
                                    <Input
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        placeholder="Type DELETE here"
                                        className="font-mono"
                                        disabled={isDeleting}
                                        autoComplete="off"
                                    />
                                    {deleteConfirmText.length > 0 && deleteConfirmText !== 'DELETE' && deleteConfirmText.toLowerCase() === 'delete' && (
                                        <p className="text-xs text-amber-500 mt-1">Please type DELETE in uppercase.</p>
                                    )}
                                    {deleteConfirmText.length > 0 && deleteConfirmText.toLowerCase() !== 'delete' && (
                                        <p className="text-xs text-destructive mt-1">Type the word DELETE exactly to confirm.</p>
                                    )}
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete My Account
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function BellIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
    )
}
