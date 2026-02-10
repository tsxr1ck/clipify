import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { env } from '../config/environment.js';

// Initialize Vertex AI core
const vertexAI = new VertexAI({
    project: env.GOOGLE_CLOUD_PROJECT_ID,
    location: 'us-central1'
});

// Models
const MODELS = {
    flash: 'gemini-2.5-flash',
    imagen: 'imagen-4.0-generate-001',
    imagenFallback: 'gemini-2.5-flash-image', // Fallback for quota limits
    veo: 'veo-3.1-generate-001'
} as const;

// Interface for parsed style
export interface ParsedStyle {
    overview: string;
    colorPalette: string;
    artisticStyle: string;
    lighting: string;
    composition: string;
    texture: string;
    keywords: string[];
}

export class AIService {
    /**
     * Helper to get a generative model instance
     */
    private getModel(modelName: string) {
        return vertexAI.getGenerativeModel({
            model: modelName,
            safetySettings: [{
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }, {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }, {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }, {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }]
        });
    }

    /**
     * Analyze character image
     */
    //     async analyzeCharacter(imageBase64: string, mimeType: string): Promise<string> {
    //         const prompt = `Analyze this character image and provide a detailed visual description for image generation.
    // Focus on describing:
    // 1. **Subject/Character**: What or who is depicted (person, animal, creature, object)
    // 2. **Appearance**: Physical features, body type, facial features, expression
    // 3. **Clothing/Accessories**: What they're wearing or carrying
    // 4. **Pose/Action**: How they're positioned or what they're doing
    // 5. **Notable Details**: Any distinctive features, props, or elements

    // Write a concise but comprehensive prompt suitable for regenerating this character in a different art style.
    // Format as a single paragraph, 2-4 sentences.
    // Do NOT mention the art style, colors, or lighting - focus only on the SUBJECT itself.`;

    //         try {
    //             const model = this.getModel(MODELS.flash);
    //             const result = await model.generateContent({
    //                 contents: [{
    //                     role: 'user',
    //                     parts: [
    //                         { text: prompt },
    //                         {
    //                             inlineData: {
    //                                 mimeType: mimeType,
    //                                 data: imageBase64,
    //                             },
    //                         },
    //                     ],
    //                 }],
    //                 generationConfig: {
    //                     temperature: 0.5,
    //                     maxOutputTokens: 500,
    //                 },
    //             });

