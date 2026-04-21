"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/api';

import { Suspense } from 'react';

function AuthCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        handleCallback();
    }, [searchParams, router]);

    async function handleCallback() {
        try {
            const accessToken = searchParams.get('accessToken');
            const refreshToken = searchParams.get('refreshToken');

            if (accessToken && refreshToken) {
                const isNew = !authService.isAuthenticated();
                authService.handleAuthCallback({ accessToken, refreshToken });
                // New users go through onboarding, returning users go to dashboard
                router.push(isNew ? '/onboarding' : '/dashboard/contacts');
            } else {
                // Fallback: If backend set httpOnly cookies
                const user = await authService.getCurrentUser();
                if (user.success) {
                    router.push('/dashboard/contacts');
                } else {
                    setError('Authentication failed - missing tokens');
                }
            }
        } catch (err) {
            console.error('Auth callback error:', err);
            setError('Authentication failed. Please try again.');
        }
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="glass-card p-8 rounded-xl max-w-sm text-center">
                    <h2 className="text-xl font-bold text-destructive mb-2">Authentication Error</h2>
                    <p className="text-sm text-muted-foreground mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background font-medium text-muted-foreground">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p>Completing authentication...</p>
            </div>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
