import { where } from 'firebase/firestore';
import type { Goal, GoalContribution } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { formatVND } from '../lib/format';
import type { PageId } from '../lib/router';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';

const RADIUS = 52;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CurrentGoal({ onNavigate }: { onNavigate: (page: PageId) => void }) {
    const { data: activeGoals } = useFirestoreQuery<Goal>('goals', [where('status', '==', 'active')]);
    const { data: contributions = [] } = useFirestoreQuery<GoalContribution>('contributions');
    const goal = activeGoals?.[0];

    const open = <button onClick={() => onNavigate('finance')} className="text-sm font-semibold text-primary">Quản lý</button>;

    if (!goal) {
        return (
            <Card title="Mục tiêu" action={open}>
                {activeGoals === undefined
                    ? <div className="h-40 rounded-xl bg-surface-2 animate-pulse" />
                    : <EmptyState icon="flag" title="Chưa có mục tiêu" description="Tạo mục tiêu trong mục Tài chính" />}
            </Card>
        );
    }

    const current = contributions.filter(c => c.goalId === goal.id).reduce((sum, c) => sum + c.amount, 0);
    const progress = Math.min(Math.round((current / goal.targetAmount) * 100), 100);

    return (
        <Card title="Mục tiêu" action={open}>
            <div className="flex lg:flex-col items-center gap-5">
                <div className="relative size-32 shrink-0">
                    <svg className="size-full -rotate-90" viewBox="0 0 128 128">
                        <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-surface-2" />
                        <circle
                            cx="64" cy="64" r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round"
                            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - progress / 100)}
                            className="text-primary transition-[stroke-dashoffset] duration-700"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold tabular">{progress}%</span>
                </div>
                <div className="flex-1 min-w-0 w-full space-y-2 text-sm">
                    <p className="text-base font-bold truncate">{goal.name}</p>
                    <Line label="Đã tích luỹ" value={formatVND(current)} />
                    <Line label="Mục tiêu" value={formatVND(goal.targetAmount)} />
                    <Line label="Còn lại" value={formatVND(Math.max(goal.targetAmount - current, 0))} strong />
                </div>
            </div>
        </Card>
    );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="flex justify-between gap-3">
            <span className="text-muted">{label}</span>
            <span className={`tabular ${strong ? 'font-bold text-income' : 'font-semibold'}`}>{value}</span>
        </div>
    );
}
