import { useMemo, useState } from 'react';
import { where } from 'firebase/firestore';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { parseCategory } from '../lib/categories';
import { formatVND, PERIOD_LABELS, periodRange, type PeriodId } from '../lib/format';
import type { PageId } from '../lib/router';
import TransactionRow from './TransactionRow';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import Icon from './ui/Icon';
import PageHeader from './ui/PageHeader';
import SegmentedControl from './ui/SegmentedControl';

const PERIODS: PeriodId[] = ['this_week', 'this_month', 'last_month', 'all'];
const RECENT_LIMIT = 10;

interface Slice { name: string; icon: string; color: string; value: number }

export default function Analytics({ onNavigate }: { onNavigate: (page: PageId) => void }) {
    const [period, setPeriod] = useState<PeriodId>('this_month');
    const { data } = useFirestoreQuery<Transaction>('transactions', [where('status', '==', 'classified')]);

    const { txs, slices, expense, income } = useMemo(() => {
        const [start, end] = periodRange(period);
        const txs = (data ?? []).filter(tx => tx.date >= start && tx.date <= end).sort((a, b) => b.date - a.date);

        const byName = new Map<string, Slice>();
        let expense = 0, income = 0;
        for (const tx of txs) {
            if (tx.amount > 0) { income += tx.amount; continue; }
            expense += -tx.amount;
            const cat = parseCategory(tx.category) ?? { name: 'Khác', icon: 'category', color: '#64748b' };
            const s = byName.get(cat.name) ?? { ...cat, value: 0 };
            s.value += -tx.amount;
            byName.set(cat.name, s);
        }
        return { txs, slices: [...byName.values()].sort((a, b) => b.value - a.value), expense, income };
    }, [data, period]);

    return (
        <>
            <PageHeader title="Phân tích" subtitle="Cơ cấu chi tiêu theo danh mục" />

            <SegmentedControl
                className="mb-4 md:max-w-md"
                options={PERIODS.map(p => ({ value: p, label: PERIOD_LABELS[p] }))}
                value={period}
                onChange={setPeriod}
            />

            {data === undefined ? (
                <div className="h-80 rounded-2xl bg-surface animate-pulse" />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <Card title="Chi tiêu">
                        {slices.length === 0 ? (
                            <EmptyState icon="analytics" title="Chưa có chi tiêu trong kỳ này" />
                        ) : (
                            <>
                                <div className="relative h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                                                {slices.map(s => <Cell key={s.name} fill={s.color} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xs text-muted">Tổng chi</span>
                                        <span className="text-xl font-extrabold tabular">{formatVND(expense)}</span>
                                        {income > 0 && <span className="text-xs font-semibold text-income tabular">Thu {formatVND(income)}</span>}
                                    </div>
                                </div>

                                <ul className="mt-4 space-y-3">
                                    {slices.map(s => {
                                        const pct = Math.round((s.value / expense) * 100);
                                        return (
                                            <li key={s.name} className="flex items-center gap-3">
                                                <span className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ color: s.color, backgroundColor: `color-mix(in srgb, ${s.color} 14%, transparent)` }}>
                                                    <Icon name={s.icon} size={16} />
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between gap-2 text-sm">
                                                        <span className="font-semibold truncate">{s.name}</span>
                                                        <span className="font-semibold tabular shrink-0">{formatVND(s.value)}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                                                        </div>
                                                        <span className="text-xs text-muted tabular w-9 text-right">{pct}%</span>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                    </Card>

                    <Card
                        padded={false}
                        className="pb-2 self-start"
                        title={`Giao dịch trong kỳ (${txs.length})`}
                        action={txs.length > RECENT_LIMIT && <button onClick={() => onNavigate('history')} className="text-sm font-semibold text-primary">Xem tất cả</button>}
                    >
                        {txs.length === 0 ? (
                            <EmptyState icon="receipt" title="Không có giao dịch" />
                        ) : (
                            <div className="divide-y">
                                {txs.slice(0, RECENT_LIMIT).map(tx => <TransactionRow key={tx.id} tx={tx} />)}
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </>
    );
}
