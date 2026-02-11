import type { ParsedStyle, AspectRatio } from '../../types';
import { generationsService, type Generation } from './generationsService';
import apiClient from '@/services/api/client';

// Helper for error handling
const handleApiError = (error: any, defaultMessage: string) => {
    console.error(defaultMessage, error);
    if (error?.response?.data?.error) {
        throw new Error(error.response.data.error);
    }
    throw new Error(defaultMessage);
};

// ==================== CORE AI FUNCTIONS ====================

/**
 * Validate API key - Deprecated/Stubbed as backend handles auth
 */
export async function validateApiKey(_apiKey: string): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
}

/**
 * Check Veo access - Deprecated/Stubbed
 */
export async function checkVeoAccess(): Promise<boolean> {
    return true;
}

/**
 * Analyze character image
 */
export async function analyzeCharacterImage(imageBase64: string, mimeType: string): Promise<{ description: string }> {
    try {
        const response = await apiClient.post('/ai/analyze-character', {
            imageBase64,
            mimeType,
        });
        return response.data;
    } catch (error) {
        throw handleApiError(error, 'Error analyzing character');
    }
}

/**
 * Extract style from image
 */
export async function extractStyleFromImage(
    imageBase64: string,
    mimeType: string,
    userGuidance?: string
): Promise<{ analysis: string; parsedStyle: ParsedStyle }> {
    try {
        const response = await apiClient.post('/ai/extract-style', {
            imageBase64,
            mimeType,
            userGuidance,
        });
        return response.data;
    } catch (error) {
        throw handleApiError(error, 'Error extracting style');
    }
}

/**
 * Generate character image
 */
export async function generateCharacterImage(
    prompt: string,
    aspectRatio: AspectRatio,
    style: ParsedStyle | null
): Promise<{ base64: string; mimeType: string }> {
    try {
        // Construct full prompt with style
        let fullPrompt = prompt;
        if (style) {
            fullPrompt = `${prompt}
             
             Style Description: ${style.overview}
             Artistic Style: ${style.artisticStyle}
             Color Palette: ${style.colorPalette}
             Lighting: ${style.lighting}
             Composition: ${style.composition}
             Texture: ${style.texture}
             Keywords: ${style.keywords.join(', ')}`;
        }

        const response = await apiClient.post('/ai/generate-image', {
            prompt: fullPrompt,
            aspectRatio,
        });

        return {
            base64: response.data.imageBase64,
            mimeType: 'image/png'
        };
    } catch (error) {
        throw handleApiError(error, 'Error generating image');
    }
}

/**
 * Generate character from reference image (Image-to-Image)
 */
export async function generateCharacterFromImage(
    prompt: string,
    aspectRatio: AspectRatio,
    style: ParsedStyle | null,
    referenceImageBase64: string,
    referenceImageMimeType: string
): Promise<{ base64: string; mimeType: string }> {
    try {
        let fullPrompt = prompt;
        if (style) {
            fullPrompt = `${prompt}
             
             Style Description: ${style.overview}
             Keywords: ${style.keywords.join(', ')}`;
        }

        const response = await apiClient.post('/ai/generate-image', {
            prompt: fullPrompt,
            aspectRatio,
            imageBase64: referenceImageBase64,
            mimeType: referenceImageMimeType
        });

        return {
            base64: response.data.imageBase64,
            mimeType: 'image/png'
        };
    } catch (error) {
        throw handleApiError(error, 'Error generating image from reference');
    }
}

/**
 * Generate video
 */
export async function generateVideo(
    image: string, // Unused for now if backend doesn't support img2vid yet
    prompt: string
): Promise<{ videoBase64: string; mimeType: string; costMXN: number }> {
    try {
        console.log('Generating video with prompt:', prompt);
        console.log('Generating video with image:', image);
        const response = await apiClient.post('/ai/generate-video', {
            prompt,
            imageBase64: image,
            mimeType: 'image/png'
        }, {
            timeout: 300000 // 5 minutes (Veo generation can take 2-3 mins)
        });

        return {
            videoBase64: response.data.videoBase64,
            mimeType: 'video/mp4',
            costMXN: 0 // Cost handled by backend, frontend just needs result
        };
    } catch (error) {
        throw handleApiError(error, 'Error generating video');
    }
}

