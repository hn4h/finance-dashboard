import { useMemo } from 'react';
import type { Transaction } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { where } from 'firebase/firestore';
import TransactionCard from './TransactionCard';

interface InboxListProps {
    onClassifyAll?: () => void;
}

export default function InboxList({ onClassifyAll }: InboxListProps) {
    const { data: rawTransactions = [] } = useFirestoreQuery<Transaction>('transactions', [
        where('status', '==', 'inbox')
    ]);
    const transactions = useMemo(() => [...rawTransactions].sort((a, b) => b.date - a.date), [rawTransactions]);

    if (transactions === undefined) {
        return (
            <div className="flex flex-col space-y-6 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="h-8 bg-surface-container-high w-1/3 rounded-lg"></div>
                </div>
                <div className="space-y-4">
                    <div className="h-24 bg-surface-container-high rounded-xl"></div>
                    <div className="h-24 bg-surface-container-high rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-on-surface">Chờ phân loại (0)</h3>
                </div>
                <div className="bg-surface-container-lowest flex flex-col items-center justify-center py-20 px-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-surface-container-highest/50">
                    <span className="material-symbols-outlined text-[80px] text-green-500 mb-6 drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                    <h3 className="text-2xl font-black text-on-surface mb-3 tracking-tight">Tất cả đã được phân loại!</h3>
                    <p className="text-outline font-medium max-w-[350px] leading-relaxed">
                        Tuyệt vời! Bạn không còn giao dịch VPBank nào mới chưa được xử lý. Nhấn "Đồng bộ dữ liệu" để tải email mới.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-on-surface">Chờ phân loại</h3>
                    <p className="text-xs text-outline font-medium mt-1">Bạn có {transactions.length} giao dịch cần xử lý</p>
                </div>
                <button onClick={onClassifyAll} className="text-primary text-sm font-bold hover:underline cursor-pointer">Phân loại tất cả →</button>
            </div>

            <div className="space-y-3">
                {transactions.map(tx => (
                    <TransactionCard key={tx.id} tx={tx} />
                ))}
            </div>
        </div>
    );
}
