import { useState, useEffect, useCallback } from 'react';
import { generationsService, type Generation, type GenerationType, type GenerationListParams } from '@/services/api/generationsService';

export interface UseGenerationsOptions {
    type?: GenerationType;
    favorites?: boolean;
    limit?: number;
    autoFetch?: boolean;
}

export function useGenerations(options: UseGenerationsOptions = {}) {
    const { type, favorites, limit = 50, autoFetch = true } = options;

    const [generations, setGenerations] = useState<Generation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

    const fetchGenerations = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params: GenerationListParams = {
                page,
                limit,
                status: 'completed', // Only show completed for library
            };
            if (type) params.type = type;
            if (favorites) params.favorites = true;

            const response = await generationsService.list(params);
            setGenerations(response.generations);
            setPagination({
                page: response.pagination.page,
                total: response.pagination.total,
                totalPages: response.pagination.totalPages,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch generations');
        } finally {
            setLoading(false);
        }
    }, [type, favorites, limit]);

    useEffect(() => {
        if (autoFetch) {
            fetchGenerations();
        }
    }, [fetchGenerations, autoFetch]);

    const toggleFavorite = useCallback(async (id: string) => {
        const gen = generations.find(g => g.id === id);
        if (!gen) return;

        try {
            const updated = await generationsService.update(id, { isFavorite: !gen.isFavorite });
            setGenerations(prev => prev.map(g => g.id === id ? updated : g));
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to update favorite');
        }
    }, [generations]);

    const deleteGeneration = useCallback(async (id: string) => {
        try {
            await generationsService.delete(id);
            setGenerations(prev => prev.filter(g => g.id !== id));
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to delete');
        }
    }, []);

    const refetch = useCallback(() => {
        fetchGenerations(pagination.page);
    }, [fetchGenerations, pagination.page]);

    return {
        generations,
        loading,
        error,
        pagination,
        toggleFavorite,
        deleteGeneration,
        refetch,
        fetchPage: fetchGenerations,
    };
}

export default useGenerations;
