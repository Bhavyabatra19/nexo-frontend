export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  phone?: string;
  avatar?: string;
  tags: any[];
  lastContacted: string | null;
  notes: NoteEntry[];
  source: 'google' | 'linkedin' | 'manual';
  createdAt: string;
  contactCreatedDate?: string | null;
  lists: any[];
  activities: ActivityEvent[];
  linkedinUrl?: string;
  bio?: string;
  address?: string;
  phones?: { value: string; label: string }[];
  emails?: { value: string; label: string }[];
  ai_summary?: string | null;
  instagramUrl?: string;
  instagram_url?: string;
  customLinks?: { label: string; url: string }[];
  custom_links?: { label: string; url: string }[];
}

export interface NoteEntry {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  contactId: string;
  contactName: string;
  message: string;
  dueDate: string;
  completed: boolean;
}

export type ActivityType = 'note_added' | 'reminder_created' | 'reminder_completed' | 'tag_changed' | 'contact_created' | 'contact_updated';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
}

export const allTags = [
  'Engineering', 'Design', 'Product', 'Founder', 'Investor',
  'VIP', 'Marketing', 'Content', 'DevOps', 'Fintech',
  'Legal', 'Compliance', 'Re-engage',
];

export const allLists = ['Top 100', 'Advisors', 'Hiring Pipeline', 'Investors Circle'];

export const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@techcorp.io',
    company: 'TechCorp',
    title: 'VP of Engineering',
    phone: '+1 (555) 234-5678',
    tags: ['Engineering', 'VIP'],
    lastContacted: '2026-02-13',
    notes: [
      { id: 'n1', content: 'Met at React Summit 2025. Interested in collaboration on open-source tooling.', createdAt: '2025-09-15T10:00:00Z' },
      { id: 'n2', content: 'Followed up on open-source proposal — she wants to co-author a blog post.', createdAt: '2026-01-20T14:30:00Z' },
    ],
    source: 'linkedin',
    createdAt: '2025-09-15',
    lists: ['Top 100'],
    activities: [
      { id: 'a1-1', type: 'contact_created', description: 'Contact created via LinkedIn import', timestamp: '2025-09-15T10:00:00Z' },
      { id: 'a1-2', type: 'note_added', description: 'Added note about React Summit 2025', timestamp: '2025-09-15T10:00:00Z' },
      { id: 'a1-3', type: 'note_added', description: 'Added follow-up note on open-source proposal', timestamp: '2026-01-20T14:30:00Z' },
      { id: 'a1-4', type: 'reminder_created', description: 'Set reminder: Send open-source project proposal', timestamp: '2026-02-10T09:00:00Z' },
    ],
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    email: 'marcus.j@designlab.com',
    company: 'DesignLab',
    title: 'Head of Product Design',
    tags: ['Design', 'Product'],
    lastContacted: '2026-02-10',
    notes: [
      { id: 'n3', content: 'Great conversation about design systems. Follow up on Figma plugin idea.', createdAt: '2025-06-20T09:00:00Z' },
    ],
    source: 'google',
    createdAt: '2025-06-20',
    lists: [],
    activities: [
      { id: 'a2-1', type: 'contact_created', description: 'Contact imported from Google Contacts', timestamp: '2025-06-20T09:00:00Z' },
      { id: 'a2-2', type: 'note_added', description: 'Added note about design systems conversation', timestamp: '2025-06-20T09:00:00Z' },
    ],
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.r@startupxyz.com',
    company: 'StartupXYZ',
    title: 'CEO & Co-Founder',
    phone: '+1 (555) 987-6543',
    tags: ['Founder', 'Investor'],
    lastContacted: '2026-01-28',
    notes: [
      { id: 'n4', content: 'Raising Series A. Looking for technical advisors.', createdAt: '2025-11-03T11:00:00Z' },
    ],
    source: 'manual',
    createdAt: '2025-11-03',
    lists: ['Investors Circle'],
    activities: [
      { id: 'a3-1', type: 'contact_created', description: 'Contact added manually', timestamp: '2025-11-03T11:00:00Z' },
      { id: 'a3-2', type: 'note_added', description: 'Added note about Series A fundraising', timestamp: '2025-11-03T11:00:00Z' },
      { id: 'a3-3', type: 'reminder_created', description: 'Set reminder: Follow up on Series A progress', timestamp: '2026-01-15T08:00:00Z' },
    ],
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.kim@cloudscale.io',
    company: 'CloudScale',
    title: 'Senior DevOps Engineer',
    tags: ['Engineering', 'DevOps'],
    lastContacted: '2026-02-01',
    notes: [
      { id: 'n5', content: 'Kubernetes expert. Potential consulting opportunity.', createdAt: '2025-08-12T16:00:00Z' },
    ],
    source: 'linkedin',
    createdAt: '2025-08-12',
    lists: ['Hiring Pipeline'],
    activities: [
      { id: 'a4-1', type: 'contact_created', description: 'Contact created via LinkedIn import', timestamp: '2025-08-12T16:00:00Z' },
      { id: 'a4-2', type: 'note_added', description: 'Added note about Kubernetes consulting', timestamp: '2025-08-12T16:00:00Z' },
    ],
  },
  {
    id: '5',
    name: 'Priya Patel',
    email: 'priya@venturefund.vc',
    company: 'Venture Fund',
    title: 'Partner',
    phone: '+1 (555) 111-2233',
    tags: ['Investor', 'VIP'],
    lastContacted: '2026-02-14',
    notes: [
      { id: 'n6', content: 'Interested in AI/ML startups. Has portfolio of 30+ companies.', createdAt: '2025-04-08T08:00:00Z' },
    ],
    source: 'google',
    createdAt: '2025-04-08',
    lists: ['Investors Circle', 'Top 100'],
    activities: [
      { id: 'a5-1', type: 'contact_created', description: 'Contact imported from Google Contacts', timestamp: '2025-04-08T08:00:00Z' },
      { id: 'a5-2', type: 'note_added', description: 'Added note about AI/ML portfolio', timestamp: '2025-04-08T08:00:00Z' },
      { id: 'a5-3', type: 'tag_changed', description: 'Added tag: VIP', timestamp: '2025-06-01T10:00:00Z' },
      { id: 'a5-4', type: 'reminder_created', description: 'Set reminder: Share pitch deck for review', timestamp: '2026-02-01T09:00:00Z' },
    ],
  },
  {
    id: '6',
    name: 'Alex Thompson',
    email: 'alex.t@mediagroup.com',
    company: 'MediaGroup',
    title: 'Content Director',
    tags: ['Marketing', 'Content'],
    lastContacted: '2026-01-15',
    notes: [
      { id: 'n7', content: 'Podcast collaboration discussed. Send proposal by end of month.', createdAt: '2025-10-22T13:00:00Z' },
    ],
    source: 'linkedin',
    createdAt: '2025-10-22',
    lists: [],
    activities: [
      { id: 'a6-1', type: 'contact_created', description: 'Contact created via LinkedIn import', timestamp: '2025-10-22T13:00:00Z' },
      { id: 'a6-2', type: 'note_added', description: 'Added note about podcast collaboration', timestamp: '2025-10-22T13:00:00Z' },
      { id: 'a6-3', type: 'reminder_created', description: 'Set reminder: Submit podcast proposal', timestamp: '2026-01-20T09:00:00Z' },
    ],
  },
  {
    id: '7',
    name: 'Lisa Wang',
    email: 'lisa.wang@fintech.co',
    company: 'FinTech Co',
    title: 'CTO',
    tags: ['Engineering', 'Fintech', 'VIP'],
    lastContacted: '2025-12-20',
    notes: [
      { id: 'n8', content: 'Building payments infrastructure. Uses our API.', createdAt: '2025-03-15T10:00:00Z' },
    ],
    source: 'manual',
    createdAt: '2025-03-15',
    lists: ['Top 100', 'Advisors'],
    activities: [
      { id: 'a7-1', type: 'contact_created', description: 'Contact added manually', timestamp: '2025-03-15T10:00:00Z' },
      { id: 'a7-2', type: 'note_added', description: 'Added note about payments infrastructure', timestamp: '2025-03-15T10:00:00Z' },
      { id: 'a7-3', type: 'tag_changed', description: 'Added tag: VIP', timestamp: '2025-05-10T14:00:00Z' },
    ],
  },
  {
    id: '8',
    name: "James O'Brien",
    email: 'james@legaltech.io',
    company: 'LegalTech',
    title: 'General Counsel',
    tags: ['Legal', 'Compliance'],
    lastContacted: '2026-02-05',
    notes: [
      { id: 'n9', content: 'Privacy compliance expert. Can help with GDPR questions.', createdAt: '2025-07-19T15:00:00Z' },
    ],
    source: 'google',
    createdAt: '2025-07-19',
    lists: ['Advisors'],
    activities: [
      { id: 'a8-1', type: 'contact_created', description: 'Contact imported from Google Contacts', timestamp: '2025-07-19T15:00:00Z' },
      { id: 'a8-2', type: 'note_added', description: 'Added note about GDPR compliance', timestamp: '2025-07-19T15:00:00Z' },
    ],
  },
];

