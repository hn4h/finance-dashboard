import { useMemo, useState } from 'react';
import type { Transaction } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { where } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Extract the emoji component out for the legend
const COLORS = ['#0056D2', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EC4899', '#BA1A1A', '#64748B'];

type DateFilterType = 'all' | 'this_week' | 'this_month' | 'last_month';

export default function Analytics() {
    const [dateFilter, setDateFilter] = useState<DateFilterType>('this_month');
    const { data: rawClassified = [] } = useFirestoreQuery<Transaction>('transactions', [
        where('status', '==', 'classified')
    ]);

    const classifiedTxs = useMemo(() => {
        let result = [...rawClassified];
        if (dateFilter !== 'all') {
            const now = new Date();
            let startTime = 0;
            let endTime = Infinity;

            if (dateFilter === 'this_week') {
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(new Date(now).setDate(diff));
                startTime = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getTime();
                endTime = startTime + 7 * 86400000 - 1;
            } else if (dateFilter === 'this_month') {
                startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
            } else if (dateFilter === 'last_month') {
                startTime = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
                endTime = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
            }
            
            result = result.filter(tx => {
                const txTime = new Date(tx.date).getTime();
                return txTime >= startTime && txTime <= endTime;
            });
        }
        return result.sort((a, b) => a.date - b.date);
    }, [rawClassified, dateFilter]);

    const chartData = useMemo(() => {
        if (!classifiedTxs) return [];

        // Only analyze expenses (negative amount) for the donut chart
        const expenses = classifiedTxs.filter(tx => tx.amount < 0);
        const grouped: Record<string, number> = {};

        expenses.forEach(tx => {
            const cat = tx.category ? tx.category.split(' ').slice(1).join(' ') || tx.category.split(' ')[0] : 'Khác';
            grouped[cat] = (grouped[cat] || 0) + Math.abs(tx.amount);
        });

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [classifiedTxs]);

    const totalExpense = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.value, 0);
    }, [chartData]);

    if (classifiedTxs === undefined) {
        return <div className="p-10 text-center animate-pulse text-body">Đang tải biểu đồ...</div>;
    }

    const reversedTxs = [...classifiedTxs].reverse();

    return (
        <div className="flex flex-col gap-6">
            {/* Chart Section */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 border border-surface-container-highest/20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-on-surface">Cơ cấu chi tiêu</h2>
                        <p className="text-sm text-outline mt-1">Tổng cộng: <span className="font-bold text-expense">-{totalExpense.toLocaleString()} đ</span></p>
                    </div>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                        className="bg-surface-container-low border border-surface-container-highest/30 text-on-surface text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="this_month">Tháng này</option>
                        <option value="last_month">Tháng trước</option>
                        <option value="this_week">Tuần này</option>
                        <option value="all">Toàn bộ thời gian</option>
                    </select>
                </div>

                {chartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-surface-container-low rounded-xl border border-surface-container/50">
                        <span className="material-symbols-outlined text-4xl text-outline mb-2">pie_chart</span>
                        <p className="text-sm font-medium text-outline">Chưa có dữ liệu phân loại chi tiêu.</p>
                    </div>
                ) : (
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => [`${Number(value).toLocaleString()} đ`, 'Chi tiêu']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', fontWeight: '500' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* History Activity Stream */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 border border-surface-container-highest/20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-on-surface">Lịch sử phân loại</h2>
                    <span className="bg-surface-container-highest px-3 py-1 rounded-full text-xs font-bold text-on-surface-variant uppercase tracking-widest">{reversedTxs.length}</span>
                </div>

                <div className="space-y-4">
                    {reversedTxs.length === 0 ? (
                        <div className="text-center py-8 text-outline text-sm font-medium bg-surface-container-low rounded-xl border border-surface-container/50">
                            Chưa có giao dịch nào được lưu.
                        </div>
                    ) : (
                        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
                            {reversedTxs.map((tx) => {
                                const isIncome = tx.amount > 0;
                                const categoryParts = tx.category ? tx.category.split(' ') : ['category', 'Khác'];
                                const categoryIcon = categoryParts[0];
                                const categoryName = categoryParts.slice(1).join(' ') || categoryParts[0];

                                return (
                                    <div key={tx.id} className="flex items-center justify-between pb-4 border-b border-surface-container-highest/50 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'}`}>
                                                <span className="material-symbols-outlined text-[20px]">{categoryIcon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-surface-variant px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold text-on-surface">{categoryName}</span>
                                                    <span className="text-[11px] font-medium text-outline">{new Date(tx.date).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <p className="text-sm font-medium text-on-surface truncate" title={tx.description}>{tx.description}</p>
                                            </div>
                                        </div>
                                        <div className={`shrink-0 font-bold ${isIncome ? 'text-green-700' : 'text-on-surface'}`}>
                                            {isIncome ? '+' : ''}{tx.amount.toLocaleString()} đ
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
