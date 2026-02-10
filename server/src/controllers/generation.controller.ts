import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';

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
    outputUrl: z.string().optional(),
    outputKey: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    thumbnailKey: z.string().optional(),
    mimeType: z.string().optional(),
    fileSizeBytes: z.number().int().positive().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    durationSeconds: z.number().int().positive().optional(),
    apiModel: z.string().optional(),
    apiResponse: z.record(z.unknown()).optional(),
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
            const {
                page: pageRaw,
                limit: limitRaw,
                type: typeRaw,
                status: statusRaw,
                characterId: characterIdRaw,
                favorites: favoritesRaw,
            } = req.query;

            const pageStr = typeof pageRaw === 'string' ? pageRaw : undefined;
            const limitStr = typeof limitRaw === 'string' ? limitRaw : undefined;
            const type = typeof typeRaw === 'string' ? typeRaw : undefined;
            const status = typeof statusRaw === 'string' ? statusRaw : undefined;
            const characterId = typeof characterIdRaw === 'string' ? characterIdRaw : undefined;
            const favoritesStr = typeof favoritesRaw === 'string' ? favoritesRaw : undefined;

            const userId = req.user!.userId;

            // Parse query params
            const page = parseInt(pageStr || '1', 10) || 1;
            const limit = parseInt(limitStr || '20', 10) || 20;
            const favorites = favoritesStr === 'true';
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
            const { id } = req.params as { id: string };
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
            const data = createGenerationSchema.parse(req.body);

            const generation = await prisma.generation.create({
                data: {
                    userId,
                    characterId: data.characterId,
                    styleId: data.styleId,
                    title: data.title,
                    description: data.description,
                    generationType: data.generationType,
                    prompt: data.prompt,
                    status: 'pending',
                    sceneConfig: data.sceneConfig as any,
                    generationParams: data.generationParams as any,
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
            const { id } = req.params as { id: string };
            const userId = req.user!.userId;
            const data = updateGenerationSchema.parse(req.body);

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
            const { id } = req.params as { id: string };
            const userId = req.user!.userId;
            const data = completeGenerationSchema.parse(req.body);

            const existing = await prisma.generation.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Generation not found' });
                return;
            }

            // Upload to Supabase Storage
            let outputUrl = data.outputUrl;
            let outputKey = data.outputKey;

            // If we have a base64 string or a temporary URL, upload to our storage
            if (data.outputUrl && !data.outputUrl.includes('supabase')) {
                const isVideo = existing.generationType === 'video';
                const bucket = isVideo ? 'VIDEOS' : 'IMAGES';
                const extension = isVideo ? 'mp4' : 'png';
                const path = `${userId}/${id}.${extension}`;

                try {
                    let buffer: Buffer;
                    const outputUrlStr = data.outputUrl!;

                    console.log(`Processing ${existing.generationType} output (length: ${outputUrlStr.length} chars)`);

                    // Check if it's a URL
                    const isHttpUrl = outputUrlStr.startsWith('http://') || outputUrlStr.startsWith('https://');
                    const isGsUrl = outputUrlStr.startsWith('gs://');
                    const isDataUri = outputUrlStr.startsWith('data:');

                    if (isDataUri) {
                        // Handle standard data URI (data:image/png;base64,...)
                        console.log(`Detected data URI for ${existing.generationType}`);
                        const base64Data = outputUrlStr.split(';base64,').pop();
                        if (!base64Data) throw new Error('Invalid data URI format');
                        buffer = Buffer.from(base64Data, 'base64');
                    } else if (isHttpUrl || isGsUrl) {
                        // Handle URL download
                        console.log(`Downloading from URL: ${outputUrlStr.substring(0, 100)}...`);
                        const response = await fetch(outputUrlStr);

                        if (!response.ok) {
                            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                        }

                        const arrayBuffer = await response.arrayBuffer();
                        buffer = Buffer.from(arrayBuffer);
                    } else {
                        // Assume it's raw base64 - try to decode it
                        console.log(`Attempting to decode as raw base64 for ${existing.generationType}`);

                        try {
                            buffer = Buffer.from(outputUrlStr, 'base64');

                            // Verify it's actually valid base64 by checking if decoding produced meaningful data
                            if (buffer.length === 0) {
                                throw new Error('Decoded buffer is empty');
                            }

                            // For images, check for PNG/JPEG magic numbers
                            if (!isVideo) {
                                const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
                                const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
                                const isWebP = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

                                if (!isPNG && !isJPEG && !isWebP) {
                                    console.warn('Decoded data does not match image magic numbers');
                                }
                            }

                            // For videos, check for common video format signatures
                            if (isVideo) {
                                const isMP4 = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70; // 'ftyp'
                                const isWebM = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;

                                if (!isMP4 && !isWebM) {
                                    console.warn('Decoded data does not match video magic numbers');
                                }
                            }

                            console.log(`Successfully decoded ${buffer.length} bytes from base64`);
                        } catch (decodeError) {
                            throw new Error(`Failed to decode base64: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`);
                        }
                    }

                    if (!buffer || buffer.length === 0) {
                        throw new Error(`Buffer is empty after processing ${existing.generationType} output`);
                    }

                    console.log(`Uploading ${buffer.length} bytes to ${bucket}/${path}`);

                    const { storageService } = await import('../services/storage.service.js');
                    const uploadResult = await storageService.upload(
                        bucket,
                        path,
                        buffer,
                        isVideo ? 'video/mp4' : 'image/png'
                    );

                    outputUrl = uploadResult.url;
                    outputKey = uploadResult.key;

                    console.log(`Successfully uploaded ${existing.generationType} to Supabase: ${outputUrl}`);
                } catch (uploadError) {
                    console.error('Failed to upload to Supabase:', uploadError);
                    console.error('Output URL preview:', data.outputUrl?.substring(0, 200));
                    // Continue with original URL if upload fails, but log it
                }
            }

            const generation = await prisma.generation.update({
                where: { id },
                data: {
                    outputUrl, // Use the new Supabase URL
                    outputKey,
                    thumbnailUrl: data.thumbnailUrl,
                    thumbnailKey: data.thumbnailKey,
                    mimeType: data.mimeType,
                    fileSizeBytes: data.fileSizeBytes,
                    width: data.width,
                    height: data.height,
                    durationSeconds: data.durationSeconds,
                    apiModel: data.apiModel,
                    apiResponse: data.apiResponse as any,
                    tokensUsed: data.tokensUsed,
                    promptTokens: data.promptTokens,
                    completionTokens: data.completionTokens,
                    costUsd: new Prisma.Decimal(data.costUsd || 0),
                    costMxn: new Prisma.Decimal(data.costMxn || 0),
                    generationTimeSeconds: data.generationTimeSeconds,
                    apiLatencyMs: data.apiLatencyMs,
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
                    costUsd: new Prisma.Decimal(data.costUsd || 0),
                    costMxn: new Prisma.Decimal(data.costMxn || 0),
                    latencyMs: data.apiLatencyMs,
                },
            });

            // Deduct credits
            if (data.costMxn > 0) {
                const credits = await prisma.credits.findUnique({ where: { userId } });

                await prisma.credits.update({
                    where: { userId },
                    data: {
                        balanceMxn: { decrement: data.costMxn },
                        totalSpentMxn: { increment: data.costMxn },
                    },
                });

                // Record transaction
                await prisma.creditTransaction.create({
                    data: {
                        userId,
                        transactionType: 'usage',
                        amountMxn: new Prisma.Decimal(-data.costMxn),
                        balanceBeforeMxn: credits?.balanceMxn || new Prisma.Decimal(0),
                        balanceAfterMxn: new Prisma.Decimal(Number(credits?.balanceMxn || 0) - data.costMxn),
                        generationId: id,
                        description: `${existing.generationType} generation: ${existing.title}`,
                    },
                });
            }

            res.json({ generation });
        } catch (error) {
            console.error('Completion error:', error);
            const message = error instanceof Error ? error.message : 'Failed to complete generation';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /generations/:id/fail
     */
    async fail(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params as { id: string };
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
            const { id } = req.params as { id: string };
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
