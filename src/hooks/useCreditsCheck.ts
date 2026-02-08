import { useCredits, useCanAfford } from '@/context/CreditsContext';
import { PRICING, type GenerationType } from '@/config/constants';

/**
 * Calculate estimated cost for a generation
 */
export function calculateCost(type: GenerationType, params?: { durationSeconds?: number }): number {
    switch (type) {
        case 'VIDEO_PER_SECOND':
            return PRICING.VIDEO_PER_SECOND * (params?.durationSeconds || 5);
        default:
            return PRICING[type];
    }
}

/**
 * Hook to check credits before generation
 * Returns affordability status, estimated cost, and action handlers
 */
export function useCreditsCheck(type: GenerationType, params?: { durationSeconds?: number }) {
    const { balance, isLoading, refreshBalance, isLowBalance } = useCredits();
    const estimatedCost = calculateCost(type, params);
    const { canAfford, shortfall } = useCanAfford(estimatedCost);

    return {
        canAfford,
        estimatedCost,
        balance,
        shortfall,
        isLoading,
        isLowBalance,
        refreshBalance,
        // Formatted strings for UI
        estimatedCostFormatted: `$${estimatedCost.toFixed(2)} MXN`,
        balanceFormatted: `$${balance.toFixed(2)} MXN`,
        shortfallFormatted: `$${shortfall.toFixed(2)} MXN`,
    };
}

/**
 * Hook specifically for video generation cost estimation
 */
export function useVideoCreditsCheck(durationSeconds: number) {
    return useCreditsCheck('VIDEO_PER_SECOND', { durationSeconds });
}

/**
 * Hook specifically for image generation cost estimation
 */
export function useImageCreditsCheck() {
    return useCreditsCheck('IMAGE_GENERATION');
}

/**
 * Hook specifically for style creation cost estimation
 */
export function useStyleCreditsCheck() {
    return useCreditsCheck('STYLE_ANALYSIS');
}

/**
 * Hook specifically for character creation cost estimation
 */
export function useCharacterCreditsCheck() {
    return useCreditsCheck('CHARACTER_CREATION');
}

/**
 * Hook specifically for AI scene builder cost estimation
 */
export function useSceneBuilderCreditsCheck() {
    return useCreditsCheck('SCENE_BUILDER');
}
