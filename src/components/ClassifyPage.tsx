import { useState, useCallback, useEffect, useMemo } from 'react';
import { db, type Transaction } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { where, doc, updateDoc } from 'firebase/firestore';

const CATEGORIES = [
    { icon: 'restaurant', name: 'Ăn uống', color: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-600' },
    { icon: 'directions_car', name: 'Di chuyển', color: 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-600' },
    { icon: 'local_mall', name: 'Mua sắm', color: 'bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-600' },
    { icon: 'sports_esports', name: 'Giải trí', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600' },
    { icon: 'favorite', name: 'Người yêu', color: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-500' },
    { icon: 'category', name: 'Khác', color: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600' },
];

type AnimState = 'idle' | 'exit-up' | 'enter-up';

export default function ClassifyPage() {
    const { data: rawTransactions = [] } = useFirestoreQuery<Transaction>('transactions', [
        where('status', '==', 'unclassified')
    ]);
    const transactions = useMemo(() => [...rawTransactions].sort((a, b) => a.date - b.date), [rawTransactions]);

    const [animState, setAnimState] = useState<AnimState>('idle');
    const [displayTx, setDisplayTx] = useState<Transaction | null>(null);
    const [totalAtStart, setTotalAtStart] = useState<number | null>(null);

    // Track total count on first load
    useEffect(() => {
        if (transactions && totalAtStart === null) {
            setTotalAtStart(transactions.length);
        }
    }, [transactions, totalAtStart]);

    // Keep display transaction in sync
    useEffect(() => {
        if (animState === 'idle' && transactions && transactions.length > 0) {
            setDisplayTx(transactions[0]);
        }
    }, [transactions, animState]);

    const handleCategorize = useCallback(async (categoryLabel: string) => {
        if (!displayTx || animState !== 'idle') return;

        // 1. Animate out
        setAnimState('exit-up');

        // 2. After animation, update DB and prep next card
        setTimeout(async () => {
            await updateDoc(doc(db.transactions, displayTx.id!), {
                category: categoryLabel,
                status: 'classified',
            } as any);

            // 3. Animate next card in
            setAnimState('enter-up');
            setTimeout(() => {
                setAnimState('idle');
            }, 300);
        }, 350);
    }, [displayTx, animState]);

    // Keyboard shortcuts: 1-7 for categories
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const idx = parseInt(e.key) - 1;
            if (idx >= 0 && idx < CATEGORIES.length) {
                const cat = CATEGORIES[idx];
                handleCategorize(`${cat.icon} ${cat.name}`);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleCategorize]);

    // Loading state
    if (transactions === undefined) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-[400px] h-[300px] bg-surface-container-high rounded-3xl" />
                    <div className="flex gap-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-16 h-16 bg-surface-container-high rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const remaining = transactions.length;
    const total = totalAtStart ?? remaining;
    const done = total - remaining;
    const progress = total > 0 ? (done / total) * 100 : 100;

    // Empty / All done state
    if (remaining === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen p-6">
                <div className="text-center max-w-md">
                    <div className="relative mb-8">
                        <div className="w-32 h-32 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-bounce" style={{ animationDuration: '2s' }}>
                            <span className="material-symbols-outlined text-[64px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
                        </div>
                        <div className="absolute inset-0 w-32 h-32 mx-auto bg-green-200/50 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                    </div>
                    <h2 className="text-3xl font-black text-on-surface tracking-tight mb-3">Hoàn thành! 🎉</h2>
                    <p className="text-outline font-medium leading-relaxed mb-6">
                        Tất cả giao dịch đã được phân loại. Nhấn "Đồng bộ dữ liệu" ở sidebar để tải email mới từ VPBank.
                    </p>
                    {total > 0 && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-bold">
                            <span className="material-symbols-outlined text-[18px]">task_alt</span>
                            Đã xử lý {total} giao dịch
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const tx = displayTx ?? transactions[0];
    const amountColor = tx.amount > 0 ? 'text-green-600' : 'text-error';
    const prefix = tx.amount > 0 ? '+' : '';
    const amountBg = tx.amount > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

    // Animation classes
    const cardAnim =
        animState === 'exit-up'
            ? 'translate-y-[-120%] opacity-0 scale-90 rotate-[-3deg]'
            : animState === 'enter-up'
                ? 'translate-y-0 opacity-100 scale-100'
                : 'translate-y-0 opacity-100 scale-100';

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 md:p-10">
            {/* Header */}
            <div className="w-full max-w-lg mb-8 text-center">
                <h2 className="text-[28px] font-black tracking-tight text-on-background mb-2">Phân loại giao dịch</h2>
                <p className="text-outline font-medium text-sm">Chọn danh mục cho từng giao dịch • Phím tắt: 1-7</p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-lg mb-8">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-outline uppercase tracking-widest">Tiến độ</span>
                    <span className="text-xs font-bold text-primary">{done}/{total}</span>
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-outline mt-2 font-medium">Còn {remaining} giao dịch cần xử lý</p>
            </div>

            {/* Card Stack Visual + Main Card */}
            <div className="relative w-full max-w-lg mb-8">
                {/* Stacked cards behind (decorative) */}
                {remaining > 2 && (
                    <div className="absolute inset-x-4 top-3 h-full bg-surface-container-lowest rounded-3xl border border-surface-container-highest/20 -z-20 opacity-40" />
                )}
                {remaining > 1 && (
                    <div className="absolute inset-x-2 top-1.5 h-full bg-surface-container-lowest rounded-3xl border border-surface-container-highest/20 -z-10 opacity-60" />
                )}

                {/* Main Card */}
                <div
                    className={`bg-surface-container-lowest rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,64,161,0.12)] border border-surface-container-highest/20 overflow-hidden transition-all duration-350 ease-out ${cardAnim}`}
                    style={{ transitionDuration: '350ms' }}
                >
                    {/* Amount Banner */}
                    <div className={`px-8 py-6 ${amountBg} border-b flex items-center justify-between`}>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-outline/70">Số tiền</span>
                            <div className={`text-[40px] font-black tracking-tighter leading-tight ${amountColor}`}>
                                {prefix}{tx.amount.toLocaleString()}
                                <span className="text-lg font-semibold ml-2 opacity-60">VNĐ</span>
                            </div>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            <span className={`material-symbols-outlined text-3xl ${tx.amount > 0 ? 'text-green-600' : 'text-error'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                {tx.amount > 0 ? 'arrow_downward_alt' : 'arrow_upward_alt'}
                            </span>
                        </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="px-8 py-6 space-y-4">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-outline/60 block mb-1">Mô tả</span>
                            <p className="text-lg font-bold text-on-surface leading-snug">{tx.description}</p>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-outline">
                            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                            <span className="font-medium">
                                {new Date(tx.date).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' })}
                            </span>
                        </div>
                        {/* Raw excerpt in monospace */}
                        <div className="bg-surface-container rounded-xl p-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-outline/60 block mb-2">Nội dung gốc</span>
                            <p className="font-mono text-xs text-on-surface-variant leading-relaxed break-all">{tx.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Buttons */}
            <div className="w-full max-w-lg">
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline/60 mb-3 text-center">Chọn danh mục</p>
                <div className="grid grid-cols-4 gap-3">
                    {CATEGORIES.map((cat, i) => (
                        <button
                            key={cat.name}
                            onClick={() => handleCategorize(`${cat.icon} ${cat.name}`)}
                            disabled={animState !== 'idle'}
                            className={`group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 ${cat.color} transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:-translate-y-0.5`}
                        >
                            <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                            <span className="text-xs font-bold text-on-surface-variant">{cat.name}</span>
                            <kbd className="text-[9px] font-mono bg-white/80 px-1.5 py-0.5 rounded text-outline border border-outline-variant/30">{i + 1}</kbd>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