/**
 * Generate video with reference image (Image-to-Video)
 */
export async function generateVideoWithRef(
    motionPrompt: string,
    imageBase64: string,
    negativePrompt?: string
): Promise<{ videoBase64: string; mimeType: string; costMXN: number }> {
    try {
        console.log('Generating video with reference image and prompt:', motionPrompt);
        const response = await apiClient.post('/ai/generate-video-with-ref', {
            prompt: motionPrompt,
            imageBase64,
            negativePrompt,
            mimeType: 'image/png'
        }, {
            timeout: 300000 // 5 minutes
        });

        return {
            videoBase64: response.data.videoBase64,
            mimeType: 'video/mp4',
            costMXN: 0 // Cost handled by backend
        };
    } catch (error) {
        throw handleApiError(error, 'Error generating video with reference image');
    }
}

/**
 * Extend a video (video-to-video continuation)
 * Passes the previous segment's video + new prompt to Veo to continue the story.
 *
 * TEST METHOD — delete if it doesn't work out.
 */
export async function extendVideo(
    prompt: string,
    videoBase64: string,
    negativePrompt?: string
): Promise<{ videoBase64: string; mimeType: string; costMXN: number }> {
    try {
        console.log('[extendVideo] Extending video with prompt:', prompt.substring(0, 80));
        const response = await apiClient.post('/ai/extend-video', {
            prompt,
            videoBase64,
            negativePrompt,
        }, {
            timeout: 300000 // 5 minutes
        });

        return {
            videoBase64: response.data.videoBase64,
            mimeType: 'video/mp4',
            costMXN: 0 // Cost handled by backend
        };
    } catch (error) {
        throw handleApiError(error, 'Error extending video');
    }
}

/**
 * Story segment definition for the chain generator
 *
 * TEST METHOD — delete if it doesn't work out.
 */
export interface StorySegmentInput {
    segmentNumber: number;
    title: string;
    prompt: string; // The full built prompt for this segment
}

/**
 * Result for each segment in the chain
 *
 * TEST METHOD — delete if it doesn't work out.
 */
export interface StorySegmentResult {
    segmentNumber: number;
    title: string;
    videoBase64: string;
    mimeType: string;
    costMXN: number;
    wasExtended: boolean; // true if this was created via extendVideo (segment 2+)
}

/**
 * Generate a full story by chaining video segments together.
 *
 * Flow:
 *  - Segment 1: normal generateVideo (or generateVideoWithRef if reference image provided)
 *  - Segment 2+: extendVideo(segment prompt, previous segment's video)
 *
 * This produces visual continuity between segments because Veo extends
 * from the last frames of the previous video.
 *
 * TEST METHOD — delete if it doesn't work out.
 *
 * @param segments - Array of story segments with their prompts
 * @param firstSegmentImage - Optional image for image-to-video on segment 1
 * @param onSegmentComplete - Callback after each segment finishes
 * @param onSegmentStart - Callback when each segment starts
 * @returns Array of results for each segment
 */
export async function generateStoryVideoChain(
    segments: StorySegmentInput[],
    firstSegmentImage?: string,
    onSegmentStart?: (segmentNumber: number, title: string) => void,
    onSegmentComplete?: (result: StorySegmentResult) => void,
): Promise<StorySegmentResult[]> {
    const results: StorySegmentResult[] = [];
    let previousVideoBase64: string | null = null;

    for (const segment of segments) {
        onSegmentStart?.(segment.segmentNumber, segment.title);

        let result: { videoBase64: string; mimeType: string; costMXN: number };
        let wasExtended = false;

        if (segment.segmentNumber === 1 || !previousVideoBase64) {
            // First segment: generate from scratch (or from reference image)
            console.log(`[storyChain] Generating segment ${segment.segmentNumber} from scratch`);
            if (firstSegmentImage) {
                result = await generateVideoWithRef(segment.prompt, firstSegmentImage);
            } else {
                result = await generateVideo('', segment.prompt);
            }
        } else {
            // Subsequent segments: extend from previous video
            console.log(`[storyChain] Extending segment ${segment.segmentNumber} from previous video`);
            result = await extendVideo(segment.prompt, previousVideoBase64);
            wasExtended = true;
        }

        previousVideoBase64 = result.videoBase64;

        const segmentResult: StorySegmentResult = {
            segmentNumber: segment.segmentNumber,
            title: segment.title,
            videoBase64: result.videoBase64,
            mimeType: result.mimeType,
            costMXN: result.costMXN,
            wasExtended,
        };

        results.push(segmentResult);
        onSegmentComplete?.(segmentResult);
    }

    return results;
}

