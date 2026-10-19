import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useFeedback } from '../components/ui/useFeedback';
import { syncEmails } from '../services/gmailService';
import { useGoogleSignIn } from './useGoogleSignIn';

/** One-tap incremental sync (since last sync) with toast feedback. */
export function useQuickSync() {
    const { accessToken, logout } = useAuth();
    const signIn = useGoogleSignIn();
    const { toast } = useFeedback();
    const [syncing, setSyncing] = useState(false);

    const run = async () => {
        if (!accessToken) {
            signIn();
            return;
        }
        setSyncing(true);
        try {
            const { parsedCount } = await syncEmails(accessToken);
            toast(parsedCount > 0 ? `Đã thêm ${parsedCount} giao dịch mới` : 'Không có giao dịch mới', parsedCount > 0 ? 'success' : 'info');
        } catch (e) {
            if (e instanceof Error && e.message === 'UNAUTHORIZED') {
                await logout();
                toast('Phiên Google đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            } else {
                toast('Đồng bộ thất bại. Thử lại trong trang Đồng bộ để xem chi tiết.', 'error');
            }
        } finally {
            setSyncing(false);
        }
    };

    return { run, syncing, signedIn: !!accessToken };
}
