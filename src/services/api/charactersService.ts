import apiClient, { getErrorMessage } from './client';
import type { AspectRatio } from '../../types';

// Types
export interface Character {
    id: string;
    name: string;
    description?: string;
    prompt: string;
    combinedPrompt?: string;
    imageUrl: string;
    imageKey: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    aspectRatio: AspectRatio;
    styleId: string;
    styleName?: string;
    generationCount: number;
    isFavorite: boolean;
    createdAt: string;
    style?: {
        id: string;
        name: string;
    };
}

export interface CharacterListParams {
    page?: number;
    limit?: number;
    styleId?: string;
    search?: string;
    favorites?: boolean;
}

export interface CharacterListResponse {
    characters: Character[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateCharacterData {
    name: string;
    description?: string;
    prompt: string;
    combinedPrompt?: string;
    imageUrl: string;
    imageKey: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    aspectRatio: AspectRatio;
    styleId: string;
}

export interface UpdateCharacterData {
    name?: string;
    description?: string;
    isFavorite?: boolean;
}

// Characters Service
export const charactersService = {
    /**
     * List characters with pagination
     */
    async list(params: CharacterListParams = {}): Promise<CharacterListResponse> {
        try {
            const response = await apiClient.get('/characters', { params });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get a single character by ID
     */
    async get(id: string): Promise<Character> {
        try {
            const response = await apiClient.get(`/characters/${id}`);
            return response.data.character;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Create a new character
     */
    async create(data: CreateCharacterData): Promise<Character> {
        try {
            const response = await apiClient.post('/characters', data);
            return response.data.character;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Update a character
     */
    async update(id: string, data: UpdateCharacterData): Promise<Character> {
        try {
            const response = await apiClient.put(`/characters/${id}`, data);
            return response.data.character;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Delete a character
     */
    async delete(id: string): Promise<void> {
        try {
            await apiClient.delete(`/characters/${id}`);
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },
};

export default charactersService;