// ==================== HIGHER LEVEL FUNCTIONS WITH LOGGING ====================

// Pricing constants in MXN (display only) - must match config/constants.ts
// Base USD costs + 50% markup, converted at 17.5 MXN/USD
const ESTIMATED_COSTS = {
    STYLE: 0.26,      // Gemini 2.5 Flash analysis ($0.015 USD)
    IMAGE: 1.31,      // Imagen 4.0 Standard ($0.075 USD)
    VIDEO: 13.13      // Veo 3.1 Standard per second ($0.75 USD) - for default 5s video
};

export interface GenerationResult<T> {
    data: T;
    costMXN: number;
}

/**
 * Analyze character with logging
 */
export async function analyzeCharacterImageWithLogging(
    _apiKey: string, // Ignored
    imageBase64: string,
    mimeType: string
): Promise<{ description: string; costMXN: number }> {
    const startTime = Date.now();
    let generation: Generation | null = null;
    const costMXN = ESTIMATED_COSTS.STYLE;

    try {
        generation = await generationsService.create({
            title: 'Character Analysis',
            generationType: 'image',
            prompt: 'Analyze character image',
            folder: 'analysis'
        });

        const result = await analyzeCharacterImage(imageBase64, mimeType);

        if (generation) {
            await generationsService.complete(generation.id, {
                outputUrl: 'analysis-result',
                outputKey: `gen/${generation.id}`,
                mimeType: 'application/json',
                costMxn: costMXN,
                generationTimeSeconds: Math.ceil((Date.now() - startTime) / 1000),
            });
        }

        return { ...result, costMXN };
    } catch (error) {
        if (generation) {
            await generationsService.fail(generation.id, error instanceof Error ? error.message : 'Unknown error');
        }
        throw error;
    }
}

/**
 * Extract style with logging
 */
export async function generateStyleWithLogging(
    _apiKey: string,
    imageBase64: string,
    mimeType: string,
    userGuidance?: string
): Promise<{ analysis: string; parsedStyle: ParsedStyle; costMXN: number }> {
    const startTime = Date.now();
    let generation: Generation | null = null;
    const costMXN = ESTIMATED_COSTS.STYLE;

    try {
        generation = await generationsService.create({
            title: 'Style Analysis',
            generationType: 'style',
            prompt: userGuidance || 'Style extraction',
        });

        const result = await extractStyleFromImage(imageBase64, mimeType, userGuidance);

        if (generation) {
            await generationsService.complete(generation.id, {
                outputUrl: 'style-analysis',
                outputKey: `gen/${generation.id}`,
                mimeType: 'application/json',
                costMxn: costMXN,
                generationTimeSeconds: Math.ceil((Date.now() - startTime) / 1000),
            });
        }

        return { ...result, costMXN };
    } catch (error) {
        if (generation) {
            await generationsService.fail(generation.id, error instanceof Error ? error.message : 'Unknown error');
        }
        throw error;
    }
}

/**
 * Generate character image with logging (Restored for CharacterCreator)
 */
export async function generateCharacterImageWithLogging(
    _apiKey: string,
    prompt: string,
    _styleKeywords: string[],
    styleDetails: ParsedStyle,
    aspectRatio: AspectRatio
): Promise<{ base64: string; mimeType: string; costMXN: number }> {
    const startTime = Date.now();
    let generation: Generation | null = null;
    const costMXN = ESTIMATED_COSTS.IMAGE;

    try {
        generation = await generationsService.create({
            title: 'Character Generation',
            generationType: 'image',
            prompt: prompt,
            generationParams: {
                aspectRatio,
                styleKeywords: styleDetails.keywords
            },
        });

        const result = await generateCharacterImage(prompt, aspectRatio, styleDetails);

        if (generation) {
            // Validate base64 data before sending
            if (!result.base64 || result.base64.length === 0) {
                throw new Error('Generated image data is empty');
            }

            console.log(`Sending image to backend: ${result.base64.length} chars`);

            // Send the actual base64 data to backend for upload to Supabase
            await generationsService.complete(generation.id, {
                outputUrl: result.base64, // Send actual base64 for backend to upload
                outputKey: `gen/${generation.id}`,
                mimeType: result.mimeType,
                costMxn: costMXN,
                generationTimeSeconds: Math.ceil((Date.now() - startTime) / 1000),
            });
        }

        return { ...result, costMXN };
    } catch (error) {
        if (generation) {
            await generationsService.fail(generation.id, error instanceof Error ? error.message : 'Unknown error');
        }
        throw error;
    }
}

