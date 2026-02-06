import type { SavedStyle, SavedCharacter, GeneratedVideo } from '../types';

const DB_NAME = 'clipify-db';
const DB_VERSION = 1;

// Store names
const STORES = {
    STYLES: 'styles',
    CHARACTERS: 'characters',
    VIDEOS: 'videos',
    SETTINGS: 'settings',
} as const;

// Settings keys
const SETTINGS_KEYS = {
    API_KEY: 'api-key',
    THEME: 'theme',
} as const;

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize and get the database instance
 */
function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open IndexedDB'));
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.STYLES)) {
                db.createObjectStore(STORES.STYLES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
                db.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
                db.createObjectStore(STORES.VIDEOS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Generate UUID
 */
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ============= API Key Storage =============
export const apiKeyStorage = {
    get: async (): Promise<string | null> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORES.SETTINGS, 'readonly');
                const store = tx.objectStore(STORES.SETTINGS);
                const request = store.get(SETTINGS_KEYS.API_KEY);
                request.onsuccess = () => resolve(request.result?.value || null);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return null;
        }
    },

    set: async (key: string): Promise<void> => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.SETTINGS, 'readwrite');
            const store = tx.objectStore(STORES.SETTINGS);
            const request = store.put({ key: SETTINGS_KEYS.API_KEY, value: key });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    remove: async (): Promise<void> => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.SETTINGS, 'readwrite');
            const store = tx.objectStore(STORES.SETTINGS);
            const request = store.delete(SETTINGS_KEYS.API_KEY);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    exists: async (): Promise<boolean> => {
        const key = await apiKeyStorage.get();
        return !!key;
    },
};

// ============= Styles Storage =============
export const stylesStorage = {
    getAll: async (): Promise<SavedStyle[]> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORES.STYLES, 'readonly');
                const store = tx.objectStore(STORES.STYLES);
                const request = store.getAll();
                request.onsuccess = () => {
                    // Sort by createdAt descending (newest first)
                    const styles = request.result || [];
                    styles.sort((a, b) => b.createdAt - a.createdAt);
                    resolve(styles);
                };
                request.onerror = () => reject(request.error);
            });
        } catch {
            return [];
        }
    },

    getById: async (id: string): Promise<SavedStyle | null> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORES.STYLES, 'readonly');
                const store = tx.objectStore(STORES.STYLES);
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return null;
        }
    },

    add: async (style: SavedStyle): Promise<void> => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.STYLES, 'readwrite');
            const store = tx.objectStore(STORES.STYLES);
            const request = store.add(style);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    update: async (id: string, updates: Partial<SavedStyle>): Promise<void> => {
        const existing = await stylesStorage.getById(id);
        if (!existing) return;

        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.STYLES, 'readwrite');
            const store = tx.objectStore(STORES.STYLES);
            const request = store.put({ ...existing, ...updates });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    remove: async (id: string): Promise<void> => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.STYLES, 'readwrite');
            const store = tx.objectStore(STORES.STYLES);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    count: async (): Promise<number> => {
        const styles = await stylesStorage.getAll();
        return styles.length;
    },
};

// ============= Characters Storage =============
export const charactersStorage = {
    getAll: async (): Promise<SavedCharacter[]> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORES.CHARACTERS, 'readonly');
                const store = tx.objectStore(STORES.CHARACTERS);
                const request = store.getAll();
                request.onsuccess = () => {
                    const characters = request.result || [];
                    characters.sort((a, b) => b.createdAt - a.createdAt);
                    resolve(characters);
                };
                request.onerror = () => reject(request.error);
            });
        } catch {
            return [];
        }
    },

    getById: async (id: string): Promise<SavedCharacter | null> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORES.CHARACTERS, 'readonly');
                const store = tx.objectStore(STORES.CHARACTERS);
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return null;
        }
    },

    getByStyleId: async (styleId: string): Promise<SavedCharacter[]> => {
        const characters = await charactersStorage.getAll();
        return characters.filter((c) => c.styleId === styleId);
    },

    add: async (character: SavedCharacter): Promise<void> => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.CHARACTERS, 'readwrite');
            const store = tx.objectStore(STORES.CHARACTERS);
            const request = store.add(character);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    update: async (id: string, updates: Partial<SavedCharacter>): Promise<void> => {
        const existing = await charactersStorage.getById(id);
        if (!existing) return;

        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.CHARACTERS, 'readwrite');
            const store = tx.objectStore(STORES.CHARACTERS);
            const request = store.put({ ...existing, ...updates });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    remove: async (id: string): Promise<void> => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.CHARACTERS, 'readwrite');
            const store = tx.objectStore(STORES.CHARACTERS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    count: async (): Promise<number> => {
        const characters = await charactersStorage.getAll();
        return characters.length;
    },
};

