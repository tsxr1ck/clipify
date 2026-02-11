import { PRICING } from '@/config/constants';
import { creditsService } from './creditsService';
import apiClient from '@/services/api/client';
import type { VideoDuration } from '@/types';

// Scene builder result type
export interface SceneBuilderResult {
    escena: string;
    fondo?: string;
    accion: string;
    dialogo: string;
    voiceStyle?: string;
    movimiento?: string;
    suggestedDuration: VideoDuration;
    // Hyper-realism fields
    condicionesFisicas?: string;
    defectosTecnicos?: string;
    contextoInvisible?: string;
    // Reference Image fields
    useReferenceImage?: boolean;
    referenceImageBase64?: string;
}

// Response from scene generation including cost info
export interface SceneGenerationResult {
    scene: SceneBuilderResult;
    tokensUsed: number;
    costMXN: number;
    id?: string; // ID if saved to database
}

// Story segment (extends scene with segment metadata)
export interface StorySegment extends SceneBuilderResult {
    segmentNumber: number;
    title: string;
}

// Response from story generation
export interface StoryGenerationResult {
    segments: StorySegment[];
    storyTitle: string;
    storyDescription: string;
    tokensUsed: number;
    costMXN: number;
    id?: string; // ID if saved to database
}

// ... prompts (unchanged) ...
const SCENE_BUILDER_PROMPT = `You are an expert video scene planner for short-form content. Given a user's natural language description of their video idea, generate a detailed scene configuration.

Respond in JSON format with exact field names:
{
    "escena": "Detailed scene setting description including environment, lighting, atmosphere",
    "fondo": "Background elements (sky, buildings, nature, etc.) - optional, can be empty string",
    "accion": "What the character is doing - specific actions and movements",
    "dialogo": "The exact dialogue the character says - should be engaging and match the tone",
    "voiceStyle": "Voice delivery style (e.g., energetic, calm, excited, mysterious) - optional",
    "movimiento": "Camera movements and character animations (e.g., zoom in, pan left, character walks forward) - optional",
    "suggestedDuration": "Recommended duration in seconds: 2, 4, 6, or 8"
}

Guidelines:
- Keep dialogue concise (1-3 sentences max for short videos)
- Make scene descriptions vivid but not overly long
- suggestedDuration must be exactly 2, 4, 6, or 8
- All text should be in the same language as the user's input
- If the user writes in Spanish, respond in Spanish
- Focus on creating engaging, dynamic scenes suitable for social media`;

// System prompt for story generation (multi-segment)
const STORY_BUILDER_PROMPT = `You are an expert storyteller and video scene planner for short-form content series. Given a user's story idea, generate a complete multi-segment story where each segment is a complete scene that flows into the next.

Respond in JSON format with exact field names:
{
    "storyTitle": "A catchy title for the entire story",
    "storyDescription": "A brief 1-sentence description of the story arc",
    "segments": [
        {
            "segmentNumber": 1,
            "title": "Short title for this segment",
            "escena": "Detailed scene setting description including environment, lighting, atmosphere",
            "fondo": "Background elements - optional, can be empty string",
            "accion": "What the character is doing - specific actions and movements",
            "dialogo": "The exact dialogue - should be engaging and advance the story",
            "voiceStyle": "Voice delivery style - optional",
            "movimiento": "Camera movements and animations - optional",
            "suggestedDuration": 8
        }
    ]
}

Guidelines:
- Each segment should be 8 seconds (suggestedDuration: 8 always)
- Create a compelling story arc with beginning, development, and conclusion
- Each segment should end in a way that hooks into the next
- Keep dialogue concise but impactful
- All text should be in the same language as the user's input
- If the user writes in Spanish, respond in Spanish
- Make each segment visually interesting and distinct`;

/**
 * Generate scene configuration from natural language using backend
 */
