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

        const response = await fetch(url, { ...options, headers, credentials: 'include' });

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

// Cookie-based auth (folkX-style). Tokens live in httpOnly cookies set by the backend.
// `authed` in localStorage is a non-sensitive UX flag so sync isAuthenticated() keeps working.
class AuthService {
    async getGoogleAuthUrl() {
        const response = await fetch(`${API_BASE}/auth/google`);
        const data = await response.json();
        return data.authUrl;
    }

    // Called by /auth/callback after the backend has already set cookies via redirect.
    markAuthenticated() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('authed', '1');
        }
    }

    // Legacy shim — callback page used to receive tokens in query params. Cookies now replace this.
    handleAuthCallback(_tokens?: { accessToken?: string; refreshToken?: string }) {
        this.markAuthenticated();
    }

    isAuthenticated() {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('authed') === '1';
    }

    async refreshAccessToken() {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json().catch(() => ({ success: false }));

        if (data.success) return data.accessToken;
        this.logout();
        throw new Error('Failed to refresh token');
    }

    async getCurrentUser() {
        return fetchWithAuth(`${API_BASE}/auth/me`);
    }

    async logout() {
        if (typeof window === 'undefined') return;
        try {
            await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch {}
        localStorage.removeItem('authed');
        // Drop legacy token keys from pre-cookie builds
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
    }

    getAuthHeaders(): Record<string, string> {
        return { 'Content-Type': 'application/json' };
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
            credentials: 'include',
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
        const promise = fetch(`${API_BASE}/linkedin/import-by-url`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
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

// ─── Groups Service ────────────────────────────────────────────────────────

class GroupsService {
    async createGroup(data: { name: string; description?: string; logo_url?: string }) {
        return fetchWithAuth(`${API_BASE}/groups`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listGroups() {
        return fetchWithAuth(`${API_BASE}/groups`);
    }

    async getGroup(id: string) {
        return fetchWithAuth(`${API_BASE}/groups/${id}`);
    }

    async joinGroup(inviteCode: string) {
        return fetchWithAuth(`${API_BASE}/groups/join/${inviteCode}`, { method: 'POST' });
    }

    async giveConsent(groupId: string) {
        return fetchWithAuth(`${API_BASE}/groups/${groupId}/consent`, { method: 'POST' });
    }

    async getMembers(groupId: string) {
        return fetchWithAuth(`${API_BASE}/groups/${groupId}/members`);
    }

    async removeMember(groupId: string, memberId: string) {
        return fetchWithAuth(`${API_BASE}/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
    }

}

export const groupsService = new GroupsService();

// ─── Search Service ────────────────────────────────────────────────────────

class SearchService {
    async search(query: string, scope: 'personal' | 'group' | 'all', groupId?: string) {
        const params = new URLSearchParams({ q: query, scope });
        if (groupId) params.set('group_id', groupId);
        return fetchWithAuth(`${API_BASE}/search?${params}`);
    }
}

export const searchService = new SearchService();

// ─── Intros Service ────────────────────────────────────────────────────────

class IntrosService {
    async requestIntro(data: {
        connector_id: string;
        target_contact_id: string;
        context: string;
        preferred_method?: string;
        group_id?: string;
    }) {
        return fetchWithAuth(`${API_BASE}/intros`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listIntros() {
        return fetchWithAuth(`${API_BASE}/intros`);
    }

    async approveIntro(id: string, connector_note?: string) {
        return fetchWithAuth(`${API_BASE}/intros/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ connector_note }),
        });
    }

    async denyIntro(id: string) {
        return fetchWithAuth(`${API_BASE}/intros/${id}/deny`, { method: 'POST' });
    }
}

export const introsService = new IntrosService();
