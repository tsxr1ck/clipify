import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Token storage keys
const ACCESS_TOKEN_KEY = 'clipify_access_token';
const REFRESH_TOKEN_KEY = 'clipify_refresh_token';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Auth endpoints that should not trigger token refresh
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/verify'];

// Flag to track if we're redirecting to login (to suppress errors)
let isRedirectingToLogin = false;

// Token management
export const tokenStorage = {
    getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
    getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
    setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },
    clearTokens: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// Check if request is to an auth endpoint
const isAuthEndpoint = (url: string | undefined): boolean => {
    if (!url) return false;
    return AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// Redirect to login (centralized)
const redirectToLogin = () => {
    if (isRedirectingToLogin) return;
    isRedirectingToLogin = true;
    tokenStorage.clearTokens();

    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
    }
};

// Request interceptor - attach auth token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Don't make requests if we're redirecting to login
        if (isRedirectingToLogin) {
            return Promise.reject(new axios.Cancel('Redirecting to login'));
        }

        const token = tokenStorage.getAccessToken();
        // Only attach token if we have one and it's not an auth endpoint
        if (token && config.headers && !isAuthEndpoint(config.url)) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        // If we're already redirecting, suppress all errors
        if (isRedirectingToLogin || axios.isCancel(error)) {
            return new Promise(() => { }); // Never resolve, page is reloading
        }

        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Skip token refresh for auth endpoints
        if (isAuthEndpoint(originalRequest?.url)) {
            return Promise.reject(error);
        }

        // If error is not 401 or request has already been retried, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // If we're already refreshing, queue this request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((token) => {
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return apiClient(originalRequest);
                })
                .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = tokenStorage.getRefreshToken();

        if (!refreshToken) {
            isRefreshing = false;
            redirectToLogin();
            return new Promise(() => { }); // Never resolve, page is reloading
        }

        try {
            // Use a fresh axios instance to avoid interceptor loops
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
            });

            // Server returns { token } for just the access token (refresh token stays the same)
            const { token: newAccessToken } = response.data;

            // Only update access token, keep the same refresh token
            tokenStorage.setTokens(newAccessToken, refreshToken);

            processQueue(null, newAccessToken);

            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            return apiClient(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError as Error, null);
            redirectToLogin();
            return new Promise(() => { }); // Never resolve, page is reloading
        } finally {
            isRefreshing = false;
        }
    }
);

export default apiClient;

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
    if (axios.isCancel(error)) {
        return ''; // Suppress cancel errors
    }
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error || error.response?.data?.message || error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
}
