import apiClient, { tokenStorage, getErrorMessage } from './client';

// Types
export interface User {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
    profile: {
        displayName?: string;
        avatarUrl?: string;
    } | null;
    credits: {
        balance: number;
        currency: string;
    } | null;
    createdAt: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface RegisterResponse {
    message: string;
    userId: string;
}

// Auth Service
export const authService = {
    /**
     * Register a new user
     */
    async register(email: string, password: string): Promise<RegisterResponse> {
        try {
            const response = await apiClient.post('/auth/register', { email, password });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<AuthResponse> {
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            const { accessToken, refreshToken, user } = response.data;

            // Ensure credits balance is a number
            if (user.credits) {
                user.credits.balance = Number(user.credits.balance);
            }

            tokenStorage.setTokens(accessToken, refreshToken);
            return { accessToken, refreshToken, user };
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Logout current user
     */
    async logout(): Promise<void> {
        try {
            await apiClient.post('/auth/logout');
        } catch {
            // Ignore logout errors
        } finally {
            tokenStorage.clearTokens();
        }
    },

    /**
     * Get current user info
     */
    async me(): Promise<User> {
        try {
            const response = await apiClient.get('/auth/me');
            const user = response.data;

            // Ensure credits balance is a number
            if (user.credits) {
                user.credits.balance = Number(user.credits.balance);
            }

            return user;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<{ message: string }> {
        try {
            const response = await apiClient.post('/auth/verify-email', { token });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Request password reset
     */
    async forgotPassword(email: string): Promise<{ message: string }> {
        try {
            const response = await apiClient.post('/auth/forgot-password', { email });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Reset password with token
     */
    async resetPassword(token: string, password: string): Promise<{ message: string }> {
        try {
            const response = await apiClient.post('/auth/reset-password', { token, password });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Check if user is authenticated (has valid tokens)
     */
    isAuthenticated(): boolean {
        return !!tokenStorage.getAccessToken();
    },
};

export default authService;
