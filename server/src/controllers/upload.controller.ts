import { type Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { storageService } from '../services/storage.service.js';

// Validation schemas
const uploadImageSchema = z.object({
    imageBase64: z.string().min(1),
    mimeType: z.string().min(1),
    fileName: z.string().optional(),
});

const uploadGenerationSchema = z.object({
    fileBase64: z.string().min(1),
    mimeType: z.string().min(1),
    fileName: z.string().optional(),
    isVideo: z.boolean().default(false),
});

/**
 * Sanitize filename for Supabase Storage
 * Removes spaces, special characters, and ensures valid extension
 */
function sanitizeFilename(filename: string): string {
    // Remove extension first (we'll add it based on mimeType)
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    // Replace spaces and special chars with underscores, keep alphanumeric and dashes
    return nameWithoutExt
        .replace(/[^a-zA-Z0-9-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 50); // Limit length
}

export const uploadController = {
    /**
     * POST /upload/style-image
     * Upload a style reference image
     */
    async uploadStyleImage(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { imageBase64, mimeType, fileName } = uploadImageSchema.parse(req.body);

            // Convert base64 to buffer
            const buffer = Buffer.from(imageBase64, 'base64');

            // Generate unique path with sanitized filename
            const ext = mimeType.split('/')[1] || 'png';
            const safeName = sanitizeFilename(fileName || 'style');
            const path = `${userId}/${Date.now()}-${safeName}.${ext}`;

            // Upload with thumbnail
            const result = await storageService.uploadWithThumbnail('STYLES', path, buffer, mimeType);

            res.json({
                url: result.url,
                key: result.key,
                thumbnailUrl: result.thumbnailUrl,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Upload failed';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /upload/character-image
     * Upload a character image
     */
    async uploadCharacterImage(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { imageBase64, mimeType, fileName } = uploadImageSchema.parse(req.body);

            // Convert base64 to buffer
            const buffer = Buffer.from(imageBase64, 'base64');

            // Generate unique path with sanitized filename
            const ext = mimeType.split('/')[1] || 'png';
            const safeName = sanitizeFilename(fileName || 'character');
            const path = `${userId}/${Date.now()}-${safeName}.${ext}`;

            // Upload with thumbnail
            const result = await storageService.uploadWithThumbnail('CHARACTERS', path, buffer, mimeType);

            res.json({
                url: result.url,
                key: result.key,
                thumbnailUrl: result.thumbnailUrl,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Upload failed';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /upload/generation
     * Upload a generated image or video
     */
    async uploadGeneration(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { fileBase64, mimeType, fileName, isVideo } = uploadGenerationSchema.parse(req.body);

            // Convert base64 to buffer
            const buffer = Buffer.from(fileBase64, 'base64');

            // Generate unique path with sanitized filename
            const ext = mimeType.split('/')[1] || (isVideo ? 'mp4' : 'png');
            const safeName = sanitizeFilename(fileName || 'generation');
            const path = `${userId}/${Date.now()}-${safeName}.${ext}`;

            // Upload (with or without thumbnail)
            let result;
            if (isVideo) {
                result = await storageService.uploadVideo(path, buffer, mimeType);
            } else {
                result = await storageService.uploadWithThumbnail('GENERATIONS', path, buffer, mimeType);
            }

            res.json({
                url: result.url,
                key: result.key,
                thumbnailUrl: result.thumbnailUrl,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Upload failed';
            res.status(500).json({ error: message });
        }
    },
};
