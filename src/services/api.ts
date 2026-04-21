import { Contact, Reminder } from '@/lib/mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

// ─── Shared authenticated fetch with deduplication ─────────────────────────
// Identical in-flight GET requests are deduplicated so that 100 users
// triggering the same endpoint don't each fire a separate network call.
const inflightGETs = new Map<string, Promise<any>>();

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
    const method = (options.method || 'GET').toUpperCase();

    // Deduplicate concurrent identical GET requests
    if (method === 'GET') {
        const existing = inflightGETs.get(url);
        if (existing) return existing;
    }

    const doFetch = async (): Promise<any> => {
        const headers: Record<string, string> = {
            ...authService.getAuthHeaders(),
            ...(options.headers as Record<string, string> || {}),
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            await authService.refreshAccessToken();
            return fetchWithAuth(url, options);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
            return response.json();
        }
        return response.text();
    };

    if (method === 'GET') {
        const promise = doFetch().finally(() => inflightGETs.delete(url));
        inflightGETs.set(url, promise);
        return promise;
    }

    return doFetch();
}

// ─── Auth Service ──────────────────────────────────────────────────────────

class AuthService {
    async getGoogleAuthUrl() {
        const response = await fetch(`${API_BASE}/auth/google`);
        const data = await response.json();
        return data.authUrl;
    }

    handleAuthCallback(tokens: { accessToken: string; refreshToken: string }) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
        }
    }

    getAccessToken() {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('accessToken');
        }
        return null;
    }

    getRefreshToken() {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('refreshToken');
        }
        return null;
    }

    isAuthenticated() {
        return !!this.getAccessToken();
    }

    async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (data.success) {
            if (typeof window !== 'undefined') {
                localStorage.setItem('accessToken', data.accessToken);
            }
            return data.accessToken;
        } else {
            this.logout();
            throw new Error('Failed to refresh token');
        }
    }

    async getCurrentUser() {
        return fetchWithAuth(`${API_BASE}/auth/me`);
    }

    logout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/';
        }
    }

    getAuthHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAccessToken()}`
        };
    }
}

export const authService = new AuthService();

// ─── Contacts Service ──────────────────────────────────────────────────────

class ContactsService {
    async syncContacts() {
        return fetchWithAuth(`${API_BASE}/sync/complete`, { method: 'POST' });
    }

    async getSyncStatus() {
        return fetchWithAuth(`${API_BASE}/sync/status`);
    }

    async getContacts(params: Record<string, string | number> = {}) {
        const query = new URLSearchParams(params as Record<string, string>).toString();
        return fetchWithAuth(`${API_BASE}/contacts?${query}`);
    }

    async searchContacts(query: string) {
        return fetchWithAuth(`${API_BASE}/contacts?q=${encodeURIComponent(query)}`);
    }

    async getStaleContacts(days = 30) {
        return fetchWithAuth(`${API_BASE}/contacts?filter=stale&days=${days}`);
    }

    async getContact(id: string) {
        return fetchWithAuth(`${API_BASE}/contacts/${id}`);
    }

    async createContact(contactData: any) {
        return fetchWithAuth(`${API_BASE}/contacts`, {
            method: 'POST',
            body: JSON.stringify(contactData)
        });
    }

    async updateContact(id: string, updates: Partial<Contact>) {
        return fetchWithAuth(`${API_BASE}/contacts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    async deleteContact(id: string) {
        return fetchWithAuth(`${API_BASE}/contacts/${id}`, { method: 'DELETE' });
    }

    async updateNotes(id: string, notes: string) {
        return fetchWithAuth(`${API_BASE}/contacts/${id}/notes`, {
            method: 'PATCH',
            body: JSON.stringify({ notes })
        });
    }

    async toggleFavorite(id: string) {
        return fetchWithAuth(`${API_BASE}/contacts/${id}/favorite`, { method: 'POST' });
    }

    async getImportantDates(id: string) {
        return fetchWithAuth(`${API_BASE}/contacts/${id}/important-dates`);
    }

    async updateImportantDates(id: string, importantDates: { label: string; date: string }[]) {
        return fetchWithAuth(`${API_BASE}/contacts/${id}/important-dates`, {
            method: 'PUT',
            body: JSON.stringify({ importantDates })
        });
    }

    async generateAiSummary(id: string) {
        return fetchWithAuth(`${API_BASE}/ai/summary/${id}`, { method: 'POST' });
    }
}

export const contactsService = new ContactsService();

// ─── Organize Service ──────────────────────────────────────────────────────

class OrganizeService {
    async getTags() {
        return fetchWithAuth(`${API_BASE}/organize/tags`);
    }

