import type { ButtonHTMLAttributes } from 'react';
import Icon from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
    primary: 'bg-primary text-on-primary hover:opacity-90',
    secondary: 'bg-surface-2 text-fg hover:bg-border',
    ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
    danger: 'bg-expense/10 text-expense hover:bg-expense/15',
};

const SIZES: Record<Size, string> = {
    md: 'h-10 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-12 px-5 text-base gap-2 rounded-2xl w-full',
    icon: 'size-10 rounded-full justify-center',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    icon?: string;
    loading?: boolean;
}

export default function Button({
    variant = 'primary', size = 'md', icon, loading, className = '', children, disabled, type = 'button', ...rest
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center font-semibold transition-[opacity,background-color,transform] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 select-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
            {...rest}
        >
            {(icon || loading) && (
                <Icon name={loading ? 'sync' : icon!} size={size === 'lg' ? 20 : 18} className={loading ? 'animate-spin' : ''} />
            )}
            {children}
        </button>
    );
}
