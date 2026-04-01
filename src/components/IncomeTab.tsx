import { useState, useMemo } from 'react';
import { db, type IncomeEntry } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const SOURCE_PRESETS = ['Lương', 'Freelance', 'Đầu tư', 'Thưởng', 'Khác'];

interface IncomeFormData {
    amount: string;
    source: string;
    date: string;
    note: string;
}

const emptyForm: IncomeFormData = {
    amount: '',
    source: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
};

export default function IncomeTab() {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<IncomeFormData>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: rawIncomes = [] } = useFirestoreQuery<IncomeEntry>('incomes');
    const incomes = useMemo(() => [...rawIncomes].sort((a, b) => b.date - a.date), [rawIncomes]);

    const totalLast30Days = incomes
        .filter(i => {
            const now = Date.now();
            const thirtiethDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
            return i.date >= thirtiethDaysAgo && i.date <= now;
        })
        .reduce((sum, i) => sum + i.amount, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(form.amount.replace(/,/g, ''));
        if (!amt || !form.source) return;

        const entry: any = {
            amount: amt,
            source: form.source,
            date: new Date(form.date).getTime(),
            note: form.note || null,
        };

        if (editingId !== null) {
            await updateDoc(doc(db.incomes, editingId.toString()), entry as any);
            setEditingId(null);
        } else {
            await addDoc(db.incomes, entry);
        }
        setForm(emptyForm);
        setShowForm(false);
    };

    const handleEdit = (income: IncomeEntry) => {
        setForm({
            amount: income.amount.toLocaleString('en-US'),
            source: income.source,
            date: new Date(income.date).toISOString().slice(0, 10),
            note: income.note || '',
        });
        setEditingId(income.id!);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Xoá khoản thu nhập này?')) {
            await deleteDoc(doc(db.incomes, id));
        }
    };

    const handleCancel = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(false);
    };

    return (
        <div>
            {/* Summary + Add Button */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-outline text-xs font-bold uppercase tracking-wider mb-1">Tổng thu nhập 30 ngày qua</p>
                    <p className="text-3xl font-extrabold text-green-700 tracking-tight">{totalLast30Days.toLocaleString()} <span className="text-sm font-semibold text-outline">VNĐ</span></p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
                    className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-container transition-all active:scale-[0.97] shadow-lg shadow-primary/10 cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[20px]">{showForm ? 'close' : 'add'}</span>
                    {showForm ? 'Đóng' : 'Thêm thu nhập'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest/20 shadow-sm mb-8 space-y-5 animate-in">
                    <h3 className="text-lg font-bold text-on-surface">{editingId ? 'Sửa thu nhập' : 'Thêm thu nhập mới'}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Số tiền (VNĐ) *</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.amount}
                                onChange={e => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    const formatted = raw ? parseInt(raw, 10).toLocaleString('en-US') : '';
                                    setForm({ ...form, amount: formatted });
                                }}
                                placeholder="5,000,000"
                                required
                                className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 bg-surface text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                        </div>
                        {/* Date */}
                        <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Ngày</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 bg-surface text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    {/* Source Chips */}
                    <div>
                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Nguồn *</label>
                        <div className="flex flex-wrap gap-2">
                            {SOURCE_PRESETS.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setForm({ ...form, source: s })}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all cursor-pointer ${form.source === s
                                        ? 'bg-primary text-on-primary border-primary'
                                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:border-primary/50'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Note */}
                        <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Ghi chú (tùy chọn)</label>
                            <input
                                type="text"
                                value={form.note}
                                onChange={e => setForm({ ...form, note: e.target.value })}
                                placeholder="Vd: Lương tháng này"
                                className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button type="submit" className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-container transition-all active:scale-[0.97] cursor-pointer">
                            {editingId ? 'Cập nhật' : 'Lưu'}
                        </button>
                        <button type="button" onClick={handleCancel} className="px-6 py-2.5 rounded-xl font-semibold text-sm text-outline hover:bg-surface-container-high transition-all cursor-pointer">
                            Huỷ
                        </button>
                    </div>
                </form>
            )}

            {/* Income List */}
            {incomes.length === 0 ? (
                <div className="text-center py-16 text-outline">
                    <span className="material-symbols-outlined text-5xl mb-4 block opacity-30">account_balance_wallet</span>
                    <p className="font-semibold">Chưa có thu nhập nào</p>
                    <p className="text-sm mt-1">Nhấn "Thêm thu nhập" để bắt đầu</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {incomes.map(income => (
                        <div key={income.id} className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest/20 shadow-sm hover:shadow-md transition-all group flex items-center gap-4">
                            {/* Icon */}
                            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-green-700 text-[22px]">account_balance_wallet</span>
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-bold text-on-surface">{income.source}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-outline">
                                    <span>{new Date(income.date).toLocaleDateString('vi-VN')}</span>
                                    {income.note && <span className="truncate">• {income.note}</span>}
                                </div>
                            </div>
                            {/* Amount */}
                            <span className="text-lg font-extrabold text-green-700 tabular-nums shrink-0">+{income.amount.toLocaleString()}</span>
                            {/* Actions */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => handleEdit(income)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer" title="Sửa">
                                    <span className="material-symbols-outlined text-[18px] text-outline">edit</span>
                                </button>
                                <button onClick={() => handleDelete(income.id!)} className="p-1.5 rounded-lg hover:bg-error-container/30 transition-colors cursor-pointer" title="Xoá">
                                    <span className="material-symbols-outlined text-[18px] text-error">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
