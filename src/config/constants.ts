// Pricing constants (in MXN)
export const PRICING = {
    IMAGE_GENERATION: 0.35,      // ~$0.02 USD
    VIDEO_PER_SECOND: 0.70,      // ~$0.04 USD per second
    STYLE_ANALYSIS: 0.18,        // ~$0.01 USD
    CHARACTER_CREATION: 0.35,    // Same as image
} as const;

export type GenerationType = keyof typeof PRICING;
