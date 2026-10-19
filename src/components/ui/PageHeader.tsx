import type { ReactNode } from 'react';
import Icon from './Icon';

interface PageHeaderProps {
    title: string;
    subtitle?: ReactNode;
    /** Shows a ‹ back button (mobile sub-pages) */
    onBack?: () => void;
    actions?: ReactNode;
}

/** Sticky, safe-area-aware title bar on mobile; large page title on desktop. */
export default function PageHeader({ title, subtitle, onBack, actions }: PageHeaderProps) {
    return (
        <header className="sticky top-0 z-30 -mx-4 md:mx-0 px-4 md:px-0 pt-[calc(0.75rem+var(--safe-top))] md:pt-10 pb-3 md:pb-6 bg-bg/85 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none md:static">
            <div className="flex items-center gap-2 min-h-10">
                {onBack && (
                    <button onClick={onBack} aria-label="Quay lại" className="md:hidden size-10 -ml-2 rounded-full flex items-center justify-center text-primary hover:bg-surface-2">
                        <Icon name="back" size={26} />
                    </button>
                )}
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight truncate">{title}</h1>
                    {subtitle && <p className="hidden md:block text-muted mt-1">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
        </header>
    );
}
