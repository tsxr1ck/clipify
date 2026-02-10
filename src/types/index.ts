// Step progression
export type Step = 0 | 1 | 2 | 3;

// API Key state
export interface ApiKeyState {
    key: string | null;
    isValid: boolean;
    isValidating: boolean;
    error: string | null;
}

// Parsed style from Gemini analysis
export interface ParsedStyle {
    overview: string;
    colorPalette: string;
    artisticStyle: string;
    lighting: string;
    composition: string;
    texture: string;
    keywords: string[];
}

// Saved Style (in localStorage)
export interface SavedStyle {
    id: string;
    name: string;
    createdAt: number;
    styleAnalysis: string;
    keywords: string[];
    referenceImage: string; // base64
    userPrompt?: string;
    parsedStyle: ParsedStyle;
}

// Aspect ratio options
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

// Saved Character (in localStorage)
export interface SavedCharacter {
    id: string;
    name: string;
    createdAt: number;
    prompt: string;
    styleId: string;
    styleName: string;
    imageBase64: string;
    aspectRatio: AspectRatio;
    combinedPrompt: string;
}

// Video duration options
export type VideoDuration = 2 | 4 | 6 | 8;

// Video Scene Configuration
export interface VideoSceneConfig {
    escena: string; // Scene setting
    accion: string; // Action
    dialogo: string; // Dialogue
    movimiento?: string; // Motion (optional)
    duration: VideoDuration;
}

// Scene Builder AI Result
export interface SceneBuilderResult {
    escena: string;
    fondo?: string;
    accion: string;
    dialogo: string;
    voiceStyle?: string;
    movimiento?: string;
    suggestedDuration: VideoDuration;
}

// Generated Video (in localStorage - optional)
export interface GeneratedVideo {
    id: string;
    createdAt: number;
    characterId: string;
    styleId: string;
    sceneConfig: VideoSceneConfig;
    videoUrl: string; // blob URL or base64
    thumbnailBase64: string;
}

// Application State
export interface AppState {
    currentStep: Step;
    apiKey: ApiKeyState;
    selectedStyleId: string | null;
    selectedCharacterId: string | null;
    isLoading: boolean;
    error: string | null;
    theme?: string;
}

// API Response Types
export interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
    }>;
}

export interface ImagenResponse {
    predictions: Array<{
        bytesBase64Encoded: string;
        mimeType: string;
    }>;
}

export interface VeoResponse {
    predictions: Array<{
        bytesBase64Encoded: string;
        mimeType: string;
    }>;
}

// Error types
export interface ApiError {
    code: number;
    message: string;
    details?: string;
}
