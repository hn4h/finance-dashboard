interface SegmentedControlProps<T extends string> {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
}

export default function SegmentedControl<T extends string>({ options, value, onChange, className = '' }: SegmentedControlProps<T>) {
    return (
        <div role="tablist" className={`flex p-1 gap-1 bg-surface-2 rounded-xl overflow-x-auto no-scrollbar ${className}`}>
            {options.map(o => (
                <button
                    key={o.value}
                    role="tab"
                    aria-selected={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={`flex-1 whitespace-nowrap px-3 h-9 rounded-lg text-sm font-semibold transition-colors ${value === o.value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