export async function generateSceneConfig(
    prompt: string
): Promise<SceneGenerationResult> {
    // Check credits first (frontend check for UX, backend verifies too)
    const { balance } = await creditsService.getBalance();
    const estimatedCost = PRICING.SCENE_BUILDER;
    if (balance < estimatedCost) {
        throw new Error(`Insufficient credits. Required: $${estimatedCost.toFixed(2)} MXN, Available: $${balance.toFixed(2)} MXN`);
    }

    const fullPrompt = `${SCENE_BUILDER_PROMPT}

User's video idea: "${prompt}"

Generate the scene configuration JSON:`;

    const response = await apiClient.post('/ai/generate-text', {
        prompt: fullPrompt,
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
    });

    const { text: textContent, tokensUsed } = response.data;

    if (!textContent) {
        throw new Error('No scene generated. Please try again.');
    }

    // Parse the JSON response
    let parsedScene: SceneBuilderResult;
    try {
        parsedScene = JSON.parse(textContent);
    } catch {
        // Try to extract JSON from response if it's wrapped in other text
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsedScene = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('Failed to parse scene configuration. Please try again.');
        }
    }

    // Validate and normalize the duration
    const validDurations: VideoDuration[] = [2, 4, 6, 8];
    let duration = Number(parsedScene.suggestedDuration);
    if (!validDurations.includes(duration as VideoDuration)) {
        // Round to nearest valid duration
        duration = validDurations.reduce((prev, curr) =>
            Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
        );
    }

    const start = {
        escena: parsedScene.escena || '',
        fondo: parsedScene.fondo || '',
        accion: parsedScene.accion || '',
        dialogo: parsedScene.dialogo || '',
        voiceStyle: parsedScene.voiceStyle || '',
        movimiento: parsedScene.movimiento || '',
        suggestedDuration: duration as VideoDuration,
    };

    // --- AUTO-SAVE SCENE ---
    let savedSceneId: string | undefined;
    try {
        const sceneData = {
            title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
            description: `Generated from: ${prompt}`,
            originalPrompt: prompt,
            escena: start.escena,
            fondo: start.fondo,
            accion: start.accion,
            dialogo: start.dialogo,
            voiceStyle: start.voiceStyle,
            movimiento: start.movimiento,
            suggestedDuration: start.suggestedDuration,
            tokensUsed,
            costMxn: PRICING.SCENE_BUILDER,
        };

        const saveResponse = await apiClient.post('/scenes', sceneData);
        if (saveResponse.data?.scene?.id) {
            savedSceneId = saveResponse.data.scene.id;
        }
    } catch (error) {
        console.error('Failed to auto-save scene:', error);
        // Don't fail the generation if save fails, just log it
    }
    // -----------------------

    return {
        scene: start,
        tokensUsed,
        costMXN: PRICING.SCENE_BUILDER,
        id: savedSceneId,
    };
}

/**
 * Generate multi-segment story configuration from natural language using backend
 */
export async function generateStoryConfig(
    prompt: string,
    segmentCount: number
): Promise<StoryGenerationResult> {
    // Validate segment count
    const validatedSegmentCount = Math.min(Math.max(segmentCount, 2), 6);

    // Check credits
    const { balance } = await creditsService.getBalance();
    const estimatedCost = PRICING.STORY_BUILDER_PER_SEGMENT * validatedSegmentCount;
    if (balance < estimatedCost) {
        throw new Error(`Insufficient credits. Required: $${estimatedCost.toFixed(2)} MXN, Available: $${balance.toFixed(2)} MXN`);
    }

    const fullPrompt = `${STORY_BUILDER_PROMPT}

User's story idea: "${prompt}"
Number of segments requested: ${validatedSegmentCount}

Generate a complete story with exactly ${validatedSegmentCount} segments in JSON format:`;

    const response = await apiClient.post('/ai/generate-text', {
        prompt: fullPrompt,
        temperature: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
    });

    const { text: textContent, tokensUsed } = response.data;

    if (!textContent) {
        throw new Error('No story generated. Please try again.');
    }

    // Parse the JSON response
    let parsedStory: { storyTitle: string; storyDescription: string; segments: StorySegment[] };
    try {
        parsedStory = JSON.parse(textContent);
    } catch {
        // Try to extract JSON from response
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsedStory = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('Failed to parse story configuration. Please try again.');
        }
    }

    // Validate segments
    if (!parsedStory.segments || !Array.isArray(parsedStory.segments)) {
        throw new Error('Invalid story format: missing segments array');
    }

    // Normalize segments
    const normalizedSegments: StorySegment[] = parsedStory.segments.map((seg, idx) => ({
        segmentNumber: seg.segmentNumber || idx + 1,
        title: seg.title || `Segment ${idx + 1}`,
        escena: seg.escena || '',
        fondo: seg.fondo || '',
        accion: seg.accion || '',
        dialogo: seg.dialogo || '',
        voiceStyle: seg.voiceStyle || '',
        movimiento: seg.movimiento || '',
        suggestedDuration: 8 as VideoDuration, // Stories always use 8s segments
    }));

    const actualCost = PRICING.STORY_BUILDER_PER_SEGMENT * normalizedSegments.length;

    // --- AUTO-SAVE STORY ---
    let savedStoryId: string | undefined;
    try {
        const storyData = {
            storyTitle: parsedStory.storyTitle || 'Untitled Story',
            storyDescription: parsedStory.storyDescription || '',
            originalPrompt: prompt,
            segmentCount: normalizedSegments.length,
            segments: normalizedSegments,
            tokensUsed,
            costMxn: actualCost,
        };

        const saveResponse = await apiClient.post('/stories', storyData);
        if (saveResponse.data?.story?.id) {
            savedStoryId = saveResponse.data.story.id;
        }
    } catch (error) {
        console.error('Failed to auto-save story:', error);
        // Don't fail the generation if save fails, just log it
    }
    // -----------------------

    return {
        segments: normalizedSegments,
        storyTitle: parsedStory.storyTitle || 'Untitled Story',
        storyDescription: parsedStory.storyDescription || '',
        tokensUsed,
        costMXN: actualCost,
        id: savedStoryId,
    };
}

