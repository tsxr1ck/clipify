import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { aiService } from '../services/ai.service.js';
import { analyzeCharacterImageWithLogging } from '../services/enhanced-character-analysis.service.js';
import { creditsService } from '../services/credits.service.js';
import { calculatePrice, type GenerationType } from '../config/pricing.js';
import { z } from 'zod';

// ... validation schemas ...
export const analyzeCharacterSchema = z.object({
    imageBase64: z.string(),
    mimeType: z.string(),
    customPrompt: z.string().optional(),
});

export const extractStyleSchema = z.object({
    imageBase64: z.string(),
    mimeType: z.string(),
    userGuidance: z.string().optional(),
});

export const generateImageSchema = z.object({
    prompt: z.string(),
    aspectRatio: z.string(),
    imageBase64: z.string().optional(),
    mimeType: z.string().optional(),
});

export const generateVideoSchema = z.object({
    prompt: z.string(),
    imageBase64: z.string().optional(),
    mimeType: z.string().optional(),
    negativePrompt: z.string().optional(),
});

export const extendVideoSchema = z.object({
    prompt: z.string(),
    videoBase64: z.string(),
    negativePrompt: z.string().optional(),
});

export const generateTextSchema = z.object({
    prompt: z.string(),
    temperature: z.number().optional(),
    maxOutputTokens: z.number().optional(),
    responseMimeType: z.string().optional(),
});

import { generationsService } from '../services/generations.service.js';

// ... (keep existing imports)

