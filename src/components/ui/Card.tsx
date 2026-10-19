import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    title?: ReactNode;
    action?: ReactNode;
    padded?: boolean;
}

export default function Card({ title, action, padded = true, className = '', children, ...rest }: CardProps) {
    return (
        <section className={`bg-surface rounded-2xl shadow-card ${padded ? 'p-4 md:p-6' : ''} ${className}`} {...rest}>
            {(title || action) && (
                <div className={`flex items-center justify-between gap-3 mb-3 ${padded ? '' : 'px-4 pt-4 md:px-6 md:pt-6'}`}>
                    {title && <h2 className="text-base font-bold">{title}</h2>}
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}
