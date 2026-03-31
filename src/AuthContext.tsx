import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
    accessToken: string | null;
    firebaseUser: User | null;
    setToken: (token: string | null, expiresInSeconds?: number) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'google_access_token';
const EXPIRY_KEY = 'google_token_expiry';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(() => {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const expiryTime = localStorage.getItem(EXPIRY_KEY);

        if (storedToken && expiryTime) {
            // Check if token is still valid (give 1 minute buffer)
            if (Date.now() < parseInt(expiryTime, 10) - 60000) {
                return storedToken;
            } else {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(EXPIRY_KEY);
            }
        }
        return null;
    });

    const setToken = async (token: string | null, expiresInSeconds: number = 3599) => {
        setAccessToken(token);
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(EXPIRY_KEY, (Date.now() + expiresInSeconds * 1000).toString());

            try {
                // Sử dụng Access Token của Google để đăng nhập Firebase
                const credential = GoogleAuthProvider.credential(null, token);
                await signInWithCredential(auth, credential);
            } catch (error: any) {
                console.error("Lỗi đăng nhập Firebase:", error);
                // Nếu chưa bật Google Auth trên Firebase Console (auth/configuration-not-found)
                // Hoặc lỗi khác, chuyển sang đăng nhập ẩn danh để vượt qua rules request.auth != null
                try {
                    console.log("Đang thử đăng nhập ẩn danh (Anonymous)...");
                    await signInAnonymously(auth);
                } catch (anonError) {
                    console.error("Lỗi đăng nhập ẩn danh:", anonError);
                }
            }
        } else {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(EXPIRY_KEY);

            try {
                // Đăng xuất khỏi Firebase
                await signOut(auth);
            } catch (error) {
                console.error("Lỗi đăng xuất Firebase:", error);
            }
        }
    };

    // Theo dõi trạng thái đăng nhập của Firebase
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user && accessToken) {
                // Firebase lost session but we have an active Google token. Try to restore it.
                try {
                    const credential = GoogleAuthProvider.credential(null, accessToken);
                    await signInWithCredential(auth, credential);
                } catch (error) {
                    console.error("Không thể phục hồi phiên Firebase từ token:", error);
                    try {
                        console.log("Đang thử kết nối lại ẩn danh (Anonymous)...");
                        await signInAnonymously(auth);
                    } catch (anonError) {
                        console.error("Lỗi đăng nhập ẩn danh khi phục hồi:", anonError);
                        // Invalid token and cannot connect anonymously
                        setToken(null);
                    }
                }
            } else {
                setFirebaseUser(user);
            }
        });
        return () => unsubscribe();
    }, [accessToken]);

    const logout = async () => {
        await setToken(null);
    };

    return (
        <AuthContext.Provider value={{ accessToken, firebaseUser, setToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
