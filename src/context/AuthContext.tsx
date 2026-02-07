import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { authService, type User } from '../services/api';
import { tokenStorage } from '../services/api/client';

// Auth state interface
interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// Auth context interface
interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<{ message: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}

// Initial state
const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>(initialState);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            const hasToken = tokenStorage.getAccessToken();

            if (!hasToken) {
                setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null,
                });
                return;
            }

            try {
                const user = await authService.me();
                setState({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
            } catch {
                // Token invalid or expired
                tokenStorage.clearTokens();
                setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null,
                });
            }
        };

        checkAuth();
    }, []);

    // Login
    const login = useCallback(async (email: string, password: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const { user } = await authService.login(email, password);
            setState({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Login failed',
            }));
            throw error;
        }
    }, []);

    // Register
    const register = useCallback(async (email: string, password: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await authService.register(email, password);
            setState(prev => ({ ...prev, isLoading: false }));
            return result;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Registration failed',
            }));
            throw error;
        }
    }, []);

    // Logout
    const logout = useCallback(async () => {
        await authService.logout();
        setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        });
    }, []);

    // Refresh user data
    const refreshUser = useCallback(async () => {
        try {
            const user = await authService.me();
            setState(prev => ({ ...prev, user }));
        } catch {
            // Ignore refresh errors
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const value: AuthContextType = {
        ...state,
        login,
        register,
        logout,
        refreshUser,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Hook for checking if user has specific role
export function useHasRole(role: string): boolean {
    const { user } = useAuth();
    return user?.role === role;
}
