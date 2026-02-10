// Pricing constants (in MXN) - Must match server/src/config/pricing.ts
// Base costs from Google Cloud Vertex AI + infrastructure overhead, with 50% markup
// Source: https://cloud.google.com/vertex-ai/generative-ai/pricing
export const PRICING = {
    IMAGE_GENERATION: 1.31,      // ~$0.075 USD (Base $0.05 + 50% markup) - Imagen 4.0 Standard
    VIDEO_PER_SECOND: 13.13,     // ~$0.75 USD (Base $0.50 + 50% markup) - Veo 3.1 Standard
    STYLE_ANALYSIS: 0.26,        // ~$0.015 USD (Base $0.01 + 50% markup) - Gemini 2.5 Flash
    CHARACTER_CREATION: 1.31,    // Same as image generation
    SCENE_BUILDER: 0.26,         // Text-only Gemini 2.5 Flash call
    STORY_BUILDER_PER_SEGMENT: 0.20, // Slightly less per segment (text-only)
} as const;

export type GenerationType = keyof typeof PRICING;
