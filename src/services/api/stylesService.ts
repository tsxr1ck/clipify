import apiClient, { getErrorMessage } from './client';
import type { ParsedStyle } from '../../types';

// Types
export interface Style {
    id: string;
    name: string;
    description?: string;
    styleAnalysis?: string;
    parsedStyle: ParsedStyle;
    keywords: string[];
    referenceImageUrl: string;
    referenceImageKey: string;
    referenceImageThumbUrl?: string;
    userPrompt?: string;
    isPublic: boolean;
    useCount: number;
    characterCount: number;
    createdAt: string;
    characters?: Array<{
        id: string;
        name: string;
        thumbnailUrl?: string;
    }>;
}

export interface StyleListParams {
    page?: number;
    limit?: number;
    search?: string;
}

export interface StyleListResponse {
    styles: Style[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateStyleData {
    name: string;
    description?: string;
    styleAnalysis?: string;
    parsedStyle: ParsedStyle;
    keywords: string[];
    referenceImageUrl: string;
    referenceImageKey: string;
    referenceImageThumbUrl?: string;
    userPrompt?: string;
    isPublic?: boolean;
}

export interface UpdateStyleData {
    name?: string;
    description?: string;
    isPublic?: boolean;
}

// Styles Service
export const stylesService = {
    /**
     * List styles with pagination
     */
    async list(params: StyleListParams = {}): Promise<StyleListResponse> {
        try {
            const response = await apiClient.get('/styles', { params });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get a single style by ID
     */
    async get(id: string): Promise<Style> {
        try {
            const response = await apiClient.get(`/styles/${id}`);
            return response.data.style;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Create a new style
     */
    async create(data: CreateStyleData): Promise<Style> {
        try {
            const response = await apiClient.post('/styles', data);
            return response.data.style;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Update a style
     */
    async update(id: string, data: UpdateStyleData): Promise<Style> {
        try {
            const response = await apiClient.put(`/styles/${id}`, data);
            return response.data.style;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Delete a style
     */
    async delete(id: string): Promise<void> {
        try {
            await apiClient.delete(`/styles/${id}`);
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },
};

export default stylesService;
