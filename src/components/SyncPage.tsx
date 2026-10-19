import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { fromDateInput, toDateInput } from '../lib/format';
import type { PageId } from '../lib/router';
import { syncEmails, type SyncOptions } from '../services/gmailService';
import Button from './ui/Button';
import Card from './ui/Card';
import { Field, inputClass } from './ui/Field';
import { useFeedback } from './ui/useFeedback';
import PageHeader from './ui/PageHeader';
import SegmentedControl from './ui/SegmentedControl';

interface LogLine { at: number; text: string }

function logTone(text: string) {
    if (text.includes('🚨') || text.includes('❌')) return 'text-expense';
    if (text.includes('✅') || text.includes('🎉')) return 'text-income';
    if (text.includes('⏭')) return 'text-muted';
    return '';
}

export default function SyncPage({ onBack, onNavigate }: { onBack: () => void; onNavigate: (page: PageId) => void }) {
    const { accessToken, firebaseUser, logout } = useAuth();
    const signIn = useGoogleSignIn();
    const { toast } = useFeedback();
    const [mode, setMode] = useState<'auto' | 'custom'>('auto');
    const [startDate, setStartDate] = useState(() => toDateInput(Date.now() - 7 * 86400000));
    const [endDate, setEndDate] = useState(() => toDateInput());
    const [syncing, setSyncing] = useState(false);
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [newCount, setNewCount] = useState(0);
    const logEnd = useRef<HTMLDivElement>(null);

    useEffect(() => { logEnd.current?.scrollIntoView({ block: 'nearest' }); }, [logs]);

    const run = async () => {
        if (!accessToken) return signIn();
        if (!firebaseUser) {
            toast('Đang kết nối lại Firebase. Đợi vài giây rồi thử lại, hoặc đăng nhập lại Google.', 'error');
            return;
        }
        const options: SyncOptions = { onProgress: text => setLogs(prev => [...prev, { at: Date.now(), text }]) };
        if (mode === 'custom') {
            if (!startDate || !endDate) {
                toast('Vui lòng chọn đủ ngày bắt đầu và kết thúc.', 'error');
                return;
            }
            options.startDate = new Date(fromDateInput(startDate));
            options.endDate = new Date(fromDateInput(endDate) + 86400000 - 1);
        }

        setSyncing(true);
        setLogs([]);
        setNewCount(0);
        try {
            const { parsedCount } = await syncEmails(accessToken, options);
            setNewCount(parsedCount);
        } catch (e) {
            if (e instanceof Error && e.message === 'UNAUTHORIZED') {
                await logout();
                toast('Phiên Google đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            }
        } finally {
            setSyncing(false);
        }
    };

    return (
        <>
            <PageHeader title="Đồng bộ" subtitle="Quét giao dịch VPBank từ Gmail" onBack={onBack} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <Card className="lg:self-start">
                    <SegmentedControl
                        options={[{ value: 'auto', label: 'Từ lần trước' }, { value: 'custom', label: 'Chọn ngày' }]}
                        value={mode}
                        onChange={setMode}
                    />
                    {mode === 'auto' ? (
                        <p className="text-sm text-muted mt-3">Quét email mới kể từ lần đồng bộ thành công gần nhất. Phù hợp để cập nhật hằng ngày.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <Field label="Từ ngày">
                                <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </Field>
                            <Field label="Đến ngày">
                                <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </Field>
                        </div>
                    )}
                    <Button size="lg" icon={accessToken ? 'sync' : 'login'} loading={syncing} className="mt-5" onClick={run}>
                        {syncing ? 'Đang đồng bộ…' : accessToken ? 'Bắt đầu đồng bộ' : 'Đăng nhập Google để đồng bộ'}
                    </Button>
                    {newCount > 0 && !syncing && (
                        <Button variant="secondary" size="lg" icon="classify" className="mt-2" onClick={() => onNavigate('classify')}>
                            Phân loại {newCount} giao dịch mới
                        </Button>
                    )}
                </Card>

                <Card padded={false} className="lg:col-span-2 overflow-hidden">
                    <div className="px-4 py-3 border-b text-xs font-semibold text-muted">Nhật ký đồng bộ</div>
                    <div className="h-80 md:h-[28rem] overflow-y-auto overscroll-contain p-4 font-mono text-[13px] leading-relaxed bg-surface-2/50">
                        {logs.length === 0 ? (
                            <p className="h-full flex items-center justify-center text-muted font-sans text-sm">Chưa có hoạt động.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {logs.map((l, i) => (
                                    <div key={i} className={`flex gap-2 ${logTone(l.text)}`}>
                                        <span className="text-muted shrink-0 select-none tabular">
                                            {new Date(l.at).toLocaleTimeString('vi-VN', { hour12: false })}
                                        </span>
                                        <span className="break-words min-w-0">{l.text}</span>
                                    </div>
                                ))}
                                {syncing && <div className="text-muted animate-pulse">Đang xử lý…</div>}
                                <div ref={logEnd} />
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </>
    );
}
