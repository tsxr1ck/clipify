import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { encrypt, decrypt } from '../services/encryption.service.js';

// Validation schemas
export const createApiKeySchema = z.object({
    keyName: z.string().min(1).max(100).default('Default Key'),
    apiKey: z.string().min(10, 'API key is too short'),
    isPrimary: z.boolean().default(false),
});

export const updateApiKeySchema = z.object({
    keyName: z.string().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
});

export const apiKeyController = {
    /**
     * GET /api-keys
     */
    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const apiKeys = await prisma.apiKey.findMany({
                where: { userId: req.user!.userId },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    keyName: true,
                    isActive: true,
                    isPrimary: true,
                    lastValidatedAt: true,
                    validationStatus: true,
                    validationError: true,
                    usageCount: true,
                    lastUsedAt: true,
                    createdAt: true,
                },
            });

            res.json({ apiKeys });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to list API keys';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /api-keys
     */
    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { keyName, apiKey, isPrimary } = req.body;
            const userId = req.user!.userId;

            // Encrypt the API key
            const { encrypted, iv, tag } = encrypt(apiKey);

            // If setting as primary, unset other primaries
            if (isPrimary) {
                await prisma.apiKey.updateMany({
                    where: { userId, isPrimary: true },
                    data: { isPrimary: false },
                });
            }

            const newKey = await prisma.apiKey.create({
                data: {
                    userId,
                    keyName,
                    encryptedKey: encrypted,
                    encryptionIv: iv,
                    encryptionTag: tag,
                    isPrimary,
                    validationStatus: 'pending',
                },
                select: {
                    id: true,
                    keyName: true,
                    isActive: true,
                    isPrimary: true,
                    validationStatus: true,
                    createdAt: true,
                },
            });

            res.status(201).json({ apiKey: newKey });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create API key';
            res.status(500).json({ error: message });
        }
    },

    /**
     * PUT /api-keys/:id
     */
    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { keyName, isActive, isPrimary } = req.body;
            const userId = req.user!.userId;

            // Check ownership
            const existing = await prisma.apiKey.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'API key not found' });
                return;
            }

            // If setting as primary, unset other primaries
            if (isPrimary) {
                await prisma.apiKey.updateMany({
                    where: { userId, isPrimary: true, id: { not: id } },
                    data: { isPrimary: false },
                });
            }

            const updated = await prisma.apiKey.update({
                where: { id },
                data: {
                    ...(keyName !== undefined && { keyName }),
                    ...(isActive !== undefined && { isActive }),
                    ...(isPrimary !== undefined && { isPrimary }),
                },
                select: {
                    id: true,
                    keyName: true,
                    isActive: true,
                    isPrimary: true,
                    validationStatus: true,
                    updatedAt: true,
                },
            });

            res.json({ apiKey: updated });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update API key';
            res.status(500).json({ error: message });
        }
    },

    /**
     * DELETE /api-keys/:id
     */
    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;

            // Check ownership
            const existing = await prisma.apiKey.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'API key not found' });
                return;
            }

            await prisma.apiKey.delete({ where: { id } });
            res.json({ message: 'API key deleted' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete API key';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /api-keys/:id/validate
     * Validates the API key by making a test request to Google AI
     */
    async validate(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;

            // Get API key
            const apiKeyRecord = await prisma.apiKey.findFirst({
                where: { id, userId },
            });

            if (!apiKeyRecord) {
                res.status(404).json({ error: 'API key not found' });
                return;
            }

            // Decrypt the key
            const decryptedKey = decrypt(
                apiKeyRecord.encryptedKey,
                apiKeyRecord.encryptionIv,
                apiKeyRecord.encryptionTag
            );

            // Test the API key (make a simple request to Google AI)
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models?key=${decryptedKey}`
                );

                if (response.ok) {
                    await prisma.apiKey.update({
                        where: { id },
                        data: {
                            validationStatus: 'valid',
                            validationError: null,
                            lastValidatedAt: new Date(),
                        },
                    });
                    res.json({ valid: true, message: 'API key is valid' });
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = (errorData as { error?: { message?: string } }).error?.message || 'Invalid API key';

                    await prisma.apiKey.update({
                        where: { id },
                        data: {
                            validationStatus: 'invalid',
                            validationError: errorMessage,
                            lastValidatedAt: new Date(),
                        },
                    });
                    res.json({ valid: false, message: errorMessage });
                }
            } catch (fetchError) {
                const message = fetchError instanceof Error ? fetchError.message : 'Validation request failed';
                await prisma.apiKey.update({
                    where: { id },
                    data: {
                        validationStatus: 'error',
                        validationError: message,
                        lastValidatedAt: new Date(),
                    },
                });
                res.json({ valid: false, message });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to validate API key';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /api-keys/primary (internal helper)
     * Returns the decrypted primary API key for use in generation
     */
    async getPrimaryKey(userId: string): Promise<string | null> {
        const apiKey = await prisma.apiKey.findFirst({
            where: { userId, isPrimary: true, isActive: true },
        });

        if (!apiKey) return null;

        return decrypt(apiKey.encryptedKey, apiKey.encryptionIv, apiKey.encryptionTag);
    },
};
