import type { Goal, IncomeEntry } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { where } from 'firebase/firestore';
import type { PageId } from './Layout';

interface CurrentGoalProps {
    onNavigate?: (page: PageId) => void;
}

export default function CurrentGoal({ onNavigate }: CurrentGoalProps) {
    const { data: activeGoals = [] } = useFirestoreQuery<Goal>('goals', [
        where('status', '==', 'active')
    ]);
    const firstActiveGoal = activeGoals.length > 0 ? activeGoals[0] : null;
    const goalId = firstActiveGoal?.id;

    const { data: incomes = [] } = useFirestoreQuery<IncomeEntry>('incomes');
    const linkedIncomes = goalId ? incomes.filter(i => i.goalId === goalId) : [];

    // No active goal → fallback
    if (activeGoals === undefined) {
        // Still loading
        return (
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-surface-container-highest/20 h-full flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-outline/30 mb-3">hourglass_empty</span>
                <p className="text-outline font-medium text-sm">Đang tải...</p>
            </div>
        );
    }

    if (firstActiveGoal === null) {
        return (
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-surface-container-highest/20 h-full flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-outline/30 mb-3">flag</span>
                <p className="text-outline font-semibold">Chưa có mục tiêu</p>
                <p className="text-outline text-sm mt-1">Vào trang Tài chính để tạo mục tiêu đầu tiên</p>
            </div>
        );
    }

    const goalName = firstActiveGoal.name;
    const targetAmount = firstActiveGoal.targetAmount;
    const currentAmount = linkedIncomes.reduce((sum, i) => sum + i.amount, 0);
    const progress = Math.min(Math.round((currentAmount / targetAmount) * 100), 100);

    // SVG Circle Math for the Gauge
    const radius = 64;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-surface-container-highest/20 h-full flex flex-col items-center text-center">
            <div className="w-full flex justify-between items-start mb-4">
                <span className="text-label-md font-bold text-primary tracking-widest uppercase text-left">Mục tiêu</span>
                <button onClick={() => onNavigate?.('finance')} className="material-symbols-outlined text-outline hover:text-primary transition-colors cursor-pointer">edit</button>
            </div>

            <h3 className="text-xl font-bold text-on-surface mb-8">{goalName}</h3>

            <div className="relative flex items-center justify-center w-40 h-40 mb-8">
                {/* Background Circle */}
                <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        className="text-surface-container-high"
                        strokeWidth={strokeWidth}
                    />
                    {/* Foreground Circle */}
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        className="text-primary transition-all duration-1000 ease-out"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>
                {/* Center Text */}
                <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-on-surface tracking-tighter">{progress}%</span>
                </div>
            </div>

            <div className="w-full space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-outline font-medium">Đã tích lũy</span>
                    <span className="font-bold text-on-surface">{currentAmount.toLocaleString()} đ</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-outline font-medium">Mục tiêu</span>
                    <span className="font-bold text-on-surface">{targetAmount.toLocaleString()} đ</span>
                </div>
                <div className="w-full h-px bg-surface-container-highest/30 my-2"></div>
                <div className="flex justify-between items-center text-sm text-green-600 font-semibold">
                    <span>Còn lại</span>
                    <span>{Math.max(targetAmount - currentAmount, 0).toLocaleString()} đ</span>
                </div>
            </div>
        </div>
    );
}