export const aiController = {
    /**
     * Analyze character image
     * Cost: Treated as style extraction (low cost)
     */
    async analyzeCharacter(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { imageBase64, mimeType, customPrompt } = analyzeCharacterSchema.parse(req.body);

            if (customPrompt) {
                // Direct analysis with custom prompt (e.g., reference image analysis)
                const price = calculatePrice('style');
                const balance = await creditsService.getBalance(userId);
                if (balance.lessThan(price.userPriceMXN)) {
                    res.status(402).json({ error: `Insufficient credits. Required: $${price.userPriceMXN} MXN` });
                    return;
                }

                const description = await aiService.analyzeCharacter(imageBase64, mimeType, customPrompt);
                await creditsService.deductCredits(userId, price.userPriceMXN, 'Image Analysis');
                res.json({ description });
            } else {
                // Default: enhanced character analysis with logging
                const result = await analyzeCharacterImageWithLogging(userId, imageBase64, mimeType);
                await creditsService.deductCredits(userId, result.costMXN, 'Detailed Character Analysis');
                res.json({ description: result.description });
            }
        } catch (error) {
            console.error('Character analysis error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Analysis failed' });
        }
    },

    /**
     * Extract style from image
     */
    async extractStyle(req: AuthRequest, res: Response): Promise<void> {
        let generationId: string | undefined;
        try {
            const userId = req.user!.userId;
            const { imageBase64, mimeType, userGuidance } = extractStyleSchema.parse(req.body);

            // 1. Check balance
            const price = calculatePrice('style');
            const balance = await creditsService.getBalance(userId);
            if (balance.lessThan(price.userPriceMXN)) {
                res.status(402).json({ error: `Insufficient credits. Required: $${price.userPriceMXN} MXN` });
                return;
            }

            // 2. Start Generation Record
            const generation = await generationsService.create({
                userId,
                title: 'Style Extraction',
                generationType: 'style',
                prompt: userGuidance || 'Style Analysis',
                folder: 'styles',
                costMxn: Number(price.userPriceMXN),
                costUsd: Number(price.costUSD)
            });
            generationId = generation.id;
            const startTime = Date.now();

            // 3. Perform operation
            const result = await aiService.extractStyle(imageBase64, mimeType, userGuidance);

            // 4. Complete Generation Record
            await generationsService.complete(generationId, {
                outputUrl: 'style-analysis-json', // Result is JSON, not a URL
                completionTokens: 0, // Not tracked for style extraction usually
                costMxn: Number(price.userPriceMXN),
                costUsd: Number(price.costUSD),
                generationTimeSeconds: Math.ceil((Date.now() - startTime) / 1000),
                apiResponse: result // Store the analysis in metadata/items if supported
            });

            // 5. Deduct credits
            await creditsService.deductCredits(userId, price.userPriceMXN, 'Style extraction');

            res.json(result);
        } catch (error) {
            console.error('Style extraction error:', error);
            if (generationId) {
                await generationsService.fail(generationId, error instanceof Error ? error.message : 'Unknown error');
            }
            res.status(500).json({ error: error instanceof Error ? error.message : 'Extraction failed' });
        }
    },

    /**
     * Generate image
     */
    async generateImage(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { prompt, aspectRatio, imageBase64, mimeType } = generateImageSchema.parse(req.body);

            // 1. Check balance
            const price = calculatePrice('image');
            const balance = await creditsService.getBalance(userId);
            if (balance.lessThan(price.userPriceMXN)) {
                res.status(402).json({ error: `Insufficient credits. Required: $${price.userPriceMXN} MXN` });
                return;
            }

            // 2. Perform operation
            const generatedImageBase64 = await aiService.generateImage(prompt, aspectRatio, imageBase64, mimeType);

            // 3. Deduct credits (generation record handled by frontend via generateImageWithLogging)
            await creditsService.deductCredits(userId, price.userPriceMXN, 'Image generation');

            res.json({ imageBase64: generatedImageBase64 });
        } catch (error) {
            console.error('Image generation error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Generation failed' });
        }
    },

    /**
     * Generate video
     */
    async generateVideo(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { prompt, negativePrompt } = generateVideoSchema.parse(req.body);
            console.log('Generating video with prompt:', prompt);

            const duration = 5;
            const price = calculatePrice('video', duration);

            // 1. Check balance
            const balance = await creditsService.getBalance(userId);
            if (balance.lessThan(price.userPriceMXN)) {
                res.status(402).json({ error: `Insufficient credits. Required: $${price.userPriceMXN} MXN` });
                return;
            }

            // 2. Perform operation (pass reference image if provided)
            const videoBase64 = await aiService.generateVideo(prompt, negativePrompt);

            // 3. Deduct credits (generation record handled by frontend via generateVideoWithLogging)
            await creditsService.deductCredits(userId, price.userPriceMXN, `Video generation (${duration}s)`);

            res.json({ videoBase64 });
        } catch (error) {
            console.error('Video generation error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Generation failed' });
        }
    },
    /**
     * Generate video
     */
    async generateVideoWithReferenceImage(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { prompt, imageBase64, negativePrompt } = generateVideoSchema.parse(req.body);
            console.log('Generating video with prompt:', prompt);
            if (imageBase64) console.log('With reference image for image-to-video');

            const duration = 5;
            const price = calculatePrice('video', duration);

            // 1. Check balance
            const balance = await creditsService.getBalance(userId);
            if (balance.lessThan(price.userPriceMXN)) {
                res.status(402).json({ error: `Insufficient credits. Required: $${price.userPriceMXN} MXN` });
                return;
            }

            // 2. Perform operation (pass reference image if provided)
            const videoBase64 = await aiService.generateVideoWithReferenceImage(prompt, imageBase64, negativePrompt);

            // 3. Deduct credits (generation record handled by frontend via generateVideoWithLogging)
            await creditsService.deductCredits(userId, price.userPriceMXN, `Video generation (${duration}s)`);

            res.json({ videoBase64 });
        } catch (error) {
            console.error('Video generation error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Generation failed' });
        }
    },

    /**
     * Extend a video (video-to-video continuation for story segments)
     * TEST METHOD — delete if it doesn't work out.
     */
    async extendVideo(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { prompt, videoBase64, negativePrompt } = extendVideoSchema.parse(req.body);
            console.log('[extendVideo] Extending video with prompt:', prompt.substring(0, 80));

            const duration = 5;
            const price = calculatePrice('video', duration);

            const balance = await creditsService.getBalance(userId);
            if (balance.lessThan(price.userPriceMXN)) {
                res.status(402).json({ error: `Insufficient credits. Required: $${price.userPriceMXN} MXN` });
                return;
            }

            const resultVideoBase64 = await aiService.extendVideo(prompt, videoBase64, negativePrompt);

            await creditsService.deductCredits(userId, price.userPriceMXN, `Video extension (${duration}s)`);

            res.json({ videoBase64: resultVideoBase64 });
        } catch (error) {
            console.error('[extendVideo] Video extension error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Video extension failed' });
        }
    },

    /**
     * Generate text (for scene/story generation)
     * Low-cost text completion
     */
    async generateText(req: AuthRequest, res: Response): Promise<void> {
        let generationId: string | undefined;
        try {
            const userId = req.user!.userId;
            const { prompt, temperature, maxOutputTokens, responseMimeType } = req.body;

            // Use style price for text generation (low cost)
            const price = calculatePrice('style');
            const balance = await creditsService.getBalance(userId);
            if (balance.lessThan(price.userPriceMXN)) {
                res.status(402).json({ error: `Insufficient credits. Required: $${price.userPriceMXN} MXN` });
                return;
            }

            // 2. Start Generation Record
            const generation = await generationsService.create({
                userId,
                title: 'Text Generation',
                generationType: 'text',
                prompt: prompt,
                folder: 'text',
                costMxn: Number(price.userPriceMXN),
                costUsd: Number(price.costUSD)
            });
            generationId = generation.id;
            const startTime = Date.now();

            // 3. Perform operation
            const result = await aiService.generateText(prompt, {
                temperature,
                maxOutputTokens,
                responseMimeType,
            });

            // 4. Complete
            await generationsService.complete(generationId, {
                outputUrl: 'text-response',
                tokensUsed: result.tokensUsed,
                costMxn: Number(price.userPriceMXN),
                costUsd: Number(price.costUSD),
                generationTimeSeconds: Math.ceil((Date.now() - startTime) / 1000)
            });

            // 5. Deduct credits
            await creditsService.deductCredits(userId, price.userPriceMXN, 'Text generation');

            res.json(result);
        } catch (error) {
            console.error('Text generation error:', error);
            if (generationId) {
                await generationsService.fail(generationId, error instanceof Error ? error.message : 'Unknown error');
            }
            res.status(500).json({ error: error instanceof Error ? error.message : 'Generation failed' });
        }
    }
};
