import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { syncEmails } from '../services/gmailService';

export default function SyncPage() {
    const { accessToken, firebaseUser } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Default to last 7 days for the date pickers
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [syncMode, setSyncMode] = useState<'auto' | 'custom'>('auto');

    const handleSync = async () => {
        if (!accessToken) {
            alert('Vui lòng đăng nhập trước khi đồng bộ.');
            return;
        }

        if (!firebaseUser) {
            alert('Đang kết nối lại với Firebase hoặc phiên đăng nhập đã hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại Google.');
            return;
        }

        setSyncing(true);
        setLogs([]); // clear previous logs

        try {
            const options: any = {
                onProgress: (msg: string) => {
                    setLogs(prev => [...prev, msg]);
                }
            };

            if (syncMode === 'custom') {
                if (!startDate || !endDate) {
                    alert('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.');
                    setSyncing(false);
                    return;
                }
                options.startDate = new Date(startDate);
                // Set endDate to end of the day to include all transactions on that day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                options.endDate = end;
            }

            await syncEmails(accessToken, options);

            // Wait a moment before allowing re-sync
            setTimeout(() => {
                setSyncing(false);
            }, 1000);
        } catch (e) {
            console.error(e);
            setLogs(prev => [...prev, `🚨 Lỗi kỹ thuật: ${e instanceof Error ? e.message : 'Unknown error'}`]);
            setSyncing(false);
        }
    };

    return (
        <div className="p-6 md:p-10 min-w-0 max-w-[1000px] mx-auto pb-24 md:pb-10">
            <section className="mb-8">
                <h2 className="text-[32px] font-black tracking-tight text-on-background mb-2">Đồng bộ dữ liệu</h2>
                <p className="text-outline font-medium">Cập nhật giao dịch ngân hàng từ hộp thư Email của bạn.</p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-surface-container-highest/50">
                        <h3 className="text-lg font-bold mb-4">Tùy chọn đồng bộ</h3>

                        <div className="space-y-4">
                            {/* Mode Selection */}
                            <div className="flex bg-surface-container-high rounded-xl p-1 gap-1">
                                <button
                                    onClick={() => setSyncMode('auto')}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${syncMode === 'auto' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Thông minh
                                </button>
                                <button
                                    onClick={() => setSyncMode('custom')}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${syncMode === 'custom' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Tùy chọn ngày
                                </button>
                            </div>

                            {/* Custom Date Pickers */}
                            {syncMode === 'custom' && (
                                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Từ ngày</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-surface-container-high text-on-surface px-4 py-2.5 rounded-xl border border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Đến ngày</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-surface-container-high text-on-surface px-4 py-2.5 rounded-xl border border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <p className="text-xs text-outline font-medium italic">
                                        Lưu ý: Bạn chỉ quét được email nếu cấu hình Gmail API hỗ trợ quét lượng lớn dữ liệu trong ngày.
                                    </p>
                                </div>
                            )}

                            {syncMode === 'auto' && (
                                <div className="pt-2">
                                    <p className="text-sm font-medium text-slate-600 bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                        Hệ thống sẽ tự động quét email từ thời điểm đồng bộ thành công gần nhất. Phù hợp cho việc cập nhật hàng ngày.
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSync}
                            disabled={syncing || !accessToken}
                            className={`w-full mt-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${syncing || !accessToken
                                ? 'bg-surface-container-high text-slate-400 cursor-not-allowed'
                                : 'bg-primary hover:bg-primary-container text-on-primary shadow-lg shadow-primary/20 hover:-translate-y-0.5'
                                }`}
                        >
                            <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`}>
                                sync
                            </span>
                            {syncing ? 'Đang xử lý...' : 'Bắt đầu đồng bộ'}
                        </button>

                        {!accessToken && (
                            <p className="text-error text-xs font-medium text-center mt-3">
                                Tính năng này yêu cầu đăng nhập.
                            </p>
                        )}
                    </div>
                </div>

                {/* Console / Log Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-[#1e1e1e] rounded-3xl overflow-hidden shadow-xl border border-slate-800 flex flex-col h-[500px]">
                        <div className="bg-[#2d2d2d] px-4 py-3 flex items-center justify-between border-b border-black/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-400 text-sm">terminal</span>
                                <span className="text-xs font-mono text-slate-300 font-medium">sync_process.log</span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-error"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                            </div>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 font-mono text-sm">
                            {logs.length === 0 ? (
                                <div className="text-slate-500 flex flex-col items-center justify-center h-full opacity-50">
                                    <span className="material-symbols-outlined text-4xl mb-4">history</span>
                                    <p>Hệ thống sẵn sàng đón nhận lệnh...</p>
                                </div>
                            ) : (
                                <div className="space-y-2 pb-6">
                                    {logs.map((log, i) => (
                                        <div key={i} className={`flex gap-3 leading-relaxed animate-in fade-in slide-in-from-bottom-1 ${log.includes('🚨') || log.includes('❌') ? 'text-red-400' :
                                            log.includes('✅') || log.includes('🎉') ? 'text-green-400' :
                                                log.includes('⏭') ? 'text-slate-500' :
                                                    'text-slate-300'
                                            }`}>
                                            <span className="text-slate-600 select-none shrink-0">
                                                [{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                                            </span>
                                            <span className="break-all">{log}</span>
                                        </div>
                                    ))}
                                    {syncing && (
                                        <div className="flex gap-3 leading-relaxed text-slate-400 animate-pulse">
                                            <span className="text-slate-600 select-none shrink-0">
                                                [{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                                            </span>
                                            <span>Đang tải thêm dữ liệu<span className="animate-[ping_1.5s_infinite]">...</span></span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
