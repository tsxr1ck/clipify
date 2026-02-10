import { useState, useEffect } from 'react';
import apiClient from '@/services/api/client';
import type { SceneBuilderResult, StorySegment } from '@/services/api/sceneBuilderService';

// Types for saved data
export interface SavedScene extends SceneBuilderResult {
    id: string;
    title: string;
    description?: string;
    originalPrompt: string;
    timesUsed: number;
    lastUsedAt?: string;
    isFavorite: boolean;
    tags: string[];
    folder?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SavedStory {
    id: string;
    storyTitle: string;
    storyDescription?: string;
    originalPrompt: string;
    segmentCount: number;
    segments: StorySegment[];
    timesUsed: number;
    lastUsedAt?: string;
    isFavorite: boolean;
    tags: string[];
    folder?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Hook for managing saved scenes
 */
export function useSavedScenes(options: {
    page?: number;
    limit?: number;
    favorites?: boolean;
    folder?: string;
    search?: string;
} = {}) {
    const [scenes, setScenes] = useState<SavedScene[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    const fetchScenes = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/scenes', { params: options });
            setScenes(response.data.scenes);
            setPagination(response.data.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch scenes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScenes();
    }, [JSON.stringify(options)]);

    const deleteScene = async (sceneId: string) => {
        try {
            await apiClient.delete(`/scenes/${sceneId}`);
            setScenes(scenes.filter(s => s.id !== sceneId));
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to delete scene');
        }
    };

    const toggleFavorite = async (sceneId: string) => {
        try {
            const scene = scenes.find(s => s.id === sceneId);
            if (!scene) return;

            const response = await apiClient.put(`/scenes/${sceneId}`, {
                isFavorite: !scene.isFavorite,
            });

            setScenes(scenes.map(s =>
                s.id === sceneId ? { ...s, isFavorite: response.data.scene.isFavorite } : s
            ));
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to toggle favorite');
        }
    };

    const updateScene = async (sceneId: string, updates: Partial<SavedScene>) => {
        try {
            const response = await apiClient.put(`/scenes/${sceneId}`, updates);
            setScenes(scenes.map(s => (s.id === sceneId ? response.data.scene : s)));
            return response.data.scene;
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to update scene');
        }
    };

    return {
        scenes,
        loading,
        error,
        pagination,
        refresh: fetchScenes,
        deleteScene,
        toggleFavorite,
        updateScene,
    };
}

/**
 * Hook for managing saved stories
 */
export function useSavedStories(options: {
    page?: number;
    limit?: number;
    favorites?: boolean;
    folder?: string;
    search?: string;
} = {}) {
    const [stories, setStories] = useState<SavedStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    const fetchStories = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/stories', { params: options });
            setStories(response.data.stories);
            setPagination(response.data.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch stories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, [JSON.stringify(options)]);

    const deleteStory = async (storyId: string) => {
        try {
            await apiClient.delete(`/stories/${storyId}`);
            setStories(stories.filter(s => s.id !== storyId));
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to delete story');
        }
    };

    const toggleFavorite = async (storyId: string) => {
        try {
            const story = stories.find(s => s.id === storyId);
            if (!story) return;

            const response = await apiClient.put(`/stories/${storyId}`, {
                isFavorite: !story.isFavorite,
            });

            setStories(stories.map(s =>
                s.id === storyId ? { ...s, isFavorite: response.data.story.isFavorite } : s
            ));
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to toggle favorite');
        }
    };

    const updateStory = async (storyId: string, updates: Partial<SavedStory>) => {
        try {
            const response = await apiClient.put(`/stories/${storyId}`, updates);
            setStories(stories.map(s => (s.id === storyId ? response.data.story : s)));
            return response.data.story;
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to update story');
        }
    };

    return {
        stories,
        loading,
        error,
        pagination,
        refresh: fetchStories,
        deleteStory,
        toggleFavorite,
        updateStory,
    };
}

/**
 * Hook to get a single scene
 */
export function useSavedScene(sceneId: string | null) {
    const [scene, setScene] = useState<SavedScene | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sceneId) return;

        const fetchScene = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiClient.get(`/scenes/${sceneId}`);
                setScene(response.data.scene);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch scene');
            } finally {
                setLoading(false);
            }
        };

        fetchScene();
    }, [sceneId]);

    return { scene, loading, error };
}

/**
 * Hook to get a single story
 */
export function useSavedStory(storyId: string | null) {
    const [story, setStory] = useState<SavedStory | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!storyId) return;

        const fetchStory = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiClient.get(`/stories/${storyId}`);
                setStory(response.data.story);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch story');
            } finally {
                setLoading(false);
            }
        };

        fetchStory();
    }, [storyId]);

    return { story, loading, error };
}