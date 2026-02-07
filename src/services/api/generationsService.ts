import apiClient, { getErrorMessage } from './client';

// Types
export type GenerationType = 'image' | 'video' | 'style';
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SceneConfig {
    escena: string;
    accion: string;
    dialogo: string;
    movimiento?: string;
    duration: number;
}

export interface Generation {
    id: string;
    title: string;
    description?: string;
    generationType: GenerationType;
    status: GenerationStatus;
    prompt: string;
    sceneConfig?: SceneConfig;
    generationParams?: Record<string, unknown>;
    outputUrl?: string;
    thumbnailUrl?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
    aspectRatio?: string;
    isFavorite: boolean;
    costMxn?: number;
    tags: string[];
    folder?: string;
    errorMessage?: string;
    createdAt: string;
    completedAt?: string;
    character?: {
        id: string;
        name: string;
        imageUrl?: string;
    };
    style?: {
        id: string;
        name: string;
    };
}

export interface GenerationListParams {
    page?: number;
    limit?: number;
    type?: GenerationType;
    status?: GenerationStatus;
    characterId?: string;
    favorites?: boolean;
}

export interface GenerationListResponse {
    generations: Generation[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateGenerationData {
    characterId?: string;
    styleId?: string;
    title: string;
    description?: string;
    generationType: GenerationType;
    prompt: string;
    sceneConfig?: SceneConfig;
    generationParams?: Record<string, unknown>;
    folder?: string;
    tags?: string[];
}

export interface CompleteGenerationData {
    outputUrl: string;
    outputKey: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    mimeType: string;
    fileSizeBytes?: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
    apiModel?: string;
    tokensUsed?: number;
    promptTokens?: number;
    completionTokens?: number;
    costUsd?: number;
    costMxn?: number;
    generationTimeSeconds?: number;
    apiLatencyMs?: number;
}

export interface UpdateGenerationData {
    title?: string;
    description?: string;
    isFavorite?: boolean;
    tags?: string[];
    folder?: string;
}

// Generations Service
export const generationsService = {
    /**
     * List generations with pagination
     */
    async list(params: GenerationListParams = {}): Promise<GenerationListResponse> {
        try {
            const response = await apiClient.get('/generations', { params });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get a single generation by ID
     */
    async get(id: string): Promise<Generation> {
        try {
            const response = await apiClient.get(`/generations/${id}`);
            return response.data.generation;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Create a new generation (starts in 'pending' status)
     */
    async create(data: CreateGenerationData): Promise<Generation> {
        try {
            const response = await apiClient.post('/generations', data);
            return response.data.generation;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Update a generation
     */
    async update(id: string, data: UpdateGenerationData): Promise<Generation> {
        try {
            const response = await apiClient.put(`/generations/${id}`, data);
            return response.data.generation;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Mark generation as complete with output data
     */
    async complete(id: string, data: CompleteGenerationData): Promise<Generation> {
        try {
            const response = await apiClient.post(`/generations/${id}/complete`, data);
            return response.data.generation;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Mark generation as failed
     */
    async fail(id: string, errorMessage: string): Promise<Generation> {
        try {
            const response = await apiClient.post(`/generations/${id}/fail`, { errorMessage });
            return response.data.generation;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Delete a generation
     */
    async delete(id: string): Promise<void> {
        try {
            await apiClient.delete(`/generations/${id}`);
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },
};

export default generationsService;
