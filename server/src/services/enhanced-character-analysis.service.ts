import { aiService } from './ai.service.js';
import { generationsService } from './generations.service.js';
import type { Generation } from '@prisma/client';

// Pricing: Gemini 2.5 Flash text analysis - matches pricing.ts calculatePrice('style')
// Base $0.01 USD + 50% markup = $0.015 USD * 17.5 MXN/USD = ~$0.26 MXN
const ESTIMATED_COSTS = {
    STYLE: 0.26, // MXN - must match server/src/config/pricing.ts
};

/**
 * ENHANCED CHARACTER ANALYSIS PROMPT
 * Focuses heavily on facial features for accurate recreation
 */
const DETAILED_CHARACTER_ANALYSIS_PROMPT = `You are an expert character analyst for AI image generation. Your job is to create an EXTREMELY DETAILED character description that will allow EXACT recreation of this person in future AI generations.

CRITICAL: Be OBSESSIVELY detailed about facial features. Every detail matters for character consistency.

Provide your analysis in this EXACT format (be very specific in each section):

## FACIAL STRUCTURE
- Face shape: [Be specific: oval, round, square, heart-shaped, diamond, long, etc.]
- Jawline: [Define clearly: strong/soft, angular/rounded, wide/narrow, defined/gentle]
- Chin: [Shape and prominence: pointed, rounded, cleft, recessed, prominent, etc.]
- Cheekbones: [High/low, prominent/subtle, wide/narrow]
- Forehead: [Size and shape: broad/narrow, high/low, rounded/flat]

## EYES (MOST CRITICAL - BE VERY DETAILED)
- Eye color: [Exact color: bright blue, deep brown, hazel with green flecks, gray-blue, etc.]
- Eye shape: [Almond, round, hooded, upturned, downturned, monolid, deep-set, wide-set, close-set]
- Eye size: [Large, medium, small, proportionate to face]
- Eye spacing: [Wide-set, close-set, average]
- Eyelids: [Visible/hidden crease, hooded, prominent]
- Eyebrows: [Thick/thin, arched/straight, high/low, color, natural/groomed, length]
- Eyelashes: [Long/short, thick/sparse, curled/straight]
- Eye expression: [Warm, intense, gentle, piercing, etc.]

## NOSE
- Overall shape: [Button, Roman, Greek, snub, hawk, turned-up, wide, narrow]
- Bridge: [High/low, straight/curved, wide/narrow]
- Tip: [Rounded/pointed, upturned/downturned, bulbous/refined]
- Nostrils: [Flared/narrow, wide/small, visible/subtle]
- Size relative to face: [Proportionate, small, large, prominent]

## MOUTH & LIPS
- Lip fullness: [Full, thin, medium, plump upper/lower, balanced/unbalanced]
- Lip shape: [Cupid's bow pronounced/subtle, wide/narrow, heart-shaped, bow-shaped]
- Mouth width: [Wide, narrow, proportionate to face]
- Smile: [Wide, subtle, lopsided, symmetric, shows teeth/doesn't]
- Teeth: [Visible/not, straight/gapped, white/natural]
- Lip color: [Natural pink, rose, pale, deep, etc.]

## SKIN
- Skin tone: [Be specific: fair/ivory/beige/tan/olive/brown/dark, warm/cool/neutral undertones]
- Texture: [Smooth, textured, freckled, clear, weathered]
- Notable features: [Freckles (where?), moles (where?), beauty marks, dimples, wrinkles, laugh lines]
- Age appearance: [Estimate: looks 20s, early 30s, mid-40s, etc.]

## HAIR
- Color: [Exact shade: platinum blonde, honey blonde, auburn, chestnut brown, jet black, salt-and-pepper, etc.]
- Style: [Long/short, straight/wavy/curly, parted where?, styled how?]
- Texture: [Fine, thick, coarse, silky, voluminous, flat]
- Length: [Specific: shoulder-length, chin-length, cropped, waist-length]
- Notable features: [Bangs, layers, highlights, graying at temples, etc.]

## DISTINCTIVE FEATURES
- List ANY unique characteristics:
  - Scars, birthmarks, tattoos (location and description)
  - Piercings (where and what type)
  - Facial hair (style, color, grooming)
  - Glasses (style, color, shape)
  - Accessories (earrings, necklace, etc.)
  - Expression lines (crow's feet, smile lines, forehead lines)
  - Asymmetries (if any)
  - Any other memorable features

## OVERALL IMPRESSION
- Age: [Estimate]
- Ethnicity/Heritage: [If apparent: European, Asian, African, Latin, Middle Eastern, Mixed, etc.]
- Gender presentation: [Male, female, androgynous]
- Build visible: [If visible: slim, athletic, stocky, broad-shouldered, etc.]

## AI GENERATION PROMPT (READY TO USE)
[Synthesize all the above into a single, detailed paragraph optimized for AI image generation. Include EVERY important facial detail in a natural, flowing description that an AI can use to recreate this exact person. Start with "A person with..." and include all critical facial features.]

REMEMBER: The goal is EXACT recreation. Every facial feature matters. Be forensically detailed.`;

