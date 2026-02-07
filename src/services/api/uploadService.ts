import apiClient, { getErrorMessage } from './client';

// Types
export interface UploadResult {
    url: string;
    key: string;
    thumbnailUrl?: string;
}

// Upload Service
export const uploadService = {
    /**
     * Upload a style reference image
     */
    async uploadStyleImage(imageBase64: string, mimeType: string, fileName?: string): Promise<UploadResult> {
        try {
            const response = await apiClient.post('/upload/style-image', {
                imageBase64,
                mimeType,
                fileName,
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Upload a character image
     */
    async uploadCharacterImage(imageBase64: string, mimeType: string, fileName?: string): Promise<UploadResult> {
        try {
            const response = await apiClient.post('/upload/character-image', {
                imageBase64,
                mimeType,
                fileName,
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Upload a generated image or video
     */
    async uploadGeneration(fileBase64: string, mimeType: string, isVideo: boolean = false, fileName?: string): Promise<UploadResult> {
        try {
            const response = await apiClient.post('/upload/generation', {
                fileBase64,
                mimeType,
                isVideo,
                fileName,
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },
};

export default uploadService;
