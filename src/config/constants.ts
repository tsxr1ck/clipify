// Pricing constants (in MXN)
export const PRICING = {
    IMAGE_GENERATION: 1.05,      // ~$0.06 USD (Base $0.04 + 50% markup)
    VIDEO_PER_SECOND: 9.49,     // ~$0.90 USD (Base $0.60 + 50% markup)
    STYLE_ANALYSIS: 0.26,        // ~$0.015 USD (Base $0.01 + 50% markup)
    CHARACTER_CREATION: 1.05,    // Same as image
    SCENE_BUILDER: 0.26,         // Text-only Gemini call
    STORY_BUILDER_PER_SEGMENT: 0.20, // Slightly less per segment
} as const;

export type GenerationType = keyof typeof PRICING;