    async createTag(name: string, color: string, textColor?: string) {
        return fetchWithAuth(`${API_BASE}/organize/tags`, {
            method: 'POST',
            body: JSON.stringify({ name, color, textColor })
        });
    }

    async updateTag(tagId: string, name: string, color?: string, textColor?: string) {
        return fetchWithAuth(`${API_BASE}/organize/tags/${tagId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name, color, textColor })
        });
    }

    async deleteTag(tagId: string) {
        return fetchWithAuth(`${API_BASE}/organize/tags/${tagId}`, { method: 'DELETE' });
    }

    async addTagToContact(contactId: string, tagId: string) {
        return fetchWithAuth(`${API_BASE}/contacts/${contactId}/tags`, {
            method: 'POST',
            body: JSON.stringify({ tagId })
        });
    }

    async removeTagFromContact(contactId: string, tagId: string) {
        return fetchWithAuth(`${API_BASE}/contacts/${contactId}/tags/${tagId}`, { method: 'DELETE' });
    }

    async bulkAddTagToContacts(contactIds: string[], tagId: string) {
        return fetchWithAuth(`${API_BASE}/contacts/bulk/tags`, {
            method: 'POST',
            body: JSON.stringify({ contactIds, tagId })
        });
    }

    async bulkRemoveTagFromContacts(contactIds: string[], tagId: string) {
        return fetchWithAuth(`${API_BASE}/contacts/bulk/tags`, {
            method: 'DELETE',
            body: JSON.stringify({ contactIds, tagId })
        });
    }

    // --- LISTS ---
    async getLists() {
        return fetchWithAuth(`${API_BASE}/organize/lists`);
    }

    async createList(name: string, description?: string, criteria?: any) {
        return fetchWithAuth(`${API_BASE}/organize/lists`, {
            method: 'POST',
            body: JSON.stringify({ name, description, criteria })
        });
    }

    async getList(listId: string) {
        return fetchWithAuth(`${API_BASE}/organize/lists/${listId}`);
    }

    async updateList(listId: string, name?: string, description?: string, criteria?: any) {
        return fetchWithAuth(`${API_BASE}/organize/lists/${listId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name, description, criteria })
        });
    }

    async deleteList(listId: string) {
        return fetchWithAuth(`${API_BASE}/organize/lists/${listId}`, { method: 'DELETE' });
    }

    async bulkAddContactsToList(listId: string, contactIds: string[]) {
        return fetchWithAuth(`${API_BASE}/organize/lists/${listId}/contacts/bulk`, {
            method: 'POST',
            body: JSON.stringify({ contactIds })
        });
    }

    async removeContactFromList(listId: string, contactId: string) {
        return fetchWithAuth(`${API_BASE}/organize/lists/${listId}/contacts/${contactId}`, { method: 'DELETE' });
    }
}

export const organizeService = new OrganizeService();

// ─── LinkedIn Service ──────────────────────────────────────────────────────

class LinkedInService {
    async getStatus() {
        return fetchWithAuth(`${API_BASE}/linkedin/status`);
    }

    async uploadCsv(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        // Use raw fetch for multipart — fetchWithAuth sets Content-Type to JSON
        const response = await fetch(`${API_BASE}/linkedin/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authService.getAccessToken()}` },
            body: formData,
        });

        if (response.status === 401) {
            await authService.refreshAccessToken();
            return this.uploadCsv(file);
        }

        return response.json();
    }

    async getJobStatus(jobId: string) {
        return fetchWithAuth(`${API_BASE}/linkedin/job/${jobId}`);
    }

    async importData(importData: any, options: any = {}) {
        return fetchWithAuth(`${API_BASE}/linkedin/import`, {
            method: 'POST',
            body: JSON.stringify({ importData, options })
        });
    }

    async cancel() {
        return fetchWithAuth(`${API_BASE}/linkedin/cancel`, { method: 'DELETE' });
    }

    importByUrl(urls: string[]): EventSource {
        // Returns a raw fetch Response for SSE — caller handles the stream
        const ctrl = new AbortController();
        const token = authService.getAccessToken();
        // We return the fetch promise wrapped in an object the component can consume
        const promise = fetch(`${API_BASE}/linkedin/import-by-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ urls }),
            signal: ctrl.signal,
        });
        (promise as any).abort = () => ctrl.abort();
        return promise as any;
    }
}

export const linkedinService = new LinkedInService();

// ─── Notes Service ─────────────────────────────────────────────────────────

class NotesService {
    async getNotes(contactId: string) {
        return fetchWithAuth(`${API_BASE}/notes/${contactId}`);
    }

    async createNote(contactId: string, content: string, title?: string) {
        return fetchWithAuth(`${API_BASE}/notes/${contactId}`, {
            method: 'POST',
            body: JSON.stringify({ content, title: title || undefined })
        });
    }

    async updateNote(noteId: string, content: string, title?: string) {
        return fetchWithAuth(`${API_BASE}/notes/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify({ content, title: title || undefined })
        });
    }

    async deleteNote(noteId: string) {
        return fetchWithAuth(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
    }
}

