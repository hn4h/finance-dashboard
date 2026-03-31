import { useAuth } from '../AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect } from 'react';

export type PageId = 'dashboard' | 'classify' | 'history' | 'analytics' | 'finance' | 'sync';

interface LayoutProps {
    currentPage: PageId;
    onNavigate: (page: PageId) => void;
    children: React.ReactNode;
}

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
    const { accessToken, logout, setToken } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') ||
                localStorage.getItem('theme') === 'dark';
        }
        return false;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const loginAction = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            setToken(tokenResponse.access_token);
        },
        onError: () => {
            console.error('Login Failed');
            alert('Đăng nhập Google thất bại. Vui lòng thử lại.');
        },
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
    });

    const navItems: { id: PageId; icon: string; label: string }[] = [
        { id: 'dashboard', icon: 'dashboard', label: 'Tổng quan' },
        { id: 'classify', icon: 'category', label: 'Phân loại' },
        { id: 'history', icon: 'history', label: 'Lịch sử' },
        { id: 'analytics', icon: 'analytics', label: 'Phân tích' },
        { id: 'finance', icon: 'savings', label: 'Tài chính' },
        { id: 'sync', icon: 'sync', label: 'Đồng bộ' },
    ];

    return (
        <div className="bg-background dark:bg-[#0f111c] text-on-background dark:text-slate-200 min-h-screen flex transition-colors duration-300">
            {/* Sidebar */}
            <aside className="hidden md:flex flex-col w-64 h-screen p-6 gap-y-4 bg-white dark:bg-[#0A0D14] sticky top-0 border-r border-slate-200 dark:border-white/5 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-colors duration-300">
                <div className="flex items-center gap-3 mb-8 px-4 cursor-pointer group">
                    <span className="material-symbols-outlined text-primary dark:text-blue-400 text-3xl font-bold bg-primary/5 dark:bg-blue-500/10 p-2 rounded-xl group-hover:scale-105 transition-transform">account_balance_wallet</span>
                    <h1 className="text-xl font-extrabold text-[#0040a1] dark:text-white font-['Inter'] tracking-tight">Hnah Finance</h1>
                </div>

                {accessToken && (
                    <button
                        onClick={() => onNavigate('sync')}
                        className={`bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] duration-200 shadow-[0_4px_20px_rgba(0,64,161,0.15)] hover:shadow-[0_8px_25px_rgba(0,64,161,0.25)] w-full mb-6 ${currentPage === 'sync' ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-[#0A0D14]' : ''
                            }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">sync</span>
                        Đồng bộ dữ liệu
                    </button>
                )}

                <nav className="flex-1 space-y-1.5 overflow-y-auto px-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-['Inter'] text-sm font-bold transition-all w-full text-left cursor-pointer group ${currentPage === item.id
                                ? 'bg-primary/5 dark:bg-blue-500/10 text-primary dark:text-blue-400'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 font-semibold'
                                }`}
                        >
                            <span className={`material-symbols-outlined transition-all ${currentPage === item.id ? 'fill-1' : 'group-hover:translate-x-0.5'}`}>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 space-y-2 border-t border-slate-100 dark:border-white/5">
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl font-['Inter'] text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200 transition-all w-full text-left cursor-pointer group"
                    >
                        <span className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-12">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                        <span>{isDarkMode ? 'Giao diện Sáng' : 'Giao diện Tối'}</span>
                    </button>

                    {accessToken ? (
                        <>
                            <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-colors cursor-pointer">
                                <div className="h-10 w-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                    <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfrDG_qkuIR53WW_r6OW1SLFRVRmQEn3OJDaeoBBps0eMM4YkqIG066g2pvA6Ebb-Kez-1N2Lgb86d-gi4gqbW7G8weKlr1uD5XP1EwcrSkpGQANaNgboHmfTGgdxVAhsiR59y-Zw3Bk3wE62qXnRjCl7Zq6LSTUbDaj3MqgivRfn5XKNY0Tc-wATIbG9ET31NahJBQAoiddSK_apNrdsjqiiyl68OwiBoWOtedYWB8ty64uQ_YJR_f4Rd3ewlQ_ZEzwaYhJIgTAR0" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tài khoản</div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">Hnah Admin</div>
                                </div>
                            </div>
                            <button onClick={logout} className="flex items-center gap-3 px-4 py-2.5 text-error dark:text-red-400 hover:bg-error/5 dark:hover:bg-red-500/10 rounded-xl text-sm font-bold w-full text-left transition-all hover:pl-5 group">
                                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-0.5">logout</span> Đăng xuất
                            </button>
                        </>
                    ) : (
                        <button onClick={() => loginAction()} className="flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 shadow-sm rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-all w-full group">
                            <svg className="transition-transform group-hover:scale-110" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 40.009 -11.514 38.989 -14.754 38.989 C -19.444 38.989 -23.494 41.689 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                </g>
                            </svg>
                            <span>Đăng nhập qua Google</span>
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {children}
            </main>

            {/* Mobile Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex justify-between items-center z-[60]">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`flex flex-col items-center gap-1 transition-all ${currentPage === item.id ? 'text-primary' : 'text-slate-400'}`}
                    >
                        <span className="material-symbols-outlined transition-transform group-active:scale-90">{item.icon}</span>
                        <span className="text-[10px] font-extrabold">{item.label}</span>
                    </button>
                ))}
                {accessToken ? (
                    <button className="flex flex-col items-center gap-1 text-slate-400" onClick={logout}>
                        <span className="material-symbols-outlined">logout</span>
                        <span className="text-[10px] font-extrabold">Thoát</span>
                    </button>
                ) : (
                    <button className="flex flex-col items-center gap-1 text-slate-400" onClick={() => loginAction()}>
                        <span className="material-symbols-outlined">login</span>
                        <span className="text-[10px] font-extrabold">Đăng nhập</span>
                    </button>
                )}
            </nav>
        </div>
    );
}
