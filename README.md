# NEXO — Personal CRM Frontend

> Never lose touch with people who matter.

NEXO is a personal CRM that syncs your Google Contacts and Calendar to help you manage relationships, track interactions, and stay on top of reminders — all in one place.

This is the **frontend** repository built with Next.js, React, and Tailwind CSS.

---

## ✨ Features

- **Google OAuth Sign-In** — Authenticate with your Google account in one click
- **Contact Management** — View, search, filter, and sort your contacts with server-side pagination
- **Google Contacts Sync** — Pull contacts directly from Google People API with last-sync timestamp display
- **LinkedIn CSV Import** — Import your LinkedIn connections via CSV upload with duplicate detection
- **Contact Detail Panel** — View full contact profiles with notes, reminders, activities, and calendar events
- **Tag System** — Create, assign, and manage color-coded tags for organizing contacts
- **Bulk Actions** — Select multiple contacts and apply/remove tags in bulk
- **Reminders** — Create, edit, complete, and delete reminders with a searchable contact combobox
- **Activity Timeline** — Track interaction history per contact
- **Responsive Sidebar** — Navigate between Contacts, Reminders, and Import sections

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| **State Management** | [TanStack React Query](https://tanstack.com/query) |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Date Utilities** | date-fns |
| **Forms** | React Hook Form + Zod |

---

## 📁 Project Structure

```
fe/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx              # Landing page with Google Sign-In
│   │   ├── layout.tsx            # Root layout (Providers, metadata)
│   │   ├── auth/callback/        # OAuth callback handler
│   │   └── dashboard/
│   │       ├── page.tsx          # Dashboard home (redirects to contacts)
│   │       ├── layout.tsx        # Dashboard layout with sidebar
│   │       ├── contacts/         # Contacts page
│   │       ├── reminders/        # Reminders page
│   │       └── import/           # LinkedIn CSV import page
│   ├── components/
│   │   ├── AppSidebar.tsx        # Navigation sidebar
│   │   ├── ContactGrid.tsx       # Main contacts table with pagination
│   │   ├── ContactDetail.tsx     # Contact detail slide-over panel
│   │   ├── RemindersView.tsx     # Reminders CRUD with searchable combobox
│   │   ├── CSVImport.tsx         # LinkedIn CSV import wizard
│   │   ├── TagManager.tsx        # Tag CRUD dialog
│   │   ├── ProtectedRoute.tsx    # Auth guard wrapper
│   │   ├── Providers.tsx         # React Query + Theme + Toast providers
│   │   └── ui/                   # shadcn/ui component library
│   ├── services/
│   │   └── api.ts                # API service layer (auth, contacts, reminders, sync, etc.)
│   ├── hooks/
│   │   ├── use-debounce.ts       # Debounce hook for search inputs
│   │   ├── use-toast.ts          # Toast notification hook
│   │   └── use-mobile.tsx        # Mobile breakpoint detection
│   └── lib/
│       ├── utils.ts              # Utility functions (cn, etc.)
│       └── mockData.ts           # Type definitions and mock data
├── public/                       # Static assets
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A running instance of the [NEXO Backend](https://github.com/amansingh962000-beep/Nexo-Backend) (default: `http://localhost:3000`)

### Installation

```bash
# Clone the repository
git clone https://github.com/amansingh962000-beep/Nexo-Frontend.git
cd Nexo-Frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env and set NEXT_PUBLIC_API_BASE if your backend is not on localhost:3000
```

### Development

```bash
npm run dev
```

The app runs at **http://localhost:4000** by default.

### Production Build

```bash
npm run build
npm run start
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | Backend API base URL | `http://localhost:3000/api` |

Create a `.env` or `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
```

---

## 📡 API Integration

The frontend communicates with the NEXO Express.js backend through a service layer (`src/services/api.ts`) covering:

| Service | Endpoints |
|---|---|
| **Auth** | Google OAuth flow, token refresh, user info |
| **Contacts** | CRUD, search, pagination, favorites, tags |
| **Reminders** | CRUD, completion toggle |
| **Sync** | Google Contacts sync, sync status/history |
| **LinkedIn** | CSV upload and import |
| **Notes** | Per-contact notes |
| **Activities** | Interaction timeline |
| **Organize** | Tags and lists management |
| **Calendar** | Calendar events per contact |

---

## 🧩 Key Pages

| Route | Description |
|---|---|
| `/` | Landing page with Google Sign-In |
| `/auth/callback` | OAuth callback — exchanges code for tokens |
| `/dashboard` | Redirects to `/dashboard/contacts` |
| `/dashboard/contacts` | Contact table with search, sort, filter, pagination |
| `/dashboard/reminders` | Reminders list with create/edit/delete |
| `/dashboard/import` | LinkedIn CSV import wizard |

---

## 📄 License

This project is private and not licensed for public distribution.
