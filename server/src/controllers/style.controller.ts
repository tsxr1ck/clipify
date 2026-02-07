import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';

// Validation schemas
export const createStyleSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    styleAnalysis: z.string().optional(),
    parsedStyle: z.object({
        overview: z.string(),
        colorPalette: z.string(),
        artisticStyle: z.string(),
        lighting: z.string(),
        composition: z.string(),
        texture: z.string(),
        keywords: z.array(z.string()),
    }),
    keywords: z.array(z.string()).default([]),
    referenceImageUrl: z.string().url(),
    referenceImageKey: z.string(),
    referenceImageThumbUrl: z.string().url().optional(),
    userPrompt: z.string().optional(),
    isPublic: z.boolean().default(false),
});

export const updateStyleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    isPublic: z.boolean().optional(),
});

export const listStylesSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
});

export const styleController = {
    /**
     * GET /styles
     */
    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { page: pageStr, limit: limitStr, search } = req.query as { page?: string; limit?: string; search?: string };
            const userId = req.user!.userId;

            // Parse query params (they come as strings)
            const page = parseInt(pageStr || '1', 10) || 1;
            const limit = parseInt(limitStr || '20', 10) || 20;
            const skip = (page - 1) * limit;

            const where = {
                userId,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                        { keywords: { has: search } },
                    ],
                }),
            };

            const [styles, total] = await Promise.all([
                prisma.style.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        keywords: true,
                        referenceImageUrl: true,
                        referenceImageThumbUrl: true,
                        isPublic: true,
                        useCount: true,
                        characterCount: true,
                        createdAt: true,
                    },
                }),
                prisma.style.count({ where }),
            ]);

            res.json({
                styles,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to list styles';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /styles/:id
     */
    async get(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;

            const style = await prisma.style.findFirst({
                where: {
                    id,
                    OR: [{ userId }, { isPublic: true }],
                },
                include: {
                    characters: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true,
                            name: true,
                            thumbnailUrl: true,
                        },
                    },
                },
            });

            if (!style) {
                res.status(404).json({ error: 'Style not found' });
                return;
            }

            // Increment view count for public styles
            if (style.isPublic && style.userId !== userId) {
                await prisma.style.update({
                    where: { id },
                    data: { viewCount: { increment: 1 } },
                });
            }

            res.json({ style });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get style';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /styles
     */
    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const data = req.body;

            const style = await prisma.style.create({
                data: {
                    userId,
                    ...data,
                },
            });

            res.status(201).json({ style });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create style';
            res.status(500).json({ error: message });
        }
    },

    /**
     * PUT /styles/:id
     */
    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;
            const data = req.body;

            // Check ownership
            const existing = await prisma.style.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Style not found' });
                return;
            }

            const style = await prisma.style.update({
                where: { id },
                data,
            });

            res.json({ style });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update style';
            res.status(500).json({ error: message });
        }
    },

    /**
     * DELETE /styles/:id
     */
    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;

            // Check ownership
            const existing = await prisma.style.findFirst({
                where: { id, userId },
                include: { _count: { select: { characters: true } } },
            });

            if (!existing) {
                res.status(404).json({ error: 'Style not found' });
                return;
            }

            if (existing._count.characters > 0) {
                res.status(400).json({
                    error: 'Cannot delete style with characters. Delete characters first.'
                });
                return;
            }

            await prisma.style.delete({ where: { id } });
            res.json({ message: 'Style deleted' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete style';
            res.status(500).json({ error: message });
        }
    },
};
