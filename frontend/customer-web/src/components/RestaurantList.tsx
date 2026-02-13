import React, { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurants } from '../hooks/useRestaurants';
import { OptimizedImage } from './OptimizedImage';
import { Skeleton } from '../design-system/Skeleton';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  rating: number;
  cuisines: string[];
  deliveryFee: number;
  minOrderAmount: number;
  estimatedDeliveryTime: number;
  isOpen: boolean;
  imageUrl?: string;
}

interface RestaurantListProps {
  searchTerm?: string;
  selectedCuisines?: string[];
  sortBy?: 'rating' | 'deliveryTime' | 'deliveryFee';
  onRestaurantClick?: (restaurant: Restaurant) => void;
}

const RestaurantCard: React.FC<{
  restaurant: Restaurant;
  onClick: () => void;
}> = React.memo(({ restaurant, onClick }) => {
  const formattedDeliveryFee = useMemo(() =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(restaurant.deliveryFee),
    [restaurant.deliveryFee]
  );

  const formattedMinOrder = useMemo(() =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(restaurant.minOrderAmount),
    [restaurant.minOrderAmount]
  );

  return (
    <div
      className="restaurant-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onClick()}
      data-testid="restaurant-card"
    >
      <div className="restaurant-image">
        <OptimizedImage
          src={restaurant.imageUrl || '/placeholder-restaurant.jpg'}
          alt={restaurant.name}
          width={300}
          height={200}
          priority={false}
        />
        {!restaurant.isOpen && (
          <div className="restaurant-closed-overlay">Geschlossen</div>
        )}
      </div>

      <div className="restaurant-info">
        <div className="restaurant-header">
          <h3 className="restaurant-name" data-testid="restaurant-name">{restaurant.name}</h3>
          <div className="restaurant-rating">
            <span className="rating-star">⭐</span>
            <span className="rating-value">{restaurant.rating.toFixed(1)}</span>
          </div>
        </div>

        <p className="restaurant-description">{restaurant.description}</p>

        <div className="restaurant-meta">
          <div className="restaurant-cuisines">
            {restaurant.cuisines.slice(0, 2).map((cuisine) => (
              <span key={cuisine} className="cuisine-tag">
                {cuisine}
              </span>
            ))}
          </div>

          <div className="restaurant-details">
            <span className="delivery-fee">{formattedDeliveryFee} Lieferung</span>
            <span className="min-order">Min. {formattedMinOrder}</span>
            <span className="delivery-time">{restaurant.estimatedDeliveryTime} min</span>
          </div>
        </div>
      </div>
    </div>
  );
});

RestaurantCard.displayName = 'RestaurantCard';

export const RestaurantList: React.FC<RestaurantListProps> = React.memo(({
  searchTerm = '',
  selectedCuisines = [],
  sortBy = 'rating',
  onRestaurantClick,
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const { data: restaurantsData, isLoading, error } = useRestaurants();

  const filteredAndSortedRestaurants = useMemo(() => {
    if (!restaurantsData || !Array.isArray(restaurantsData)) return [];

    let filtered = [...restaurantsData]; // Erstelle eine Kopie des Arrays

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchLower) ||
        restaurant.description.toLowerCase().includes(searchLower) ||
        restaurant.cuisines.some(cuisine =>
          cuisine.toLowerCase().includes(searchLower)
        )
      );
    }

    // Filter by cuisines
    if (selectedCuisines.length > 0) {
      filtered = filtered.filter(restaurant =>
        selectedCuisines.some(selectedCuisine =>
          restaurant.cuisines.some(cuisine =>
            cuisine.toLowerCase().includes(selectedCuisine.toLowerCase())
          )
        )
      );
    }

    // Sort (nur wenn filtered ein Array ist)
    if (Array.isArray(filtered)) {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return b.rating - a.rating;
          case 'deliveryTime':
            return a.estimatedDeliveryTime - b.estimatedDeliveryTime;
          case 'deliveryFee':
            return a.deliveryFee - b.deliveryFee;
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [restaurantsData, searchTerm, selectedCuisines, sortBy]);

  const paginatedRestaurants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedRestaurants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedRestaurants, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedRestaurants.length / itemsPerPage);

  const handleRestaurantClick = useCallback((restaurant: Restaurant) => {
    console.log('Restaurant clicked:', restaurant.id, restaurant.name);
    if (onRestaurantClick) {
      onRestaurantClick(restaurant);
    } else {
      // Default navigation behavior
      console.log('Navigating to:', `/restaurant/${restaurant.id}`);
      navigate(`/restaurant/${restaurant.id}`);
    }
  }, [navigate, onRestaurantClick]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (isLoading) {
    return (
      <div className="restaurant-list" data-testid="restaurant-list">
        <div className="restaurant-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="restaurant-card">
              <Skeleton variant="rectangular" width="100%" height={200} />
              <div style={{ padding: '1rem' }}>
                <Skeleton variant="text" width="80%" height={24} />
                <Skeleton variant="text" width="100%" height={16} />
                <Skeleton variant="text" width="60%" height={16} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="restaurant-list" data-testid="restaurant-list">
        <div className="error-state">
          <h3>Fehler beim Laden der Restaurants</h3>
          <p>{error.message}</p>
          <button onClick={() => window.location.reload()}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-list" data-testid="restaurant-list">
      <div className="restaurant-list-header">
        <h2>
          {filteredAndSortedRestaurants.length} Restaurants gefunden
        </h2>
      </div>

      <div className="restaurant-grid">
        {paginatedRestaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            onClick={() => handleRestaurantClick(restaurant)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Zurück
          </button>

          <span className="pagination-info">
            Seite {currentPage} von {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Weiter →
          </button>
        </div>
      )}

      {filteredAndSortedRestaurants.length === 0 && (
        <div className="no-results">
          <h3>Keine Restaurants gefunden</h3>
          <p>Versuchen Sie andere Suchbegriffe oder Filter.</p>
        </div>
      )}
    </div>
  );
});

RestaurantList.displayName = 'RestaurantList';