/**
 * Calculate estimated cost for story generation
 */
export function calculateStoryCost(segmentCount: number): number {
    return PRICING.STORY_BUILDER_PER_SEGMENT * Math.min(Math.max(segmentCount, 2), 6);
}

// Image Scene builder result type
export interface ImageSceneBuilderResult {
    escena: string;
    fondo?: string;
    accion: string;
    lighting: string;
    camera: string;
}

// Response from image scene generation
export interface ImageSceneGenerationResult {
    scene: ImageSceneBuilderResult;
    tokensUsed: number;
    costMXN: number;
    id?: string; // ID if saved to database
}

// System prompt for image scene generation
const IMAGE_SCENE_BUILDER_PROMPT = `You are an expert visual director and photographer. Given a user's natural language description of an image idea, generate a detailed visual configuration.

Respond in JSON format with exact field names:
{
    "escena": "Detailed environment description, atmosphere, and mood",
    "fondo": "Specific background elements, depth, and context",
    "accion": "Precise character pose, expression, and action",
    "lighting": "Lighting setup (e.g., cinematic, natural, studio, neon)",
    "camera": "Camera angle and shot type (e.g., close-up, wide angle, low angle)"
}

Guidelines:
- Create visually striking and coherent scenes
- Focus on details that matter for image generation
- All text should be in the same language as the user's input
- If the user writes in Spanish, respond in Spanish`;

/**
 * Generate image scene configuration from natural language using backend
 */
export async function generateImageSceneConfig(
    prompt: string
): Promise<ImageSceneGenerationResult> {
    // Check credits
    const { balance } = await creditsService.getBalance();
    const estimatedCost = PRICING.SCENE_BUILDER;
    if (balance < estimatedCost) {
        throw new Error(`Insufficient credits. Required: $${estimatedCost.toFixed(2)} MXN, Available: $${balance.toFixed(2)} MXN`);
    }

    const fullPrompt = `${IMAGE_SCENE_BUILDER_PROMPT}

User's image idea: "${prompt}"

Generate the visual configuration JSON:`;

    const response = await apiClient.post('/ai/generate-text', {
        prompt: fullPrompt,
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
    });

    const { text: textContent, tokensUsed } = response.data;

    if (!textContent) {
        throw new Error('No scene generated. Please try again.');
    }

    // Parse the JSON response
    let parsedScene: ImageSceneBuilderResult;
    try {
        parsedScene = JSON.parse(textContent);
    } catch {
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsedScene = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('Failed to parse scene configuration. Please try again.');
        }
    }

    const result = {
        escena: parsedScene.escena || '',
        fondo: parsedScene.fondo || '',
        accion: parsedScene.accion || '',
        lighting: parsedScene.lighting || '',
        camera: parsedScene.camera || '',
    };

    // --- AUTO-SAVE IMAGE SCENE ---
    let savedSceneId: string | undefined;
    try {
        // We reuse the Scene table but mark it with a tag
        const sceneData = {
            title: `[Image] ${prompt.slice(0, 40)}...`,
            description: `Generated image scene from: ${prompt}`,
            originalPrompt: prompt,
            escena: result.escena,
            fondo: `${result.fondo}\n\n[Lighting]: ${result.lighting}\n[Camera]: ${result.camera}`, // Combine extra fields into fondo
            accion: result.accion,
            dialogo: '', // Not used for images
            suggestedDuration: 0, // 0 indicates image scene
            tokensUsed,
            costMxn: PRICING.SCENE_BUILDER,
            tags: ['image-scene'],
        };

        const saveResponse = await apiClient.post('/scenes', sceneData);
        if (saveResponse.data?.scene?.id) {
            savedSceneId = saveResponse.data.scene.id;
        }
    } catch (error) {
        console.error('Failed to auto-save image scene:', error);
    }
    // -----------------------

    return {
        scene: result,
        tokensUsed,
        costMXN: PRICING.SCENE_BUILDER,
        id: savedSceneId,
    };
}

export const sceneBuilderService = {
    generateSceneConfig,
    generateStoryConfig,
    generateImageSceneConfig,
    calculateStoryCost,
    estimatedCost: PRICING.SCENE_BUILDER,
    storyPricePerSegment: PRICING.STORY_BUILDER_PER_SEGMENT,
};

export default sceneBuilderService;
