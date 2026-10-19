import { createContext, useContext } from 'react';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast { id: number; kind: ToastKind; message: string }

export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    danger?: boolean;
}

export interface FeedbackContextValue {
    toast: (message: string, kind?: ToastKind) => void;
    confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
    const ctx = useContext(FeedbackContext);
    if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
    return ctx;
}
