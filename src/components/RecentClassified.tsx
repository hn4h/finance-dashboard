import { useFirestoreQuery } from '../hooks/useFirestore';
import { where } from 'firebase/firestore';
import type { PageId } from './Layout';
import type { Transaction } from '../db';

interface RecentClassifiedProps {
    onNavigate?: (page: PageId) => void;
}

export default function RecentClassified({ onNavigate }: RecentClassifiedProps) {
    // Lấy 3 giao dịch đã phân loại gần nhất
    const { data: rawTransactions = [] } = useFirestoreQuery<Transaction>('transactions', [
        where('status', '==', 'classified')
    ]);

    // Sort descending by date and take top 3
    const transactions = [...rawTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

    return (
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-surface-container-highest/20 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-surface-container-highest/40 pb-4">
                <div>
                    <h3 className="text-xl font-black text-on-surface tracking-tight">Giao dịch gần đây</h3>
                    <p className="text-sm text-outline font-medium mt-1">Đã được phân loại</p>
                </div>
                <button
                    onClick={() => onNavigate?.('history')}
                    className="text-primary hover:text-primary/80 transition-colors font-bold text-sm tracking-wide bg-primary/10 px-4 py-2 rounded-lg"
                >
                    Xem tất cả
                </button>
            </div>

            {transactions.length === 0 ? (
                <div className="text-center py-10 text-outline flex-1 flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                    <p>Chưa có giao dịch nào được phân loại.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {transactions.map(tx => {
                        const isIncome = tx.amount > 0;
                        const iconColorClass = isIncome ? 'text-green-700 bg-green-100' : 'text-primary bg-primary/10';
                        const amountColorClass = isIncome ? 'text-green-600' : 'text-on-surface';

                        const categoryParts = tx.category ? tx.category.split(' ') : ['pending_actions', 'Chưa rõ'];
                        const categoryIcon = categoryParts[0];
                        const categoryName = categoryParts.slice(1).join(' ') || categoryParts[0];

                        return (
                            <div key={tx.id} className="flex flex-row items-center justify-between p-4 rounded-xl hover:bg-surface-container-low transition-colors group border border-transparent hover:border-surface-container-highest/30">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconColorClass}`}>
                                        <span className="material-symbols-outlined text-xl">{categoryIcon}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-on-surface text-base line-clamp-1" title={tx.description}>
                                            {tx.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                                                {categoryName}
                                            </span>
                                            <span className="text-xs text-outline font-medium">
                                                {new Date(tx.date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`font-black text-lg ${amountColorClass} tracking-tight text-right shrink-0 ml-4`}>
                                    {isIncome ? '+' : ''}{tx.amount.toLocaleString()} <span className="text-sm font-semibold opacity-70">VNĐ</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
