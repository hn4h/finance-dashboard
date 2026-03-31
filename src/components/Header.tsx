import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { syncEmails } from '../services/gmailService';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { where } from 'firebase/firestore';
import type { Transaction } from '../db';
import { RefreshCw, LogOut } from 'lucide-react';

export default function Header() {
    const { accessToken, logout } = useAuth();
    const [syncing, setSyncing] = useState(false);

    const { data: transactions = [] } = useFirestoreQuery<Transaction>('transactions', [
        where('status', '==', 'classified')
    ]);

    const income = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const balance = income - expense;

    const handleSync = async () => {
        if (!accessToken) return;
        setSyncing(true);
        try {
            const count = await syncEmails(accessToken);
            alert(`Đồng bộ hoàn tất. Có ${count} giao dịch mới.`);
        } catch (e) {
            console.error(e);
            alert('Lỗi đồng bộ email. Có thể token đã hết hạn, vui lòng đăng xuất và đăng nhập lại.');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <header className="p-4 bg-surface shadow-sm border-b border-surface-c flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-xl font-semibold text-heading flex items-center gap-2">
                    VP Finance Dashboard
                </h1>
                <div className="flex gap-4 mt-2 text-sm bg-bg px-3 py-1.5 rounded-md border border-surface-c">
                    <div><span className="text-body mr-1">Số dư:</span><span className="font-semibold text-heading">{balance.toLocaleString()}đ</span></div>
                    <div className="w-px h-full bg-surface-c hidden sm:block"></div>
                    <div><span className="text-body mr-1">Thu nhập:</span><span className="font-semibold text-income">+{income.toLocaleString()}đ</span></div>
                    <div className="w-px h-full bg-surface-c hidden sm:block"></div>
                    <div><span className="text-body mr-1">Chi tiêu:</span><span className="font-semibold text-expense">-{expense.toLocaleString()}đ</span></div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 font-medium bg-primary text-surface hover:bg-p-dark rounded-md transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
                </button>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 font-medium text-body hover:bg-surface-c rounded-md transition-colors"
                    title="Đăng xuất"
                >
                    <LogOut size={16} /> <span className="hidden sm:inline">Thoát</span>
                </button>
            </div>
        </header>
    );
}
