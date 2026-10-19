import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, updateDoc, where } from 'firebase/firestore';
import { db, type Transaction } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { CATEGORIES, categoryValue, type Category } from '../lib/categories';
import { formatVND } from '../lib/format';
import type { PageId } from '../lib/router';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import { useFeedback } from './ui/useFeedback';
import Icon from './ui/Icon';
import PageHeader from './ui/PageHeader';

const EXIT_MS = 250;

export default function ClassifyPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
    const { data } = useFirestoreQuery<Transaction>('transactions', [where('status', '==', 'unclassified')]);
    const queue = useMemo(() => (data ? [...data].sort((a, b) => a.date - b.date) : undefined), [data]);
    const { toast } = useFeedback();

    const [totalAtStart, setTotalAtStart] = useState<number | null>(null);
    const [leaving, setLeaving] = useState<string | null>(null);

    useEffect(() => {
        if (queue && totalAtStart === null) setTotalAtStart(queue.length);
    }, [queue, totalAtStart]);

    // While a card animates out it is still in the snapshot; the next one is queued behind it
    const tx = queue?.find(t => t.id !== leaving) ?? null;
    const current = queue?.find(t => t.id === leaving) ?? tx;

    const classify = useCallback(async (cat: Category | 'ignore') => {
        if (!tx?.id || leaving) return;
        setLeaving(tx.id);
        try {
            await Promise.all([
                updateDoc(doc(db.transactions, tx.id), cat === 'ignore'
                    ? { category: null, status: 'ignored' }
                    : { category: categoryValue(cat), status: 'classified' }),
                new Promise(r => setTimeout(r, EXIT_MS)),
            ]);
        } catch (e) {
            console.error(e);
            toast('Không lưu được phân loại. Kiểm tra kết nối và thử lại.', 'error');
        } finally {
            setLeaving(null);
        }
    }, [tx, leaving, toast]);

    // Desktop shortcuts: 1–9, 0 for the 10th category
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
            const idx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
            if (idx >= 0 && idx < CATEGORIES.length) classify(CATEGORIES[idx]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [classify]);

    const remaining = queue?.length ?? 0;
    const total = Math.max(totalAtStart ?? remaining, remaining);
    const done = total - remaining;

    return (
        <>
            <PageHeader
                title="Phân loại"
                subtitle="Chọn danh mục cho từng giao dịch · phím tắt 1–9, 0"
                actions={queue && total > 0 && remaining > 0 && (
                    <span className="text-sm font-semibold text-muted tabular">{done}/{total}</span>
                )}
            />

            <div className="max-w-lg mx-auto">
                {queue === undefined ? (
                    <div className="space-y-4">
                        <div className="h-56 rounded-3xl bg-surface animate-pulse" />
                        <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />)}
                        </div>
                    </div>
                ) : !current ? (
                    <div className="bg-surface rounded-3xl shadow-card">
                        <EmptyState
                            icon="celebration"
                            title="Đã phân loại hết!"
                            description={done > 0 ? `Bạn vừa xử lý ${done} giao dịch.` : 'Không còn giao dịch nào chờ phân loại.'}
                            action={<Button icon="sync" variant="secondary" onClick={() => onNavigate('sync')}>Đồng bộ email mới</Button>}
                        />
                    </div>
                ) : (
                    <>
                        {/* Progress */}
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mb-4">
                            <div className="h-full bg-primary rounded-full transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                        </div>

                        {/* Card */}
                        <div className="relative mb-5">
                            {remaining > 1 && <div className="absolute inset-x-3 -bottom-2 h-full rounded-3xl bg-surface/60 shadow-card" />}
                            <article
                                key={current.id}
                                className={`relative bg-surface rounded-3xl shadow-card p-5 transition-[transform,opacity] ease-out animate-pop-in ${current.id === leaving ? '-translate-y-6 opacity-0 scale-95' : ''}`}
                                style={{ transitionDuration: `${EXIT_MS}ms` }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm text-muted">{current.amount > 0 ? 'Tiền vào' : 'Tiền ra'}</p>
                                        <p className={`text-3xl md:text-4xl font-extrabold tracking-tight tabular ${current.amount > 0 ? 'text-income' : 'text-expense'}`}>
                                            {formatVND(current.amount, { sign: true })}
                                        </p>
                                    </div>
                                    <span className={`size-11 rounded-2xl flex items-center justify-center shrink-0 ${current.amount > 0 ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                                        <Icon name={current.amount > 0 ? 'income' : 'expense'} size={22} />
                                    </span>
                                </div>
                                <p className="mt-4 font-semibold text-lg leading-snug break-words">{current.description}</p>
                                <div className="mt-3 space-y-1.5 text-sm text-muted">
                                    {current.beneficiary && (
                                        <p className="flex items-center gap-2"><Icon name="person" size={16} /> {current.beneficiary}</p>
                                    )}
                                    <p className="flex items-center gap-2">
                                        <Icon name="calendar" size={16} />
                                        {new Date(current.date).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </article>
                        </div>

                        {/* Categories */}
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {CATEGORIES.map((cat, i) => (
                                <button
                                    key={cat.name}
                                    onClick={() => classify(cat)}
                                    disabled={!!leaving}
                                    className="relative flex flex-col items-center justify-center gap-1.5 h-20 rounded-2xl bg-surface shadow-card active:scale-95 transition-transform disabled:opacity-60"
                                >
                                    <span className="size-9 rounded-xl flex items-center justify-center" style={{ color: cat.color, backgroundColor: `color-mix(in srgb, ${cat.color} 14%, transparent)` }}>
                                        <Icon name={cat.icon} size={20} />
                                    </span>
                                    <span className="text-xs font-semibold leading-tight text-center px-1">{cat.name}</span>
                                    <kbd className="hidden md:block absolute top-1.5 right-2 text-[10px] font-mono text-muted">{(i + 1) % 10}</kbd>
                                </button>
                            ))}
                        </div>
                        <Button variant="ghost" icon="block" className="w-full mt-3 !text-expense" disabled={!!leaving} onClick={() => classify('ignore')}>
                            Bỏ qua (giao dịch lỗi)
                        </Button>
                    </>
                )}
            </div>
        </>
    );
}
