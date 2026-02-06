import type { GeminiResponse, ParsedStyle, AspectRatio } from '../../types';

// API Endpoints
export const API_ENDPOINTS = {
    // Gemini 2.0 Flash (for style extraction with vision)
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',

    // Imagen 3 (for image generation via Gemini 2.5 Flash)
    imagen: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',

    // Veo (for video generation - Limited Preview)
    veo: 'https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predict',
} as const;

// Style extraction prompt
const STYLE_EXTRACTION_PROMPT = `You are an expert visual style analyst. Analyze this image and extract a comprehensive style description that can be used to generate new images in the same aesthetic.

Provide your analysis in the following structured format:

## Visual Style Overview
[2-3 sentence summary of the overall aesthetic]

## Color Palette
[Detailed description of colors, tones, saturation levels]

## Artistic Style
[Art style, rendering technique, medium (photo-realistic, illustration, 3D render, painting, etc.)]

## Lighting & Atmosphere
[Lighting direction, intensity, mood, time of day if applicable]

## Composition & Framing
[Perspective, depth, focus, framing style]

## Texture & Detail Level
[Surface qualities, level of detail, grain/smoothness]

## Key Visual Elements
[Distinctive visual characteristics that define this style]

## Style Keywords
[Comma-separated list of 8-12 descriptive keywords for image generation]`;

/**
 * Validate API key by making a test call
 */
export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
        const response = await fetch(
            `${API_ENDPOINTS.gemini}?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Hello' }] }],
                }),
            }
        );

        if (response.ok) {
            return { valid: true };
        }

        const errorData = await response.json().catch(() => ({}));
        const status = response.status;

        switch (status) {
            case 400:
                return { valid: false, error: 'Invalid API key format' };
            case 401:
            case 403:
                return { valid: false, error: 'Invalid API key or insufficient permissions' };
            case 429:
                return {
                    valid: false,
                    error: 'Rate limit exceeded. Wait 24 hours or upgrade to paid tier.',
                };
            default:
                return {
                    valid: false,
                    error: errorData.error?.message || `API error: ${status}`,
                };
        }
    } catch (error) {
        return {
            valid: false,
            error: 'Unable to connect. Check your internet connection.',
        };
    }
}

/**
 * Extract visual style from an image using Gemini Vision
 */
export async function extractStyleFromImage(
    apiKey: string,
    imageBase64: string,
    mimeType: string,
    userGuidance?: string
): Promise<{ analysis: string; parsedStyle: ParsedStyle }> {
    const prompt = userGuidance
        ? `${STYLE_EXTRACTION_PROMPT}\n\nAdditional guidance from user: ${userGuidance}`
        : STYLE_EXTRACTION_PROMPT;

    const response = await fetch(
        `${API_ENDPOINTS.gemini}?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: imageBase64,
                                },
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Style extraction failed: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!analysis) {
        throw new Error('No style analysis returned from API');
    }

    // Parse the structured response
    const parsedStyle = parseStyleAnalysis(analysis);

    return { analysis, parsedStyle };
}

/**
 * Parse the structured style analysis into components
 */
function parseStyleAnalysis(analysis: string): ParsedStyle {
    const sections: Record<string, string> = {};
    const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=\n## |$)/g;
    let match;

    while ((match = sectionRegex.exec(analysis)) !== null) {
        const title = match[1].trim().toLowerCase();
        const content = match[2].trim();
        sections[title] = content;
    }

    // Extract keywords from the Style Keywords section
    const keywordsSection = sections['style keywords'] || '';
    const keywords = keywordsSection
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

    return {
        overview: sections['visual style overview'] || '',
        colorPalette: sections['color palette'] || '',
        artisticStyle: sections['artistic style'] || '',
        lighting: sections['lighting & atmosphere'] || sections['lighting'] || '',
        composition: sections['composition & framing'] || sections['composition'] || '',
        texture: sections['texture & detail level'] || sections['texture'] || '',
        keywords: keywords.length > 0 ? keywords : ['stylized', 'artistic'],
    };
}

/**
 * Generate a character image using Gemini 2.5 Flash with image generation
 */
