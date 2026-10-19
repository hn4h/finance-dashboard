import type { ReactNode } from 'react';
import Icon from './Icon';

interface EmptyStateProps {
    icon: string;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center text-center py-10 px-4">
            <div className="size-14 rounded-full bg-surface-2 text-muted flex items-center justify-center mb-3">
                <Icon name={icon} size={26} />
            </div>
            <p className="font-semibold">{title}</p>
            {description && <p className="text-sm text-muted mt-1 max-w-xs">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
