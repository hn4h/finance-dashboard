import { useMemo, useState } from 'react';
import type { Transaction } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { parseCategory } from '../lib/categories';
import { formatVND, fromDateInput, PERIOD_LABELS, periodRange, type PeriodId } from '../lib/format';
import { CreateTransactionSheet, TransactionDetailSheet } from './TransactionSheets';
import TransactionRow from './TransactionRow';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import { inputClass, Field } from './ui/Field';
import Icon from './ui/Icon';
import PageHeader from './ui/PageHeader';
import Sheet from './ui/Sheet';

type DateFilter = Exclude<PeriodId, 'last_month'> | 'custom';
const DATE_FILTERS: DateFilter[] = ['all', 'today', 'this_week', 'this_month', 'custom'];

interface DayGroup { key: string; label: string; items: Transaction[]; income: number; expense: number }

export default function HistoryPage() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [dateSheetOpen, setDateSheetOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { data } = useFirestoreQuery<Transaction>('transactions');
    const all = useMemo(() => (data ?? []).filter(tx => tx.status !== 'ignored'), [data]);
    // Detail sheet reads the live doc so category changes show immediately
    const selected = selectedId ? all.find(t => t.id === selectedId) ?? null : null;

    // Filter chips by category *name* so legacy icon variants ("fastfood Ăn uống") group together
    const categoryNames = useMemo(() => {
        const names = new Map<string, string>();
        all.forEach(tx => {
            const cat = parseCategory(tx.category);
            if (cat && !names.has(cat.name)) names.set(cat.name, cat.icon);
        });
        return [...names].sort(([a], [b]) => a.localeCompare(b, 'vi'));
    }, [all]);

    const groups = useMemo(() => {
        let [start, end] = dateFilter === 'custom' ? [0, Infinity] : periodRange(dateFilter);
        if (dateFilter === 'custom') {
            if (customStart) start = fromDateInput(customStart);
            if (customEnd) end = fromDateInput(customEnd) + 86400000 - 1;
        }
        const q = search.trim().toLowerCase();
        const filtered = all
            .filter(tx => tx.date >= start && tx.date <= end)
            .filter(tx => !category || parseCategory(tx.category)?.name === category)
            .filter(tx => !q || tx.description.toLowerCase().includes(q) || tx.beneficiary?.toLowerCase().includes(q))
            .sort((a, b) => b.date - a.date);

        const byDay = new Map<string, DayGroup>();
        for (const tx of filtered) {
            const d = new Date(tx.date);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            let g = byDay.get(key);
            if (!g) {
                g = { key, label: d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }), items: [], income: 0, expense: 0 };
                byDay.set(key, g);
            }
            g.items.push(tx);
            if (tx.amount > 0) g.income += tx.amount; else g.expense += -tx.amount;
        }
        return { list: [...byDay.values()], count: filtered.length };
    }, [all, search, category, dateFilter, customStart, customEnd]);

    const dateLabel = dateFilter !== 'custom'
        ? PERIOD_LABELS[dateFilter]
        : customStart || customEnd
            ? `${customStart ? new Date(fromDateInput(customStart)).toLocaleDateString('vi-VN') : '…'} – ${customEnd ? new Date(fromDateInput(customEnd)).toLocaleDateString('vi-VN') : '…'}`
            : 'Tuỳ chỉnh';
    const hasFilters = !!(search || category || dateFilter !== 'all');

    return (
        <>
            <PageHeader
                title="Lịch sử"
                subtitle={`${groups.count} giao dịch`}
                actions={<Button icon="add" onClick={() => setCreateOpen(true)}><span className="hidden sm:inline">Thêm</span></Button>}
            />

            {/* Filters */}
            <div className="space-y-3 mb-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm nội dung, người hưởng…"
                            className={`${inputClass} pl-10 bg-surface shadow-card`}
                        />
                    </div>
                    <button
                        onClick={() => setDateSheetOpen(true)}
                        className={`flex items-center gap-1.5 h-12 px-3.5 rounded-xl shadow-card text-sm font-semibold shrink-0 max-w-[45%] ${dateFilter !== 'all' ? 'bg-primary text-on-primary' : 'bg-surface'}`}
                    >
                        <Icon name="calendar" size={18} />
                        <span className="truncate">{dateLabel}</span>
                    </button>
                </div>

                {categoryNames.length > 0 && (
                    <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-2 overflow-x-auto no-scrollbar">
                        <Chip active={!category} onClick={() => setCategory(null)}>Tất cả</Chip>
                        {categoryNames.map(([name, icon]) => (
                            <Chip key={name} active={category === name} onClick={() => setCategory(category === name ? null : name)}>
                                <Icon name={icon} size={15} /> {name}
                            </Chip>
                        ))}
                    </div>
                )}
            </div>

            {/* List */}
            {data === undefined ? (
                <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-40 rounded-2xl bg-surface animate-pulse" />)}</div>
            ) : groups.list.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-card">
                    <EmptyState
                        icon="receipt"
                        title={hasFilters ? 'Không tìm thấy giao dịch' : 'Chưa có giao dịch nào'}
                        action={hasFilters && (
                            <Button variant="secondary" onClick={() => { setSearch(''); setCategory(null); setDateFilter('all'); }}>Xoá bộ lọc</Button>
                        )}
                    />
                </div>
            ) : (
                <div className="space-y-5">
                    {groups.list.map(g => (
                        <section key={g.key}>
                            <div className="flex items-baseline justify-between gap-3 px-1 mb-2">
                                <h2 className="text-sm font-semibold capitalize truncate">{g.label}</h2>
                                <p className="text-xs font-semibold tabular shrink-0 space-x-2">
                                    {g.income > 0 && <span className="text-income">+{formatVND(g.income)}</span>}
                                    {g.expense > 0 && <span className="text-expense">-{formatVND(g.expense)}</span>}
                                </p>
                            </div>
                            <div className="bg-surface rounded-2xl shadow-card divide-y overflow-hidden">
                                {g.items.map(tx => <TransactionRow key={tx.id} tx={tx} meta="time" onClick={() => setSelectedId(tx.id!)} />)}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <Sheet
                open={dateSheetOpen}
                onClose={() => setDateSheetOpen(false)}
                title="Lọc theo thời gian"
                footer={<Button size="lg" onClick={() => setDateSheetOpen(false)}>Áp dụng</Button>}
            >
                <div className="grid grid-cols-2 gap-2">
                    {DATE_FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setDateFilter(f)}
                            className={`h-12 rounded-xl text-sm font-semibold ${f === 'all' ? 'col-span-2' : ''} ${dateFilter === f ? 'bg-primary text-on-primary' : 'bg-surface-2'}`}
                        >
                            {f === 'custom' ? 'Tuỳ chỉnh' : PERIOD_LABELS[f]}
                        </button>
                    ))}
                </div>
                {dateFilter === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <Field label="Từ ngày">
                            <input type="date" className={inputClass} value={customStart} onChange={e => setCustomStart(e.target.value)} />
                        </Field>
                        <Field label="Đến ngày">
                            <input type="date" className={inputClass} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                        </Field>
                    </div>
                )}
            </Sheet>

            <CreateTransactionSheet open={createOpen} onClose={() => setCreateOpen(false)} />
            <TransactionDetailSheet tx={selected} onClose={() => setSelectedId(null)} />
        </>
    );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${active ? 'bg-fg text-bg' : 'bg-surface shadow-card text-muted hover:text-fg'}`}
        >
            {children}
        </button>
    );
}
