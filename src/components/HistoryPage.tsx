import { useState, useMemo } from 'react';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { db, type Transaction } from '../db';
import { db as firestoreDb } from '../firebase';
import { addDoc, deleteDoc, doc } from 'firebase/firestore';
import type { PageId } from './Layout';

interface HistoryPageProps {
    onNavigate?: (page: PageId) => void;
}
type DateFilterType = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';

const CATEGORY_PRESETS = [
    'fastfood Ăn uống',
    'directions_car Đi lại',
    'shopping_bag Mua sắm',
    'local_hospital Sức khoẻ',
    'school Học tập',
    'sports_esports Giải trí',
    'home Nhà ở',
    'attach_money Thu nhập',
    'more_horiz Khác',
];

const emptyCreateForm = {
    txType: 'expense' as 'expense' | 'income',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    category: '',
};

export default function HistoryPage(_props: HistoryPageProps) {
    const [search, setSearch] = useState('');
    const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState(emptyCreateForm);

    const { data: allTransactions = [] } = useFirestoreQuery<Transaction>('transactions');

    // Extract unique categories for filter chips
    const categories = useMemo(() => {
        const cats = new Set<string>();
        allTransactions.forEach(tx => {
            if (tx.category) cats.add(tx.category);
        });
        return Array.from(cats).sort();
    }, [allTransactions]);

    // Filter transactions by search + category
    const filtered = useMemo(() => {
        let result = [...allTransactions];

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(tx =>
                tx.description.toLowerCase().includes(q)
            );
        }

        if (selectedCategory) {
            result = result.filter(tx => tx.category === selectedCategory);
        }
        if (dateFilterType !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            let startTime = 0;
            let endTime = Infinity;

            if (dateFilterType === 'today') {
                startTime = today;
                endTime = today + 86400000 - 1;
            } else if (dateFilterType === 'this_week') {
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(new Date(now).setDate(diff));
                startTime = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getTime();
                endTime = startTime + 7 * 86400000 - 1;
            } else if (dateFilterType === 'this_month') {
                startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
            } else if (dateFilterType === 'custom') {
                if (customStartDate) startTime = new Date(customStartDate).getTime();
                if (customEndDate) endTime = new Date(customEndDate + 'T23:59:59.999').getTime();
            }

            result = result.filter(tx => {
                const txTime = new Date(tx.date).getTime();
                return txTime >= startTime && txTime <= endTime;
            });
        }

        // Sort by date descending
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return result;
    }, [allTransactions, search, selectedCategory, dateFilterType, customStartDate, customEndDate]);

    // Group transactions by date
    const grouped = useMemo(() => {
        const groups: { dateKey: string; label: string; transactions: typeof filtered; dailyIncome: number; dailyExpense: number }[] = [];
        const map = new Map<string, typeof filtered>();

        filtered.forEach(tx => {
            const d = new Date(tx.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(tx);
        });

        // Map is already in desc order because filtered is sorted desc
        map.forEach((txs, dateKey) => {
            const label = new Date(txs[0].date).toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });
            const dailyIncome = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
            const dailyExpense = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
            groups.push({ dateKey, label, transactions: txs, dailyIncome, dailyExpense });
        });

        return groups;
    }, [filtered]);
    const getDateFilterLabel = () => {
        switch (dateFilterType) {
            case 'today': return 'Hôm nay';
            case 'this_week': return 'Tuần này';
            case 'this_month': return 'Tháng này';
            case 'custom':
                if (customStartDate && customEndDate) return `${new Date(customStartDate).toLocaleDateString('vi-VN')} - ${new Date(customEndDate).toLocaleDateString('vi-VN')}`;
                if (customStartDate) return `Từ ${new Date(customStartDate).toLocaleDateString('vi-VN')}`;
                if (customEndDate) return `Đến ${new Date(customEndDate).toLocaleDateString('vi-VN')}`;
                return 'Tuỳ chỉnh';
            default: return 'Tất cả thời gian';
        }
    };

    const totalCount = filtered.length;

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const rawAmt = parseFloat(createForm.amount.replace(/,/g, ''));
        if (!rawAmt || !createForm.description) {
            alert('Vui lòng điền đầy đủ số tiền và mô tả giao dịch!');
            return;
        }
        const finalAmount = createForm.txType === 'expense' ? -Math.abs(rawAmt) : Math.abs(rawAmt);
        const emailId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        try {
            const parsedDate = new Date(createForm.date).getTime();
            const finalDate = isNaN(parsedDate) ? Date.now() : parsedDate;

            await addDoc(db.transactions, {
                emailId,
                amount: finalAmount,
                description: createForm.description,
                date: finalDate,
                category: createForm.category || null,
                status: 'classified',
            } as any);


            setCreateForm(emptyCreateForm);
            setIsCreateModalOpen(false);
            alert('Thêm giao dịch thủ công thành công!');
        } catch (error) {
            console.error('Error adding manual transaction:', error);
            alert('Lỗi: Không thể thêm giao dịch. Vui lòng kiểm tra console.');
        }
    };

    return (
        <div className="p-6 md:p-10 min-w-0 max-w-[1200px] mx-auto">
            {/* Header */}
            <section className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-[32px] font-black tracking-tight text-on-background mb-2">Lịch sử giao dịch</h2>
                    <p className="text-outline font-medium">
                        Toàn bộ giao dịch đã ghi nhận — {totalCount} giao dịch
                    </p>
                </div>
                <button
                    onClick={() => { setCreateForm(emptyCreateForm); setIsCreateModalOpen(true); }}
                    className="flex shrink-0 items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all active:scale-[0.97] shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Thêm thủ công
                </button>
            </section>

            {/* Search and Date Filter */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm kiếm giao dịch..."
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest/30 text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 font-medium transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setIsDateModalOpen(true)}
                    className="flex shrink-0 items-center justify-between gap-2 px-5 py-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest/30 text-on-surface font-bold hover:bg-surface-container-low transition-colors shadow-sm"
                >
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">calendar_month</span>
                        {getDateFilterLabel()}
                    </div>
                    <span className="material-symbols-outlined text-outline ml-2">expand_more</span>
                </button>
            </div>

            {/* Category Filter Chips */}
            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${!selectedCategory
                            ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                            : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container-highest/30 hover:bg-surface-container-low'
                            }`}
                    >
                        Tất cả
                    </button>
                    {categories.map(cat => {
                        const parts = cat.split(' ');
                        const icon = parts[0];
                        const name = parts.slice(1).join(' ') || cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                                className={`px-4 py-2 rounded-full text-sm font-bold flex items-center transition-all ${selectedCategory === cat
                                    ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                                    : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container-highest/30 hover:bg-surface-container-low'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[16px] mr-1.5">{icon}</span>
                                {name}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Activity Stream */}
            {grouped.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-2xl p-16 text-center border border-surface-container-highest/20">
                    <span className="material-symbols-outlined text-5xl text-outline/40 mb-4 block">receipt_long</span>
                    <p className="text-outline font-semibold text-lg">
                        {search || selectedCategory ? 'Không tìm thấy giao dịch nào.' : 'Chưa có giao dịch nào.'}
                    </p>
                    {(search || selectedCategory) && (
                        <button
                            onClick={() => { setSearch(''); setSelectedCategory(null); }}
                            className="mt-4 text-primary font-bold text-sm hover:underline"
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    {grouped.map(group => (
                        <div key={group.dateKey}>
                            {/* Date Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-container-highest/30">
                                <h3 className="text-sm font-black text-on-surface uppercase tracking-wider">
                                    {group.label}
                                </h3>
                                <div className="flex items-center gap-4 text-xs font-bold">
                                    {group.dailyIncome > 0 && (
                                        <span className="text-green-600">+{group.dailyIncome.toLocaleString()}đ</span>
                                    )}
                                    {group.dailyExpense > 0 && (
                                        <span className="text-error">-{group.dailyExpense.toLocaleString()}đ</span>
                                    )}
                                </div>
                            </div>

                            {/* Transaction Cards */}
                            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest/20 divide-y divide-surface-container-highest/20 overflow-hidden">
                                {group.transactions.map(tx => {
                                    const isIncome = tx.amount > 0;
                                    const isUnclassified = tx.status === 'unclassified';

                                    const categoryParts = tx.category ? tx.category.split(' ') : ['pending_actions', 'Chưa phân loại'];
                                    const categoryIcon = categoryParts[0];
                                    const categoryName = categoryParts.slice(1).join(' ') || categoryParts[0];

                                    const iconBg = isUnclassified
                                        ? 'bg-amber-100 text-amber-700'
                                        : isIncome
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-primary/10 text-primary';

                                    return (
                                        <div
                                            key={tx.id}
                                            onClick={() => setSelectedTx(tx)}
                                            className="flex items-center justify-between px-5 py-4 hover:bg-surface-container-low/50 transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                                                    <span className="material-symbols-outlined text-lg">{isUnclassified ? 'pending_actions' : categoryIcon}</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-on-surface text-[15px] truncate" title={tx.description}>
                                                        {tx.description}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${isUnclassified
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-surface-container text-on-surface-variant'
                                                            }`}>
                                                            {isUnclassified ? 'Chưa phân loại' : categoryName}
                                                        </span>
                                                        <span className="text-[11px] text-outline font-medium">
                                                            {new Date(tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`font-black text-base tracking-tight shrink-0 ml-4 ${isIncome ? 'text-green-600' : 'text-on-surface'}`}>
                                                {isIncome ? '+' : ''}{tx.amount.toLocaleString()} <span className="text-xs font-semibold opacity-60">đ</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Transaction Modal */}
            {isCreateModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsCreateModalOpen(false)}
                >
                    <div
                        className="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-surface-container-highest/20"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-on-surface tracking-tight">Tạo giao dịch</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-5">
                            {/* Income / Expense Toggle */}
                            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-xl">
                                {(['expense', 'income'] as const).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setCreateForm({ ...createForm, txType: t })}
                                        className={`py-2.5 rounded-lg text-sm font-bold transition-all ${createForm.txType === t
                                            ? t === 'income'
                                                ? 'bg-green-600 text-white shadow-md'
                                                : 'bg-error text-on-error shadow-md'
                                            : 'text-on-surface-variant hover:bg-surface-container-high'
                                            }`}
                                    >
                                        {t === 'income' ? '💰 Thu nhập' : '💸 Chi tiêu'}
                                    </button>
                                ))}
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Số tiền (VNĐ) *</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={createForm.amount}
                                    onChange={e => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        const formatted = raw ? parseInt(raw, 10).toLocaleString('en-US') : '';
                                        setCreateForm({ ...createForm, amount: formatted });
                                    }}
                                    placeholder="100,000"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-surface-container-highest/50 bg-surface text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Mô tả *</label>
                                <input
                                    type="text"
                                    value={createForm.description}
                                    onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder="Vd: Cà phê sáng"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-surface-container-highest/50 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Ngày</label>
                                <input
                                    type="date"
                                    value={createForm.date}
                                    onChange={e => setCreateForm({ ...createForm, date: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-surface-container-highest/50 bg-surface text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                            </div>

                            {/* Category Chips */}
                            <div>
                                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Phân loại</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORY_PRESETS.map(cat => {
                                        const [icon, ...rest] = cat.split(' ');
                                        const name = rest.join(' ');
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setCreateForm({ ...createForm, category: createForm.category === cat ? '' : cat })}
                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${createForm.category === cat
                                                    ? 'bg-primary text-on-primary border-primary'
                                                    : 'bg-surface-container text-on-surface-variant border-transparent hover:border-primary/30'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">{icon}</span>
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-primary text-on-primary rounded-xl font-bold text-base hover:opacity-90 transition-all active:scale-[0.97] shadow-md shadow-primary/20"
                                >
                                    Lưu giao dịch
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-5 py-3.5 rounded-xl font-bold text-sm text-outline hover:bg-surface-container-high transition-all"
                                >
                                    Huỷ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Date Filter Modal */}
            {isDateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsDateModalOpen(false)}>
                    <div className="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-surface-container-highest/20" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-on-surface tracking-tight">Lọc thời gian</h3>
                            <button onClick={() => setIsDateModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {(['all', 'today', 'this_week', 'this_month', 'custom'] as DateFilterType[]).map(type => {
                                const labels: Record<DateFilterType, string> = {
                                    all: 'Tất cả',
                                    today: 'Hôm nay',
                                    this_week: 'Tuần này',
                                    this_month: 'Tháng này',
                                    custom: 'Tuỳ chỉnh',
                                };
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setDateFilterType(type)}
                                        className={`col-span-1 ${type === 'all' ? 'col-span-2' : ''} px-4 py-3 rounded-2xl text-sm font-bold transition-all text-center border ${dateFilterType === type
                                            ? 'bg-primary text-on-primary border-primary shadow-md shadow-primary/20'
                                            : 'bg-surface-container text-on-surface border-transparent hover:bg-surface-container-high'}`}
                                    >
                                        {labels[type]}
                                    </button>
                                );
                            })}
                        </div>

                        {dateFilterType === 'custom' && (
                            <div className="flex flex-col gap-4 mb-6 animate-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label className="block text-sm font-bold text-on-surface mb-2">Từ ngày</label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={e => setCustomStartDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-surface-container-highest/50 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-on-surface mb-2">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={e => setCustomEndDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-surface-container-highest/50 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setIsDateModalOpen(false)}
                            className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-primary/30 transition-all mt-2"
                        >
                            Áp dụng
                        </button>
                    </div>
                </div>
            )}

            {/* Transaction Detail Drawer */}
            {selectedTx && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedTx(null)}
                    />
                    {/* Drawer */}
                    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface-container-lowest shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-surface-container-highest/20">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-container-highest/20 bg-surface-container-lowest/80 backdrop-blur-md">
                            <h3 className="text-xl font-black text-on-surface">Chi tiết</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác.')) {
                                            if (selectedTx.id) {
                                                await deleteDoc(doc(firestoreDb, 'transactions', selectedTx.id));
                                                setSelectedTx(null);
                                            }
                                        }
                                    }}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-error/10 text-error transition-colors"
                                    title="Xóa giao dịch"
                                >
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                                <button
                                    onClick={() => setSelectedTx(null)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Amount & Title */}
                            <div className="text-center">
                                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${selectedTx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-surface-container-high text-on-surface'}`}>
                                    <span className="material-symbols-outlined text-3xl">
                                        {selectedTx.amount > 0 ? 'arrow_downward' : 'arrow_upward'}
                                    </span>
                                </div>
                                <h4 className={`text-4xl font-black tracking-tighter mb-2 ${selectedTx.amount > 0 ? 'text-green-600' : 'text-on-surface'}`}>
                                    {selectedTx.amount > 0 ? '+' : ''}{selectedTx.amount.toLocaleString()}đ
                                </h4>
                                <p className="text-outline font-medium text-lg px-4">{selectedTx.description}</p>
                            </div>

                            {/* Info Blocks */}
                            <div className="bg-surface-container-lowest border border-surface-container-highest/30 rounded-3xl p-6 space-y-5 shadow-sm">
                                <div>
                                    <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Thời gian ghi nhận</p>
                                    <p className="font-semibold text-on-surface text-lg">
                                        {new Date(selectedTx.date).toLocaleString('vi-VN', {
                                            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <hr className="border-surface-container-highest/30" />
                                <div>
                                    <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Phân loại</p>
                                    <div className="inline-flex items-center gap-2 mt-1">
                                        <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg ${selectedTx.status === 'unclassified'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-surface-container-highest text-on-surface'
                                            }`}>
                                            {(() => {
                                                if (selectedTx.status === 'unclassified' || !selectedTx.category) {
                                                    return (
                                                        <>
                                                            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                                                            Chưa phân loại
                                                        </>
                                                    );
                                                }
                                                const parts = selectedTx.category.split(' ');
                                                const icon = parts[0];
                                                const name = parts.slice(1).join(' ') || icon;
                                                return (
                                                    <>
                                                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                                                        {name}
                                                    </>
                                                );
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <hr className="border-surface-container-highest/30" />
                                <div>
                                    <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Tài khoản</p>
                                    <p className="font-semibold text-on-surface text-lg">{selectedTx.account || 'Tài khoản chính'}</p>
                                </div>
                                {selectedTx.type && (
                                    <>
                                        <hr className="border-surface-container-highest/30" />
                                        <div>
                                            <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Hình thức</p>
                                            <p className="font-semibold text-on-surface text-lg capitalize">{selectedTx.type}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Additional Metadata if any */}
                            {selectedTx.metadata && Object.keys(selectedTx.metadata).length > 0 && (
                                <div className="bg-surface-container-lowest border border-surface-container-highest/30 rounded-3xl p-6 space-y-4 shadow-sm">
                                    <h5 className="font-bold text-on-surface mb-2">Thông tin kỹ thuật</h5>
                                    {Object.entries(selectedTx.metadata).map(([key, value]) => (
                                        <div key={key}>
                                            <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">{key}</p>
                                            <p className="font-medium text-on-surface-variant text-sm break-all font-mono bg-surface-container p-2 rounded-lg mt-1">{String(value)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-surface-container-highest/20 bg-surface-container-lowest">
                            <button
                                onClick={() => {
                                    setSelectedTx(null);
                                    if (_props.onNavigate) _props.onNavigate('classify');
                                }}
                                className="w-full py-4 bg-surface-container-highest text-on-surface rounded-xl font-bold text-lg hover:brightness-95 transition-all flex justify-center items-center gap-2 shadow-sm"
                            >
                                <span className="material-symbols-outlined">edit</span>
                                {selectedTx.status === 'unclassified' ? 'Phân loại ngay tại đây' : 'Chuyển đến trang phân loại'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
