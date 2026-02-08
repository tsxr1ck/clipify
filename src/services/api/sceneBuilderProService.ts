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
    // New fields for hyper-realism
    condicionesFisicas?: string;
    defectosTecnicos?: string;
    contextoInvisible?: string;
}

// Response from scene generation including cost info
export interface SceneGenerationResult {
    scene: SceneBuilderResult;
    tokensUsed: number;
    costMXN: number;
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
}

/**
 * ULTRA-ROBUST JSON PARSER
 * Handles ANY format the AI might return
 */
function parseJsonResponse(textContent: string, context: 'scene' | 'story' = 'scene'): any {
    if (!textContent || textContent.trim().length === 0) {
        throw new Error('Empty response from AI');
    }

    console.log(`[JSON Parser] Attempting to parse ${context} response (${textContent.length} chars)`);
    console.log('[JSON Parser] Raw response preview:', textContent.substring(0, 200));

    // STRATEGY 1: Direct parse (ideal case)
    try {
        const parsed = JSON.parse(textContent.trim());
        console.log('[JSON Parser] ✓ Strategy 1 SUCCESS: Direct parse');
        return parsed;
    } catch (e) {
        console.log('[JSON Parser] ✗ Strategy 1 failed:', e instanceof Error ? e.message : 'unknown');
    }

    // STRATEGY 2: Remove markdown code blocks
    let cleaned = textContent
        .replace(/```json\s*/gi, '')
        .replace(/```javascript\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    try {
        const parsed = JSON.parse(cleaned);
        console.log('[JSON Parser] ✓ Strategy 2 SUCCESS: Removed markdown');
        return parsed;
    } catch (e) {
        console.log('[JSON Parser] ✗ Strategy 2 failed');
    }

    // STRATEGY 3: Extract JSON with greedy regex
    const jsonMatches = cleaned.match(/\{[\s\S]*\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
        // Try each match (in case there are multiple JSON objects)
        for (let i = 0; i < jsonMatches.length; i++) {
            try {
                const parsed = JSON.parse(jsonMatches[i]);
                console.log(`[JSON Parser] ✓ Strategy 3 SUCCESS: Regex match #${i + 1}`);
                return parsed;
            } catch (e) {
                console.log(`[JSON Parser] ✗ Strategy 3.${i + 1} failed`);
            }
        }
    }

    // STRATEGY 4: Find balanced braces
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
            const extracted = cleaned.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(extracted);
            console.log('[JSON Parser] ✓ Strategy 4 SUCCESS: Brace extraction');
            return parsed;
        } catch (e) {
            console.log('[JSON Parser] ✗ Strategy 4 failed');
        }
    }

    // STRATEGY 5: Clean invisible/problematic characters
    const superCleaned = cleaned
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control chars
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

    try {
        const parsed = JSON.parse(superCleaned);
        console.log('[JSON Parser] ✓ Strategy 5 SUCCESS: Character cleanup');
        return parsed;
    } catch (e) {
        console.log('[JSON Parser] ✗ Strategy 5 failed');
    }

    // STRATEGY 6: Try to find and extract array (for story mode)
    if (context === 'story') {
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            try {
                const parsed = JSON.parse(arrayMatch[0]);
                if (Array.isArray(parsed)) {
                    console.log('[JSON Parser] ✓ Strategy 6 SUCCESS: Array extraction (story)');
                    return {
                        storyTitle: 'Generated Story',
                        storyDescription: 'AI-generated story',
                        segments: parsed
                    };
                }
            } catch (e) {
                console.log('[JSON Parser] ✗ Strategy 6 failed');
            }
        }
    }

    // STRATEGY 7: Manual field extraction as last resort
    console.log('[JSON Parser] Attempting manual field extraction...');
    try {
        const manualExtract: any = {};

        // Extract fields using regex patterns
        const escenaMatch = textContent.match(/"escena"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const accionMatch = textContent.match(/"accion"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const dialogoMatch = textContent.match(/"dialogo"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const durationMatch = textContent.match(/"suggestedDuration"\s*:\s*(\d+)/);

        if (escenaMatch) manualExtract.escena = escenaMatch[1];
        if (accionMatch) manualExtract.accion = accionMatch[1];
        if (dialogoMatch) manualExtract.dialogo = dialogoMatch[1];
        if (durationMatch) manualExtract.suggestedDuration = parseInt(durationMatch[1]);

        // Optional fields
        const fondoMatch = textContent.match(/"fondo"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const voiceMatch = textContent.match(/"voiceStyle"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const movimientoMatch = textContent.match(/"movimiento"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);

        if (fondoMatch) manualExtract.fondo = fondoMatch[1];
        if (voiceMatch) manualExtract.voiceStyle = voiceMatch[1];
        if (movimientoMatch) manualExtract.movimiento = movimientoMatch[1];

        // Pro fields
        const condicionesMatch = textContent.match(/"condicionesFisicas"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const defectosMatch = textContent.match(/"defectosTecnicos"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const contextoMatch = textContent.match(/"contextoInvisible"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);

        if (condicionesMatch) manualExtract.condicionesFisicas = condicionesMatch[1];
        if (defectosMatch) manualExtract.defectosTecnicos = defectosMatch[1];
        if (contextoMatch) manualExtract.contextoInvisible = contextoMatch[1];

        if (manualExtract.escena && manualExtract.accion && manualExtract.dialogo) {
            console.log('[JSON Parser] ✓ Strategy 7 SUCCESS: Manual field extraction');
            return manualExtract;
        } else {
            console.log('[JSON Parser] ✗ Strategy 7 failed: Missing required fields');
        }
    } catch (e) {
        console.log('[JSON Parser] ✗ Strategy 7 failed:', e);
    }

    // ALL STRATEGIES FAILED - Show helpful error
    console.error('=== JSON PARSING FAILED ===');
    console.error('Response length:', textContent.length);
    console.error('First 500 chars:', textContent.substring(0, 500));
    console.error('Last 500 chars:', textContent.substring(Math.max(0, textContent.length - 500)));
    console.error('===========================');

    throw new Error(
        'Could not parse AI response. The AI returned an unexpected format. ' +
        'Please try again or try rephrasing your request.'
    );
}

// SIMPLIFIED, ULTRA-CLEAR SCENE PROMPT
const SCENE_BUILDER_PROMPT = `You are a hyper-realistic video scene generator.

CRITICAL: Respond with ONLY a JSON object. Nothing else. No explanations. No markdown. Just the JSON.

Required JSON structure:
{
  "escena": "Detailed scene setting with physical conditions and imperfections",
  "condicionesFisicas": "Lighting physics, atmospheric conditions, spatial reality",
  "fondo": "Background elements with their physical state",
  "accion": "Character action captured at imperfect moment",
  "dialogo": "Natural dialogue (1-3 sentences, with realistic speech imperfections)",
  "voiceStyle": "Voice delivery style with imperfections",
  "movimiento": "Camera movement with realistic defects",
  "defectosTecnicos": "Technical imperfections (compression, sensor artifacts, optical flaws)",
  "contextoInvisible": "What happens outside frame that affects what we see",
  "suggestedDuration": 4
}

HYPER-REALISM RULES:

1. PHYSICAL CONDITIONS over aesthetic descriptions
   ❌ "beautiful sunset"
   ✅ "light at 17° angle, 400K warmer than ideal, micro-shadows with irregular edges"

2. MANDATORY IMPERFECTIONS:
   - Camera shake 0.3-0.8°
   - Focus 3-5cm off ideal
   - White balance off 200-400K
   - Chromatic noise in shadows
   - Asymmetric vignetting
   - H.264 compression artifacts

3. REAL OPTICS:
   - Odd focal lengths: 37mm, 49mm, 63mm (NOT 35mm, 50mm)
   - Unusual aperture: f/1.9, f/2.2, f/3.5
   - Lens artifacts: barrel distortion, chromatic aberration
   - Sensor: hot pixels, banding

4. INVISIBLE CONTEXT:
   - Events/light sources outside frame
   - Environmental factors affecting subject
   - Temporal causality

5. IMPERFECT TIME:
   - Freeze micro-failures, not perfection
   - Fabric lag, expressions between states
   - Partial motion blur on fast elements

6. USELESS DETAIL:
   - One absurd but real detail per scene
   - Loose thread, coffee stain, unclear reflection

7. SPONTANEOUS CAPTURE:
   - "Accidental recording"
   - "Handheld, no stabilization"
   - "Frame from burst, not best one"

8. VOICE IMPERFECTIONS:
   - Breath, pauses, trailing off
   - Vocal fry, hesitation
   - Mouth sync 2-3 frames off

AVOID:
- Perfect anything
- Cinematic polish
- Studio aesthetic
- AI/CGI look
- Ideal composition
- Professional quality

suggestedDuration must be: 2, 4, 6, or 8
Match user's language (Spanish/English)
Keep dialogue concise (1-3 sentences)

REMEMBER: Return ONLY the JSON object. No other text.`;

// SIMPLIFIED STORY PROMPT
const STORY_BUILDER_PROMPT = `You are a hyper-realistic multi-segment story generator.

CRITICAL: Respond with ONLY a JSON object. Nothing else. No markdown. Just JSON.

Required JSON structure:
{
  "storyTitle": "Authentic title",
  "storyDescription": "One sentence story arc",
  "segments": [
    {
      "segmentNumber": 1,
      "title": "Segment title",
      "escena": "Scene with physical conditions",
      "condicionesFisicas": "Lighting physics, atmospheric reality",
      "fondo": "Background physical state",
      "accion": "Action at imperfect moment",
      "dialogo": "Natural speech with imperfections",
      "voiceStyle": "Voice delivery with artifacts",
      "movimiento": "Camera movement with defects",
      "defectosTecnicos": "Technical flaws",
      "contextoInvisible": "Off-frame events",
      "suggestedDuration": 8
    }
  ]
}

STORY RULES:
- Each segment has DIFFERENT imperfections
- Show progression: light changes, vocal fatigue, environment shifts
- Documentary feel, not produced
- All segments 8 seconds
- Apply same hyper-realism rules as scenes

Match user's language.
Return ONLY JSON object.`;

/**
 * Generate scene with ultra-robust parsing
 */
export async function generateSceneConfig(
    prompt: string
): Promise<SceneGenerationResult> {
    const { balance } = await creditsService.getBalance();
    const estimatedCost = PRICING.SCENE_BUILDER;
    if (balance < estimatedCost) {
        throw new Error(`Insufficient credits. Required: $${estimatedCost.toFixed(2)} MXN, Available: $${balance.toFixed(2)} MXN`);
    }

    const fullPrompt = `${SCENE_BUILDER_PROMPT}

USER VIDEO IDEA: "${prompt}"

Generate the JSON object now:`;

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       SCENE GENERATION API CALL - DEBUG INFO              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📝 User prompt:', prompt);
    console.log('📏 Full prompt length:', fullPrompt.length);
    console.log('🔍 Prompt preview (first 300 chars):');
    console.log(fullPrompt.substring(0, 300) + '...\n');

    console.log('🌐 Making API call to /ai/generate-text...');
    console.log('⚙️  Request parameters:', {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
    });

    let response;
    try {
        response = await apiClient.post('/ai/generate-text', {
            prompt: fullPrompt,
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
        });
    } catch (apiError) {
        console.error('❌ API CALL FAILED:');
        console.error('   Error type:', typeof apiError);
        console.error('   Error:', apiError);
        if (apiError && typeof apiError === 'object') {
            console.error('   Error keys:', Object.keys(apiError));
            console.error('   Full error object:', JSON.stringify(apiError, null, 2));
        }
        throw apiError;
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              RAW API RESPONSE RECEIVED                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📊 Response status:', response.status);
    console.log('📋 Response status text:', response.statusText);
    console.log('🏷️  Response headers:', JSON.stringify(response.headers, null, 2));
    console.log('\n📦 Response.data structure:');
    console.log('   - Type:', typeof response.data);
    console.log('   - Is null?:', response.data === null);
    console.log('   - Is undefined?:', response.data === undefined);
    console.log('   - Constructor:', response.data?.constructor?.name || 'N/A');
    console.log('   - Is Array?:', Array.isArray(response.data));
    console.log('   - Keys:', response.data ? Object.keys(response.data) : 'N/A');
    console.log('\n📄 Full response.data object (stringified):');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n📄 Full response.data object (raw):');
    console.log(response.data);

    const { text: textContent, tokensUsed } = response.data;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           EXTRACTED VALUES FROM RESPONSE                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📝 textContent:');
    console.log('   - Type:', typeof textContent);
    console.log('   - Is null?:', textContent === null);
    console.log('   - Is undefined?:', textContent === undefined);
    console.log('   - Is string?:', typeof textContent === 'string');
    console.log('   - Constructor:', textContent?.constructor?.name || 'N/A');
    console.log('   - Length:', textContent?.length || 0);
    console.log('   - First 100 chars:', textContent?.substring?.(0, 100) || 'N/A');
    console.log('   - Raw value type:', Object.prototype.toString.call(textContent));
    console.log('\n🔢 tokensUsed:', tokensUsed);
    console.log('\n💾 COMPLETE textContent value (stringified):');
    console.log('─'.repeat(60));
    console.log(JSON.stringify(textContent, null, 2));
    console.log('─'.repeat(60));
    console.log('\n💾 COMPLETE textContent value (raw):');
    console.log('─'.repeat(60));
    console.log(textContent);
    console.log('─'.repeat(60));

    if (!textContent) {
        console.error('❌ ERROR: textContent is empty/null/undefined');
        console.error('Available response.data fields:', Object.keys(response.data || {}));
        throw new Error('AI returned empty response');
    }

    // CRITICAL FIX: Check if textContent is already a parsed object
    let textToParse: string;
    if (typeof textContent === 'object' && textContent !== null) {
        console.log('⚠️  NOTICE: textContent is already an object, not a string!');
        console.log('   This means the API already parsed the JSON for us.');
        console.log('   Object keys:', Object.keys(textContent));

        // If it's already the parsed scene object, use it directly
        if ('escena' in textContent && 'accion' in textContent && 'dialogo' in textContent) {
            console.log('✅ textContent is already the parsed scene object! Skipping JSON parsing.');
            const parsedScene = textContent as SceneBuilderResult;

            // Validate and normalize duration
            const validDurations: VideoDuration[] = [2, 4, 6, 8];
            let duration = Number(parsedScene.suggestedDuration) || 4;
            if (!validDurations.includes(duration as VideoDuration)) {
                console.warn(`⚠️  Invalid duration ${duration}, normalizing...`);
                duration = validDurations.reduce((prev, curr) =>
                    Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
                );
                console.log(`✓ Normalized duration to: ${duration}`);
            }

            const result = {
                scene: {
                    escena: parsedScene.escena || '',
                    fondo: parsedScene.fondo || '',
                    accion: parsedScene.accion || '',
                    dialogo: parsedScene.dialogo || '',
                    voiceStyle: parsedScene.voiceStyle || '',
                    movimiento: parsedScene.movimiento || '',
                    condicionesFisicas: parsedScene.condicionesFisicas || '',
                    defectosTecnicos: parsedScene.defectosTecnicos || '',
                    contextoInvisible: parsedScene.contextoInvisible || '',
                    suggestedDuration: duration as VideoDuration,
                },
                tokensUsed,
                costMXN: PRICING.SCENE_BUILDER,
            };

            console.log('\n✅ FINAL RESULT (from pre-parsed object):');
            console.log(JSON.stringify(result, null, 2));
            console.log('╚════════════════════════════════════════════════════════════╝\n');

            return result;
        }

        // Otherwise, stringify it so we can parse it
        console.log('   Converting object to JSON string for parsing...');
        textToParse = JSON.stringify(textContent);
    } else if (typeof textContent === 'string') {
        textToParse = textContent;
    } else {
        console.error('❌ ERROR: textContent is neither string nor object!');
        console.error('   Type:', typeof textContent);
        console.error('   Value:', textContent);
        throw new Error(`Unexpected textContent type: ${typeof textContent}`);
    }

    console.log('\n🔄 Passing to JSON parser...\n');
    console.log('Text to parse (first 200 chars):', textToParse.substring(0, 200));

    // Use ultra-robust parser
    const parsedScene = parseJsonResponse(textToParse, 'scene') as SceneBuilderResult;

    console.log('\n✅ Successfully parsed scene:');
    console.log(JSON.stringify(parsedScene, null, 2));

    // Validate required fields
    if (!parsedScene.escena || !parsedScene.accion || !parsedScene.dialogo) {
        console.error('❌ Parsed scene missing required fields:', parsedScene);
        throw new Error('AI response missing required fields (escena, accion, dialogo)');
    }

    // Validate and normalize duration
    const validDurations: VideoDuration[] = [2, 4, 6, 8];
    let duration = Number(parsedScene.suggestedDuration) || 4;
    if (!validDurations.includes(duration as VideoDuration)) {
        console.warn(`⚠️  Invalid duration ${duration}, normalizing...`);
        duration = validDurations.reduce((prev, curr) =>
            Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
        );
        console.log(`✓ Normalized duration to: ${duration}`);
    }

    const result = {
        scene: {
            escena: parsedScene.escena || '',
            fondo: parsedScene.fondo || '',
            accion: parsedScene.accion || '',
            dialogo: parsedScene.dialogo || '',
            voiceStyle: parsedScene.voiceStyle || '',
            movimiento: parsedScene.movimiento || '',
            condicionesFisicas: parsedScene.condicionesFisicas || '',
            defectosTecnicos: parsedScene.defectosTecnicos || '',
            contextoInvisible: parsedScene.contextoInvisible || '',
            suggestedDuration: duration as VideoDuration,
        },
        tokensUsed,
        costMXN: PRICING.SCENE_BUILDER,
    };

    console.log('\n✅ FINAL RESULT:');
    console.log(JSON.stringify(result, null, 2));
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    return result;
}

/**
 * Generate story with ultra-robust parsing
 */
export async function generateStoryConfig(
    prompt: string,
    segmentCount: number
): Promise<StoryGenerationResult> {
    const validatedSegmentCount = Math.min(Math.max(segmentCount, 2), 6);

    const { balance } = await creditsService.getBalance();
    const estimatedCost = PRICING.STORY_BUILDER_PER_SEGMENT * validatedSegmentCount;
    if (balance < estimatedCost) {
        throw new Error(`Insufficient credits. Required: $${estimatedCost.toFixed(2)} MXN, Available: $${balance.toFixed(2)} MXN`);
    }

    const fullPrompt = `${STORY_BUILDER_PROMPT}

USER STORY IDEA: "${prompt}"
NUMBER OF SEGMENTS: ${validatedSegmentCount}

Generate ${validatedSegmentCount} segments. Return ONLY JSON object:`;

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       STORY GENERATION API CALL - DEBUG INFO               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📝 User prompt:', prompt);
    console.log('🔢 Segment count:', validatedSegmentCount);
    console.log('📏 Full prompt length:', fullPrompt.length);

    console.log('\n🌐 Making API call to /ai/generate-text...');

    let response;
    try {
        response = await apiClient.post('/ai/generate-text', {
            prompt: fullPrompt,
            temperature: 0.75,
            maxOutputTokens: 6144,
            responseMimeType: 'application/json',
        });
    } catch (apiError) {
        console.error('❌ API CALL FAILED:', apiError);
        throw apiError;
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              RAW API RESPONSE RECEIVED                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📊 Response status:', response.status);
    console.log('📄 Full response.data:', JSON.stringify(response.data, null, 2));

    const { text: textContent, tokensUsed } = response.data;

    console.log('\n💾 textContent type:', typeof textContent);
    console.log('💾 textContent length:', textContent?.length || 0);
    console.log('💾 COMPLETE textContent:');
    console.log('─'.repeat(60));
    console.log(textContent);
    console.log('─'.repeat(60));

    if (!textContent) {
        console.error('❌ ERROR: textContent is empty');
        throw new Error('AI returned empty response');
    }

    // Check if already parsed
    let textToParse: string;
    if (typeof textContent === 'object' && textContent !== null) {
        console.log('⚠️  textContent is already an object!');
        if ('segments' in textContent && Array.isArray(textContent.segments)) {
            console.log('✅ textContent is already the parsed story object!');
            const parsedStory = textContent as { storyTitle: string; storyDescription: string; segments: StorySegment[] };

            // Validate segments
            if (!parsedStory.segments || !Array.isArray(parsedStory.segments)) {
                throw new Error('Invalid story format: missing segments array');
            }

            if (parsedStory.segments.length === 0) {
                throw new Error('AI generated 0 segments');
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
                condicionesFisicas: seg.condicionesFisicas || '',
                defectosTecnicos: seg.defectosTecnicos || '',
                contextoInvisible: seg.contextoInvisible || '',
                suggestedDuration: 8 as VideoDuration,
            }));

            const actualCost = PRICING.STORY_BUILDER_PER_SEGMENT * normalizedSegments.length;

            const result = {
                segments: normalizedSegments,
                storyTitle: parsedStory.storyTitle || 'Untitled Story',
                storyDescription: parsedStory.storyDescription || '',
                tokensUsed,
                costMXN: actualCost,
            };

            console.log('\n✅ FINAL STORY RESULT (from pre-parsed object):');
            console.log(JSON.stringify(result, null, 2));
            console.log('╚════════════════════════════════════════════════════════════╝\n');

            return result;
        }
        textToParse = JSON.stringify(textContent);
    } else {
        textToParse = textContent;
    }

    console.log('\n🔄 Passing to JSON parser...\n');

    // Use ultra-robust parser
    const parsedStory = parseJsonResponse(textToParse, 'story') as {
        storyTitle: string;
        storyDescription: string;
        segments: StorySegment[];
    };

    console.log('\n✅ Successfully parsed story:');
    console.log(JSON.stringify(parsedStory, null, 2));

    // Validate
    if (!parsedStory.segments || !Array.isArray(parsedStory.segments)) {
        console.error('❌ Parsed story missing segments:', parsedStory);
        throw new Error('AI response missing segments array');
    }

    if (parsedStory.segments.length === 0) {
        throw new Error('AI generated 0 segments');
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
        condicionesFisicas: seg.condicionesFisicas || '',
        defectosTecnicos: seg.defectosTecnicos || '',
        contextoInvisible: seg.contextoInvisible || '',
        suggestedDuration: 8 as VideoDuration,
    }));

    const actualCost = PRICING.STORY_BUILDER_PER_SEGMENT * normalizedSegments.length;

    const result = {
        segments: normalizedSegments,
        storyTitle: parsedStory.storyTitle || 'Untitled Story',
        storyDescription: parsedStory.storyDescription || '',
        tokensUsed,
        costMXN: actualCost,
    };

    console.log('\n✅ FINAL STORY RESULT:');
    console.log(JSON.stringify(result, null, 2));
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    return result;
}

/**
 * Calculate estimated cost
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
    // New fields for hyper-realism (optional)
    condicionesFisicas?: string;
    defectosTecnicos?: string;
    contextoInvisible?: string;
}

// Response from image scene generation
export interface ImageSceneGenerationResult {
    scene: ImageSceneBuilderResult;
    tokensUsed: number;
    costMXN: number;
    id?: string; // ID if saved to database
}

// SIMPLIFIED, ULTRA-CLEAR IMAGE SCENE PROMPT (PRO)
const IMAGE_SCENE_BUILDER_PROMPT_PRO = `You are a hyper-realistic photographer and visual director.

CRITICAL: Respond with ONLY a JSON object. Nothing else. No explanations. No markdown. Just the JSON.

Required JSON structure:
{
  "escena": "Detailed environment description, atmosphere, and mood",
  "fondo": "Specific background elements, depth, and context",
  "accion": "Precise character pose, expression, and action",
  "lighting": "Advanced lighting setup (e.g., chiaroscuro, volumetric, practical lights, color temperature)",
  "camera": "Specific camera gear, lens choice (mm), aperture (f-stop), and angle",
  "condicionesFisicas": "Atmospheric conditions (haze, dust, humidity) and physical lighting properties",
  "defectosTecnicos": "Photographic imperfections (film grain, chromatic aberration, lens flare, motion blur)",
  "contextoInvisible": "Elements or light sources outside the frame that influence the shot"
}

HYPER-REALISM RULES:

1. PHOTOGRAPHIC PRECISION:
   - Specify lens focal length (e.g., 35mm, 85mm, 24mm)
   - Specify aperture depth of field (e.g., f/1.4 for bokeh, f/8 for sharpness)
   - Describe light sources realistically (softbox, rim light, golden hour sun)

2. TEXTURE & ATMOSPHERE:
   - "400 iso grainy film look"
   - "Dust particles dancing in light beams"
   - "Wet pavement reflecting neon"

3. IMPERFECTIONS ARE KEY:
   - "Slight motion blur on hand"
   - "Lens flare from off-camera light"
   - "Vignetting at corners"
   - "Chromatic aberration on high contrast edges"

4. AVOID:
   - "Perfect" or "AI-generated" look
   - Generic descriptions like "beautiful lighting"
   - Oversaturated or cartoonish colors

Match user's language (Spanish/English).
Return ONLY the JSON object. No other text.`;

/**
 * Generate image scene configuration from natural language using backend (PRO MODE)
 */
export async function generateImageSceneConfig(
    prompt: string
): Promise<ImageSceneGenerationResult> {
    // Check credits
    const { balance } = await creditsService.getBalance();
    const estimatedCost = PRICING.SCENE_BUILDER; // Same price for now
    if (balance < estimatedCost) {
        throw new Error(`Insufficient credits. Required: $${estimatedCost.toFixed(2)} MXN, Available: $${balance.toFixed(2)} MXN`);
    }

    const fullPrompt = `${IMAGE_SCENE_BUILDER_PROMPT_PRO}

USER IMAGE IDEA: "${prompt}"

Generate the JSON object now:`;

    console.log('🌐 Making API call to /ai/generate-text (Image Scene Pro)...');

    let response;
    try {
        response = await apiClient.post('/ai/generate-text', {
            prompt: fullPrompt,
            temperature: 0.7,
            maxOutputTokens: 4096, // Increased to prevent truncation of detailed JSON
            responseMimeType: 'application/json',
        });
    } catch (apiError) {
        console.error('❌ API CALL FAILED:', apiError);
        throw apiError;
    }

    const { text: textContent, tokensUsed } = response.data;

    if (!textContent) {
        throw new Error('No scene generated. Please try again.');
    }

    // Use robust parser strategy
    let textToParse = typeof textContent === 'object' ? JSON.stringify(textContent) : textContent;

    // Parse using the robust parser we already have
    const parsedScene = parseJsonResponse(textToParse, 'scene') as any;

    const result: ImageSceneBuilderResult = {
        escena: parsedScene.escena || '',
        fondo: parsedScene.fondo || '',
        accion: parsedScene.accion || '',
        lighting: parsedScene.lighting || '',
        camera: parsedScene.camera || '',
        condicionesFisicas: parsedScene.condicionesFisicas,
        defectosTecnicos: parsedScene.defectosTecnicos,
        contextoInvisible: parsedScene.contextoInvisible,
    };

    // --- AUTO-SAVE IMAGE SCENE ---
    let savedSceneId: string | undefined;
    try {
        // Construct detailed field for auto-save
        let fondoWithDetails = result.fondo || '';

        if (result.lighting) fondoWithDetails += `\n\n[Lighting]: ${result.lighting}`;
        if (result.camera) fondoWithDetails += `\n[Camera]: ${result.camera}`;
        if (result.condicionesFisicas) fondoWithDetails += `\n[Physical]: ${result.condicionesFisicas}`;
        if (result.contextoInvisible) fondoWithDetails += `\n[Context]: ${result.contextoInvisible}`;
        if (result.defectosTecnicos) fondoWithDetails += `\n[Defects]: ${result.defectosTecnicos}`;

        const sceneData = {
            title: `[Image Pro] ${prompt.slice(0, 40)}...`,
            description: `Generated image scene (Pro) from: ${prompt}`,
            originalPrompt: prompt,
            escena: result.escena,
            fondo: fondoWithDetails.trim(),
            accion: result.accion,
            dialogo: '', // Not used for images
            suggestedDuration: 0, // 0 indicates image scene
            tokensUsed,
            costMxn: PRICING.SCENE_BUILDER,
            tags: ['image-scene', 'pro-mode'],
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

export const sceneBuilderProService = {
    generateSceneConfig,
    generateStoryConfig,
    generateImageSceneConfig,
    calculateStoryCost,
    estimatedCost: PRICING.SCENE_BUILDER,
    storyPricePerSegment: PRICING.STORY_BUILDER_PER_SEGMENT,
};

export default sceneBuilderProService;