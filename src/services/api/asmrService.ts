import { PRICING } from '@/config/constants';
import { creditsService } from './creditsService';
import apiClient from '@/services/api/client';
import type { VideoDuration } from '@/types';

// ASMR Template definition
export interface ASMRTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    promptConstraints: string;
    negativePrompt: string;
    suggestions: string[];
}

// ASMR scene result
export interface ASMRSceneResult {
    escena: string;
    fondo?: string;
    accion: string;
    movimiento?: string;
    sonido: string; // Sound description for ASMR context
    suggestedDuration: VideoDuration;
}

export interface ASMRSceneGenerationResult {
    scene: ASMRSceneResult;
    tokensUsed: number;
    costMXN: number;
}

// ASMR Templates
export const ASMR_TEMPLATES: ASMRTemplate[] = [
    {
        id: 'no-character',
        name: 'No Character',
        description: 'Pure environment and object-focused ASMR. No people visible at all.',
        icon: '🚫',
        promptConstraints: 'STRICT RULE: NO human faces, NO people, NO characters, NO human bodies visible at any point. Focus entirely on objects, textures, environments, and ambient elements. The scene must be completely devoid of any human presence.',
        negativePrompt: 'person, people, human, face, body, hands, fingers, character, portrait, selfie',
        suggestions: [
            'Rain falling on a window with city lights in the background',
            'A crackling fireplace with snow visible outside',
            'Ocean waves gently washing over smooth pebbles',
        ],
    },
    {
        id: 'hands-only',
        name: 'Hands Only',
        description: 'Only hands visible performing satisfying actions. No face or body.',
        icon: '🤲',
        promptConstraints: 'STRICT RULE: ONLY hands and forearms may be visible. NO face, NO full body, NO torso. Focus on close-up shots of hands performing detailed, satisfying actions. The camera should be tight on the hands and the objects they interact with.',
        negativePrompt: 'face, full body, torso, head, portrait, wide shot',
        suggestions: [
            'Hands carefully arranging colorful macarons in a box',
            'Hands molding and shaping soft clay on a pottery wheel',
            'Hands writing calligraphy with an ink pen on textured paper',
        ],
    },
    {
        id: 'close-up-objects',
        name: 'Close-up Objects',
        description: 'Macro shots of satisfying textures, materials, and objects.',
        icon: '🔍',
        promptConstraints: 'STRICT RULE: Extreme close-up and macro perspective. NO people visible. Focus on the intricate details of objects, materials, and textures. Use shallow depth of field to emphasize surface details. The camera should be very close to the subject.',
        negativePrompt: 'person, people, human, face, wide shot, landscape',
        suggestions: [
            'Kinetic sand being sliced with a knife in extreme close-up',
            'Soap being carved with precise cuts, revealing layers',
            'Paint being mixed slowly on a palette, colors blending together',
        ],
    },
    {
        id: 'nature-ambient',
        name: 'Nature & Ambient',
        description: 'Calming nature scenes with ambient atmosphere.',
        icon: '🌿',
        promptConstraints: 'STRICT RULE: NO people visible. Focus on natural environments: forests, water, plants, weather. Emphasize the peaceful, meditative quality of nature. Slow, gentle movements. Capture the subtle sounds and movements of the natural world.',
        negativePrompt: 'person, people, human, face, urban, city, building, car',
        suggestions: [
            'Morning dew drops on leaves in a misty forest',
            'A gentle stream flowing over mossy rocks',
            'Cherry blossom petals falling slowly in soft light',
        ],
    },
    {
        id: 'cooking-food',
        name: 'Cooking & Food',
        description: 'Food preparation with satisfying sounds and textures.',
        icon: '🍳',
        promptConstraints: 'Focus on food and cooking from a close-up, overhead, or first-person perspective. Hands may be visible but NO face. Emphasize the textures, colors, and satisfying aspects of food preparation. Highlight sizzling, chopping, pouring, and plating.',
        negativePrompt: 'face, portrait, full body, wide room shot',
        suggestions: [
            'Chocolate being poured over a dessert in slow motion',
            'Vegetables being precisely chopped on a wooden cutting board',
            'Pancake batter being poured onto a sizzling griddle',
        ],
    },
    {
        id: 'art-crafts',
        name: 'Art & Crafts',
        description: 'Creative and artistic activities with satisfying processes.',
        icon: '🎨',
        promptConstraints: 'Focus on creative processes from a close-up or overhead perspective. Hands may be visible but NO face. Emphasize the satisfying aspects of creating art: paint spreading, clay shaping, paper folding. Show the transformation of raw materials into art.',
        negativePrompt: 'face, portrait, full body, wide room shot',
        suggestions: [
            'Watercolor paint flowing across wet paper',
            'Resin being poured into a mold with dried flowers',
            'Origami paper being folded into an intricate crane',
        ],
    },
];

