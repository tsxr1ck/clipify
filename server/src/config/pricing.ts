// Pricing configuration for MXN-based credits system
// Base costs reflect Google Cloud Vertex AI official pricing (Feb 2026)
// Source: https://cloud.google.com/vertex-ai/generative-ai/pricing
// User price = base cost + MARKUP_PERCENTAGE (see below)

export const USD_TO_MXN = 17.5; // Update from currency API in production

export const BASE_COSTS_USD = {
    styleExtraction: 0.01,   // Gemini 2.5 Flash text analysis (~$0.003 actual, padded for infrastructure)
    imageGeneration: 0.05,   // Imagen 4.0 Standard ($0.04/image) + infrastructure overhead
    videoPerSecond: 0.50,    // Veo 3.1 Standard ($0.40/sec at 720p/1080p) + infrastructure overhead
} as const;

export const MARKUP_PERCENTAGE = 50; // 50% profit margin

export const CREDIT_PACKAGES = [
    { id: 'starter', amountMXN: 100, bonusPercent: 0, name: 'Starter' },
    { id: 'basic', amountMXN: 250, bonusPercent: 5, name: 'Basic' },
    { id: 'pro', amountMXN: 500, bonusPercent: 10, name: 'Pro' },
    { id: 'premium', amountMXN: 1000, bonusPercent: 15, name: 'Premium' },
    { id: 'enterprise', amountMXN: 2500, bonusPercent: 20, name: 'Enterprise' },
] as const;

export type GenerationType = 'style' | 'image' | 'video';

export interface PriceCalculation {
    costUSD: number;
    userPriceMXN: number;
    profitMXN: number;
}

export function calculatePrice(type: GenerationType, duration?: number): PriceCalculation {
    let baseUSD = 0;

    switch (type) {
        case 'style':
            baseUSD = BASE_COSTS_USD.styleExtraction;
            break;
        case 'image':
            baseUSD = BASE_COSTS_USD.imageGeneration;
            break;
        case 'video':
            baseUSD = BASE_COSTS_USD.videoPerSecond * (duration || 2);
            break;
    }

    const userPriceUSD = baseUSD * (1 + MARKUP_PERCENTAGE / 100);
    const userPriceMXN = userPriceUSD * USD_TO_MXN;

    return {
        costUSD: baseUSD,
        userPriceMXN: Number(userPriceMXN.toFixed(2)),
        profitMXN: Number((userPriceMXN - baseUSD * USD_TO_MXN).toFixed(2)),
    };
}

export function getPackageWithBonus(packageId: string): { amountMXN: number; bonusMXN: number; totalMXN: number } | null {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return null;

    const bonusMXN = (pkg.amountMXN * pkg.bonusPercent) / 100;
    return {
        amountMXN: pkg.amountMXN,
        bonusMXN,
        totalMXN: pkg.amountMXN + bonusMXN,
    };
}
