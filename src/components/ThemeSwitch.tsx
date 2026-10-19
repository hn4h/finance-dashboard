import type { ThemePref } from '../lib/theme';
import Icon from './ui/Icon';

const OPTIONS: { value: ThemePref; icon: string; label: string }[] = [
    { value: 'light', icon: 'light_mode', label: 'Sáng' },
    { value: 'dark', icon: 'dark_mode', label: 'Tối' },
    { value: 'system', icon: 'system_mode', label: 'Tự động' },
];

export default function ThemeSwitch({ value, onChange }: { value: ThemePref; onChange: (v: ThemePref) => void }) {
    return (
        <div role="radiogroup" aria-label="Giao diện" className="flex p-1 gap-1 bg-surface-2 rounded-xl">
            {OPTIONS.map(o => (
                <button
                    key={o.value}
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-12 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${value === o.value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}
                >
                    <Icon name={o.icon} size={16} />
                    {o.label}
                </button>
            ))}
        </div>
    );
}