/**
 * Analyze character image with enhanced detail for recreation
 */
async function analyzeCharacterImage(
    imageBase64: string,
    mimeType: string
): Promise<{ description: string }> {
    try {
        const result = await aiService.analyzeCharacter(
            imageBase64,
            mimeType,
            DETAILED_CHARACTER_ANALYSIS_PROMPT // Use enhanced prompt
        );

        // The result now contains extremely detailed facial analysis
        return { description: result };
    } catch (error) {
        console.error('Character analysis error:', error);
        throw error;
    }
}

/**
 * Main exported function with logging
 */
export async function analyzeCharacterImageWithLogging(
    userId: string,
    imageBase64: string,
    mimeType: string
): Promise<{ description: string; costMXN: number }> {
    const startTime = Date.now();
    let generation: Generation | null = null;
    const costMXN = ESTIMATED_COSTS.STYLE;

    try {
        generation = await generationsService.create({
            userId,
            title: 'Detailed Character Analysis',
            generationType: 'image',
            prompt: 'Analyze character facial features for recreation',
            folder: 'analysis'
        });

        console.log('🔍 Starting detailed character analysis...');
        const result = await analyzeCharacterImage(imageBase64, mimeType);
        console.log('✅ Character analysis complete');
        console.log(`📊 Analysis length: ${result.description.length} characters`);

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
        console.error('❌ Character analysis failed:', error);
        if (generation) {
            await generationsService.fail(
                generation.id,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
        throw error;
    }
}

/**
 * Extract just the AI-ready prompt from detailed analysis
 */
export function extractAIPrompt(detailedDescription: string): string {
    // Look for the "AI GENERATION PROMPT" section
    const promptMatch = detailedDescription.match(
        /## AI GENERATION PROMPT.*?\n(.*?)(?=\n##|\n\n##|$)/s
    );

    if (promptMatch && promptMatch[1]) {
        return promptMatch[1].trim();
    }

    // Fallback: return the whole description
    return detailedDescription;
}

/**
 * Parse structured analysis into sections
 */
export function parseCharacterAnalysis(description: string) {
    const sections: Record<string, string> = {};

    const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=\n## |$)/g;
    let match;

    while ((match = sectionRegex.exec(description)) !== null) {
        const title = match[1].trim();
        const content = match[2].trim();
        sections[title] = content;
    }

    return {
        facialStructure: sections['FACIAL STRUCTURE'] || '',
        eyes: sections['EYES (MOST CRITICAL - BE VERY DETAILED)'] || sections['EYES'] || '',
        nose: sections['NOSE'] || '',
        mouthAndLips: sections['MOUTH & LIPS'] || '',
        skin: sections['SKIN'] || '',
        hair: sections['HAIR'] || '',
        distinctiveFeatures: sections['DISTINCTIVE FEATURES'] || '',
        overallImpression: sections['OVERALL IMPRESSION'] || '',
        aiPrompt: sections['AI GENERATION PROMPT (READY TO USE)'] || sections['AI GENERATION PROMPT'] || '',
        fullAnalysis: description,
    };
}