import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { sceneStorageService, storyStorageService } from '../services/scenestorage.service.js';

// Validation schemas
const createSceneSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    originalPrompt: z.string().min(1),
    escena: z.string().min(1),
    fondo: z.string().optional(),
    accion: z.string().min(1),
    dialogo: z.string().min(1),
    voiceStyle: z.string().optional(),
    movimiento: z.string().optional(),
    suggestedDuration: z.number().int().min(2).max(8),
    condicionesFisicas: z.string().optional(),
    defectosTecnicos: z.string().optional(),
    contextoInvisible: z.string().optional(),
    tokensUsed: z.number().int().optional(),
    costMxn: z.number().optional(),
    tags: z.array(z.string()).optional(),
    folder: z.string().optional(),
});

const updateSceneSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    isFavorite: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    folder: z.string().optional(),
});

const createStorySchema = z.object({
    storyTitle: z.string().min(1).max(200),
    storyDescription: z.string().optional(),
    originalPrompt: z.string().min(1),
    segmentCount: z.number().int().min(2).max(6),
    segments: z.array(z.any()),
    tokensUsed: z.number().int().optional(),
    costMxn: z.number().optional(),
    tags: z.array(z.string()).optional(),
    folder: z.string().optional(),
});

const updateStorySchema = z.object({
    storyTitle: z.string().min(1).max(200).optional(),
    storyDescription: z.string().optional(),
    isFavorite: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    folder: z.string().optional(),
});

export const sceneController = {
    /**
     * POST /scenes
     */
    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const data = createSceneSchema.parse(req.body);

            const scene = await sceneStorageService.createScene(userId, data);

            res.status(201).json({ scene });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Validation error', details: error.errors });
                return;
            }
            const message = error instanceof Error ? error.message : 'Failed to create scene';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /scenes
     */
    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const {
                page: pageRaw,
                limit: limitRaw,
                favorites: favoritesRaw,
                folder: folderRaw,
                search: searchRaw,
            } = req.query;

            const pageStr = typeof pageRaw === 'string' ? pageRaw : undefined;
            const limitStr = typeof limitRaw === 'string' ? limitRaw : undefined;
            const favoritesStr = typeof favoritesRaw === 'string' ? favoritesRaw : undefined;
            const folder = typeof folderRaw === 'string' ? folderRaw : undefined;
            const search = typeof searchRaw === 'string' ? searchRaw : undefined;

            const page = parseInt(pageStr || '1', 10);
            const limit = parseInt(limitStr || '20', 10);
            const favorites = favoritesStr === 'true';

            const { scenes, total } = await sceneStorageService.listScenes(userId, {
                page,
                limit,
                favorites,
                folder,
                search,
            });

            res.json({
                scenes,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to list scenes';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /scenes/:id
     */
    async get(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { id } = req.params as { id: string };

            const scene = await sceneStorageService.getScene(userId, id);

            if (!scene) {
                res.status(404).json({ error: 'Scene not found' });
                return;
            }

            res.json({ scene });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get scene';
            res.status(500).json({ error: message });
        }
    },

    /**
     * PUT /scenes/:id
     */
    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { id } = req.params as { id: string };
            const data = updateSceneSchema.parse(req.body);

            const scene = await sceneStorageService.updateScene(userId, id, data);

            res.json({ scene });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Validation error', details: error.errors });
                return;
            }
            const message = error instanceof Error ? error.message : 'Failed to update scene';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /scenes/:id/use
     */
    async markUsed(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { id } = req.params as { id: string };

            const scene = await sceneStorageService.markSceneUsed(userId, id);

            res.json({ scene });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to mark scene as used';
            res.status(500).json({ error: message });
        }
    },

    /**
     * DELETE /scenes/:id
     */
    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { id } = req.params as { id: string };

            await sceneStorageService.deleteScene(userId, id);

            res.json({ message: 'Scene deleted' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete scene';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /scenes/search/similar?prompt=...
     */
    async findSimilar(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { prompt: rawPrompt, limit: limitStr } = req.query;

            if (!rawPrompt || typeof rawPrompt !== 'string') {
                res.status(400).json({ error: 'Prompt must be a valid string' });
                return;
            }
            const prompt = rawPrompt;

            const limit = parseInt((typeof limitStr === 'string' ? limitStr : undefined) || '5', 10);
            const scenes = await sceneStorageService.findSimilarScenes(userId, prompt, limit);

            res.json({ scenes });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to find similar scenes';
            res.status(500).json({ error: message });
        }
    },
};

export const storyController = {
    /**
     * POST /stories
     */
    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const data = createStorySchema.parse(req.body);

            const story = await storyStorageService.createStory(userId, data);

            res.status(201).json({ story });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Validation error', details: error.errors });
                return;
            }
            const message = error instanceof Error ? error.message : 'Failed to create story';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /stories
     */
    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const {
                page: pageRaw,
                limit: limitRaw,
                favorites: favoritesRaw,
                folder: folderRaw,
                search: searchRaw,
            } = req.query;

            const pageStr = typeof pageRaw === 'string' ? pageRaw : undefined;
            const limitStr = typeof limitRaw === 'string' ? limitRaw : undefined;
            const favoritesStr = typeof favoritesRaw === 'string' ? favoritesRaw : undefined;
            const folder = typeof folderRaw === 'string' ? folderRaw : undefined;
            const search = typeof searchRaw === 'string' ? searchRaw : undefined;

            const page = parseInt(pageStr || '1', 10);
            const limit = parseInt(limitStr || '20', 10);
            const favorites = favoritesStr === 'true';

            const { stories, total } = await storyStorageService.listStories(userId, {
                page,
                limit,
                favorites,
                folder,
                search,
            });

            res.json({
                stories,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to list stories';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /stories/:id
     */
    async get(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { id } = req.params as { id: string };

            const story = await storyStorageService.getStory(userId, id);

            if (!story) {
                res.status(404).json({ error: 'Story not found' });
                return;
            }

            res.json({ story });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get story';
            res.status(500).json({ error: message });
        }
    },

    /**
     * PUT /stories/:id
     */
    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { id } = req.params as { id: string };
            const data = updateStorySchema.parse(req.body);

            const story = await storyStorageService.updateStory(userId, id, data);

            res.json({ story });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Validation error', details: error.errors });
                return;
            }
            const message = error instanceof Error ? error.message : 'Failed to update story';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /stories/:id/use
     */
    async markUsed(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { id } = req.params as { id: string };

            const story = await storyStorageService.markStoryUsed(userId, id);

            res.json({ story });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to mark story as used';
            res.status(500).json({ error: message });
        }
    },

    /**
     * DELETE /stories/:id
     */
    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { id } = req.params as { id: string };

            await storyStorageService.deleteStory(userId, id);

            res.json({ message: 'Story deleted' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete story';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /stories/search/similar?prompt=...
     */
    async findSimilar(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { prompt: rawPrompt, limit: limitStr } = req.query;

            if (!rawPrompt || typeof rawPrompt !== 'string') {
                res.status(400).json({ error: 'Prompt must be a valid string' });
                return;
            }
            const prompt = rawPrompt;

            const limit = parseInt((typeof limitStr === 'string' ? limitStr : undefined) || '5', 10);
            const stories = await storyStorageService.findSimilarStories(userId, prompt, limit);

            res.json({ stories });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to find similar stories';
            res.status(500).json({ error: message });
        }
    },
};