import type { ReactNode } from 'react';
import { where } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import type { Transaction } from '../db';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import type { PageId } from '../lib/router';
import type { ThemePref } from '../lib/theme';
import Icon from './ui/Icon';
import ThemeSwitch from './ThemeSwitch';

interface LayoutProps {
    currentPage: PageId;
    onNavigate: (page: PageId) => void;
    theme: ThemePref;
    onThemeChange: (pref: ThemePref) => void;
    children: ReactNode;
}

interface NavItem { id: PageId; icon: string; label: string }

const SIDEBAR_ITEMS: NavItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: 'Tổng quan' },
    { id: 'classify', icon: 'classify', label: 'Phân loại' },
    { id: 'history', icon: 'history', label: 'Lịch sử' },
    { id: 'analytics', icon: 'analytics', label: 'Phân tích' },
    { id: 'finance', icon: 'finance', label: 'Tài chính' },
    { id: 'sync', icon: 'sync', label: 'Đồng bộ' },
];

const TAB_ITEMS: NavItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: 'Tổng quan' },
    { id: 'classify', icon: 'classify', label: 'Phân loại' },
    { id: 'history', icon: 'history', label: 'Lịch sử' },
    { id: 'analytics', icon: 'analytics', label: 'Phân tích' },
    { id: 'more', icon: 'more', label: 'Thêm' },
];

/** Pages reached from the "Thêm" tab keep that tab highlighted */
const TAB_FOR_PAGE: Partial<Record<PageId, PageId>> = { finance: 'more', sync: 'more' };

export default function Layout({ currentPage, onNavigate, theme, onThemeChange, children }: LayoutProps) {
    const { accessToken, logout } = useAuth();
    const signIn = useGoogleSignIn();
    const { data: unclassified } = useFirestoreQuery<Transaction>('transactions', [where('status', '==', 'unclassified')]);
    const pendingCount = unclassified?.length ?? 0;
    const activeTab = TAB_FOR_PAGE[currentPage] ?? currentPage;

    return (
        <div className="min-h-dvh md:flex">
            {/* ── Sidebar (≥md) ── */}
            <aside className="hidden md:flex flex-col w-64 shrink-0 h-dvh sticky top-0 p-4 gap-1 bg-surface border-r">
                <div className="flex items-center gap-3 px-3 py-4 mb-2">
                    <span className="size-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                        <Icon name="wallet" />
                    </span>
                    <span className="text-lg font-extrabold tracking-tight">Hnah Finance</span>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {SIDEBAR_ITEMS.map(item => {
                        const active = currentPage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                aria-current={active ? 'page' : undefined}
                                className={`flex items-center gap-3 w-full h-11 px-3 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-2 hover:text-fg'}`}
                            >
                                <Icon name={item.icon} />
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.id === 'classify' && pendingCount > 0 && <Badge count={pendingCount} />}
                            </button>
                        );
                    })}
                </nav>

                <div className="pt-4 mt-2 border-t space-y-3">
                    <ThemeSwitch value={theme} onChange={onThemeChange} />
                    {accessToken ? (
                        <button onClick={logout} className="flex items-center gap-3 w-full h-11 px-3 rounded-xl text-sm font-semibold text-expense hover:bg-expense/10">
                            <Icon name="logout" /> Đăng xuất
                        </button>
                    ) : (
                        <button onClick={() => signIn()} className="flex items-center gap-3 w-full h-11 px-3 rounded-xl text-sm font-semibold bg-surface-2 hover:bg-border">
                            <Icon name="login" /> Đăng nhập Google
                        </button>
                    )}
                </div>
            </aside>

            {/* ── Content ── */}
            <main className="flex-1 min-w-0 px-4 md:px-10 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+1.5rem)] md:pb-10">
                <div className="max-w-5xl mx-auto">{children}</div>
            </main>

            {/* ── Tab bar (<md) ── */}
            <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-surface/90 backdrop-blur-xl border-t pb-[var(--safe-bottom)]">
                <div className="flex h-[var(--tabbar-h)]">
                    {TAB_ITEMS.map(item => {
                        const active = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                aria-current={active ? 'page' : undefined}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 transition-colors ${active ? 'text-primary' : 'text-muted'}`}
                            >
                                <span className={`relative flex items-center justify-center h-7 w-14 rounded-full transition-colors ${active ? 'bg-primary/12' : ''}`}>
                                    <Icon name={item.icon} size={22} strokeWidth={active ? 2.4 : 2} />
                                    {item.id === 'classify' && pendingCount > 0 && (
                                        <span className="absolute -top-1 right-1.5"><Badge count={pendingCount} /></span>
                                    )}
                                </span>
                                <span className="text-[11px] font-semibold truncate max-w-full">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

function Badge({ count }: { count: number }) {
    return (
        <span className="min-w-5 h-5 px-1.5 rounded-full bg-expense text-white text-[11px] font-bold leading-5 text-center tabular">
            {count > 99 ? '99+' : count}
        </span>
    );
}
