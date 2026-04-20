import React, { Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppSidebar from '@/components/AppSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-background">
                <Suspense fallback={<div className="w-[260px] shrink-0 border-r border-border bg-sidebar" />}>
                    <AppSidebar />
                </Suspense>
                <main className="flex-1 flex overflow-hidden">
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>}>
                        {children}
                    </Suspense>
                </main>
            </div>
        </ProtectedRoute>
    );
}
