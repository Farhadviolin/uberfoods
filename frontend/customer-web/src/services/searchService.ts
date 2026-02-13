import api from '../utils/api';
import { Restaurant } from '../types';

export type MegaSearchEntityType =
  | 'restaurant'
  | 'dish'
  | 'collection'
  | 'context'
  | 'action';

export interface MegaSearchFilters {
  budget: 'budget' | 'mid' | 'premium' | null;
  dietary: string[];
  deliverySpeed: 'fast' | 'balanced' | 'eco' | null;
  mood: 'comfort' | 'healthy' | 'experimental' | null;
}

export interface MegaSearchRequest {
  query: string;
  location?: {
    lat: number;
    lng: number;
  };
  filters: MegaSearchFilters;
  context?: {
    timeOfDay?: string;
    loyaltyTier?: string | null;
    recentOrders?: string[];
  };
}

export interface MegaSearchResult {
  id: string;
  type: MegaSearchEntityType;
  title: string;
  subtitle?: string;
  description?: string;
  badges?: string[];
  score: number;
  action?: {
    type: 'navigate' | 'filter' | 'insight';
    payload: string;
  };
  metadata?: Record<string, unknown>;
}

export interface MegaSearchResponse {
  query: string;
  latencyMs: number;
  personalization: {
    applied: boolean;
    signals: string[];
  };
  results: MegaSearchResult[];
  insights: {
    trendingQueries: string[];
    popularFilters: string[];
    dataFreshness: string;
  };
}

const defaultResponse: MegaSearchResponse = {
  query: '',
  latencyMs: 0,
  personalization: {
    applied: false,
    signals: [],
  },
  results: [],
  insights: {
    trendingQueries: ['Pizza bianca', 'Vegan Bowls', '5-Minuten-Lunch'],
    popularFilters: ['budget', 'healthy', 'fast'],
    dataFreshness: 'Lokale Echtzeitdaten',
  },
};

export async function fetchMegaSearch(
  payload: MegaSearchRequest,
  signal?: AbortSignal
): Promise<MegaSearchResponse> {
  if (!payload.query.trim()) {
    return { ...defaultResponse, query: payload.query };
  }

  try {
    const { data } = await api.post<MegaSearchResponse>(
      '/search/intelligent',
      payload,
      {
        signal,
        headers: {
          'X-Mega-Search': 'true',
        },
      }
    );
    return data;
  } catch {
    return {
      ...defaultResponse,
      query: payload.query,
    };
  }
}

export function buildFallbackSearchResults(
  restaurants: Restaurant[] | undefined,
  query: string,
  filters: MegaSearchFilters
): MegaSearchResponse {
  if (!query.trim() || !restaurants?.length) {
    return {
      ...defaultResponse,
      query,
      insights: {
        trendingQueries: ['Poké Bowl', 'Zero-Waste Lunch', 'Streetfood'],
        popularFilters: filters.dietary.length
          ? filters.dietary
          : ['vegan', 'vegetarisch', 'glutenfrei'],
        dataFreshness: 'Client Snapshot',
      },
    };
  }

  const normalizedQuery = query.toLowerCase();
  const results: MegaSearchResult[] = [];

  restaurants.forEach((restaurant) => {
    if (!restaurant?.id || !restaurant.name) return;

    const matchesRestaurant =
      restaurant.name.toLowerCase().includes(normalizedQuery) ||
      restaurant.description?.toLowerCase().includes(normalizedQuery);

    const matchingDishes =
      restaurant.dishes?.filter((dish) => {
        if (!dish?.name) return false;
        const nameMatch = dish.name.toLowerCase().includes(normalizedQuery);
        const tagMatch = dish.tags?.some((tag) =>
          tag.toLowerCase().includes(normalizedQuery)
        );
        return nameMatch || tagMatch;
      }) || [];

    if (matchesRestaurant) {
      results.push({
        id: restaurant.id,
        type: 'restaurant',
        title: restaurant.name,
        subtitle: restaurant.address,
        description:
          restaurant.description || 'Entdecke kuratierte Empfehlungen.',
        badges: [
          restaurant.rating ? `${restaurant.rating.toFixed(1)}★` : 'Neu',
          (restaurant as any).cuisines?.[0] || 'Multiküche',
          restaurant.deliveryFee ? `${restaurant.deliveryFee}€ Versand` : 'Gratis Zustellung',
        ].filter(Boolean) as string[],
        score: 0.8,
        action: {
          type: 'navigate',
          payload: `/restaurant/${restaurant.id}`,
        },
        metadata: {
          fallback: true,
        },
      });
    }

    matchingDishes.forEach((dish) => {
      results.push({
        id: `${restaurant.id}-${dish.id || dish.name}`,
        type: 'dish',
        title: dish.name,
        subtitle: restaurant.name,
        description: dish.description,
        badges: [
          ...(dish.tags || []),
          dish.price ? `${dish.price.toFixed(2)}€` : undefined,
        ].filter(Boolean) as string[],
        score: 0.65,
        action: {
          type: 'navigate',
          payload: `/restaurant/${restaurant.id}`,
        },
        metadata: {
          fallback: true,
        },
      });
    });
  });

  const uniqueResults = results
    .sort((a, b) => b.score - a.score)
    .filter(
      (result, index, self) =>
        index === self.findIndex((item) => item.id === result.id)
    )
    .slice(0, 12);

  return {
    ...defaultResponse,
    query,
    results: uniqueResults,
    insights: {
      trendingQueries: [query, 'In 10 Minuten liefern', 'Smart Budget'],
      popularFilters: filters.dietary.length
        ? filters.dietary
        : ['vegan', 'proteinreich', 'glutenfrei'],
      dataFreshness: 'Live Snapshot (Fallback)',
    },
  };
}


