import type { Transaction } from '../db';
import { parseCategory } from '../lib/categories';
import { formatVND } from '../lib/format';
import Icon from './ui/Icon';

export function CategoryIcon({ category, size = 'md' }: { category: string | null | undefined; size?: 'md' | 'lg' }) {
    const cat = parseCategory(category);
    const box = size === 'lg' ? 'size-12 rounded-2xl' : 'size-10 rounded-xl';
    if (!cat) {
        return (
            <span className={`${box} shrink-0 flex items-center justify-center bg-warning/12 text-warning`}>
                <Icon name="pending_actions" size={size === 'lg' ? 22 : 18} />
            </span>
        );
    }
    return (
        <span
            className={`${box} shrink-0 flex items-center justify-center`}
            style={{ color: cat.color, backgroundColor: `color-mix(in srgb, ${cat.color} 14%, transparent)` }}
        >
            <Icon name={cat.icon} size={size === 'lg' ? 22 : 18} />
        </span>
    );
}

interface TransactionRowProps {
    tx: Transaction;
    onClick?: () => void;
    /** "time" for rows grouped under a date header, "date" for flat lists */
    meta?: 'time' | 'date';
}

export default function TransactionRow({ tx, onClick, meta = 'date' }: TransactionRowProps) {
    const cat = parseCategory(tx.category);
    const when = meta === 'time'
        ? new Date(tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : new Date(tx.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag onClick={onClick} className={`flex items-center gap-3 w-full px-4 py-3 text-left ${onClick ? 'active:bg-surface-2 hover:bg-surface-2/60 transition-colors' : ''}`}>
            <CategoryIcon category={tx.status === 'unclassified' ? null : tx.category} />
            <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{tx.description}</p>
                <p className="text-xs text-muted truncate mt-0.5">
                    {tx.status === 'unclassified' ? <span className="text-warning font-semibold">Chưa phân loại</span> : cat?.name}
                    {' · '}{when}
                    {tx.beneficiary && <> · → {tx.beneficiary}</>}
                </p>
            </div>
            <span className={`shrink-0 font-bold tabular ${tx.amount > 0 ? 'text-income' : ''}`}>
                {formatVND(tx.amount, { sign: true })}
            </span>
        </Tag>
    );
}