export async function generateCharacterImage(
    apiKey: string,
    characterDescription: string,
    styleKeywords: string[],
    styleDetails: ParsedStyle,
    aspectRatio: AspectRatio = '1:1'
): Promise<{ base64: string; mimeType: string }> {
    // Construct comprehensive prompt
    const combinedPrompt = `Generate an image of: ${characterDescription}

Visual style: ${styleKeywords.join(', ')}
Color palette: ${styleDetails.colorPalette}
Lighting: ${styleDetails.lighting}
Art style: ${styleDetails.artisticStyle}
Texture: ${styleDetails.texture}

High quality, detailed, professional composition. Aspect ratio: ${aspectRatio}.`;

    const response = await fetch(
        `${API_ENDPOINTS.imagen}?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: combinedPrompt }],
                    },
                ],
            }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || '';

        if (response.status === 400 && errorMessage.includes('safety')) {
            throw new Error('Your prompt was flagged by content safety filters. Please modify your description.');
        }

        throw new Error(errorData.error?.message || `Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];

    // Find the image part in the response (typed as any for flexible parsing)
    const imagePart = parts.find((part: { inlineData?: { data: string; mimeType: string } }) => part.inlineData);

    if (!imagePart?.inlineData?.data) {
        throw new Error('No image returned from API');
    }

    return {
        base64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || 'image/png',
    };
}

/**
 * Check if Veo API is available for the given API key
 */
export async function checkVeoAccess(apiKey: string): Promise<boolean> {
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        // Try to list models or make a basic call
        // For now, assume it's available if the key works
        return true;
    } catch {
        return false;
    }
}

// Pricing constants
const TOKEN_PRICING_USD = {
    veoPerSecond: 0.05, // Estimated Veo pricing per second
};
const USD_TO_MXN = 17.5; // Approximate exchange rate

// Custom error class for API errors
class ApiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Build video prompt from scene configuration
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
        `Character: ${characterDescription}`,
        `Scene Setting: ${escena}`,
    ];

    if (fondo) {
        parts.push(`Background: ${fondo}`);
    }

    parts.push(`Action: ${accion}`);
    parts.push(`Character Dialogue: "${dialogo}"`);

    if (voiceStyle) {
        parts.push(`Voice Style: ${voiceStyle}`);
    }

    if (movimiento) {
        parts.push(`Camera/Motion: ${movimiento}`);
    }

    parts.push(`Visual Style: ${styleKeywords.join(', ')}`);
    parts.push(`Lighting: ${styleDetails.lighting}`);
    parts.push(`Color Palette: ${styleDetails.colorPalette}`);
    parts.push(`Art Style: ${styleDetails.artisticStyle}`);
    parts.push(`Duration: ${durationSeconds} seconds`);
    parts.push('Generate a high-quality video maintaining the character\'s appearance and visual style consistency.');

    return parts.join('\n\n');
}

/**
 * Generate a video using Veo 3.1
 */
export async function generateVideo(
    imageBase64: string,
    motionPrompt: string,
    duration: number,
    apiKey: string,
    onProgress?: (message: string) => void
): Promise<{ videoBase64: string; mimeType: string; costMXN: number }> {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    try {
        onProgress?.('Starting video generation...');

        // Generate video with Veo 3.1 using the image
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: motionPrompt,
            config: {
                aspectRatio: "9:16",
            },
            // Note: Image-to-video support commented out for now
            // image: {
            //     imageBytes: imageBase64,
            //     mimeType: 'image/png',
            // },
        });

        // Poll the operation status until the video is ready
        let pollCount = 0;
        const maxPolls = 60; // 10 minutes max (60 * 10 seconds)

        while (!operation.done && pollCount < maxPolls) {
            pollCount++;
            onProgress?.(`Generating video... (${pollCount * 10}s elapsed)`);

            await new Promise((resolve) => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({
                operation: operation,
            });
        }

        if (!operation.done) {
            throw new ApiError('Video generation timed out. Please try again.');
        }

        // Get the generated video
        const generatedVideos = operation.response?.generatedVideos;
        if (!generatedVideos || generatedVideos.length === 0) {
            throw new ApiError('No video generated. Please try again with a different prompt.');
        }

        onProgress?.('Downloading video...');

        // Get the video file
        const videoFile = generatedVideos[0].video;
        if (!videoFile || !videoFile.uri) {
            throw new ApiError('Video file not available.');
        }

        // Download the video manually using simple fetch (browser compatible)
        // SDK's download() tries to use file system which fails in browser
        const videoResponse = await fetch(videoFile.uri, {
            method: 'GET',
            headers: {
                'x-goog-api-key': apiKey,
            },
        });

        if (!videoResponse.ok) {
            throw new ApiError(`Failed to download video: ${videoResponse.statusText}`);
        }

        let videoBase64 = '';
        const arrayBuffer = await videoResponse.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        videoBase64 = btoa(binary);

        // Calculate estimated cost
        const costUSD = duration * TOKEN_PRICING_USD.veoPerSecond;
        const costMXN = costUSD * USD_TO_MXN;

        return {
            videoBase64,
            mimeType: 'video/mp4',
            costMXN
        };

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : 'Video generation failed';
        throw new ApiError(message);
    }
}

