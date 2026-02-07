// Shared types between services

export interface AuthUser {
    userId: string;
    email: string;
    role: string;
}

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export type GenerationType = 'image' | 'video' | 'style';
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TransactionType = 'purchase' | 'usage' | 'refund' | 'bonus';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
