import { useCallback, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import Icon from './Icon';
import Sheet from './Sheet';
import { FeedbackContext, type ConfirmOptions, type Toast, type ToastKind } from './useFeedback';

/* Toasts replace alert(); confirm() replaces window.confirm(). Consume via useFeedback(). */

const TOAST_ICON: Record<ToastKind, string> = { success: 'check_circle', error: 'warning', info: 'inbox' };
const TOAST_COLOR: Record<ToastKind, string> = { success: 'text-income', error: 'text-expense', info: 'text-primary' };

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [pending, setPending] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((ok: boolean) => void) | null>(null);
    const nextId = useRef(0);

    const toast = useCallback((message: string, kind: ToastKind = 'success') => {
        const id = ++nextId.current;
        setToasts(t => [...t, { id, kind, message }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), kind === 'error' ? 5000 : 3000);
    }, []);

    const confirm = useCallback((opts: ConfirmOptions) => {
        resolver.current?.(false);
        setPending(opts);
        return new Promise<boolean>(resolve => { resolver.current = resolve; });
    }, []);

    const settle = (ok: boolean) => {
        resolver.current?.(ok);
        resolver.current = null;
        setPending(null);
    };

    return (
        <FeedbackContext.Provider value={{ toast, confirm }}>
            {children}

            <Sheet
                open={!!pending}
                onClose={() => settle(false)}
                title={pending?.title}
                footer={<>
                    <Button variant="secondary" size="lg" onClick={() => settle(false)}>Huỷ</Button>
                    <Button variant={pending?.danger ? 'danger' : 'primary'} size="lg" onClick={() => settle(true)}>
                        {pending?.confirmLabel ?? 'Đồng ý'}
                    </Button>
                </>}
            >
                {pending?.message && <p className="text-muted">{pending.message}</p>}
            </Sheet>

            {createPortal(
                <div
                    aria-live="polite"
                    className="fixed z-[60] inset-x-4 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+12px)] md:inset-x-auto md:right-6 md:bottom-6 md:w-96 flex flex-col gap-2 pointer-events-none"
                >
                    {toasts.map(t => (
                        <div key={t.id} className="pointer-events-auto flex items-start gap-3 bg-surface text-fg rounded-2xl px-4 py-3 shadow-2xl border animate-pop-in">
                            <Icon name={TOAST_ICON[t.kind]} className={`shrink-0 mt-0.5 ${TOAST_COLOR[t.kind]}`} />
                            <p className="text-sm font-medium">{t.message}</p>
                        </div>
                    ))}
                </div>,
                document.body,
            )}
        </FeedbackContext.Provider>
    );
}