/**
 * Build a prompt for image generation
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

    if (fondo) {
        parts.push(`Background: ${fondo}`);
    }

    parts.push(`Action/Pose: ${accion}`);
    parts.push(`Visual Style: ${styleKeywords.join(', ')}`);
    parts.push(`Lighting: ${styleDetails.lighting}`);
    parts.push(`Color Palette: ${styleDetails.colorPalette}`);
    parts.push(`Art Style: ${styleDetails.artisticStyle}`);
    parts.push('Generate a high-quality image maintaining the character\'s appearance and visual style consistency.');

    return parts.join('\n\n');
}

// API Timeouts
const API_TIMEOUTS = {
    imageGeneration: 60000, // 60 seconds
    default: 30000,
};

// Cost calculation per operation type (USD)
const COST_PER_OPERATION = {
    imageGeneration: 0.02, // Estimated cost per image
};

// Result type for generations
export interface GenerationResult<T> {
    data: T;
    usage?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
    costMXN: number;
}

/**
 * Calculate cost in MXN
 */
function calculateCostMXN(usage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined, operationType: keyof typeof COST_PER_OPERATION): number {
    const baseCost = COST_PER_OPERATION[operationType] || 0;
    return baseCost * USD_TO_MXN;
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new ApiError('Request timed out. Please try again.');
        }
        throw error;
    }
}

/**
 * Parse API error from response
 */
function parseApiError(status: number, body: string): ApiError {
    try {
        const data = JSON.parse(body);
        const message = data.error?.message || `API error: ${status}`;
        return new ApiError(message);
    } catch {
        return new ApiError(`API error: ${status}`);
    }
}

/**
 * Retry wrapper for API calls
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on certain errors
            if (lastError instanceof ApiError && (
                lastError.message.includes('Invalid API key') ||
                lastError.message.includes('insufficient permissions')
            )) {
                throw lastError;
            }

            if (i < retries) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }

    throw lastError;
}

/**
 * Generate an image using Imagen 3 via Gemini API
 */
export async function generateImage(
    prompt: string,
    aspectRatio: AspectRatio,
    apiKey: string
): Promise<GenerationResult<string>> {
    const url = `${API_ENDPOINTS.imagen}?key=${apiKey}`;

    // Build enhanced prompt with aspect ratio hint
    const enhancedPrompt = `${prompt}. Aspect ratio: ${aspectRatio}.`;

    return withRetry(async () => {
        const response = await fetchWithTimeout(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: enhancedPrompt }]
                    }],
                }),
            },
            API_TIMEOUTS.imageGeneration
        );

        if (!response.ok) {
            const body = await response.text();
            throw parseApiError(response.status, body);
        }

        const data = await response.json();

        // Find the image part in the response
        const parts = data.candidates?.[0]?.content?.parts;
        if (!parts || parts.length === 0) {
            throw new ApiError('No image generated. Please try again with a different prompt.');
        }

        let imageBase64 = '';
        // Look for inline_data with image
        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
                imageBase64 = part.inlineData.data;
                break;
            }
            // Alternative format (snake_case)
            if (part.inline_data?.mimeType?.startsWith('image/')) {
                imageBase64 = part.inline_data.data;
                break;
            }
        }

        if (!imageBase64) {
            throw new ApiError('No image found in response. Please try again with a different prompt.');
        }

        const usage = data.usageMetadata;
        const costMXN = calculateCostMXN(usage, 'imageGeneration');

        return {
            data: imageBase64,
            usage,
            costMXN
        };
    });
}