/**
 * Generate image with logging
 */
export async function generateImageWithLogging(
    prompt: string,
    aspectRatio: AspectRatio,
    _apiKey: string,
    metadata: {
        styleId?: string;
        characterId?: string;
        title?: string;
        tags?: string[];
    }
): Promise<GenerationResult<string>> {
    const startTime = Date.now();
    let generation: Generation | null = null;
    const costMXN = ESTIMATED_COSTS.IMAGE;

    try {
        generation = await generationsService.create({
            title: metadata.title || 'Generated Image',
            generationType: 'image',
            prompt,
            styleId: metadata.styleId,
            characterId: metadata.characterId,
            generationParams: { aspectRatio },
        });

        // Determine if using style (passed in calling code usually implies prompt construction)
        // Here we just call the base generation
        // Wait, the calling code usually calls generateCharacterImage which handles prompt construction.
        // But this function `generateImageWithLogging` seems to be a wrapper around `generateImage` (the base one).
        // I need to match the signature expected by consumers (hooks).

        // Use generateCharacterImage logic here? 
        // Consumers pass constructed prompt to this function usually.

        const result = await generateCharacterImage(prompt, aspectRatio, null); // Style assumed in prompt

        if (generation) {
            // Validate base64 data before sending
            if (!result.base64 || result.base64.length === 0) {
                throw new Error('Generated image data is empty');
            }

            console.log(`Sending image to backend: ${result.base64.length} chars`);

            // Send the actual base64 data to backend for upload to Supabase
            await generationsService.complete(generation.id, {
                outputUrl: result.base64, // Send actual base64 for backend to upload
                outputKey: `gen/${generation.id}`,
                mimeType: result.mimeType,
                width: 1024,
                height: 1024,
                costMxn: costMXN,
                generationTimeSeconds: Math.ceil((Date.now() - startTime) / 1000),
            });
        }

        return {
            data: result.base64,
            costMXN
        };
    } catch (error) {
        if (generation) {
            await generationsService.fail(generation.id, error instanceof Error ? error.message : 'Unknown error');
        }
        throw error;
    }
}

/**
 * Generate video with logging
 */
export async function generateVideoWithLogging(
    imageBase64: string,
    motionPrompt: string,
    duration: number,
    metadata: {
        styleId?: string;
        characterId?: string;
        title?: string;
        sceneConfig?: any;
        useReferenceImage?: boolean;
        referenceImageBase64?: string;
    },
    _onProgress?: (message: string) => void
): Promise<{ videoBase64: string; mimeType: string; costMXN: number }> {
    const startTime = Date.now();
    let generation: Generation | null = null;
    const costMXN = ESTIMATED_COSTS.VIDEO * duration; // Per-second rate * duration

    try {
        generation = await generationsService.create({
            title: metadata.title || 'Generated Video',
            image: imageBase64,
            generationType: 'video',
            prompt: motionPrompt,
            styleId: metadata.styleId,
            characterId: metadata.characterId,
            sceneConfig: metadata.sceneConfig,
            generationParams: { duration, hasReferenceImage: !!metadata.referenceImageBase64 },
        });

        const result = metadata.useReferenceImage && metadata.referenceImageBase64
            ? await generateVideoWithRef(motionPrompt, metadata.referenceImageBase64)
            : await generateVideo(imageBase64, motionPrompt);

        if (generation) {
            // Validate base64 data before sending
            if (!result.videoBase64 || result.videoBase64.length === 0) {
                throw new Error('Generated video data is empty');
            }

            console.log(`Sending video to backend: ${result.videoBase64.length} chars`);

            // Send the actual base64 data to backend for upload to Supabase
            await generationsService.complete(generation.id, {
                outputUrl: result.videoBase64, // Send actual base64 for backend to upload
                outputKey: `gen/${generation.id}`,
                mimeType: result.mimeType,
                durationSeconds: duration,
                costMxn: costMXN,
                generationTimeSeconds: Math.ceil((Date.now() - startTime) / 1000),
            });
        }

        return { ...result, costMXN };
    } catch (error) {
        if (generation) {
            await generationsService.fail(generation.id, error instanceof Error ? error.message : 'Unknown error');
        }
        throw error;
    }
}

