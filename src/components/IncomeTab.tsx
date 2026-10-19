import { useMemo, useState, type FormEvent } from 'react';
import { addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, type IncomeEntry } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { formatVND, fromDateInput, toDateInput } from '../lib/format';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import { Field, MoneyInput, inputClass } from './ui/Field';
import { useFeedback } from './ui/useFeedback';
import Icon from './ui/Icon';
import Sheet from './ui/Sheet';

const SOURCE_PRESETS = ['Lương', 'Freelance', 'Đầu tư', 'Thưởng', 'Khác'];
const THIRTY_DAYS = 30 * 86400000;

interface FormState { id: string | null; amount: number; source: string; date: string; note: string }
const newForm = (): FormState => ({ id: null, amount: 0, source: '', date: toDateInput(), note: '' });

export default function IncomeTab() {
    const { data } = useFirestoreQuery<IncomeEntry>('incomes');
    const incomes = useMemo(() => [...(data ?? [])].sort((a, b) => b.date - a.date), [data]);
    const [form, setForm] = useState<FormState | null>(null);
    const [saving, setSaving] = useState(false);
    const { toast, confirm } = useFeedback();

    const now = Date.now();
    const last30 = incomes.filter(i => i.date >= now - THIRTY_DAYS && i.date <= now).reduce((s, i) => s + i.amount, 0);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form || !form.amount || !form.source) {
            toast('Vui lòng nhập số tiền và chọn nguồn.', 'error');
            return;
        }
        setSaving(true);
        const entry = { amount: form.amount, source: form.source, date: fromDateInput(form.date), note: form.note.trim() || null };
        try {
            if (form.id) await updateDoc(doc(db.incomes, form.id), entry);
            else await addDoc(db.incomes, entry as IncomeEntry);
            toast(form.id ? 'Đã cập nhật thu nhập' : 'Đã thêm thu nhập');
            setForm(null);
        } catch (err) {
            console.error(err);
            toast('Không lưu được. Vui lòng thử lại.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!form?.id) return;
        if (!await confirm({ title: 'Xoá khoản thu nhập này?', confirmLabel: 'Xoá', danger: true })) return;
        await deleteDoc(doc(db.incomes, form.id));
        setForm(null);
        toast('Đã xoá');
    };

    return (
        <>
            <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                    <p className="text-sm text-muted">Thu nhập 30 ngày qua</p>
                    <p className="text-2xl md:text-3xl font-extrabold text-income tabular">{formatVND(last30)}</p>
                </div>
                <Button icon="add" onClick={() => setForm(newForm())}>Thêm</Button>
            </div>

            {data === undefined ? (
                <div className="h-48 rounded-2xl bg-surface animate-pulse" />
            ) : incomes.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-card">
                    <EmptyState icon="wallet" title="Chưa có thu nhập nào" description="Thêm lương, thưởng hay thu nhập khác để tính số dư chính xác." />
                </div>
            ) : (
                <div className="bg-surface rounded-2xl shadow-card divide-y overflow-hidden">
                    {incomes.map(income => (
                        <button
                            key={income.id}
                            onClick={() => setForm({ id: income.id!, amount: income.amount, source: income.source, date: toDateInput(income.date), note: income.note ?? '' })}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-surface-2 hover:bg-surface-2/60"
                        >
                            <span className="size-10 rounded-xl bg-income/10 text-income flex items-center justify-center shrink-0">
                                <Icon name="wallet" size={18} />
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-semibold">{income.source}</span>
                                <span className="block text-xs text-muted truncate">
                                    {new Date(income.date).toLocaleDateString('vi-VN')}{income.note && ` · ${income.note}`}
                                </span>
                            </span>
                            <span className="font-bold text-income tabular shrink-0">+{formatVND(income.amount)}</span>
                        </button>
                    ))}
                </div>
            )}

            <Sheet
                open={!!form}
                onClose={() => setForm(null)}
                title={form?.id ? 'Sửa thu nhập' : 'Thêm thu nhập'}
                footer={<>
                    {form?.id
                        ? <Button variant="danger" size="lg" icon="delete" onClick={remove}>Xoá</Button>
                        : <Button variant="secondary" size="lg" onClick={() => setForm(null)}>Huỷ</Button>}
                    <Button size="lg" type="submit" form="income-form" loading={saving}>{form?.id ? 'Cập nhật' : 'Lưu'}</Button>
                </>}
            >
                {form && (
                    <form id="income-form" onSubmit={submit} className="space-y-4">
                        <Field label="Số tiền">
                            <MoneyInput value={form.amount} onChange={amount => setForm({ ...form, amount })} required />
                        </Field>
                        <div>
                            <span className="block text-xs font-semibold text-muted mb-1.5">Nguồn</span>
                            <div className="flex flex-wrap gap-2">
                                {SOURCE_PRESETS.map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setForm({ ...form, source: s })}
                                        aria-pressed={form.source === s}
                                        className={`h-9 px-4 rounded-full text-sm font-semibold ${form.source === s ? 'bg-primary text-on-primary' : 'bg-surface-2'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Field label="Ngày">
                            <input type="date" className={inputClass} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        </Field>
                        <Field label="Ghi chú (tuỳ chọn)">
                            <input className={inputClass} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Vd: Lương tháng 10" />
                        </Field>
                    </form>
                )}
            </Sheet>
        </>
    );
}
