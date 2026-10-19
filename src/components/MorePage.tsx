import type { ReactNode } from 'react';
import { useAuth } from '../AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import type { PageId } from '../lib/router';
import type { ThemePref } from '../lib/theme';
import ThemeSwitch from './ThemeSwitch';
import Icon from './ui/Icon';
import PageHeader from './ui/PageHeader';

interface MorePageProps {
    onNavigate: (page: PageId) => void;
    theme: ThemePref;
    onThemeChange: (pref: ThemePref) => void;
}

/** Settings-style list behind the "Thêm" tab (mobile) */
export default function MorePage({ onNavigate, theme, onThemeChange }: MorePageProps) {
    const { accessToken, logout } = useAuth();
    const signIn = useGoogleSignIn();

    return (
        <>
            <PageHeader title="Thêm" />
            <div className="space-y-6">
                <Group label="Quản lý">
                    <Row icon="finance" label="Tài chính" hint="Thu nhập · Mục tiêu" onClick={() => onNavigate('finance')} />
                    <Row icon="sync" label="Đồng bộ email" hint="Quét giao dịch VPBank từ Gmail" onClick={() => onNavigate('sync')} />
                </Group>

                <Group label="Giao diện">
                    <div className="p-3"><ThemeSwitch value={theme} onChange={onThemeChange} /></div>
                </Group>

                <Group label="Tài khoản">
                    {accessToken ? (
                        <Row icon="logout" label="Đăng xuất" danger onClick={logout} />
                    ) : (
                        <Row icon="login" label="Đăng nhập Google" hint="Cần để đồng bộ email" onClick={() => signIn()} />
                    )}
                </Group>
            </div>
        </>
    );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
    return (
        <section>
            <h2 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</h2>
            <div className="bg-surface rounded-2xl shadow-card divide-y overflow-hidden">{children}</div>
        </section>
    );
}

function Row({ icon, label, hint, danger, onClick }: { icon: string; label: string; hint?: string; danger?: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-surface-2 hover:bg-surface-2/60">
            <span className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-expense/10 text-expense' : 'bg-primary/10 text-primary'}`}>
                <Icon name={icon} />
            </span>
            <span className="flex-1 min-w-0">
                <span className={`block font-semibold ${danger ? 'text-expense' : ''}`}>{label}</span>
                {hint && <span className="block text-sm text-muted truncate">{hint}</span>}
            </span>
            {!danger && <Icon name="chevron_right" className="text-muted shrink-0" />}
        </button>
    );
}