// ASMR Scene Builder Prompt
const ASMR_SCENE_BUILDER_PROMPT = `You are an expert ASMR video scene planner. Given a user's description and ASMR template constraints, generate a detailed scene configuration optimized for ASMR content.

CRITICAL: This is ASMR content. Focus on:
- Visual satisfaction and texture details
- Slow, deliberate movements
- Close-up and macro perspectives
- Calming, meditative atmosphere
- There should be NO dialogue/speech (ASMR is about ambient sounds and visuals)

Respond in JSON format with exact field names:
{
    "escena": "Detailed scene setting with emphasis on textures, materials, lighting, and atmosphere",
    "fondo": "Background elements that enhance the ASMR ambiance - optional",
    "accion": "The specific action being performed - slow, deliberate, satisfying movements",
    "movimiento": "Camera movements - typically slow pans, gentle zooms, or static close-ups",
    "sonido": "Description of the ambient/ASMR sounds expected (for context, not audio generation)",
    "suggestedDuration": "Recommended duration: 4, 6, or 8 seconds"
}

Guidelines:
- suggestedDuration must be exactly 2, 4, 6, or 8
- Focus on visual satisfaction and texture
- Keep everything slow and calming
- All text should be in the same language as the user's input
- IMPORTANT: Keep each field value to 1-3 concise sentences. Do NOT write overly long descriptions.`;

/**
 * Generate ASMR scene configuration
 */
export async function generateASMRSceneConfig(
    prompt: string,
    template: ASMRTemplate
): Promise<ASMRSceneGenerationResult> {
    const { balance } = await creditsService.getBalance();
    const estimatedCost = PRICING.SCENE_BUILDER;
    if (balance < estimatedCost) {
        throw new Error(`Insufficient credits. Required: $${estimatedCost.toFixed(2)} MXN, Available: $${balance.toFixed(2)} MXN`);
    }

    const fullPrompt = `${ASMR_SCENE_BUILDER_PROMPT}

TEMPLATE CONSTRAINTS (MUST FOLLOW):
${template.promptConstraints}

User's ASMR video idea: "${prompt}"

Generate the ASMR scene configuration JSON:`;

    const response = await apiClient.post('/ai/generate-text', {
        prompt: fullPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
    });

    const { text: textContent, tokensUsed } = response.data;

    if (!textContent) {
        throw new Error('No scene generated. Please try again.');
    }

    let parsedScene: ASMRSceneResult;
    try {
        parsedScene = JSON.parse(textContent);
    } catch {
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsedScene = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('Failed to parse ASMR scene configuration. Please try again.');
        }
    }

    const validDurations: VideoDuration[] = [2, 4, 6, 8];
    let dur = Number(parsedScene.suggestedDuration);
    if (!validDurations.includes(dur as VideoDuration)) {
        dur = validDurations.reduce((prev, curr) =>
            Math.abs(curr - dur) < Math.abs(prev - dur) ? curr : prev
        );
    }

    return {
        scene: {
            escena: parsedScene.escena || '',
            fondo: parsedScene.fondo || '',
            accion: parsedScene.accion || '',
            movimiento: parsedScene.movimiento || '',
            sonido: parsedScene.sonido || '',
            suggestedDuration: dur as VideoDuration,
        },
        tokensUsed,
        costMXN: PRICING.SCENE_BUILDER,
    };
}

/**
 * Build ASMR video prompt with template constraints
 */
export function buildASMRVideoPrompt(
    template: ASMRTemplate,
    escena: string,
    fondo: string | undefined,
    accion: string,
    movimiento: string | undefined,
    durationSeconds: number
): string {
    const parts = [
        `ASMR VIDEO - ${template.name.toUpperCase()}`,
        `CRITICAL CONSTRAINTS: ${template.promptConstraints}`,
        `SCENE SETTING: ${escena}`,
    ];

    if (fondo) parts.push(`BACKGROUND: ${fondo}`);
    parts.push(`ACTION: ${accion}`);
    if (movimiento) parts.push(`CAMERA/MOTION: ${movimiento}`);

    parts.push(`DURATION: ${durationSeconds} seconds`);
    parts.push('STYLE: Cinematic ASMR aesthetic. Soft, warm lighting. Shallow depth of field. Slow, deliberate movements. High detail on textures and materials.');
    parts.push(`IMPORTANT: This is ASMR content. ${template.promptConstraints} Maintain a calm, satisfying visual experience throughout.`);

    return parts.join('\n\n');
}

export const asmrService = {
    templates: ASMR_TEMPLATES,
    generateASMRSceneConfig,
    buildASMRVideoPrompt,
};

export default asmrService;
