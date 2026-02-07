import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { storageService } from '../services/storage.service.js';

export const uploadController = {
    /**
     * POST /upload/style-image
     * Upload a style reference image
     */
    async uploadStyleImage(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { imageBase64, mimeType, fileName } = req.body;

            if (!imageBase64 || !mimeType) {
                res.status(400).json({ error: 'imageBase64 and mimeType are required' });
                return;
            }

            // Convert base64 to buffer
            const buffer = Buffer.from(imageBase64, 'base64');

            // Generate unique path
            const ext = mimeType.split('/')[1] || 'png';
            const path = `${userId}/${Date.now()}-${fileName || 'style'}.${ext}`;

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
            const { imageBase64, mimeType, fileName } = req.body;

            if (!imageBase64 || !mimeType) {
                res.status(400).json({ error: 'imageBase64 and mimeType are required' });
                return;
            }

            // Convert base64 to buffer
            const buffer = Buffer.from(imageBase64, 'base64');

            // Generate unique path
            const ext = mimeType.split('/')[1] || 'png';
            const path = `${userId}/${Date.now()}-${fileName || 'character'}.${ext}`;

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
            const { fileBase64, mimeType, fileName, isVideo } = req.body;

            if (!fileBase64 || !mimeType) {
                res.status(400).json({ error: 'fileBase64 and mimeType are required' });
                return;
            }

            // Convert base64 to buffer
            const buffer = Buffer.from(fileBase64, 'base64');

            // Generate unique path
            const ext = mimeType.split('/')[1] || (isVideo ? 'mp4' : 'png');
            const path = `${userId}/${Date.now()}-${fileName || 'generation'}.${ext}`;

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
