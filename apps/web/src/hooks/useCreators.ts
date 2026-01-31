import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { CreatorWithDistance, CreatorSearchFilters } from '@creatormatch/shared-types';

export function useCreators() {
  const [creators, setCreators] = useState<CreatorWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const searchCreators = useCallback(async (filters: CreatorSearchFilters & { page?: number; limit?: number }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (filters.niches?.length) params.set('niches', filters.niches.join(','));
      if (filters.minFollowers) params.set('minFollowers', filters.minFollowers.toString());
      if (filters.maxFollowers) params.set('maxFollowers', filters.maxFollowers.toString());
      if (filters.minEngagement) params.set('minEngagement', filters.minEngagement.toString());
      if (filters.lat) params.set('lat', filters.lat.toString());
      if (filters.lng) params.set('lng', filters.lng.toString());
      if (filters.radiusMiles) params.set('radiusMiles', filters.radiusMiles.toString());
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.limit) params.set('limit', filters.limit.toString());

      const response = await apiClient.get<CreatorWithDistance[]>(`/creators?${params.toString()}`);
      setCreators(response);
      setTotal(response.length); // In real app, this comes from API response meta
    } catch (err: any) {
      setError(err.message || 'Failed to load creators');
    } finally {
      setLoading(false);
    }
  }, []);

  const getCreator = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      return await apiClient.get<CreatorWithDistance>(`/creators/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load creator');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    creators,
    loading,
    error,
    total,
    searchCreators,
    getCreator,
  };
}
