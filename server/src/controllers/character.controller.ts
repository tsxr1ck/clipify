import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';

// Validation schemas
export const createCharacterSchema = z.object({
    styleId: z.string().uuid(),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    prompt: z.string().min(1),
    combinedPrompt: z.string().min(1),
    imageUrl: z.string().url(),
    imageKey: z.string(),
    thumbnailUrl: z.string().url().optional(),
    aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    generationParams: z.record(z.unknown()).default({}),
    tags: z.array(z.string()).default([]),
});

export const updateCharacterSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    isFavorite: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
});

export const listCharactersSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    styleId: z.string().uuid().optional(),
    favorites: z.coerce.boolean().optional(),
});

export const characterController = {
    /**
     * GET /characters
     */
    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { page: pageStr, limit: limitStr, styleId, favorites: favoritesStr } = req.query as {
                page?: string; limit?: string; styleId?: string; favorites?: string
            };
            const userId = req.user!.userId;

            // Parse query params
            const page = parseInt(pageStr || '1', 10) || 1;
            const limit = parseInt(limitStr || '20', 10) || 20;
            const favorites = favoritesStr === 'true';
            const skip = (page - 1) * limit;

            const where = {
                userId,
                ...(styleId && { styleId }),
                ...(favorites && { isFavorite: true }),
            };

            const [characters, total] = await Promise.all([
                prisma.character.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        imageUrl: true,
                        thumbnailUrl: true,
                        aspectRatio: true,
                        isFavorite: true,
                        useCount: true,
                        generationCount: true,
                        tags: true,
                        createdAt: true,
                        style: {
                            select: { id: true, name: true },
                        },
                    },
                }),
                prisma.character.count({ where }),
            ]);

            res.json({
                characters,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to list characters';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /characters/:id
     */
    async get(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;

            const character = await prisma.character.findFirst({
                where: { id, userId },
                include: {
                    style: {
                        select: { id: true, name: true, keywords: true },
                    },
                    generations: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true,
                            title: true,
                            generationType: true,
                            thumbnailUrl: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                },
            });

            if (!character) {
                res.status(404).json({ error: 'Character not found' });
                return;
            }

            res.json({ character });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get character';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /characters
     */
    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const data = req.body;

            // Verify style ownership
            const style = await prisma.style.findFirst({
                where: { id: data.styleId, userId },
            });

            if (!style) {
                res.status(404).json({ error: 'Style not found' });
                return;
            }

            const character = await prisma.character.create({
                data: {
                    userId,
                    ...data,
                },
            });

            // Update style character count
            await prisma.style.update({
                where: { id: data.styleId },
                data: { characterCount: { increment: 1 } },
            });

            res.status(201).json({ character });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create character';
            res.status(500).json({ error: message });
        }
    },

    /**
     * PUT /characters/:id
     */
    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;
            const data = req.body;

            const existing = await prisma.character.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Character not found' });
                return;
            }

            const character = await prisma.character.update({
                where: { id },
                data,
            });

            res.json({ character });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update character';
            res.status(500).json({ error: message });
        }
    },

    /**
     * DELETE /characters/:id
     */
    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;

            const existing = await prisma.character.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Character not found' });
                return;
            }

            await prisma.character.delete({ where: { id } });

            // Update style character count
            await prisma.style.update({
                where: { id: existing.styleId },
                data: { characterCount: { decrement: 1 } },
            });

            res.json({ message: 'Character deleted' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete character';
            res.status(500).json({ error: message });
        }
    },
};
