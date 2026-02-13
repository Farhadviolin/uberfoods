import api from '../utils/api';

export interface RestaurantRecommendation {
  id: string;
  name: string;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  categories: string[];
  distance?: number;
  recommendationScore: number;
  recommendationReasons: string[];
}

export interface DishRecommendation {
  id: string;
  name: string;
  imageUrl?: string;
  price: number;
  category: string;
  restaurant: string;
  recommendationScore: number;
  recommendationReasons: string[];
}

export interface TrendingItem {
  id: string;
  name: string;
  imageUrl?: string;
  orderCount: number;
  trend: string;
}

export interface PopularTimes {
  period: string;
  peakHoursByDay: { [key: string]: Array<{ hour: number; count: number }> };
  overallPeakHours: Array<{ day: string; hour: number; orderCount: number }>;
  recommendations: {
    bestDaysToOrder: string[];
    bestTimesToOrder: string[];
    avoidPeakTimes: string[];
  };
}

export interface DemandPrediction {
  restaurantId?: string;
  predictions: Array<{
    timestamp: string;
    hour: number;
    dayOfWeek: number;
    predictedOrders: number;
    confidence: number;
    factors: {
      timeOfDay: string;
      dayOfWeek: string;
      seasonal: string;
    };
  }>;
  summary: {
    avgPredictedDemand: number;
    peakHour: any;
    totalPredictedOrders: number;
  };
  recommendations: {
    suggestedStaffing: number;
    prepTimeRecommendations: string[];
  };
}

export interface PriceSuggestion {
  dish?: {
    id: string;
    name: string;
    currentPrice: number;
  };
  restaurantId?: string;
  suggestions: Array<{
    type: string;
    adjustment: number;
    newPrice: number;
    recommended: boolean;
    confidence: number;
    reasoning: string;
    estimatedRevenueImpact: number;
  }>;
}

export interface UserPreferences {
  userId: string;
  preferences: {
    categories: string[];
    priceRange: string;
    orderFrequency: string;
    loyaltyLevel: string;
    preferredTimes: string[];
  };
  insights: {
    favoriteCuisine: string;
    preferredPriceRange: string;
    orderFrequency: string;
    loyaltyLevel: string;
  };
  recommendations: {
    suggestedCategories: string[];
    priceSensitivity: string;
    potentialUpsell: string;
  };
}

export const recommendationsApi = {
  // Restaurant Recommendations
  getRestaurantRecommendations: async (
    limit: number = 10,
    userId?: string,
    location?: { lat: number; lng: number }
  ): Promise<{
    recommendations: RestaurantRecommendation[];
    personalization: {
      basedOnHistory: boolean;
      preferredCategories: string[];
      preferredPriceRange: string;
      locationBased: boolean;
    };
  }> => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (userId) params.append('userId', userId);
    if (location) {
      params.append('location[lat]', location.lat.toString());
      params.append('location[lng]', location.lng.toString());
    }

    const response = await api.get(`/recommendations/restaurants?${params}`);
    return response.data;
  },

  // Dish Recommendations
  getDishRecommendations: async (
    limit: number = 5,
    restaurantId?: string
  ): Promise<{
    recommendations: DishRecommendation[];
    personalization: {
      favoriteCategories: string[];
      preferredIngredients: string[];
      dietaryPreferences: string[];
    };
  }> => {
    const params = restaurantId
      ? `?limit=${limit}&restaurantId=${restaurantId}`
      : `?limit=${limit}`;

    const response = await api.get(`/recommendations/dishes${params}`);
    return response.data;
  },

  // Trending Items
  getTrendingItems: async (
    type: 'restaurants' | 'dishes' | 'both' = 'both',
    limit: number = 10
  ): Promise<{
    trending: {
      restaurants: TrendingItem[];
      dishes: TrendingItem[];
    };
    period: string;
    totalAnalyzed: {
      orders: number;
      restaurants: number;
      dishes: number;
    };
  }> => {
    const response = await api.get(`/recommendations/trending?type=${type}&limit=${limit}`);
    return response.data;
  },

  // Similar Restaurants
  getSimilarRestaurants: async (
    restaurantId: string,
    limit: number = 5
  ): Promise<{
    targetRestaurant: {
      id: string;
      name: string;
      categories: string[];
      rating: number;
    };
    similarRestaurants: Array<{
      id: string;
      name: string;
      rating: number;
      recommendationScore: number;
      reasons: string[];
    }>;
  }> => {
    const response = await api.get(`/recommendations/similar/${restaurantId}?limit=${limit}`);
    return response.data;
  },

  // Popular Times
  getPopularTimes: async (days: number = 7): Promise<PopularTimes> => {
    const response = await api.get(`/recommendations/popular-times?days=${days}`);
    return response.data;
  },

  // Demand Prediction
  getDemandPrediction: async (
    restaurantId?: string,
    hours: number = 24
  ): Promise<DemandPrediction> => {
    const params = new URLSearchParams({ hours: hours.toString() });
    if (restaurantId) params.append('restaurantId', restaurantId);

    const response = await api.get(`/recommendations/demand-prediction?${params}`);
    return response.data;
  },

  // Price Suggestions
  getPriceSuggestions: async (
    restaurantId?: string,
    dishId?: string
  ): Promise<PriceSuggestion> => {
    const params = new URLSearchParams();
    if (restaurantId) params.append('restaurantId', restaurantId);
    if (dishId) params.append('dishId', dishId);

    const response = await api.get(`/recommendations/price-suggestions?${params}`);
    return response.data;
  },

  // User Preferences
  getUserPreferences: async (userId: string): Promise<UserPreferences> => {
    const response = await api.get(`/recommendations/user-preferences?userId=${userId}`);
    return response.data;
  },

  // Seasonal Offers
  getSeasonalOffers: async (limit: number = 10): Promise<{
    season: string;
    offers: Array<{
      name: string;
      discount: number;
      reason: string;
    }>;
    reasoning: string;
    effectiveness: {
      expectedConversionIncrease: number;
      avgDiscountValue: number;
    };
  }> => {
    const response = await api.get(`/recommendations/seasonal-offers?limit=${limit}`);
    return response.data;
  },
};