import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Star, Users, MapPin, Clock, Target, Brain, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';

interface Recommendation {
  id: string;
  name: string;
  imageUrl?: string;
  recommendationScore: number;
  recommendationReasons: string[];
}

interface RestaurantRecommendation extends Recommendation {
  rating: number;
  reviewCount: number;
  categories: string[];
  distance?: number;
}

interface DishRecommendation extends Recommendation {
  price: number;
  category: string;
  restaurant: string;
}

interface TrendingItem {
  id: string;
  name: string;
  imageUrl?: string;
  orderCount: number;
  trend: string;
}

interface PopularTimes {
  period: string;
  peakHoursByDay: { [key: string]: Array<{ hour: number; count: number }> };
  overallPeakHours: Array<{ day: string; hour: number; orderCount: number }>;
  recommendations: {
    bestDaysToOrder: string[];
    bestTimesToOrder: string[];
    avoidPeakTimes: string[];
  };
}

const RecommendationsPanel: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');

  // Fetch trending items
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['recommendations', 'trending'],
    queryFn: async () => {
      const response = await api.get('/recommendations/trending?type=both&limit=10');
      return response.data;
    },
  });

  // Fetch popular times
  const { data: popularTimesData } = useQuery({
    queryKey: ['recommendations', 'popular-times'],
    queryFn: async () => {
      const response = await api.get('/recommendations/popular-times?days=7');
      return response.data as PopularTimes;
    },
  });

  // Fetch restaurant recommendations
  const { data: restaurantRecs, refetch: refetchRestaurants } = useQuery({
    queryKey: ['recommendations', 'restaurants', selectedUserId],
    queryFn: async () => {
      const response = await api.get(`/recommendations/restaurants?limit=6${selectedUserId ? `&userId=${selectedUserId}` : ''}`);
      return response.data;
    },
    enabled: !!selectedUserId,
  });

  // Fetch dish recommendations
  const { data: dishRecs, refetch: refetchDishes } = useQuery({
    queryKey: ['recommendations', 'dishes', selectedRestaurantId],
    queryFn: async () => {
      const response = await api.get(`/recommendations/dishes?limit=6${selectedRestaurantId ? `&restaurantId=${selectedRestaurantId}` : ''}`);
      return response.data;
    },
    enabled: !!selectedRestaurantId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Recommendations</h1>
          <p className="text-gray-600 mt-2">
            Intelligente Empfehlungen für personalisiertes Kundenerlebnis
          </p>
        </div>
        <Badge variant="info" className="flex items-center space-x-1">
          <Brain className="w-4 h-4" />
          <span>AI Powered</span>
        </Badge>
      </div>

      <Tabs defaultValue="trending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="personalized">Personalisierte</TabsTrigger>
          <TabsTrigger value="demand">Nachfrage</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trending Restaurants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span>Trending Restaurants</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendingLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse flex space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trendingData?.trending.restaurants?.slice(0, 5).map((restaurant: TrendingItem) => (
                      <div key={restaurant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{restaurant.name}</p>
                            <p className="text-sm text-gray-600">{restaurant.orderCount} Bestellungen</p>
                          </div>
                        </div>
                        <Badge variant={restaurant.trend === 'up' ? 'default' : 'info'}>
                          {restaurant.trend === 'up' ? '↗️' : '→'} Trending
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trending Dishes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Trending Gerichte</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendingData?.trending.dishes?.slice(0, 5).map((dish: TrendingItem) => (
                    <div key={dish.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{dish.name}</p>
                          <p className="text-sm text-gray-600">{dish.orderCount} Bestellungen</p>
                        </div>
                      </div>
                      <Badge variant={dish.trend === 'up' ? 'default' : 'info'}>
                        {dish.trend === 'up' ? '🔥' : '📈'} Hot
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Popular Times */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <span>Beliebteste Bestellzeiten</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {popularTimesData?.overallPeakHours?.slice(0, 3).map((peak, index) => (
                  <div key={index} className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {peak.hour}:00
                    </div>
                    <div className="text-sm text-gray-600">{peak.day}</div>
                    <div className="text-xs text-gray-500">
                      {peak.orderCount} Bestellungen
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2">
                <h4 className="font-medium text-gray-900">Empfehlungen:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Beste Tage: {popularTimesData?.recommendations.bestDaysToOrder.join(', ')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Beste Zeiten: {popularTimesData?.recommendations.bestTimesToOrder.join(', ')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Vermeide: {popularTimesData?.recommendations.avoidPeakTimes.join(', ')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personalized" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Restaurant Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <span>Restaurant-Empfehlungen</span>
                </CardTitle>
                <div className="flex space-x-2">
                  <Input
                    placeholder="User ID eingeben..."
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  />
                  <Button onClick={() => refetchRestaurants()}>
                    <Zap className="w-4 h-4 mr-2" />
                    Laden
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {restaurantRecs?.recommendations ? (
                  <div className="space-y-3">
                    {restaurantRecs.recommendations.map((rec: RestaurantRecommendation) => (
                      <div key={rec.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{rec.name}</h4>
                          <Badge variant="info">
                            Score: {rec.recommendationScore}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <Star className="w-3 h-3 mr-1" />
                            {rec.rating}
                          </span>
                          <span>({rec.reviewCount} Bewertungen)</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rec.recommendationReasons.map((reason, idx) => (
                            <Badge key={idx} variant="default" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Geben Sie eine User ID ein, um personalisierte Empfehlungen zu erhalten</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dish Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-green-500" />
                  <span>Gericht-Empfehlungen</span>
                </CardTitle>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Restaurant ID eingeben..."
                    value={selectedRestaurantId}
                    onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  />
                  <Button onClick={() => refetchDishes()}>
                    <Zap className="w-4 h-4 mr-2" />
                    Laden
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dishRecs?.recommendations ? (
                  <div className="space-y-3">
                    {dishRecs.recommendations.map((rec: DishRecommendation) => (
                      <div key={rec.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{rec.name}</h4>
                          <div className="text-right">
                            <div className="font-medium">€{rec.price.toFixed(2)}</div>
                            <Badge variant="info" className="text-xs">
                              Score: {rec.recommendationScore}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {rec.category} • {rec.restaurant}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rec.recommendationReasons.map((reason, idx) => (
                            <Badge key={idx} variant="default" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Geben Sie eine Restaurant ID ein, um Gericht-Empfehlungen zu erhalten</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demand" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nachfragevorhersage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nachfrage-Analyse
                </h3>
                <p className="text-gray-600 mb-6">
                  KI-gestützte Vorhersage der Nachfrage für Restaurants und Gerichte
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">85%</div>
                    <div className="text-sm text-blue-800">Vorhersage-Genauigkeit</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">24h</div>
                    <div className="text-sm text-green-800">Vorhersage-Horizont</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">150+</div>
                    <div className="text-sm text-purple-800">Restaurants analysiert</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversion Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Recommendations → Orders</span>
                    <Badge variant="default">+23%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Personalization Impact</span>
                    <Badge variant="default">+18%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Order Value</span>
                    <Badge variant="default">+€2.50</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trend Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Healthy Food Trend</span>
                    <Badge variant="default">↗️ +35%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Quick Delivery</span>
                    <Badge variant="default">↗️ +28%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Local Cuisine</span>
                    <Badge variant="default">↗️ +15%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Model Accuracy</span>
                    <Badge variant="default">94.2%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Response Time</span>
                    <Badge variant="default">{'<'} 200ms</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Daily Predictions</span>
                    <Badge variant="default">50K+</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecommendationsPanel;
