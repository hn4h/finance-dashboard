import type { IncomeEntry, Transaction } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { where } from 'firebase/firestore';
import RecentClassified from './RecentClassified';
import CurrentGoal from './CurrentGoal';
import type { PageId } from './Layout';

interface DashboardProps {
    onNavigate?: (page: PageId) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
    const { data: transactions = [] } = useFirestoreQuery<Transaction>('transactions', [
        where('status', '==', 'classified')
    ]);
    const { data: incomes = [] } = useFirestoreQuery<IncomeEntry>('incomes');

    const manualIncome = incomes.reduce((acc, i) => acc + i.amount, 0);
    const txIncome = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const income = manualIncome + txIncome;
    const expense = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const balance = income - expense;

    return (
        <div className="p-6 md:p-10 min-w-0 max-w-[1200px] mx-auto">
            {/* Editorial Heading */}
            <section className="mb-10">
                <h2 className="text-[32px] font-black tracking-tight text-on-background mb-2">Tổng quan tài chính</h2>
                <p className="text-outline font-medium">Báo cáo sức khỏe tài chính và hoạt động chi tiêu thẻ VPBank</p>
            </section>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
                {/* Primary Balance Card */}
                <div className="md:col-span-6 bg-surface-container-lowest p-8 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,64,161,0.08)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <span className="text-label-md font-bold text-primary tracking-widest uppercase">Số dư hiện tại</span>
                            <span className="material-symbols-outlined text-primary/40">visibility</span>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-[48px] font-extrabold text-primary leading-none tracking-tighter">{balance.toLocaleString()}</span>
                            <span className="text-outline font-semibold text-sm">VNĐ</span>
                        </div>
                    </div>
                </div>
                {/* Monthly Spent */}
                <div className="md:col-span-3 bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col h-full">
                        <div className="w-12 h-12 rounded-xl bg-error-container/30 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-error">payments</span>
                        </div>
                        <span className="text-outline font-bold text-xs tracking-wider uppercase mb-2">Đã chi (Expense)</span>
                        <div className="text-[28px] font-bold text-error leading-tight tracking-tight mb-auto">{expense.toLocaleString()} VNĐ</div>
                    </div>
                </div>
                {/* Monthly Income */}
                <div className="md:col-span-3 bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col h-full">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-green-700">account_balance_wallet</span>
                        </div>
                        <span className="text-outline font-bold text-xs tracking-wider uppercase mb-2">Đã thu (Income)</span>
                        <div className="text-[28px] font-bold text-green-700 leading-tight tracking-tight mb-auto">{income.toLocaleString()} VNĐ</div>
                    </div>
                </div>
            </div>

            {/* Secondary Insight Layer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <RecentClassified onNavigate={onNavigate} />
                </div>
                <div className="flex flex-col space-y-8">
                    <CurrentGoal onNavigate={onNavigate} />
                </div>
            </div>
        </div>
    );
}
