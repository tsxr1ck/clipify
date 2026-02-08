import { prisma } from '../config/database.js';
import { Decimal } from '@prisma/client/runtime/library';
import type { Generation } from '@prisma/client';

// Types for creating/updating generations
export interface CreateGenerationParams {
    userId?: string; // Optional if we want to support system generations or handle userId inside
    title: string;
    generationType: 'image' | 'video' | 'style' | 'text' | 'audio'; // Added text/audio for completeness if needed
    prompt: string;
    folder?: string;
    characterId?: string;
    styleId?: string;
    aspectRatio?: string;
    generationParams?: Record<string, any>;
    costMxn?: number;
    costUsd?: number;
}

export interface CompleteGenerationParams {
    outputUrl: string;
    outputKey?: string;
    mimeType?: string;
    costMxn?: number;
    costUsd?: number;
    generationTimeSeconds?: number;
    durationSeconds?: number;
    tokensUsed?: number;
    promptTokens?: number;
    completionTokens?: number;
    apiModel?: string;
    apiResponse?: Record<string, any>;
}

export class GenerationsService {
    /**
     * Create a new generation record
     */
    async create(data: CreateGenerationParams & { userId?: string }): Promise<Generation> {
        // If userId is not provided, we might need to handle it or throw. 
        // For now assuming it's passed or we contextually need it.
        // In the context of the analysis service, we might need to pass the user ID.
        // Wait, enhanced-character-analysis.service.ts doesn't seem to pass userId to create(). 
        // It calls: generationsService.create({ title: ..., generationType: ..., prompt: ..., folder: ... })
        // This suggests the service assumes it can get userId from context or it's missing.

        // Actually, looking at the user's code for enhanced-character-analysis.service.ts:
        // export async function analyzeCharacterImageWithLogging(_apiKey: string, imageBase64: string, mimeType: string)
        // It doesn't take userId! This is an issue. 
        // The controller calls it: await analyzeCharacterImageWithLogging('', imageBase64, mimeType);
        // And the controller HAS userId: const userId = req.user!.userId;

        // I will need to update enhanced-character-analysis.service.ts to accept userId.
        // But first, let's define the service method to require userId.

        if (!data.userId) {
            // Fallback or error? For now, let's assume it's mandatory but allow undefined in type for flexibility if needed? 
            // Prisma requires userId.
            throw new Error('UserId is required to create a generation record');
        }

        return prisma.generation.create({
            data: {
                userId: data.userId,
                title: data.title,
                generationType: data.generationType,
                prompt: data.prompt,
                folder: data.folder,
                status: 'pending',
                characterId: data.characterId,
                styleId: data.styleId,
                aspectRatio: data.aspectRatio || '1:1', // Default
                costMxn: new Decimal(data.costMxn || 0),
                costUsd: new Decimal(data.costUsd || 0),
                generationParams: data.generationParams || {},
            },
        });
    }

    /**
     * Mark generation as completed and update with results
     */
    async complete(id: string, data: CompleteGenerationParams): Promise<Generation> {
        return prisma.generation.update({
            where: { id },
            data: {
                status: 'completed',
                completedAt: new Date(),
                outputUrl: data.outputUrl,
                outputKey: data.outputKey,
                mimeType: data.mimeType,
                costMxn: data.costMxn ? new Decimal(data.costMxn) : undefined,
                costUsd: data.costUsd ? new Decimal(data.costUsd) : undefined,
                generationTimeSeconds: data.generationTimeSeconds,
                tokensUsed: data.tokensUsed,
                apiResponse: data.apiResponse ?? undefined,
                // Note: items relation might need correct schema structure. 
                // For now, let's stick to updating the main fields.
            },
        });
    }

    /**
     * Mark generation as failed
     */
    async fail(id: string, errorMessage: string): Promise<Generation> {
        return prisma.generation.update({
            where: { id },
            data: {
                status: 'failed',
                errorMessage,
                completedAt: new Date(),
            },
        });
    }
}

export const generationsService = new GenerationsService();
