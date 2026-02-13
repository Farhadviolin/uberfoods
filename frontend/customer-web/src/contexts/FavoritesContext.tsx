import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

interface FavoritesContextType {
  favoriteRestaurants: string[];
  toggleFavorite: (restaurantId: string) => Promise<void>;
  isFavorite: (restaurantId: string) => boolean;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchFavorites = useCallback(async () => {
    try {
      if (isAuthenticated) {
        // Wenn eingeloggt, lade vom Backend
        const response = await api.get('/customers/me/favorites');
        interface FavoriteItem {
          restaurantId?: string;
          id?: string;
        }
        setFavoriteRestaurants(
          (response.data as FavoriteItem[]).map((fav) => fav.restaurantId || fav.id || '')
        );
      } else {
        // Wenn nicht eingeloggt, lade aus LocalStorage
        const savedFavorites = localStorage.getItem('guest_favorites');
        if (savedFavorites) {
          try {
            setFavoriteRestaurants(JSON.parse(savedFavorites));
          } catch {
            setFavoriteRestaurants([]);
          }
        } else {
          setFavoriteRestaurants([]);
        }
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      // Bei 401/403 Fehlern (kein Login) lade aus LocalStorage
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        const savedFavorites = localStorage.getItem('guest_favorites');
        if (savedFavorites) {
          try {
            setFavoriteRestaurants(JSON.parse(savedFavorites));
          } catch {
            setFavoriteRestaurants([]);
          }
        } else {
          setFavoriteRestaurants([]);
        }
      } else {
        // Keine Favoriten gefunden - das ist OK
        setFavoriteRestaurants([]);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (restaurantId: string) => {
    try {
      const isCurrentlyFavorite = favoriteRestaurants.includes(restaurantId);
      
      if (isAuthenticated) {
        // Wenn eingeloggt, synchronisiere mit Backend
        if (isCurrentlyFavorite) {
          await api.delete(`/customers/me/favorites/${restaurantId}`);
          setFavoriteRestaurants((prev) => prev.filter((id) => id !== restaurantId));
        } else {
          await api.post('/customers/me/favorites', { restaurantId });
          setFavoriteRestaurants((prev) => [...prev, restaurantId]);
        }
      } else {
        // Wenn nicht eingeloggt, speichere in LocalStorage
        const newFavorites = isCurrentlyFavorite
          ? favoriteRestaurants.filter((id) => id !== restaurantId)
          : [...favoriteRestaurants, restaurantId];
        setFavoriteRestaurants(newFavorites);
        localStorage.setItem('guest_favorites', JSON.stringify(newFavorites));
      }
    } catch (error: unknown) {
      // Bei Backend-Fehler, speichere trotzdem in LocalStorage (Fallback)
      if (!isAuthenticated) {
        const newFavorites = favoriteRestaurants.includes(restaurantId)
          ? favoriteRestaurants.filter((id) => id !== restaurantId)
          : [...favoriteRestaurants, restaurantId];
        setFavoriteRestaurants(newFavorites);
        localStorage.setItem('guest_favorites', JSON.stringify(newFavorites));
      } else {
        throw error;
      }
    }
  };

  const isFavorite = (restaurantId: string) => {
    return favoriteRestaurants.includes(restaurantId);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteRestaurants,
        toggleFavorite,
        isFavorite,
        loading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

