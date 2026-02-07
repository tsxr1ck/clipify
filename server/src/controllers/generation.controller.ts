import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { Decimal } from '@prisma/client/runtime/library';

// Validation schemas
export const createGenerationSchema = z.object({
    characterId: z.string().uuid().optional(),
    styleId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    generationType: z.enum(['image', 'video', 'style']),
    prompt: z.string().min(1),
    sceneConfig: z.object({
        escena: z.string(),
        accion: z.string(),
        dialogo: z.string(),
        movimiento: z.string().optional(),
        duration: z.number().int().min(2).max(15),
    }).optional(),
    generationParams: z.record(z.unknown()).default({}),
});

export const updateGenerationSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    isFavorite: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    folder: z.string().optional(),
});

export const completeGenerationSchema = z.object({
    outputUrl: z.string().url(),
    outputKey: z.string(),
    thumbnailUrl: z.string().url().optional(),
    thumbnailKey: z.string().optional(),
    mimeType: z.string(),
    fileSizeBytes: z.number().int().positive().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    durationSeconds: z.number().int().positive().optional(),
    apiModel: z.string().optional(),
    tokensUsed: z.number().int().default(0),
    promptTokens: z.number().int().default(0),
    completionTokens: z.number().int().default(0),
    costUsd: z.number().default(0),
    costMxn: z.number().default(0),
    generationTimeSeconds: z.number().int().optional(),
    apiLatencyMs: z.number().int().optional(),
});

export const listGenerationsSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: z.enum(['image', 'video', 'style']).optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    characterId: z.string().uuid().optional(),
    favorites: z.coerce.boolean().optional(),
});

export const generationController = {
    /**
     * GET /generations
     */
    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { page, limit, type, status, characterId, favorites } = req.query as {
                page: number; limit: number; type?: string; status?: string;
                characterId?: string; favorites?: boolean;
            };
            const userId = req.user!.userId;
            const skip = (page - 1) * limit;

            const where = {
                userId,
                ...(type && { generationType: type }),
                ...(status && { status }),
                ...(characterId && { characterId }),
                ...(favorites && { isFavorite: true }),
            };

            const [generations, total] = await Promise.all([
                prisma.generation.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        generationType: true,
                        status: true,
                        outputUrl: true,
                        thumbnailUrl: true,
                        mimeType: true,
                        durationSeconds: true,
                        aspectRatio: true,
                        isFavorite: true,
                        costMxn: true,
                        tags: true,
                        folder: true,
                        createdAt: true,
                        completedAt: true,
                        character: {
                            select: { id: true, name: true },
                        },
                        style: {
                            select: { id: true, name: true },
                        },
                    },
                }),
                prisma.generation.count({ where }),
            ]);

            res.json({
                generations,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to list generations';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /generations/:id
     */
    async get(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;

            const generation = await prisma.generation.findFirst({
                where: { id, userId },
                include: {
                    character: {
                        select: { id: true, name: true, imageUrl: true },
                    },
                    style: {
                        select: { id: true, name: true },
                    },
                    usageMetric: true,
                },
            });

            if (!generation) {
                res.status(404).json({ error: 'Generation not found' });
                return;
            }

            res.json({ generation });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get generation';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /generations
     */
    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const data = req.body;

            const generation = await prisma.generation.create({
                data: {
                    userId,
                    ...data,
                    status: 'pending',
                },
            });

            // Update character generation count if applicable
            if (data.characterId) {
                await prisma.character.update({
                    where: { id: data.characterId },
                    data: { generationCount: { increment: 1 } },
                });
            }

            res.status(201).json({ generation });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create generation';
            res.status(500).json({ error: message });
        }
    },

    /**
     * PUT /generations/:id
     */
    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;
            const data = req.body;

            const existing = await prisma.generation.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Generation not found' });
                return;
            }

            const generation = await prisma.generation.update({
                where: { id },
                data,
            });

            res.json({ generation });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update generation';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /generations/:id/complete
     * Called after successful generation to update with output data
     */
    async complete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;
            const data = req.body;

            const existing = await prisma.generation.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Generation not found' });
                return;
            }

            const generation = await prisma.generation.update({
                where: { id },
                data: {
                    ...data,
                    costUsd: new Decimal(data.costUsd || 0),
                    costMxn: new Decimal(data.costMxn || 0),
                    status: 'completed',
                    completedAt: new Date(),
                },
            });

            // Create usage metric
            await prisma.usageMetric.create({
                data: {
                    userId,
                    generationId: id,
                    apiModel: data.apiModel,
                    operationType: existing.generationType,
                    promptTokens: data.promptTokens || 0,
                    completionTokens: data.completionTokens || 0,
                    totalTokens: data.tokensUsed || 0,
                    costUsd: new Decimal(data.costUsd || 0),
                    costMxn: new Decimal(data.costMxn || 0),
                    latencyMs: data.apiLatencyMs,
                },
            });

            // Deduct credits
            if (data.costMxn > 0) {
                await prisma.credits.update({
                    where: { userId },
                    data: {
                        balanceMxn: { decrement: data.costMxn },
                        totalSpentMxn: { increment: data.costMxn },
                    },
                });

                // Record transaction
                const credits = await prisma.credits.findUnique({ where: { userId } });
                await prisma.creditTransaction.create({
                    data: {
                        userId,
                        transactionType: 'usage',
                        amountMxn: new Decimal(-data.costMxn),
                        balanceBeforeMxn: new Decimal(Number(credits?.balanceMxn || 0) + data.costMxn),
                        balanceAfterMxn: credits?.balanceMxn || new Decimal(0),
                        generationId: id,
                        description: `${existing.generationType} generation: ${existing.title}`,
                    },
                });
            }

            res.json({ generation });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to complete generation';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /generations/:id/fail
     */
    async fail(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;
            const { errorMessage } = req.body;

            const existing = await prisma.generation.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Generation not found' });
                return;
            }

            const generation = await prisma.generation.update({
                where: { id },
                data: {
                    status: 'failed',
                    errorMessage,
                    completedAt: new Date(),
                },
            });

            res.json({ generation });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to mark generation as failed';
            res.status(500).json({ error: message });
        }
    },

    /**
     * DELETE /generations/:id
     */
    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;

            const existing = await prisma.generation.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Generation not found' });
                return;
            }

            await prisma.generation.delete({ where: { id } });
            res.json({ message: 'Generation deleted' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete generation';
            res.status(500).json({ error: message });
        }
    },
};
