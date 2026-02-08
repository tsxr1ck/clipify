import { prisma } from '../config/database.js';
import { Decimal } from '@prisma/client/runtime/library';
import type {
    Scene,
    Story,
    Prisma
} from '@prisma/client';

export interface SceneCreateInput {
    title: string;
    description?: string;
    originalPrompt: string;
    escena: string;
    fondo?: string;
    accion: string;
    dialogo: string;
    voiceStyle?: string;
    movimiento?: string;
    suggestedDuration: number;
    condicionesFisicas?: string;
    defectosTecnicos?: string;
    contextoInvisible?: string;
    tokensUsed?: number;
    costMxn?: number;
    tags?: string[];
    folder?: string;
}

export interface StoryCreateInput {
    storyTitle: string;
    storyDescription?: string;
    originalPrompt: string;
    segmentCount: number;
    segments: any[]; // Array of StorySegment objects
    tokensUsed?: number;
    costMxn?: number;
    tags?: string[];
    folder?: string;
}

export interface SceneUpdateInput {
    title?: string;
    description?: string;
    isFavorite?: boolean;
    tags?: string[];
    folder?: string;
}

export interface StoryUpdateInput {
    storyTitle?: string;
    storyDescription?: string;
    isFavorite?: boolean;
    tags?: string[];
    folder?: string;
}

