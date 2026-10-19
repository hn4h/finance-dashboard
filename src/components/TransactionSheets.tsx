import { useState, type FormEvent } from 'react';
import { addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, type Transaction } from '../db';
import { CATEGORIES, categoryValue, parseCategory } from '../lib/categories';
import { formatVND, fromDateInput, toDateInput } from '../lib/format';
import { CategoryIcon } from './TransactionRow';
import Button from './ui/Button';
import { Field, MoneyInput, inputClass } from './ui/Field';
import { useFeedback } from './ui/useFeedback';
import Icon from './ui/Icon';
import SegmentedControl from './ui/SegmentedControl';
import Sheet from './ui/Sheet';

function CategoryPicker({ value, onChange }: { value: string | null; onChange: (value: string) => void }) {
    const selectedName = parseCategory(value)?.name;
    return (
        <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
                const active = selectedName === cat.name;
                return (
                    <button
                        key={cat.name}
                        type="button"
                        onClick={() => onChange(categoryValue(cat))}
                        aria-pressed={active}
                        className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold transition-colors ${active ? 'bg-primary text-on-primary' : 'bg-surface-2 hover:bg-border'}`}
                    >
                        <Icon name={cat.icon} size={16} />
                        {cat.name}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Create ───────────────────────────────────────────────

const emptyForm = () => ({ type: 'expense' as 'expense' | 'income', amount: 0, description: '', date: toDateInput(), category: null as string | null });

export function CreateTransactionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const { toast } = useFeedback();

    const close = () => { setForm(emptyForm()); onClose(); };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.amount || !form.description.trim()) {
            toast('Vui lòng nhập số tiền và mô tả.', 'error');
            return;
        }
        setSaving(true);
        try {
            const now = new Date();
            const day = new Date(fromDateInput(form.date));
            // Keep the current time-of-day so manual entries sort naturally within the day
            day.setHours(now.getHours(), now.getMinutes());
            await addDoc(db.transactions, {
                emailId: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                amount: form.type === 'expense' ? -form.amount : form.amount,
                description: form.description.trim(),
                date: day.getTime(),
                category: form.category,
                status: form.category ? 'classified' : 'unclassified',
            });
            toast('Đã thêm giao dịch');
            close();
        } catch (err) {
            console.error(err);
            toast('Không thể thêm giao dịch. Vui lòng thử lại.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={close}
            title="Thêm giao dịch"
            footer={<>
                <Button variant="secondary" size="lg" onClick={close}>Huỷ</Button>
                <Button size="lg" type="submit" form="create-tx" loading={saving}>Lưu</Button>
            </>}
        >
            <form id="create-tx" onSubmit={submit} className="space-y-4">
                <SegmentedControl
                    options={[{ value: 'expense', label: 'Chi tiêu' }, { value: 'income', label: 'Thu nhập' }]}
                    value={form.type}
                    onChange={type => setForm({ ...form, type })}
                />
                <Field label="Số tiền">
                    <MoneyInput value={form.amount} onChange={amount => setForm({ ...form, amount })} required />
                </Field>
                <Field label="Mô tả">
                    <input className={inputClass} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Vd: Cà phê sáng" required />
                </Field>
                <Field label="Ngày">
                    <input type="date" className={inputClass} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </Field>
                <div>
                    <span className="block text-xs font-semibold text-muted mb-1.5">Danh mục</span>
                    <CategoryPicker value={form.category} onChange={category => setForm({ ...form, category: form.category === category ? null : category })} />
                </div>
            </form>
        </Sheet>
    );
}

// ─── Detail ───────────────────────────────────────────────

export function TransactionDetailSheet({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
    const { toast, confirm } = useFeedback();

    const setCategory = async (category: string) => {
        if (!tx?.id) return;
        try {
            await updateDoc(doc(db.transactions, tx.id), { category, status: 'classified' });
            toast(`Đã chuyển sang “${parseCategory(category)?.name}”`);
        } catch (e) {
            console.error(e);
            toast('Không đổi được danh mục.', 'error');
        }
    };

    const remove = async () => {
        if (!tx?.id) return;
        const ok = await confirm({ title: 'Xoá giao dịch?', message: 'Hành động này không thể hoàn tác.', confirmLabel: 'Xoá', danger: true });
        if (!ok) return;
        await deleteDoc(doc(db.transactions, tx.id));
        onClose();
        toast('Đã xoá giao dịch');
    };

    return (
        <Sheet open={!!tx} onClose={onClose} title="Chi tiết giao dịch">
            {tx && (
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <CategoryIcon category={tx.status === 'unclassified' ? null : tx.category} size="lg" />
                        <div className="min-w-0">
                            <p className={`text-3xl font-extrabold tracking-tight tabular ${tx.amount > 0 ? 'text-income' : ''}`}>{formatVND(tx.amount, { sign: true })}</p>
                            <p className="text-sm text-muted">
                                {new Date(tx.date).toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    <dl className="rounded-2xl bg-surface-2 divide-y divide-border text-sm">
                        <div className="p-3">
                            <dt className="text-muted text-xs mb-0.5">Nội dung</dt>
                            <dd className="font-medium break-words">{tx.description}</dd>
                        </div>
                        {tx.beneficiary && (
                            <div className="p-3">
                                <dt className="text-muted text-xs mb-0.5">Người hưởng</dt>
                                <dd className="font-medium">{tx.beneficiary}</dd>
                            </div>
                        )}
                        <div className="p-3">
                            <dt className="text-muted text-xs mb-0.5">Nguồn</dt>
                            <dd className="font-medium">{tx.emailId.startsWith('manual_') ? 'Nhập thủ công' : 'Email VPBank'}</dd>
                        </div>
                    </dl>

                    <div>
                        <p className="text-xs font-semibold text-muted mb-2">{tx.status === 'unclassified' ? 'Chọn danh mục' : 'Danh mục'}</p>
                        <CategoryPicker value={tx.status === 'unclassified' ? null : tx.category} onChange={setCategory} />
                    </div>

                    <Button variant="danger" size="lg" icon="delete" onClick={remove}>Xoá giao dịch</Button>
                </div>
            )}
        </Sheet>
    );
}
