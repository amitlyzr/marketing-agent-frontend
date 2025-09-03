"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { accountApi } from '@/lib/api';

export interface TokenData {
    _id: string;
    api_key: string;
    user_id: string;
    organization_id: string;
    usage_id: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    userId: string | null;
    token: string | null;
    email: string | null;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);

    const clearAuthData = () => {
        Cookies.remove('user_id');
        Cookies.remove('token');
        setIsAuthenticated(false);
        setUserId(null);
        setToken(null);
        setEmail(null);
    };

    const setAuthData = async (userData: TokenData) => {
        // try {
        //     // Always try to create account - backend will handle if it already exists
        //     console.log('Checking/Creating account for user:', userData.user_id);
        //     await accountApi.createAccount(userData.user_id, userData.api_key);
        //     console.log('Account check/creation completed');
        // } catch (error) {
        //     console.error('Error handling account creation:', error);
        //     // Continue with auth setup even if account creation fails
        // }

        Cookies.set('user_id', userData.user_id, { expires: 7 }); // 7 days
        Cookies.set('token', userData.api_key, { expires: 7 });
        setIsAuthenticated(true);
        setUserId(userData.user_id);
        setToken(userData.api_key);
    };

    const checkAuth = async () => {
        if (typeof window === 'undefined') {
            setIsLoading(false);
            return;
        }

        try {
            const { default: lyzr } = await import('lyzr-agent');
            const tokenData = await lyzr.getKeys() as unknown as TokenData[];

            if (tokenData && tokenData[0]) {
                try {
                    const userKeys = await lyzr.getKeysUser();
                    const email = userKeys?.data?.user?.email;

                    // Always try to create account - backend will handle if it already exists
                    try {
                        console.log('Checking/Creating account for user:', tokenData[0].user_id);
                        await accountApi.createAccount(tokenData[0].user_id, tokenData[0].api_key);
                        console.log('Account check/creation completed');
                    } catch (error) {
                        console.error('Error handling account creation:', error);
                        // Continue with auth setup even if account creation fails
                    }

                    Cookies.set('user_id', tokenData[0].user_id);
                    Cookies.set('token', tokenData[0].api_key);
                    setIsAuthenticated(true);
                    setUserId(tokenData[0].user_id);
                    setToken(tokenData[0].api_key);
                    setEmail(email);
                } catch (error) {
                    console.error('Error fetching user keys:', error);
                    await setAuthData(tokenData[0]);
                }
            } else {
                clearAuthData();
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            clearAuthData();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            if (typeof window === 'undefined') return;

            try {
                const { default: lyzr } = await import('lyzr-agent');
                await lyzr.init('pk_c14a2728e715d9ea67bf');

                // Subscribe to auth state changes
                // const unsubscribe = lyzr.onAuthStateChange((isAuthenticated: boolean) => {
                //     if (isAuthenticated) {
                //         checkAuth();
                //     } else {
                //         clearAuthData();
                //         setIsLoading(false);
                //     }
                // });

                // Initial auth check
                await checkAuth();

                // return () => unsubscribe();
            } catch (err) {
                console.error('Lyzr init failed:', err);
                clearAuthData();
                setIsLoading(false);
            }
        };

        init();
    }, []);

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            isLoading,
            userId,
            token,
            checkAuth,
            email
        }}>
            {children}
        </AuthContext.Provider>
    );
}