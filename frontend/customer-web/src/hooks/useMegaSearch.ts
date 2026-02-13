import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRestaurants } from './useRestaurants';
import { useDebouncedValue } from './useDebouncedValue';
import {
  MegaSearchFilters,
  MegaSearchResponse,
  fetchMegaSearch,
  buildFallbackSearchResults,
} from '../services/searchService';

const defaultFilters: MegaSearchFilters = {
  budget: null,
  dietary: [],
  deliverySpeed: null,
  mood: null,
};

export function useMegaSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<MegaSearchFilters>(defaultFilters);
  const [lastSelectedQuery, setLastSelectedQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 350);
  const { data: restaurants } = useRestaurants();

  const { data, isFetching, isLoading, error } = useQuery<MegaSearchResponse>({
    queryKey: ['mega-search', debouncedQuery, filters],
    enabled: Boolean(debouncedQuery && debouncedQuery.trim().length >= 2),
    queryFn: ({ signal }) =>
      fetchMegaSearch(
        {
          query: debouncedQuery,
          filters,
          context: {
            timeOfDay: getTimeOfDay(),
            loyaltyTier: localStorage.getItem('loyalty_tier'),
            recentOrders: JSON.parse(
              localStorage.getItem('recent_orders') || '[]'
            ),
          },
        },
        signal
      ),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const fallback = useMemo(
    () => buildFallbackSearchResults(restaurants, debouncedQuery, filters),
    [restaurants, debouncedQuery, filters]
  );

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const mergedResults =
    data && data.results.length > 0 ? data : fallback ?? data;

  return {
    query,
    setQuery,
    filters,
    setFilters,
    results: mergedResults?.results ?? [],
    insights: mergedResults?.insights ?? fallback.insights,
    latencyMs: mergedResults?.latencyMs ?? 0,
    personalization: mergedResults?.personalization ?? fallback.personalization,
    isLoading: isLoading,
    isFetching,
    error,
    hasBackendResults: Boolean(data?.results.length),
    lastSelectedQuery,
    setLastSelectedQuery,
  };
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 6) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 14) return 'lunch';
  if (hour < 18) return 'afternoon';
  return 'evening';
}