    //             const response = await result.response;
    //             return response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    //         } catch (error) {
    //             console.error('Character analysis error:', error);
    //             throw error;
    //         }
    //     }
    async analyzeCharacter(
        imageBase64: string,
        mimeType: string,
        customPrompt?: string  // ← NEW: Accept custom prompt
    ): Promise<string> {
        const defaultPrompt = `Analyze this character...`; // Simple default

        const prompt = customPrompt || defaultPrompt;

        try {
            const model = this.getModel(MODELS.flash);
            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: imageBase64,
                            },
                        },
                    ],
                }],
                generationConfig: {
                    temperature: 0.4,      // Lower for consistency
                    maxOutputTokens: 2048, // Increased for detail
                },
            });

            const response = await result.response;
            return response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        } catch (error) {
            console.error('Character analysis error:', error);
            throw error;
        }
    }
    /**
     * Extract style from image
     */
    async extractStyle(imageBase64: string, mimeType: string, userGuidance?: string): Promise<{ analysis: string; parsedStyle: ParsedStyle }> {
        const basePrompt = `You are an expert visual style analyst. Analyze this image and extract a comprehensive style description.
Provide your analysis in the following structured format:

## Visual Style Overview
[Summary]

## Color Palette
[Description]

## Artistic Style
[Style, technique, medium]

## Lighting & Atmosphere
[Lighting, mood]

## Composition & Framing
[Perspective, depth]

## Texture & Detail Level
[Surface qualities]

## Style Keywords
[Comma-separated list of 8-12 descriptive keywords]`;

        const prompt = userGuidance
            ? `${basePrompt}\n\nAdditional guidance: ${userGuidance}`
            : basePrompt;

        try {
            const model = this.getModel(MODELS.flash);
            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: imageBase64,
                            },
                        },
                    ],
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                },
            });

            const response = await result.response;
            const analysis = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

            return {
                analysis,
                parsedStyle: this.parseStyleAnalysis(analysis),
            };
        } catch (error) {
            console.error('Style extraction error:', error);
            throw error;
        }
    }

    /**
     * Parse style analysis string
     */
    private parseStyleAnalysis(analysis: string): ParsedStyle {
        const sections: Record<string, string> = {};
        const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=\n## |$)/g;
        let match;

        while ((match = sectionRegex.exec(analysis)) !== null) {
            const title = match[1].trim().toLowerCase();
            const content = match[2].trim();
            sections[title] = content;
        }

        const keywords = (sections['style keywords'] || '')
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

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
     * Generate image using Imagen on Vertex AI with fallback support
     */
    async generateImage(prompt: string, aspectRatio: string, imageBase64?: string, mimeType?: string): Promise<string> {
        // Try with primary model first, then fallback if quota exceeded
        const modelsToTry = [MODELS.imagen, MODELS.imagenFallback];
        let lastError: any;

        for (let i = 0; i < modelsToTry.length; i++) {
            const modelName = modelsToTry[i];
            const isFallback = i > 0;

            try {
                if (isFallback) {
                    console.log(`⚠ Trying fallback model: ${modelName}`);
                }

                const model = this.getModel(modelName);

                const parts: any[] = [{ text: `${prompt} Aspect ratio: ${aspectRatio}` }];

                if (imageBase64 && mimeType) {
                    parts.push({
                        inlineData: {
                            mimeType: mimeType,
                            data: imageBase64
                        }
                    });
                }

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: parts }],
                });

                const response = await result.response;
                const candidates = response.candidates || [];

                if (isFallback) {
                    console.log(`✓ Successfully generated image using fallback model: ${modelName}`);
                }

                // Success - return result
                return this.extractImageFromCandidates(candidates);

            } catch (error: any) {
                lastError = error;

                // Check if it's a quota/rate limit error
                const isQuotaError =
                    error?.message?.includes('429') ||
                    error?.message?.includes('RESOURCE_EXHAUSTED') ||
                    error?.message?.includes('Quota exceeded') ||
                    error?.status === 429 ||
                    error?.code === 429;

                if (isQuotaError && i < modelsToTry.length - 1) {
                    console.log(`⚠ Quota exceeded for ${modelName}, trying fallback...`);
                    continue; // Try next model
                } else {
                    // Not a quota error, or we're out of fallbacks
                    throw error;
                }
            }
        }

        // If we got here, all models failed
        console.error('All image generation models failed:', lastError);
        throw lastError;
    }

    /**
     * Extract base64 image from Imagen response candidates
     */
    private extractImageFromCandidates(candidates: any[]): string {
        for (const candidate of candidates) {
            const contentParts = candidate.content?.parts || [];
            for (const part of contentParts) {
                if (part.inlineData?.mimeType?.startsWith('image/') || part.inlineData?.data) {
                    return part.inlineData.data;
                }
            }
        }

        throw new Error('No image generated in response');
    }

    /**
     * Generate video using Veo on Vertex AI (LRO)
     */
    async generateVideo(prompt: string): Promise<string> {
        try {
            console.log('Starting video generation (Veo LRO) with prompt:', prompt.substring(0, 50) + '...');

            const { GoogleAuth } = await import('google-auth-library');
            const auth = new GoogleAuth({
                scopes: 'https://www.googleapis.com/auth/cloud-platform'
            });
            const client = await auth.getClient();
            const accessToken = await client.getAccessToken();
            const token = accessToken.token;

            if (!token) throw new Error('Failed to get access token for Veo generation');

            const projectId = env.GOOGLE_CLOUD_PROJECT_ID;
            const location = 'us-central1';
            const modelId = MODELS.veo;

            // IMPORTANT: Use v1beta1 for publisher models like Veo
            // The v1 API doesn't fully support all publisher model operations yet
            const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predictLongRunning`;

            console.log('Calling Veo endpoint:', endpoint);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instances: [{
                        prompt: prompt,

                        negativePrompt: "distorted, low quality, watermark, blurry, deformed, ugly, bad anatomy, bad quality, low resolution"
                    }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "9:16"  // Vertical video for shorts/reels
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Veo init error:', errorText);
                throw new Error(`Veo init failed: ${response.status} ${errorText}`);
            }

            const operation = await response.json() as any;
            const operationName = operation.name;
            console.log('Veo operation started:', operationName);
            console.log('Full operation object:', JSON.stringify(operation, null, 2));

            // Polling loop
            let attempts = 0;
            const maxAttempts = 90; // 90 * 3s = 4.5 minutes (Veo can take a while)

            while (attempts < maxAttempts) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s between polls

                // Poll using v1beta1 and the FULL operation name as returned
                // The operation name format should be consistent with the API version used
                const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;

                // console.log(`Polling attempt ${attempts}/${maxAttempts}: ${pollUrl}`);
                const pollRes = await fetch(pollUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'operationName': operationName
                    })
                });

                if (!pollRes.ok) {
                    const errorText = await pollRes.text();
                    console.error(`Polling failed (${pollRes.status}):`, errorText);

                    // Try alternative: maybe operation is in standard operations path
                    if (pollRes.status === 404 && attempts === 1) {
                        // Extract just the operation ID and try the standard path
                        const opId = operationName.split('/operations/').pop();
                        if (opId) {
                            const altPollUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/operations/${opId}`;
                            console.log('Trying alternative URL:', altPollUrl);

                            const altPollRes = await fetch(altPollUrl, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });

                            if (altPollRes.ok) {
                                // Use this URL pattern going forward
                                console.log('Alternative URL works! Using standard operations path.');
                                const altPollData = await altPollRes.json() as any;

                                if (altPollData.done) {
                                    return this.extractVideoFromOperation(altPollData);
                                }
                                continue;
                            }
                        }
                    }

                    // Don't fail immediately, keep trying
                    if (attempts < 5) {
                        continue;
                    }

                    throw new Error(`Polling failed after ${attempts} attempts: ${pollRes.status} ${errorText}`);
                }

                const pollData = await pollRes.json() as any;
                // console.log(`Poll status: ${pollData.done ? 'DONE' : 'RUNNING'}`);
                if (pollData.done) {
                    console.log('Full poll response:', JSON.stringify(pollData, null, 2));
                    return this.extractVideoFromOperation(pollData);
                }

                // Still running...
            }

            throw new Error('Video generation timed out after 4.5 minutes');

        } catch (error) {
            console.error('Video generation error:', error);
            throw error;
        }
    }

    /**
     * CORRECTED VERSION - extractVideoFromOperation method
     * 
     * ISSUE: The original code checked video.content but Veo 3.1 actually returns
     * video.bytesBase64Encoded in the videos array.
     * 
     * ACTUAL VEO 3.1 RESPONSE:
     * {
     *   "response": {
     *     "videos": [
     *       {
     *         "bytesBase64Encoded": "...",
     *         "mimeType": "video/mp4"
     *       }
     *     ]
     *   }
     * }
     * 
     * FIX: Check for bytesBase64Encoded FIRST in the videos array
     */

    private extractVideoFromOperation(pollData: any): string {
        if (pollData.error) {
            throw new Error(`Veo generation error: ${JSON.stringify(pollData.error)}`);
        }

        console.log('Extracting video from operation response...');

        // FORMAT 1: Standard predictions array (most common for Vertex AI)
        const predictions = pollData.response?.predictions || [];

        if (predictions.length > 0) {
            const prediction = predictions[0];
            console.log('Found prediction:', {
                hasMimeType: !!prediction.mimeType,
                hasContent: !!prediction.content,
                contentLength: prediction.content?.length || 0
            });

            // Check for base64 encoded video content
            if (prediction.content && prediction.mimeType === 'video/mp4') {
                console.log('✓ Found video in predictions[0].content');
                return prediction.content;
            }

            // Try other field names for base64 content
            if (prediction.bytesBase64Encoded) {
                console.log('✓ Found video in predictions[0].bytesBase64Encoded');
                return prediction.bytesBase64Encoded;
            }

            if (prediction.videoBytes) {
                console.log('✓ Found video in predictions[0].videoBytes');
                return prediction.videoBytes;
            }

            if (prediction.bytes) {
                console.log('✓ Found video in predictions[0].bytes');
                return prediction.bytes;
            }

            // Nested video object
            if (prediction.video?.video_bytes) {
                console.log('✓ Found video in predictions[0].video.video_bytes');
                return prediction.video.video_bytes;
            }

            // Check for GCS URI (not ideal, but we'll handle it)
            if (prediction.uri || prediction.gcsUri) {
                const uri = prediction.uri || prediction.gcsUri;
                console.warn('⚠ Veo returned GCS URI instead of bytes:', uri);
                throw new Error(`Video generated but stored at GCS URI: ${uri}. Download from bucket to access.`);
            }
        }

        // FORMAT 2: Videos array (Veo 3.1 response structure)
        const videos = pollData.response?.videos || [];

        if (videos.length > 0) {
            const video = videos[0];
            console.log('Found video in videos array:', {
                hasBytesBase64Encoded: !!video.bytesBase64Encoded,
                hasGcsUri: !!video.gcsUri,
                hasMimeType: !!video.mimeType,
                hasContent: !!video.content
            });

            // CRITICAL FIX: Check for bytesBase64Encoded FIRST (Veo 3.1 format)
            if (video.bytesBase64Encoded) {
                console.log('✓ Found video in videos[0].bytesBase64Encoded');
                console.log('Video data length:', video.bytesBase64Encoded.length);
                return video.bytesBase64Encoded;
            }

            // Check for base64 content (alternative field name)
            if (video.content && video.mimeType === 'video/mp4') {
                console.log('✓ Found video in videos[0].content');
                return video.content;
            }

            // Otherwise, GCS URI
            if (video.gcsUri) {
                console.warn('⚠ Veo returned GCS URI:', video.gcsUri);
                throw new Error(`Video generated at GCS: ${video.gcsUri}. Download from bucket to access.`);
            }
        }

        // FORMAT 3: Direct response content (rare)
        if (pollData.response?.content && pollData.response?.mimeType === 'video/mp4') {
            console.log('✓ Found video in response.content');
            return pollData.response.content;
        }

        // If we got here, we couldn't find the video
        console.error('❌ Could not find video in any expected location');
        console.error('Available response keys:', Object.keys(pollData.response || {}));
        console.error('Predictions structure:', predictions.length > 0 ? Object.keys(predictions[0]) : 'none');
        console.error('Videos structure:', videos.length > 0 ? Object.keys(videos[0]) : 'none');
        console.error('Complete operation data:', JSON.stringify(pollData, null, 2));

        throw new Error('Video generation completed but no video bytes found in response. Check logs for details.');
    }

    /**
     * Generate text using Gemini
     */
    async generateText(
        prompt: string,
        options?: {
            temperature?: number;
            maxOutputTokens?: number;
            responseMimeType?: string;
        }
    ): Promise<{ text: string; tokensUsed: number }> {
        try {
            const model = this.getModel(MODELS.flash);
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: options?.temperature ?? 0.7,
                    maxOutputTokens: options?.maxOutputTokens ?? 2048,
                    responseMimeType: options?.responseMimeType,
                },
            });

            const response = await result.response;
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

            return { text, tokensUsed };
        } catch (error) {
            console.error('Text generation error:', error);
            throw error;
        }
    }
}

export const aiService = new AIService();