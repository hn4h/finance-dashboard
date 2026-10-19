import type { InputHTMLAttributes, ReactNode } from 'react';
import { formatNumber, parseMoneyInput } from '../../lib/format';

export const inputClass =
    'w-full h-12 px-4 rounded-xl bg-surface-2 text-fg placeholder:text-muted/70 border border-transparent focus:outline-none focus:border-primary focus:bg-surface transition-colors';

interface FieldProps {
    label: string;
    children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
    return (
        <label className="block">
            <span className="block text-xs font-semibold text-muted mb-1.5">{label}</span>
            {children}
        </label>
    );
}

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value: number;
    onChange: (value: number) => void;
}

/** Numeric keypad on iOS, live "1.500.000" grouping, emits a plain number */
export function MoneyInput({ value, onChange, className = '', ...rest }: MoneyInputProps) {
    return (
        <div className="relative">
            <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={value ? formatNumber(value) : ''}
                onChange={e => onChange(parseMoneyInput(e.target.value))}
                placeholder="0"
                className={`${inputClass} pr-10 font-semibold tabular ${className}`}
                {...rest}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-semibold pointer-events-none">đ</span>
        </div>
    );
}
