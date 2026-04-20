'use client';

import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'destructive' | 'default';
    onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title = 'Are you sure?',
    description = 'This action cannot be undone.',
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    variant = 'destructive',
    onConfirm,
}: ConfirmDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
        } finally {
            setLoading(false);
            onOpenChange(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={loading}
                        className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                    >
                        {loading ? 'Deleting...' : confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/**
 * Hook to manage confirm dialog state.
 * Usage:
 *   const confirm = useConfirmDialog();
 *   // In JSX: <ConfirmDialog {...confirm.props} />
 *   // To trigger: confirm.open({ onConfirm: () => doDelete(), title: '...' })
 */
export function useConfirmDialog() {
    const [state, setState] = useState<{
        isOpen: boolean;
        title?: string;
        description?: string;
        confirmLabel?: string;
        onConfirm: () => void | Promise<void>;
    }>({
        isOpen: false,
        onConfirm: () => { },
    });

    return {
        open: (opts: {
            onConfirm: () => void | Promise<void>;
            title?: string;
            description?: string;
            confirmLabel?: string;
        }) => {
            setState({ isOpen: true, ...opts });
        },
        props: {
            open: state.isOpen,
            onOpenChange: (open: boolean) => setState((s) => ({ ...s, isOpen: open })),
            title: state.title,
            description: state.description,
            confirmLabel: state.confirmLabel,
            onConfirm: state.onConfirm,
        },
    };
}
