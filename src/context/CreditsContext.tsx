import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { creditsService, type CreditsBalance } from '../services/api';
import { useAuth } from './AuthContext';

// Credits state interface
interface CreditsState {
    balance: number;
    currency: string;
    isLoading: boolean;
    isLowBalance: boolean;
    error: string | null;
}

// Low balance threshold in MXN
const LOW_BALANCE_THRESHOLD = 50;

// Credits context interface
interface CreditsContextType extends CreditsState {
    refreshBalance: () => Promise<void>;
    checkSufficientCredits: (estimatedCost: number) => boolean;
    hasCredits: boolean;
}

// Initial state
const initialState: CreditsState = {
    balance: 0,
    currency: 'MXN',
    isLoading: true,
    isLowBalance: false,
    error: null,
};

// Create context
const CreditsContext = createContext<CreditsContextType | null>(null);

// Provider component
export function CreditsProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CreditsState>(initialState);
    const { isAuthenticated } = useAuth();

    // Fetch balance when authenticated
    const fetchBalance = useCallback(async () => {
        if (!isAuthenticated) {
            setState({
                ...initialState,
                isLoading: false,
            });
            return;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const data: CreditsBalance = await creditsService.getBalance();
            setState({
                balance: data.balance,
                currency: data.currency,
                isLoading: false,
                isLowBalance: data.balance < LOW_BALANCE_THRESHOLD,
                error: null,
            });
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch credits',
            }));
        }
    }, [isAuthenticated]);

    // Fetch on mount and when auth changes
    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    // Refresh balance (exposed for after generation)
    const refreshBalance = useCallback(async () => {
        await fetchBalance();
    }, [fetchBalance]);

    // Check if user has sufficient credits
    const checkSufficientCredits = useCallback((estimatedCost: number): boolean => {
        return state.balance >= estimatedCost;
    }, [state.balance]);

    // Computed: has any credits
    const hasCredits = state.balance > 0;

    const value: CreditsContextType = {
        ...state,
        refreshBalance,
        checkSufficientCredits,
        hasCredits,
    };

    return (
        <CreditsContext.Provider value={value}>
            {children}
        </CreditsContext.Provider>
    );
}

// Hook to use credits context
export function useCredits(): CreditsContextType {
    const context = useContext(CreditsContext);
    if (!context) {
        throw new Error('useCredits must be used within a CreditsProvider');
    }
    return context;
}

// Hook to check if user can afford a generation
export function useCanAfford(estimatedCost: number): {
    canAfford: boolean;
    balance: number;
    isLoading: boolean;
    shortfall: number;
} {
    const { balance, isLoading, checkSufficientCredits } = useCredits();
    const canAfford = checkSufficientCredits(estimatedCost);
    const shortfall = canAfford ? 0 : estimatedCost - balance;

    return {
        canAfford,
        balance,
        isLoading,
        shortfall,
    };
}
