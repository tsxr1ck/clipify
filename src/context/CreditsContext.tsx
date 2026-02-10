import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { creditsService, type CreditsBalance } from '../services/api';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
    const { isAuthenticated, user } = useAuth();
    const channelRef = useRef<RealtimeChannel | null>(null);

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

    // Set up realtime subscription for credit changes
    useEffect(() => {
        if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) {
            console.log('💰 Realtime skipped:', {
                isAuthenticated,
                hasUserId: !!user?.id,
                isConfigured: isSupabaseConfigured()
            });
            return;
        }

        // Clean up existing subscription
        if (channelRef.current) {
            console.log('💰 Removing existing channel');
            supabase?.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        console.log('💰 Setting up realtime subscription for user:', user.id);
        console.log('💰 Using filter: user_id=eq.' + user.id);

        // Create new subscription
        const channel = supabase
            ?.channel(`credits:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'credits',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('💰 Credit change detected!', payload);
                    console.log('💰 Event type:', payload.eventType);
                    console.log('💰 Full payload:', JSON.stringify(payload, null, 2));

                    // Update balance based on the payload
                    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                        const newRecord = payload.new as any;

                        console.log('💰 New record:', newRecord);
                        console.log('💰 balance_mxn value:', newRecord.balance_mxn);
                        console.log('💰 balance_mxn type:', typeof newRecord.balance_mxn);

                        const newBalance = typeof newRecord.balance_mxn === 'string'
                            ? parseFloat(newRecord.balance_mxn)
                            : Number(newRecord.balance_mxn);

                        console.log('💰 Parsed balance:', newBalance);
                        console.log('💰 Previous balance:', state.balance);

                        setState(prev => ({
                            ...prev,
                            balance: newBalance,
                            currency: newRecord.currency || 'MXN',
                            isLowBalance: newBalance < LOW_BALANCE_THRESHOLD,
                        }));

                        console.log('💰 Balance updated to:', newBalance);
                    } else if (payload.eventType === 'DELETE') {
                        console.log('💰 Credits deleted, resetting to 0');
                        setState(prev => ({
                            ...prev,
                            balance: 0,
                            isLowBalance: true,
                        }));
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('💰 Realtime subscription status:', status);
                if (err) {
                    console.error('💰 Subscription error:', err);
                }
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to credits realtime!');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Channel error - check RLS policies and realtime settings');
                } else if (status === 'CLOSED') {
                    console.warn('⚠️ Channel closed');
                }
            });

        if (!channel) {
            console.error('❌ Failed to create Supabase channel');
        }

        channelRef.current = channel || null;

        // Cleanup on unmount or when user changes
        return () => {
            console.log('💰 Cleaning up realtime subscription');
            if (channelRef.current) {
                supabase?.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [isAuthenticated, user?.id]);

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
