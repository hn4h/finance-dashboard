import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../AuthContext';
import { useFeedback } from '../components/ui/useFeedback';

/** Google sign-in with Gmail read-only scope; errors surface as a toast. */
export function useGoogleSignIn() {
    const { setToken } = useAuth();
    const { toast } = useFeedback();

    return useGoogleLogin({
        onSuccess: (res) => {
            setToken(res.access_token, res.expires_in);
            toast('Đã đăng nhập Google');
        },
        onError: () => toast('Đăng nhập Google thất bại. Vui lòng thử lại.', 'error'),
        onNonOAuthError: (err) => {
            if (err.type === 'popup_closed') return;
            toast('Không mở được cửa sổ đăng nhập Google.', 'error');
        },
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
    });
}
