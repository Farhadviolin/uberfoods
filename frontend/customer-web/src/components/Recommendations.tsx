import { useMemo } from 'react';
import { useRestaurants } from '../hooks/useRestaurants';
import { useOrders } from '../hooks/useOrders';
import { useFavoritesQuery } from '../hooks/useFavoritesQuery';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { Sparkles, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OptimizedImage } from './OptimizedImage';
import './Recommendations.css';

export function Recommendations() {
  const navigate = useNavigate();
  const { data: restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { data: orders } = useOrders();
  const { data: favorites } = useFavoritesQuery();

  const recommendations = useMemo(() => {
    if (!restaurants || !Array.isArray(restaurants) || !orders) return [];

    // Analysiere Bestellhistorie
    const orderCounts = new Map<string, number>();
    orders.forEach((order) => {
      const restaurantId = order.restaurant?.id;
      if (restaurantId) {
        orderCounts.set(restaurantId, (orderCounts.get(restaurantId) || 0) + 1);
      }
    });

    // Favoriten berücksichtigen
    const favoriteIds = new Set(favorites?.map((f) => f.restaurantId) || []);

    // Berechne Empfehlungs-Score
    const scoredRestaurants = restaurants
      .filter((r) => r && r.id && r.name)
      .map((restaurant) => {
        let score = 0;

        // Basis-Score für Favoriten
        if (favoriteIds.has(restaurant.id)) {
          score += 10;
        }

        // Score basierend auf Bestellhistorie
        const orderCount = orderCounts.get(restaurant.id) || 0;
        score += orderCount * 5;

        // Score basierend auf Rating
        if (restaurant.rating) {
          score += restaurant.rating * 2;
        }

        // Score basierend auf Anzahl Gerichte (mehr Auswahl = besser)
        if (restaurant.dishes && restaurant.dishes.length > 0) {
          score += Math.min(restaurant.dishes.length / 10, 3);
        }

        return { restaurant, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6) // Top 6 Empfehlungen
      .map((item) => item.restaurant);

    return scoredRestaurants;
  }, [restaurants, orders, favorites]);

  const timeBasedRecommendations = useMemo(() => {
    if (!restaurants || !Array.isArray(restaurants)) return [];

    // Filtere Restaurants basierend auf Tageszeit (vereinfachte Heuristik)
    return restaurants
      .filter((r) => r && r.dishes && r.dishes.length > 0)
      .slice(0, 3);
  }, [restaurants]);

  if (restaurantsLoading) {
    return (
      <div className="recommendations">
        <Skeleton variant="text" width="200px" height="32px" />
        <div className="recommendations-grid">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton variant="rectangular" width="100%" height="150px" />
              <Skeleton variant="text" width="80%" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="recommendations">
      <div className="recommendations-header">
        <div className="recommendations-title">
          <Sparkles size={24} className="title-icon" />
          <h2>Empfohlene Restaurants</h2>
        </div>
        <p className="recommendations-subtitle">
          Basierend auf Ihren Vorlieben und Bestellungen
        </p>
      </div>

      {recommendations.length > 0 ? (
        <div className="recommendations-grid">
          {recommendations.map((restaurant) => (
            <Card
              key={restaurant.id}
              variant="elevated"
              hover
              interactive
              className="recommendation-card"
              onClick={() => navigate(`/restaurant/${restaurant.id}`)}
            >
              <div className="recommendation-image-wrapper">
                <OptimizedImage
                  src={restaurant.imageUrl || ''}
                  alt={restaurant.name}
                  className="recommendation-image"
                />
                {favorites?.some((f) => f.restaurantId === restaurant.id) && (
                  <div className="favorite-badge">⭐</div>
                )}
              </div>
              <div className="recommendation-content">
                <h3 className="recommendation-name">{restaurant.name}</h3>
                {restaurant.description && (
                  <p className="recommendation-description">
                    {restaurant.description.length > 80
                      ? `${restaurant.description.substring(0, 80)}...`
                      : restaurant.description}
                  </p>
                )}
                <div className="recommendation-meta">
                  {restaurant.rating && (
                    <div className="recommendation-rating">
                      ⭐ {restaurant.rating.toFixed(1)}
                    </div>
                  )}
                  {restaurant.dishes && restaurant.dishes.length > 0 && (
                    <div className="recommendation-dishes">
                      {restaurant.dishes.length} Gerichte
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/restaurant/${restaurant.id}`);
                  }}
                  className="recommendation-button"
                >
                  Jetzt bestellen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="no-recommendations">
          <p>Noch keine Empfehlungen verfügbar</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Restaurants entdecken
          </Button>
        </div>
      )}

      {timeBasedRecommendations.length > 0 && (
        <div className="time-based-recommendations">
          <div className="time-based-header">
            <Clock size={20} />
            <h3>Perfekt für jetzt</h3>
          </div>
          <div className="time-based-list">
            {timeBasedRecommendations.map((restaurant) => (
              <Card
                key={restaurant.id}
                variant="outlined"
                hover
                interactive
                className="time-based-card"
                onClick={() => navigate(`/restaurant/${restaurant.id}`)}
              >
                <OptimizedImage
                  src={restaurant.imageUrl || ''}
                  alt={restaurant.name}
                  className="time-based-image"
                />
                <div className="time-based-content">
                  <h4>{restaurant.name}</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/restaurant/${restaurant.id}`);
                    }}
                  >
                    Ansehen
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

