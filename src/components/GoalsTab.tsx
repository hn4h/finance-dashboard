import { useState, type FormEvent } from 'react';
import { addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, type Goal, type GoalContribution } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { formatVND, fromDateInput, toDateInput } from '../lib/format';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import { Field, MoneyInput, inputClass } from './ui/Field';
import { useFeedback } from './ui/useFeedback';
import Icon from './ui/Icon';
import Sheet from './ui/Sheet';

interface GoalForm { id: string | null; name: string; targetAmount: number; deadline: string }

export default function GoalsTab() {
    const { data: goals } = useFirestoreQuery<Goal>('goals');
    const { data: contributions = [] } = useFirestoreQuery<GoalContribution>('contributions');
    const [form, setForm] = useState<GoalForm | null>(null);
    const [funding, setFunding] = useState<Goal | null>(null);
    const [fundAmount, setFundAmount] = useState(0);
    const [saving, setSaving] = useState(false);
    const { toast, confirm } = useFeedback();

    const active = (goals ?? []).filter(g => g.status === 'active');
    const done = (goals ?? []).filter(g => g.status === 'done');
    const saved = (goalId: string) => contributions.filter(c => c.goalId === goalId).reduce((s, c) => s + c.amount, 0);
    const editing = form?.id ? goals?.find(g => g.id === form.id) : undefined;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form || !form.name.trim() || !form.targetAmount) {
            toast('Vui lòng nhập tên và số tiền mục tiêu.', 'error');
            return;
        }
        setSaving(true);
        const fields = { name: form.name.trim(), targetAmount: form.targetAmount, deadline: form.deadline ? fromDateInput(form.deadline) : null };
        try {
            if (form.id) await updateDoc(doc(db.goals, form.id), fields);
            else await addDoc(db.goals, { ...fields, status: 'active', createdAt: Date.now() } as Goal);
            toast(form.id ? 'Đã cập nhật mục tiêu' : 'Đã tạo mục tiêu');
            setForm(null);
        } catch (err) {
            console.error(err);
            toast('Không lưu được. Vui lòng thử lại.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleDone = async () => {
        if (!editing?.id) return;
        await updateDoc(doc(db.goals, editing.id), { status: editing.status === 'active' ? 'done' : 'active' });
        toast(editing.status === 'active' ? 'Đã đánh dấu hoàn thành 🎉' : 'Đã mở lại mục tiêu');
        setForm(null);
    };

    const remove = async () => {
        if (!editing?.id) return;
        if (!await confirm({ title: 'Xoá mục tiêu này?', message: 'Các khoản đã góp không bị xoá.', confirmLabel: 'Xoá', danger: true })) return;
        await deleteDoc(doc(db.goals, editing.id));
        setForm(null);
        toast('Đã xoá mục tiêu');
    };

    const submitFund = async (e: FormEvent) => {
        e.preventDefault();
        if (!funding?.id || fundAmount <= 0) {
            toast('Số tiền không hợp lệ.', 'error');
            return;
        }
        setSaving(true);
        try {
            await addDoc(db.contributions, { goalId: funding.id, amount: fundAmount, date: Date.now() });
            toast(`Đã góp ${formatVND(fundAmount)} vào “${funding.name}”`);
            setFunding(null);
        } catch (err) {
            console.error(err);
            toast('Không góp quỹ được. Vui lòng thử lại.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const renderGoal = (goal: Goal) => {
        const current = saved(goal.id!);
        const pct = Math.min(Math.round((current / goal.targetAmount) * 100), 100);
        const isDone = goal.status === 'done';
        return (
            <article key={goal.id} className={`bg-surface rounded-2xl shadow-card p-4 ${isDone ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-3">
                    <span className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isDone ? 'bg-income/10 text-income' : 'bg-primary/10 text-primary'}`}>
                        <Icon name={isDone ? 'check_circle' : 'flag'} size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isDone ? 'line-through' : ''}`}>{goal.name}</p>
                        <p className="text-xs text-muted">
                            {goal.deadline ? `Hạn ${new Date(goal.deadline).toLocaleDateString('vi-VN')}` : `Tạo ${new Date(goal.createdAt).toLocaleDateString('vi-VN')}`}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        icon="edit"
                        aria-label="Sửa mục tiêu"
                        onClick={() => setForm({ id: goal.id!, name: goal.name, targetAmount: goal.targetAmount, deadline: goal.deadline ? toDateInput(goal.deadline) : '' })}
                    />
                </div>
                <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1.5">
                        <span className="tabular"><span className="font-semibold">{formatVND(current)}</span> <span className="text-muted">/ {formatVND(goal.targetAmount)}</span></span>
                        <span className="font-semibold text-primary tabular">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-[width] duration-700 ${pct >= 100 || isDone ? 'bg-income' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                </div>
                {!isDone && (
                    <Button variant="secondary" icon="add" className="w-full mt-3" onClick={() => { setFunding(goal); setFundAmount(0); }}>
                        Góp quỹ
                    </Button>
                )}
            </article>
        );
    };

    return (
        <>
            <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                    <p className="text-sm text-muted">Đang theo đuổi</p>
                    <p className="text-2xl md:text-3xl font-extrabold tabular">{active.length} <span className="text-base font-semibold text-muted">mục tiêu</span></p>
                </div>
                <Button icon="add" onClick={() => setForm({ id: null, name: '', targetAmount: 0, deadline: '' })}>Thêm</Button>
            </div>

            {goals === undefined ? (
                <div className="h-40 rounded-2xl bg-surface animate-pulse" />
            ) : goals.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-card">
                    <EmptyState icon="flag" title="Chưa có mục tiêu nào" description="Đặt mục tiêu đầu tiên, ví dụ quỹ du lịch hay quỹ khẩn cấp." />
                </div>
            ) : (
                <div className="space-y-6">
                    {active.length > 0 && <div className="grid gap-3 md:grid-cols-2">{active.map(renderGoal)}</div>}
                    {done.length > 0 && (
                        <section>
                            <h2 className="px-1 mb-2 text-sm font-semibold text-muted">Đã hoàn thành ({done.length})</h2>
                            <div className="grid gap-3 md:grid-cols-2">{done.map(renderGoal)}</div>
                        </section>
                    )}
                </div>
            )}

            {/* Create / edit */}
            <Sheet
                open={!!form}
                onClose={() => setForm(null)}
                title={form?.id ? 'Sửa mục tiêu' : 'Mục tiêu mới'}
                footer={<>
                    <Button variant="secondary" size="lg" onClick={() => setForm(null)}>Huỷ</Button>
                    <Button size="lg" type="submit" form="goal-form" loading={saving}>{form?.id ? 'Cập nhật' : 'Tạo'}</Button>
                </>}
            >
                {form && (
                    <form id="goal-form" onSubmit={submit} className="space-y-4">
                        <Field label="Tên mục tiêu">
                            <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Vd: Du lịch Nhật Bản" required />
                        </Field>
                        <Field label="Số tiền mục tiêu">
                            <MoneyInput value={form.targetAmount} onChange={targetAmount => setForm({ ...form, targetAmount })} required />
                        </Field>
                        <Field label="Hạn (tuỳ chọn)">
                            <input type="date" className={inputClass} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                        </Field>
                        {editing && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button variant="secondary" icon={editing.status === 'active' ? 'check_circle' : 'flag'} onClick={toggleDone}>
                                    {editing.status === 'active' ? 'Hoàn thành' : 'Mở lại'}
                                </Button>
                                <Button variant="danger" icon="delete" onClick={remove}>Xoá</Button>
                            </div>
                        )}
                    </form>
                )}
            </Sheet>

            {/* Contribute */}
            <Sheet
                open={!!funding}
                onClose={() => setFunding(null)}
                title="Góp quỹ"
                footer={<Button size="lg" type="submit" form="fund-form" loading={saving}>Xác nhận góp</Button>}
            >
                {funding && (
                    <form id="fund-form" onSubmit={submitFund} className="space-y-4">
                        <p className="text-muted">Mục tiêu: <span className="font-semibold text-fg">{funding.name}</span></p>
                        <Field label="Số tiền góp">
                            <MoneyInput value={fundAmount} onChange={setFundAmount} autoFocus required className="text-xl" />
                        </Field>
                    </form>
                )}
            </Sheet>
        </>
    );
}