export const mockReminders: Reminder[] = [
  {
    id: '1',
    contactId: '3',
    contactName: 'Emily Rodriguez',
    message: 'Follow up on Series A fundraising progress',
    dueDate: '2026-02-16',
    completed: false,
  },
  {
    id: '2',
    contactId: '1',
    contactName: 'Sarah Chen',
    message: 'Send open-source project proposal',
    dueDate: '2026-02-17',
    completed: false,
  },
  {
    id: '3',
    contactId: '6',
    contactName: 'Alex Thompson',
    message: 'Submit podcast collaboration proposal',
    dueDate: '2026-02-20',
    completed: false,
  },
  {
    id: '4',
    contactId: '5',
    contactName: 'Priya Patel',
    message: 'Share pitch deck for review',
    dueDate: '2026-02-15',
    completed: false,
  },
];

export const tagColors: Record<string, string> = {
  Engineering: 'bg-blue-100 text-blue-700',
  Design: 'bg-pink-100 text-pink-700',
  Product: 'bg-purple-100 text-purple-700',
  Founder: 'bg-amber-100 text-amber-700',
  Investor: 'bg-green-100 text-green-700',
  VIP: 'bg-red-100 text-red-700',
  Marketing: 'bg-orange-100 text-orange-700',
  Content: 'bg-teal-100 text-teal-700',
  DevOps: 'bg-cyan-100 text-cyan-700',
  Fintech: 'bg-indigo-100 text-indigo-700',
  Legal: 'bg-slate-100 text-slate-700',
  Compliance: 'bg-gray-100 text-gray-700',
  'Re-engage': 'bg-yellow-100 text-yellow-700',
};
