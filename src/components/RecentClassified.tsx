import { useMemo } from 'react';
import { where } from 'firebase/firestore';
import type { Transaction } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import type { PageId } from '../lib/router';
import TransactionRow from './TransactionRow';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';

const LIMIT = 5;

export default function RecentClassified({ onNavigate }: { onNavigate: (page: PageId) => void }) {
    const { data: raw = [] } = useFirestoreQuery<Transaction>('transactions', [where('status', '==', 'classified')]);
    const recent = useMemo(() => [...raw].sort((a, b) => b.date - a.date).slice(0, LIMIT), [raw]);

    return (
        <Card
            padded={false}
            className="pb-2"
            title="Giao dịch gần đây"
            action={<button onClick={() => onNavigate('history')} className="text-sm font-semibold text-primary">Xem tất cả</button>}
        >
            {recent.length === 0 ? (
                <EmptyState icon="receipt" title="Chưa có giao dịch nào được phân loại" />
            ) : (
                <div className="divide-y">
                    {recent.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
                </div>
            )}
        </Card>
    );
}