// ============= Videos Storage =============
export const videosStorage = {
    getAll: async (): Promise<GeneratedVideo[]> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORES.VIDEOS, 'readonly');
                const store = tx.objectStore(STORES.VIDEOS);
                const request = store.getAll();
                request.onsuccess = () => {
                    const videos = request.result || [];
                    videos.sort((a, b) => b.createdAt - a.createdAt);
                    resolve(videos);
                };
                request.onerror = () => reject(request.error);
            });
        } catch {
            return [];
        }
    },

    add: async (video: GeneratedVideo): Promise<void> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORES.VIDEOS, 'readwrite');
                const store = tx.objectStore(STORES.VIDEOS);
                const request = store.add(video);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.warn('Could not save video:', e);
        }
    },

    remove: async (id: string): Promise<void> => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.VIDEOS, 'readwrite');
            const store = tx.objectStore(STORES.VIDEOS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    clear: async (): Promise<void> => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.VIDEOS, 'readwrite');
            const store = tx.objectStore(STORES.VIDEOS);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
};

// ============= Theme Storage =============
export const themeStorage = {
    get: async (): Promise<'light' | 'dark' | null> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORES.SETTINGS, 'readonly');
                const store = tx.objectStore(STORES.SETTINGS);
                const request = store.get(SETTINGS_KEYS.THEME);
                request.onsuccess = () => {
                    const value = request.result?.value;
                    resolve(value === 'light' || value === 'dark' ? value : null);
                };
                request.onerror = () => reject(request.error);
            });
        } catch {
            return null;
        }
    },

    set: async (theme: 'light' | 'dark'): Promise<void> => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.SETTINGS, 'readwrite');
            const store = tx.objectStore(STORES.SETTINGS);
            const request = store.put({ key: SETTINGS_KEYS.THEME, value: theme });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
};

// ============= Storage Info =============
export async function getStorageInfo(): Promise<{ used: number; available: number; percentage: number }> {
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const used = estimate.usage || 0;
            const available = estimate.quota || 0;
            const percentage = available > 0 ? (used / available) * 100 : 0;
            return { used, available, percentage };
        }
    } catch {
        // Fallback
    }
    return { used: 0, available: 0, percentage: 0 };
}

// ============= Migration from localStorage =============
export async function migrateFromLocalStorage(): Promise<void> {
    try {
        // Migrate API key
        const oldApiKey = localStorage.getItem('clipify-api-key');
        if (oldApiKey) {
            await apiKeyStorage.set(oldApiKey);
            localStorage.removeItem('clipify-api-key');
        }

        // Migrate theme
        const oldTheme = localStorage.getItem('clipify-theme');
        if (oldTheme === 'light' || oldTheme === 'dark') {
            await themeStorage.set(oldTheme);
            localStorage.removeItem('clipify-theme');
        }

        // Migrate styles
        const oldStyles = localStorage.getItem('clipify-styles');
        if (oldStyles) {
            const styles: SavedStyle[] = JSON.parse(oldStyles);
            for (const style of styles) {
                await stylesStorage.add(style);
            }
            localStorage.removeItem('clipify-styles');
        }

        // Migrate characters
        const oldCharacters = localStorage.getItem('clipify-characters');
        if (oldCharacters) {
            const characters: SavedCharacter[] = JSON.parse(oldCharacters);
            for (const character of characters) {
                await charactersStorage.add(character);
            }
            localStorage.removeItem('clipify-characters');
        }

        // Migrate videos
        const oldVideos = localStorage.getItem('clipify-videos');
        if (oldVideos) {
            const videos: GeneratedVideo[] = JSON.parse(oldVideos);
            for (const video of videos) {
                await videosStorage.add(video);
            }
            localStorage.removeItem('clipify-videos');
        }

        console.log('Migration from localStorage completed');
    } catch (error) {
        console.error('Migration from localStorage failed:', error);
    }
}

// Initialize database
export async function initDatabase(): Promise<void> {
    await getDB();
    await migrateFromLocalStorage();
}
