import type { SavedStyle, SavedCharacter, GeneratedVideo } from '../types';

// localStorage keys
const KEYS = {
    API_KEY: 'clipify-api-key',
    STYLES: 'clipify-styles',
    CHARACTERS: 'clipify-characters',
    VIDEOS: 'clipify-videos',
    SCHEMA_VERSION: 'clipify-schema-version',
    THEME: 'clipify-theme',
} as const;

// Current schema version for migrations
const SCHEMA_VERSION = 1;

// Generate UUID
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// Check localStorage availability
function isLocalStorageAvailable(): boolean {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}

// Safe JSON parse
function safeJsonParse<T>(json: string | null, fallback: T): T {
    if (!json) return fallback;
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

// API Key Storage
export const apiKeyStorage = {
    get: (): string | null => {
        if (!isLocalStorageAvailable()) return null;
        return localStorage.getItem(KEYS.API_KEY);
    },

    set: (key: string): void => {
        if (!isLocalStorageAvailable()) return;
        localStorage.setItem(KEYS.API_KEY, key);
    },

    remove: (): void => {
        if (!isLocalStorageAvailable()) return;
        localStorage.removeItem(KEYS.API_KEY);
    },

    exists: (): boolean => {
        return !!apiKeyStorage.get();
    },
};

// Styles Storage
export const stylesStorage = {
    getAll: (): SavedStyle[] => {
        if (!isLocalStorageAvailable()) return [];
        const data = localStorage.getItem(KEYS.STYLES);
        return safeJsonParse<SavedStyle[]>(data, []);
    },

    getById: (id: string): SavedStyle | null => {
        const styles = stylesStorage.getAll();
        return styles.find((s) => s.id === id) || null;
    },

    add: (style: SavedStyle): void => {
        if (!isLocalStorageAvailable()) return;
        const styles = stylesStorage.getAll();
        styles.unshift(style); // Add to beginning (newest first)
        try {
            localStorage.setItem(KEYS.STYLES, JSON.stringify(styles));
        } catch (e) {
            if ((e as Error).name === 'QuotaExceededError') {
                throw new Error('Storage limit reached. Please delete some saved styles.');
            }
            throw e;
        }
    },

    update: (id: string, updates: Partial<SavedStyle>): void => {
        if (!isLocalStorageAvailable()) return;
        const styles = stylesStorage.getAll();
        const index = styles.findIndex((s) => s.id === id);
        if (index !== -1) {
            styles[index] = { ...styles[index], ...updates };
            localStorage.setItem(KEYS.STYLES, JSON.stringify(styles));
        }
    },

    remove: (id: string): void => {
        if (!isLocalStorageAvailable()) return;
        const styles = stylesStorage.getAll();
        const filtered = styles.filter((s) => s.id !== id);
        localStorage.setItem(KEYS.STYLES, JSON.stringify(filtered));
    },

    count: (): number => {
        return stylesStorage.getAll().length;
    },
};

// Characters Storage
export const charactersStorage = {
    getAll: (): SavedCharacter[] => {
        if (!isLocalStorageAvailable()) return [];
        const data = localStorage.getItem(KEYS.CHARACTERS);
        return safeJsonParse<SavedCharacter[]>(data, []);
    },

    getById: (id: string): SavedCharacter | null => {
        const characters = charactersStorage.getAll();
        return characters.find((c) => c.id === id) || null;
    },

    getByStyleId: (styleId: string): SavedCharacter[] => {
        const characters = charactersStorage.getAll();
        return characters.filter((c) => c.styleId === styleId);
    },

    add: (character: SavedCharacter): void => {
        if (!isLocalStorageAvailable()) return;
        const characters = charactersStorage.getAll();
        characters.unshift(character); // Add to beginning (newest first)
        try {
            localStorage.setItem(KEYS.CHARACTERS, JSON.stringify(characters));
        } catch (e) {
            if ((e as Error).name === 'QuotaExceededError') {
                throw new Error('Storage limit reached. Please delete some saved characters.');
            }
            throw e;
        }
    },

    update: (id: string, updates: Partial<SavedCharacter>): void => {
        if (!isLocalStorageAvailable()) return;
        const characters = charactersStorage.getAll();
        const index = characters.findIndex((c) => c.id === id);
        if (index !== -1) {
            characters[index] = { ...characters[index], ...updates };
            localStorage.setItem(KEYS.CHARACTERS, JSON.stringify(characters));
        }
    },

    remove: (id: string): void => {
        if (!isLocalStorageAvailable()) return;
        const characters = charactersStorage.getAll();
        const filtered = characters.filter((c) => c.id !== id);
        localStorage.setItem(KEYS.CHARACTERS, JSON.stringify(filtered));
    },

    count: (): number => {
        return charactersStorage.getAll().length;
    },
};

// Videos Storage (optional - videos may be too large)
export const videosStorage = {
    getAll: (): GeneratedVideo[] => {
        if (!isLocalStorageAvailable()) return [];
        const data = localStorage.getItem(KEYS.VIDEOS);
        return safeJsonParse<GeneratedVideo[]>(data, []);
    },

    add: (video: GeneratedVideo): void => {
        if (!isLocalStorageAvailable()) return;
        const videos = videosStorage.getAll();
        videos.unshift(video);
        try {
            localStorage.setItem(KEYS.VIDEOS, JSON.stringify(videos));
        } catch (e) {
            // Videos are optional, silently fail if storage is full
            console.warn('Could not save video to localStorage:', e);
        }
    },

    remove: (id: string): void => {
        if (!isLocalStorageAvailable()) return;
        const videos = videosStorage.getAll();
        const filtered = videos.filter((v) => v.id !== id);
        localStorage.setItem(KEYS.VIDEOS, JSON.stringify(filtered));
    },

    clear: (): void => {
        if (!isLocalStorageAvailable()) return;
        localStorage.removeItem(KEYS.VIDEOS);
    },
};

// Theme Storage
export const themeStorage = {
    get: (): 'light' | 'dark' | null => {
        if (!isLocalStorageAvailable()) return null;
        const theme = localStorage.getItem(KEYS.THEME);
        return theme === 'light' || theme === 'dark' ? theme : null;
    },

    set: (theme: 'light' | 'dark'): void => {
        if (!isLocalStorageAvailable()) return;
        localStorage.setItem(KEYS.THEME, theme);
    },
};

// Schema migration (for future updates)
export function migrateLocalStorageData(): void {
    if (!isLocalStorageAvailable()) return;

    const currentVersion = parseInt(localStorage.getItem(KEYS.SCHEMA_VERSION) || '0');

    if (currentVersion < SCHEMA_VERSION) {
        // Future migrations go here
        // if (currentVersion < 2) { /* migrate to v2 */ }

        localStorage.setItem(KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());
    }
}

// Get storage usage info
export function getStorageInfo(): { used: number; available: number; percentage: number } {
    if (!isLocalStorageAvailable()) {
        return { used: 0, available: 0, percentage: 0 };
    }

    let used = 0;
    for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            used += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
        }
    }

    // Most browsers limit to ~5MB
    const available = 5 * 1024 * 1024;
    const percentage = (used / available) * 100;

    return { used, available, percentage };
}