export const sceneStorageService = {
    /**
     * Create and save a scene
     */
    async createScene(userId: string, data: SceneCreateInput): Promise<Scene> {
        return await prisma.scene.create({
            data: {
                userId,
                title: data.title,
                description: data.description,
                originalPrompt: data.originalPrompt,
                escena: data.escena,
                fondo: data.fondo || '',
                accion: data.accion,
                dialogo: data.dialogo,
                voiceStyle: data.voiceStyle,
                movimiento: data.movimiento,
                suggestedDuration: data.suggestedDuration,
                condicionesFisicas: data.condicionesFisicas,
                defectosTecnicos: data.defectosTecnicos,
                contextoInvisible: data.contextoInvisible,
                tokensUsed: data.tokensUsed || 0,
                costMxn: new Decimal(data.costMxn || 0),
                tags: data.tags || [],
                folder: data.folder,
            },
        });
    },

    /**
     * Get a scene by ID
     */
    async getScene(userId: string, sceneId: string): Promise<Scene | null> {
        return await prisma.scene.findFirst({
            where: { id: sceneId, userId },
        });
    },

    /**
     * List scenes for a user
     */
    async listScenes(
        userId: string,
        options: {
            page?: number;
            limit?: number;
            favorites?: boolean;
            folder?: string;
            search?: string;
        } = {}
    ): Promise<{ scenes: Scene[]; total: number }> {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.SceneWhereInput = {
            userId,
            ...(options.favorites && { isFavorite: true }),
            ...(options.folder && { folder: options.folder }),
            ...(options.search && {
                OR: [
                    { title: { contains: options.search, mode: 'insensitive' } },
                    { description: { contains: options.search, mode: 'insensitive' } },
                    { escena: { contains: options.search, mode: 'insensitive' } },
                ],
            }),
        };

        const [scenes, total] = await Promise.all([
            prisma.scene.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.scene.count({ where }),
        ]);

        return { scenes, total };
    },

    /**
     * Update scene
     */
    async updateScene(
        userId: string,
        sceneId: string,
        data: SceneUpdateInput
    ): Promise<Scene> {
        // Verify ownership
        const existing = await prisma.scene.findFirst({
            where: { id: sceneId, userId },
        });

        if (!existing) {
            throw new Error('Scene not found');
        }

        return await prisma.scene.update({
            where: { id: sceneId },
            data,
        });
    },

    /**
     * Mark scene as used (increment counter)
     */
    async markSceneUsed(userId: string, sceneId: string): Promise<Scene> {
        const existing = await prisma.scene.findFirst({
            where: { id: sceneId, userId },
        });

        if (!existing) {
            throw new Error('Scene not found');
        }

        return await prisma.scene.update({
            where: { id: sceneId },
            data: {
                timesUsed: { increment: 1 },
                lastUsedAt: new Date(),
            },
        });
    },

    /**
     * Delete scene
     */
    async deleteScene(userId: string, sceneId: string): Promise<void> {
        const existing = await prisma.scene.findFirst({
            where: { id: sceneId, userId },
        });

        if (!existing) {
            throw new Error('Scene not found');
        }

        await prisma.scene.delete({
            where: { id: sceneId },
        });
    },

    /**
     * Search for similar scenes (by prompt or content)
     */
    async findSimilarScenes(
        userId: string,
        prompt: string,
        limit: number = 5
    ): Promise<Scene[]> {
        // Simple text search - you could enhance with vector embeddings later
        return await prisma.scene.findMany({
            where: {
                userId,
                OR: [
                    { originalPrompt: { contains: prompt, mode: 'insensitive' } },
                    { escena: { contains: prompt, mode: 'insensitive' } },
                    { dialogo: { contains: prompt, mode: 'insensitive' } },
                ],
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
    },
};

export const storyStorageService = {
    /**
     * Create and save a story
     */
    async createStory(userId: string, data: StoryCreateInput): Promise<Story> {
        return await prisma.story.create({
            data: {
                userId,
                storyTitle: data.storyTitle,
                storyDescription: data.storyDescription,
                originalPrompt: data.originalPrompt,
                segmentCount: data.segmentCount,
                segments: data.segments,
                tokensUsed: data.tokensUsed || 0,
                costMxn: new Decimal(data.costMxn || 0),
                tags: data.tags || [],
                folder: data.folder,
            },
        });
    },

    /**
     * Get a story by ID
     */
    async getStory(userId: string, storyId: string): Promise<Story | null> {
        return await prisma.story.findFirst({
            where: { id: storyId, userId },
        });
    },

    /**
     * List stories for a user
     */
    async listStories(
        userId: string,
        options: {
            page?: number;
            limit?: number;
            favorites?: boolean;
            folder?: string;
            search?: string;
        } = {}
    ): Promise<{ stories: Story[]; total: number }> {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.StoryWhereInput = {
            userId,
            ...(options.favorites && { isFavorite: true }),
            ...(options.folder && { folder: options.folder }),
            ...(options.search && {
                OR: [
                    { storyTitle: { contains: options.search, mode: 'insensitive' } },
                    { storyDescription: { contains: options.search, mode: 'insensitive' } },
                ],
            }),
        };

        const [stories, total] = await Promise.all([
            prisma.story.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.story.count({ where }),
        ]);

        return { stories, total };
    },

    /**
     * Update story
     */
    async updateStory(
        userId: string,
        storyId: string,
        data: StoryUpdateInput
    ): Promise<Story> {
        const existing = await prisma.story.findFirst({
            where: { id: storyId, userId },
        });

        if (!existing) {
            throw new Error('Story not found');
        }

        return await prisma.story.update({
            where: { id: storyId },
            data,
        });
    },

    /**
     * Mark story as used
     */
    async markStoryUsed(userId: string, storyId: string): Promise<Story> {
        const existing = await prisma.story.findFirst({
            where: { id: storyId, userId },
        });

        if (!existing) {
            throw new Error('Story not found');
        }

        return await prisma.story.update({
            where: { id: storyId },
            data: {
                timesUsed: { increment: 1 },
                lastUsedAt: new Date(),
            },
        });
    },

    /**
     * Delete story
     */
    async deleteStory(userId: string, storyId: string): Promise<void> {
        const existing = await prisma.story.findFirst({
            where: { id: storyId, userId },
        });

        if (!existing) {
            throw new Error('Story not found');
        }

        await prisma.story.delete({
            where: { id: storyId },
        });
    },

    /**
     * Find similar stories
     */
    async findSimilarStories(
        userId: string,
        prompt: string,
        limit: number = 5
    ): Promise<Story[]> {
        return await prisma.story.findMany({
            where: {
                userId,
                OR: [
                    { originalPrompt: { contains: prompt, mode: 'insensitive' } },
                    { storyTitle: { contains: prompt, mode: 'insensitive' } },
                    { storyDescription: { contains: prompt, mode: 'insensitive' } },
                ],
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
    },
};