/**
 * Build video prompt helper
 */
export function buildVideoPrompt(
    escena: string,
    fondo: string | undefined,
    accion: string,
    dialogo: string,
    voiceStyle: string | undefined,
    movimiento: string | undefined,
    styleKeywords: string[],
    styleDetails: ParsedStyle,
    characterDescription: string,
    durationSeconds: number
): string {
    const parts = [
        `STRICT CHARACTER DESCRIPTION: ${characterDescription}`,
        `VISUAL STYLE: ${styleKeywords.join(', ')}`,
        `SCENE SETTING: ${escena}`,
    ];

    if (fondo) parts.push(`BACKGROUND DETAILS: ${fondo}`);
    parts.push(`ACTION: ${accion}`);
    parts.push(`DIALOGUE: "${dialogo}"`);
    if (voiceStyle) parts.push(`CHARACTER ATTITUDE/VOICE: ${voiceStyle}`); // Context for facial expression/acting
    if (movimiento) parts.push(`CAMERA/MOTION: ${movimiento}`);

    if (styleDetails?.lighting) parts.push(`LIGHTING: ${styleDetails.lighting}`);
    if (styleDetails?.colorPalette) parts.push(`COLOR PALETTE: ${styleDetails.colorPalette}`);
    if (styleDetails?.artisticStyle) parts.push(`ART STYLE: ${styleDetails.artisticStyle}`);

    // Technical constraints
    parts.push(`DURATION: ${durationSeconds} seconds`);

    // Final instruction
    parts.push('IMPORTANT: Maintain 100% consistency with the CHARACTER DESCRIPTION and VISUAL STYLE provided above. The character MUST look exactly as described.');

    return parts.join('\n\n');
}

/**
 * Build image prompt helper
 */
export function buildImagePrompt(
    escena: string,
    fondo: string | undefined,
    accion: string,
    styleKeywords: string[],
    styleDetails: ParsedStyle,
    characterDescription: string
): string {
    const parts = [
        `Character: ${characterDescription}`,
        `Scene Setting: ${escena}`,
    ];

    if (fondo) parts.push(`Background: ${fondo}`);
    parts.push(`Action/Pose: ${accion}`);
    parts.push(`Visual Style: ${styleKeywords.join(', ')}`);
    if (styleDetails?.lighting) parts.push(`Lighting: ${styleDetails.lighting}`);
    if (styleDetails?.colorPalette) parts.push(`Color Palette: ${styleDetails.colorPalette}`);
    if (styleDetails?.artisticStyle) parts.push(`Art Style: ${styleDetails.artisticStyle}`);

    parts.push('Generate a high-quality image maintaining the character\'s appearance and visual style consistency.');

    return parts.join('\n\n');
}

/**
 * Analyze a reference image for video generation context
 */
export async function analyzeReferenceImage(
    imageBase64: string,
    mimeType: string
): Promise<{ description: string }> {
    try {
        const response = await apiClient.post('/ai/analyze-character', {
            imageBase64,
            mimeType,
            customPrompt: `Describe this image in detail for video generation. Focus on:
1. The environment, setting, and spatial layout
2. Objects, materials, and their textures
3. Colors, color palette, and visual mood
4. Lighting conditions and atmosphere
5. Any notable elements or focal points

Write 3-5 sentences that capture the visual essence of this image, suitable as context for generating a video that brings this still image to life.`,
        });
        return response.data;
    } catch (error) {
        throw handleApiError(error, 'Error analyzing reference image');
    }
}

// Export for compatibility if needed
export const API_ENDPOINTS = {};
export const COST_PER_OPERATION = {
    imageGeneration: ESTIMATED_COSTS.IMAGE,
    videoPerSecond: ESTIMATED_COSTS.VIDEO,
    styleAnalysis: ESTIMATED_COSTS.STYLE,
};
