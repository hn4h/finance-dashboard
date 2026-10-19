import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

interface SheetProps {
    open: boolean;
    onClose: () => void;
    title?: ReactNode;
    /** Sticky action row (e.g. Save / Cancel); kept above the iOS home indicator */
    footer?: ReactNode;
    children: ReactNode;
}

let openCount = 0;

/**
 * Bottom sheet on mobile, centered dialog on ≥md. Opening pushes a history
 * entry so the iOS swipe-back gesture closes the sheet instead of leaving the page.
 */
export default function Sheet(props: SheetProps) {
    if (!props.open) return null;
    return createPortal(<SheetPanel {...props} />, document.body);
}

function SheetPanel({ onClose, title, footer, children }: SheetProps) {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // History entry: back gesture → close.
    // Keyed by useId so StrictMode's mount→unmount→mount doesn't push twice or pop itself.
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        const state = window.history.state;
        let depth: number;
        if (state?.sheetKey === titleId) {
            depth = state.sheetDepth;
        } else {
            depth = ((state?.sheetDepth as number) ?? 0) + 1;
            window.history.pushState({ ...state, sheetKey: titleId, sheetDepth: depth }, '');
        }
        const onPop = () => {
            if (((window.history.state?.sheetDepth as number) ?? 0) < depth) onCloseRef.current();
        };
        window.addEventListener('popstate', onPop);
        return () => {
            mounted.current = false;
            window.removeEventListener('popstate', onPop);
            // Closed from the UI (not a remount): drop our own history entry
            setTimeout(() => {
                if (!mounted.current && window.history.state?.sheetKey === titleId) window.history.back();
            });
        };
    }, [titleId]);

    // Scroll lock, Escape, initial focus
    useEffect(() => {
        if (openCount++ === 0) document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
        window.addEventListener('keydown', onKey);
        if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
        return () => {
            if (--openCount === 0) document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6">
            <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
                className="relative w-full md:max-w-lg max-h-[90dvh] flex flex-col bg-surface rounded-t-3xl md:rounded-2xl shadow-2xl outline-none animate-sheet-up md:animate-pop-in"
            >
                <div className="md:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-border shrink-0" />
                <div className="flex items-center justify-between gap-3 px-4 md:px-6 pt-3 md:pt-5 pb-2 shrink-0">
                    <h2 id={titleId} className="text-lg font-bold truncate">{title}</h2>
                    <button onClick={onClose} aria-label="Đóng" className="size-9 -mr-1 rounded-full flex items-center justify-center text-muted hover:bg-surface-2 shrink-0">
                        <Icon name="close" />
                    </button>
                </div>
                <div className={`flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 ${footer ? 'pb-4' : 'pb-[calc(1.25rem+var(--safe-bottom))] md:pb-6'}`}>
                    {children}
                </div>
                {footer && (
                    <div className="shrink-0 flex gap-3 px-4 md:px-6 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] md:pb-5 border-t">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
