import { useState } from 'react';
import { db, type Transaction } from '../db';

const CATEGORIES = [
    { icon: 'restaurant', name: 'Ăn uống' },
    { icon: 'directions_car', name: 'Di chuyển' },
    { icon: 'local_mall', name: 'Mua sắm' },
    { icon: 'sports_esports', name: 'Giải trí' },
    { icon: 'favorite', name: 'Người yêu' },
    { icon: 'category', name: 'Khác' },
];

export default function TransactionCard({ tx }: { tx: Transaction }) {
    const [fadingOut, setFadingOut] = useState(false);

    const handleCategorize = async (categoryObj: string) => {
        setFadingOut(true);
        // Add small delay for visual feedback before removing
        setTimeout(async () => {
            await db.transactions.update(tx.id!, {
                category: categoryObj,
                status: 'classified'
            });
        }, 300);
    };

    const amountColor = tx.amount > 0 ? 'text-green-600' : 'text-on-surface';
    const prefix = tx.amount > 0 ? '+' : '';
    const iconName = tx.amount > 0 ? 'arrow_downward_alt' : 'shopping_cart';
    const iconColor = tx.amount > 0 ? 'text-green-700' : 'text-primary';

    return (
        <div className={`p-5 bg-surface-container-lowest rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-surface-container-highest/20 hover:shadow-md hover:border-surface-container-highest transition-all duration-300 ${fadingOut ? 'opacity-0 scale-[0.98] -translate-y-2' : 'opacity-100 scale-100'}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4 flex-1">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
                        <span className={`material-symbols-outlined ${iconColor}`}>{iconName}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface text-base truncate" title={tx.description}>
                            {tx.description.substring(0, 30)}...
                        </p>
                        <p className="font-mono text-[10px] text-outline mt-1 font-medium bg-surface-container px-2 py-0.5 rounded uppercase tracking-widest break-all">
                            {tx.description}
                        </p>
                        <p className="text-xs text-outline font-medium mt-2">
                            {new Date(tx.date).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                    </div>
                </div>
                <div className={`shrink-0 font-black text-lg ${amountColor} tracking-tighter`}>
                    {prefix}{tx.amount.toLocaleString()} VNĐ
                </div>
            </div>

            <div className="pt-4 border-t border-surface-container-highest/40 flex flex-wrap gap-2">
                <p className="text-[10px] text-outline font-bold uppercase tracking-widest w-full mb-1">Phân loại nhanh</p>
                {CATEGORIES.map(c => (
                    <button
                        key={c.name}
                        onClick={() => handleCategorize(`${c.icon} ${c.name}`)}
                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-primary hover:text-on-primary rounded-lg text-sm font-semibold transition-all cursor-pointer active:scale-95"
                        title={c.name}
                    >
                        <span className="material-symbols-outlined text-[18px]">{c.icon}</span>
                        <span className="text-on-surface-variant group-hover:text-on-primary transition-colors">{c.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