export const notesService = new NotesService();

// ─── Reminders Service ─────────────────────────────────────────────────────

class RemindersService {
    async getAllReminders() {
        return fetchWithAuth(`${API_BASE}/reminders`);
    }

    async getReminders(contactId: string) {
        return fetchWithAuth(`${API_BASE}/reminders/${contactId}`);
    }

    async createReminder(contactId: string, title: string, dueDate: string, recurrence?: string) {
        return fetchWithAuth(`${API_BASE}/reminders/${contactId}`, {
            method: 'POST',
            body: JSON.stringify({ title, dueDate, recurrence: recurrence || null })
        });
    }

    async updateReminder(reminderId: string, title: string | undefined, dueDate: string | undefined, isCompleted: boolean | undefined, contactId?: string, recurrence?: string | null) {
        const body: any = {};
        if (isCompleted !== undefined) body.isCompleted = isCompleted;
        if (title) body.title = title;
        if (dueDate) body.dueDate = dueDate;
        if (contactId) body.contactId = contactId;
        if (recurrence !== undefined) body.recurrence = recurrence;

        return fetchWithAuth(`${API_BASE}/reminders/${reminderId}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    async deleteReminder(reminderId: string) {
        return fetchWithAuth(`${API_BASE}/reminders/${reminderId}`, { method: 'DELETE' });
    }
}

export const remindersService = new RemindersService();

// ─── Activities Service ────────────────────────────────────────────────────

class ActivitiesService {
    async getActivities(contactId: string) {
        return fetchWithAuth(`${API_BASE}/activities/${contactId}`);
    }
}

export const activitiesService = new ActivitiesService();

// ─── Calendar Service ──────────────────────────────────────────────────────

class CalendarService {
    async getEventsByAttendee(email: string) {
        return fetchWithAuth(`${API_BASE}/calendar/by-attendee?email=${encodeURIComponent(email)}`);
    }
}

export const calendarService = new CalendarService();

// ─── Settings Service ──────────────────────────────────────────────────────

class SettingsService {
    async getSettings() {
        return fetchWithAuth(`${API_BASE}/settings`);
    }

    async updateSettings(settings: { notificationEmail: boolean, notificationWhatsapp: boolean, whatsappNumber: string }) {
        return fetchWithAuth(`${API_BASE}/settings`, {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    async sendTestWhatsapp() {
        return fetchWithAuth(`${API_BASE}/settings/test-whatsapp`, { method: 'POST' });
    }

    async deleteAccount() {
        return fetchWithAuth(`${API_BASE}/settings/account`, { method: 'DELETE' });
    }

    async getExtensionToken() {
        return fetchWithAuth(`${API_BASE}/settings/extension-token`);
    }
}

export const settingsService = new SettingsService();

// ─── Dedup Service ─────────────────────────────────────────────────────────

class DedupService {
    async getStatus() {
        return fetchWithAuth(`${API_BASE}/dedup/status`);
    }

    async startGlobalDedup() {
        return fetchWithAuth(`${API_BASE}/dedup/start`, { method: 'POST' });
    }

    async getJobStatus(jobId: string) {
        return fetchWithAuth(`${API_BASE}/dedup/job/${jobId}`);
    }

    async applyMerges(acceptedMerges: any[]) {
        return fetchWithAuth(`${API_BASE}/dedup/apply`, {
            method: 'POST',
            body: JSON.stringify({ acceptedMerges })
        });
    }

    async cancel() {
        return fetchWithAuth(`${API_BASE}/dedup/cancel`, { method: 'DELETE' });
    }
}

export const dedupService = new DedupService();

// ─── AI Service ────────────────────────────────────────────────────────────

class AiService {
    async queryBuilder(prompt: string) {
        return fetchWithAuth(`${API_BASE}/ai/query-builder`, {
            method: 'POST',
            body: JSON.stringify({ prompt })
        });
    }

    async chat(message: string) {
        return fetchWithAuth(`${API_BASE}/ai/chat`, {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }
}

export const aiService = new AiService();
