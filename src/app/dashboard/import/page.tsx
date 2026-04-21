"use client";

import { useState } from 'react';
import CSVImport from "@/components/CSVImport";
import LinkedInURLImport from "@/components/LinkedInURLImport";
import { cn } from "@/lib/utils";

const TABS = [
  { id: 'csv', label: 'CSV Export' },
  { id: 'url', label: 'LinkedIn URLs' },
] as const;

type Tab = typeof TABS[number]['id'];

export default function ImportPage() {
  const [tab, setTab] = useState<Tab>('csv');

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Contacts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add your LinkedIn network to Nexo via CSV export or direct profile URLs.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'csv' && <CSVImport />}
      {tab === 'url' && <LinkedInURLImport />}
    </div>
  );
}
