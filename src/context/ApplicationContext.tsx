import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import type { Step, ApiKeyState, AppState } from '../types';
import { apiKeyStorage, themeStorage, initDatabase } from '../utils/indexedDB';

// Action types
type Action =
    | { type: 'SET_STEP'; step: Step }
    | { type: 'SET_API_KEY'; key: string | null }
    | { type: 'SET_API_KEY_VALIDATING'; isValidating: boolean }
    | { type: 'SET_API_KEY_VALID'; isValid: boolean; error?: string | null }
    | { type: 'CLEAR_API_KEY' }
    | { type: 'SET_SELECTED_STYLE'; styleId: string | null }
    | { type: 'SET_SELECTED_CHARACTER'; characterId: string | null }
    | { type: 'SET_LOADING'; isLoading: boolean }
    | { type: 'SET_ERROR'; error: string | null }
    | { type: 'RESET' };

// Initial state
const initialApiKeyState: ApiKeyState = {
    key: null,
    isValid: false,
    isValidating: false,
    error: null,
};

const initialState: AppState = {
    currentStep: 0,
    apiKey: initialApiKeyState,
    selectedStyleId: null,
    selectedCharacterId: null,
    isLoading: false,
    error: null,
};

// Reducer
function appReducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_STEP':
            return { ...state, currentStep: action.step, error: null };

        case 'SET_API_KEY':
            return {
                ...state,
                apiKey: { ...state.apiKey, key: action.key },
            };

        case 'SET_API_KEY_VALIDATING':
            return {
                ...state,
                apiKey: { ...state.apiKey, isValidating: action.isValidating, error: null },
            };

        case 'SET_API_KEY_VALID':
            return {
                ...state,
                apiKey: {
                    ...state.apiKey,
                    isValid: action.isValid,
                    isValidating: false,
                    error: action.error ?? null,
                },
            };

        case 'CLEAR_API_KEY':
            return {
                ...state,
                currentStep: 0,
                apiKey: initialApiKeyState,
                selectedStyleId: null,
                selectedCharacterId: null,
            };

        case 'SET_SELECTED_STYLE':
            return { ...state, selectedStyleId: action.styleId };

        case 'SET_SELECTED_CHARACTER':
            return { ...state, selectedCharacterId: action.characterId };

        case 'SET_LOADING':
            return { ...state, isLoading: action.isLoading };

        case 'SET_ERROR':
            return { ...state, error: action.error, isLoading: false };

        case 'RESET':
            return initialState;

        default:
            return state;
    }
}

// Context type
interface ApplicationContextType {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    // Convenience methods
    setStep: (step: Step) => void;
    nextStep: () => void;
    prevStep: () => void;
    setApiKey: (key: string) => void;
    clearApiKey: () => void;
    setSelectedStyle: (styleId: string | null) => void;
    setSelectedCharacter: (characterId: string | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
}

// Create context
const ApplicationContext = createContext<ApplicationContextType | null>(null);

// Provider component
export function ApplicationProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize on mount
    useEffect(() => {
        async function initialize() {
            // Initialize IndexedDB and migrate from localStorage
            await initDatabase();

            // Check for saved API key
            const savedKey = await apiKeyStorage.get();
            if (savedKey) {
                dispatch({ type: 'SET_API_KEY', key: savedKey });
                dispatch({ type: 'SET_API_KEY_VALID', isValid: true });
            }

            // Initialize theme
            const savedTheme = await themeStorage.get();
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = savedTheme || (prefersDark ? 'dark' : 'light');
            document.documentElement.classList.toggle('dark', theme === 'dark');

            setIsInitialized(true);
        }
        initialize();
    }, []);

    // Convenience methods
    const setStep = (step: Step) => dispatch({ type: 'SET_STEP', step });

    const nextStep = () => {
        const next = Math.min(state.currentStep + 1, 3) as Step;
        dispatch({ type: 'SET_STEP', step: next });
    };

    const prevStep = () => {
        const prev = Math.max(state.currentStep - 1, 0) as Step;
        dispatch({ type: 'SET_STEP', step: prev });
    };

    const setApiKey = (key: string) => {
        dispatch({ type: 'SET_API_KEY', key });
        apiKeyStorage.set(key);
    };

    const clearApiKey = () => {
        apiKeyStorage.remove();
        dispatch({ type: 'CLEAR_API_KEY' });
    };

    const setSelectedStyle = (styleId: string | null) => {
        dispatch({ type: 'SET_SELECTED_STYLE', styleId });
    };

    const setSelectedCharacter = (characterId: string | null) => {
        dispatch({ type: 'SET_SELECTED_CHARACTER', characterId });
    };

    const setLoading = (isLoading: boolean) => {
        dispatch({ type: 'SET_LOADING', isLoading });
    };

    const setError = (error: string | null) => {
        dispatch({ type: 'SET_ERROR', error });
    };

    const value: ApplicationContextType = {
        state,
        dispatch,
        setStep,
        nextStep,
        prevStep,
        setApiKey,
        clearApiKey,
        setSelectedStyle,
        setSelectedCharacter,
        setLoading,
        setError,
    };

    // Show loading while initializing
    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <ApplicationContext.Provider value={value}>
            {children}
        </ApplicationContext.Provider>
    );
}

// Hook to use the context
export function useApplication(): ApplicationContextType {
    const context = useContext(ApplicationContext);
    if (!context) {
        throw new Error('useApplication must be used within an ApplicationProvider');
    }
    return context;
}

// Hook for API key state specifically
export function useApiKey() {
    const { state, dispatch, setApiKey, clearApiKey } = useApplication();

    const setValidating = (isValidating: boolean) => {
        dispatch({ type: 'SET_API_KEY_VALIDATING', isValidating });
    };

    const setValid = (isValid: boolean, error?: string) => {
        dispatch({ type: 'SET_API_KEY_VALID', isValid, error });
    };

    return {
        ...state.apiKey,
        setKey: setApiKey,
        clearKey: clearApiKey,
        setValidating,
        setValid,
    };
}
