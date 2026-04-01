import { useState } from 'react';
import { db, type Goal, type IncomeEntry } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface GoalFormData {
    name: string;
    targetAmount: string;
    deadline: string;
}

const emptyForm: GoalFormData = {
    name: '',
    targetAmount: '',
    deadline: '',
};

export default function GoalsTab() {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<GoalFormData>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: allGoals = [] } = useFirestoreQuery<Goal>('goals');
    const { data: incomes = [] } = useFirestoreQuery<IncomeEntry>('incomes');

    // Separate active and done
    const activeGoals = allGoals.filter(g => g.status === 'active');
    const doneGoals = allGoals.filter(g => g.status === 'done');

    // Calculate progress for each goal from linked incomes
    const getGoalProgress = (goalId: string) => {
        return incomes
            .filter(i => i.goalId === goalId)
            .reduce((sum, i) => sum + i.amount, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const target = parseFloat(form.targetAmount.replace(/,/g, ''));
        if (!form.name || !target) return;

        const deadlineVal = form.deadline ? new Date(form.deadline).getTime() : null;

        if (editingId !== null) {
            await updateDoc(doc(db.goals, editingId), {
                name: form.name,
                targetAmount: target,
                deadline: deadlineVal,
            } as any);
            setEditingId(null);
        } else {
            await addDoc(db.goals, {
                name: form.name,
                targetAmount: target,
                deadline: deadlineVal,
                status: 'active',
                createdAt: Date.now(),
            } as any);
        }
        setForm(emptyForm);
        setShowForm(false);
    };

    const handleEdit = (goal: Goal) => {
        setForm({
            name: goal.name,
            targetAmount: goal.targetAmount.toLocaleString('en-US'),
            deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '',
        });
        setEditingId(goal.id!);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Xoá mục tiêu này? (Các khoản thu nhập liên kết sẽ không bị xoá)')) {
            await deleteDoc(doc(db.goals, id));
        }
    };

    const handleToggleDone = async (goal: Goal) => {
        await updateDoc(doc(db.goals, goal.id!), {
            status: goal.status === 'active' ? 'done' : 'active',
        } as any);
    };

    const handleCancel = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(false);
    };

    const renderGoalCard = (goal: Goal) => {
        const current = getGoalProgress(goal.id!);
        const progress = Math.min(Math.round((current / goal.targetAmount) * 100), 100);
        const isDone = goal.status === 'done';

        return (
            <div key={goal.id} className={`bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest/20 shadow-sm hover:shadow-md transition-all group ${isDone ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                        onClick={() => handleToggleDone(goal)}
                        className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${isDone
                            ? 'bg-green-600 border-green-600'
                            : 'border-outline-variant/50 hover:border-primary'
                            }`}
                    >
                        {isDone && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className={`font-bold text-on-surface ${isDone ? 'line-through opacity-60' : ''}`}>{goal.name}</h4>
                            {/* Actions */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isDone && (
                                    <button onClick={() => handleEdit(goal)} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer" title="Sửa">
                                        <span className="material-symbols-outlined text-[18px] text-outline">edit</span>
                                    </button>
                                )}
                                <button onClick={() => handleDelete(goal.id!)} className="p-1.5 rounded-lg hover:bg-error-container/30 transition-colors cursor-pointer" title="Xoá">
                                    <span className="material-symbols-outlined text-[18px] text-error">delete</span>
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                            <div className="flex justify-between text-xs font-semibold mb-1.5">
                                <span className="text-outline">{current.toLocaleString()} / {goal.targetAmount.toLocaleString()} VNĐ</span>
                                <span className={isDone ? 'text-green-600' : 'text-primary'}>{progress}%</span>
                            </div>
                            <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${isDone ? 'bg-green-500' : progress >= 80 ? 'bg-green-500' : 'bg-primary'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-outline">
                            {goal.deadline && (
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">event</span>
                                    Deadline: {new Date(goal.deadline).toLocaleDateString('vi-VN')}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                Tạo: {new Date(goal.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            {/* Header + Add */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-outline text-xs font-bold uppercase tracking-wider mb-1">Mục tiêu đang theo đuổi</p>
                    <p className="text-3xl font-extrabold text-on-surface tracking-tight">{activeGoals.length} <span className="text-sm font-semibold text-outline">mục tiêu</span></p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
                    className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-container transition-all active:scale-[0.97] shadow-lg shadow-primary/10 cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[20px]">{showForm ? 'close' : 'add'}</span>
                    {showForm ? 'Đóng' : 'Thêm mục tiêu'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest/20 shadow-sm mb-8 space-y-5">
                    <h3 className="text-lg font-bold text-on-surface">{editingId ? 'Sửa mục tiêu' : 'Thêm mục tiêu mới'}</h3>

                    <div>
                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Tên mục tiêu *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Vd: Du lịch Nhật Bản"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 bg-surface text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Số tiền mục tiêu (VNĐ) *</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.targetAmount}
                                onChange={e => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    const formatted = raw ? parseInt(raw, 10).toLocaleString('en-US') : '';
                                    setForm({ ...form, targetAmount: formatted });
                                }}
                                placeholder="50,000,000"
                                required
                                className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 bg-surface text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Deadline (tùy chọn)</label>
                            <input
                                type="date"
                                value={form.deadline}
                                onChange={e => setForm({ ...form, deadline: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 bg-surface text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

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

            {/* Goal Cards */}
            {allGoals.length === 0 ? (
                <div className="text-center py-16 text-outline">
                    <span className="material-symbols-outlined text-5xl mb-4 block opacity-30">flag</span>
                    <p className="font-semibold">Chưa có mục tiêu nào</p>
                    <p className="text-sm mt-1">Nhấn "Thêm mục tiêu" để đặt mục tiêu tài chính đầu tiên</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Active Goals */}
                    {activeGoals.length > 0 && (
                        <div className="space-y-3">
                            {activeGoals.map(renderGoalCard)}
                        </div>
                    )}

                    {/* Done Goals */}
                    {doneGoals.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-xs font-bold text-outline uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>
                                Đã hoàn thành ({doneGoals.length})
                            </h3>
                            <div className="space-y-3">
                                {doneGoals.map(renderGoalCard)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
