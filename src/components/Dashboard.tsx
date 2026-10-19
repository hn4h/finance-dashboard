import { useMemo, useState } from 'react';
import { where } from 'firebase/firestore';
import type { IncomeEntry, Transaction, GoalContribution } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { useQuickSync } from '../hooks/useQuickSync';
import { formatNumber, formatVND } from '../lib/format';
import type { PageId } from '../lib/router';
import CurrentGoal from './CurrentGoal';
import RecentClassified from './RecentClassified';
import Button from './ui/Button';
import Icon from './ui/Icon';
import PageHeader from './ui/PageHeader';

interface DashboardProps {
    onNavigate: (page: PageId) => void;
}

const HIDE_KEY = 'hideAmounts';

function readHidden() {
    try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
}

export default function Dashboard({ onNavigate }: DashboardProps) {
    const { data: transactions = [] } = useFirestoreQuery<Transaction>('transactions', [where('status', '==', 'classified')]);
    const { data: unclassified = [] } = useFirestoreQuery<Transaction>('transactions', [where('status', '==', 'unclassified')]);
    const { data: incomes = [] } = useFirestoreQuery<IncomeEntry>('incomes');
    const { data: contributions = [] } = useFirestoreQuery<GoalContribution>('contributions');
    const sync = useQuickSync();
    const [hidden, setHidden] = useState(readHidden);

    const totals = useMemo(() => {
        const manualIncome = incomes.reduce((acc, i) => acc + i.amount, 0);
        const txIncome = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
        const income = manualIncome + txIncome;
        const expense = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
        const netWorth = income - expense;
        const earmarked = contributions.reduce((acc, c) => acc + c.amount, 0);
        return { income, expense, netWorth, earmarked, available: netWorth - earmarked };
    }, [transactions, incomes, contributions]);

    const toggleHidden = () => {
        const next = !hidden;
        setHidden(next);
        try { localStorage.setItem(HIDE_KEY, next ? '1' : '0'); } catch { /* per-session only */ }
    };

    const money = (n: number) => (hidden ? '••••••' : formatNumber(n));

    return (
        <>
            <PageHeader
                title="Tổng quan"
                subtitle="Sức khoẻ tài chính và chi tiêu thẻ VPBank"
                actions={
                    <Button variant="secondary" icon="sync" loading={sync.syncing} onClick={sync.run}>
                        <span className="hidden sm:inline">{sync.signedIn ? 'Đồng bộ' : 'Đăng nhập'}</span>
                    </Button>
                }
            />

            <div className="space-y-4 md:space-y-6">
                {/* Balance hero */}
                <section className="relative overflow-hidden rounded-3xl p-5 md:p-8 bg-gradient-to-br from-[#0047b3] to-[#2563eb] text-white shadow-card">
                    <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
                    <div className="relative">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white/80">Số dư khả dụng</span>
                            <button onClick={toggleHidden} aria-label={hidden ? 'Hiện số tiền' : 'Ẩn số tiền'} className="size-9 -mr-2 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10">
                                <Icon name={hidden ? 'visibility_off' : 'visibility'} size={18} />
                            </button>
                        </div>
                        <p className="mt-1 text-4xl md:text-5xl font-extrabold tracking-tight tabular">
                            {money(totals.available)}<span className="text-lg font-semibold text-white/70 ml-1.5">đ</span>
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-white/70">Tổng tài sản</p>
                                <p className="font-semibold tabular">{money(totals.netWorth)} đ</p>
                            </div>
                            <div>
                                <p className="text-white/70">Đã góp mục tiêu</p>
                                <p className="font-semibold tabular">{money(totals.earmarked)} đ</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Income / expense */}
                <div className="grid grid-cols-2 gap-3 md:gap-6">
                    <StatCard icon="expense" label="Đã chi" value={hidden ? '••••••' : formatVND(totals.expense)} tone="expense" />
                    <StatCard icon="income" label="Đã thu" value={hidden ? '••••••' : formatVND(totals.income)} tone="income" />
                </div>

                {/* Pending classification nudge */}
                {unclassified.length > 0 && (
                    <button onClick={() => onNavigate('classify')} className="flex items-center gap-3 w-full p-4 rounded-2xl bg-warning/10 text-left active:scale-[0.99] transition-transform">
                        <span className="size-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
                            <Icon name="classify" />
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block font-semibold">{unclassified.length} giao dịch chờ phân loại</span>
                            <span className="block text-sm text-muted">Chạm để phân loại ngay</span>
                        </span>
                        <Icon name="chevron_right" className="text-muted" />
                    </button>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="lg:col-span-2">
                        <RecentClassified onNavigate={onNavigate} />
                    </div>
                    <CurrentGoal onNavigate={onNavigate} />
                </div>
            </div>
        </>
    );
}

function StatCard({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'income' | 'expense' }) {
    const color = tone === 'income' ? 'text-income bg-income/10' : 'text-expense bg-expense/10';
    return (
        <div className="bg-surface rounded-2xl p-4 md:p-6 shadow-card min-w-0">
            <span className={`size-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon name={icon} size={18} />
            </span>
            <p className="text-sm text-muted">{label}</p>
            <p className={`text-lg md:text-2xl font-bold tabular truncate ${tone === 'income' ? 'text-income' : 'text-expense'}`}>{value}</p>
        </div>
    );
}
