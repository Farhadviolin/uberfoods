import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../contexts/FavoritesContext';
import api from '../utils/api';
import { getImageUrl, getRestaurantPlaceholder } from '../utils/imageUtils';
import './Favorites.css';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  address: string;
  dishes: Dish[];
}

interface Dish {
  id: string;
  name: string;
  price: number;
}

export function Favorites() {
  const { t } = useTranslation();
  const { favoriteRestaurants, toggleFavorite, loading: favoritesLoading } = useFavorites();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchFavoriteRestaurants = useCallback(async () => {
    if (favoriteRestaurants.length === 0) {
      setRestaurants([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const promises = favoriteRestaurants.map((id) =>
        api.get(`/restaurants/public/${id}`).catch(() => null)
      );
      const results = await Promise.all(promises);
      const validRestaurants = results
        .filter((result) => result !== null)
        .map((result) => result!.data);
      setRestaurants(validRestaurants);
    } catch (err) {
      // Error is handled silently - empty state will be shown
    } finally {
      setLoading(false);
    }
  }, [favoriteRestaurants, t]);

  useEffect(() => {
    fetchFavoriteRestaurants();
  }, [favoriteRestaurants, fetchFavoriteRestaurants]);

  if (favoritesLoading || loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
        <div>Lade Favoriten...</div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <h1>Meine Favoriten</h1>

      {restaurants.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
          <p>Noch keine Favoriten gespeichert</p>
          <p style={{ color: '#65676B', fontSize: '14px' }}>
            Markieren Sie Restaurants als Favoriten, um sie hier schnell wiederzufinden
          </p>
          <button onClick={() => navigate('/')} className="browse-button">
            Restaurants durchsuchen
          </button>
        </div>
      ) : (
        <div className="restaurant-grid">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="restaurant-card"
              onClick={() => navigate(`/restaurant/${restaurant.id}`)}
            >
              <img
                src={getImageUrl(restaurant.imageUrl) || getRestaurantPlaceholder()}
                alt={restaurant.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getRestaurantPlaceholder();
                }}
              />
              <div className="restaurant-card-content">
                <div className="restaurant-header">
                  <h2>{restaurant.name}</h2>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(restaurant.id);
                    }}
                    className="favorite-btn active"
                    title="Aus Favoriten entfernen"
                  >
                    ⭐
                  </button>
                </div>
                <p>{restaurant.description || 'Keine Beschreibung verfügbar'}</p>
                <div className="fb-location">📍 {restaurant.address}</div>
                {restaurant.dishes && restaurant.dishes.length > 0 && (
                  <div className="dish-count">
                    {restaurant.dishes.length} Gerichte verfügbar
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

