import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, Cloud, TrendingUp, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { usePredictions, type PredictiveSuggestion } from '../hooks/usePredictiveOrdering';
import { useRestaurants } from '../hooks/useRestaurants';
import { useOrders } from '../hooks/useOrders';
import { useWeather } from '../hooks/useWeather';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { Dish } from '../types';
import './PredictiveOrdering.css';

type SuggestionWithAction = PredictiveSuggestion & { action: () => void };

type OrderItemEntry = {
  name?: string;
  dishId?: string;
  dish?: { id?: string; name?: string };
  quantity?: number;
};

type OrderHistoryEntry = {
  id: string;
  createdAt: string;
  restaurant?: { id?: string; name?: string } | string;
  items?: OrderItemEntry[];
};

interface MostOrderedItem {
  restaurant: string;
  dish: string;
}

export function PredictiveOrdering() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: orders } = useOrders();
  const { data: restaurants } = useRestaurants();
  const orderHistory = (orders ?? []) as OrderHistoryEntry[];

  // API Hooks - Backend-basierte Vorhersagen (primär)
  const { data: backendSuggestions = [], isLoading: backendLoading } = usePredictions();
  const { data: weather } = useWeather();

  // Hilfsfunktionen - müssen vor generateLocalPredictions definiert werden
  const getRestaurantName = (restaurant?: OrderHistoryEntry['restaurant']): string => {
    if (!restaurant) return 'Unbekannt';
    return typeof restaurant === 'string' ? restaurant : restaurant.name || 'Unbekannt';
  };

  const getDishName = (item?: OrderItemEntry): string => {
    if (!item) return 'Unbekannt';
    return item.name || item.dish?.name || 'Unbekannt';
  };

  const getDayName = (day: number): string => {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return days[day];
  };

  const getMostOrderedItem = (ordersWithItems: OrderHistoryEntry[]): MostOrderedItem => {
    const itemCounts: Record<string, { count: number; restaurant: string; dish: string }> = {};
    
    ordersWithItems.forEach(order => {
      const restaurantName = getRestaurantName(order.restaurant);
      order.items?.forEach((item) => {
        const dishName = getDishName(item);
        const key = `${restaurantName}-${dishName}`;
        if (!itemCounts[key]) {
          itemCounts[key] = { count: 0, restaurant: restaurantName, dish: dishName };
        }
        itemCounts[key].count++;
      });
    });

    const mostOrdered = Object.values(itemCounts).sort((a, b) => b.count - a.count)[0];
    return mostOrdered || { restaurant: 'Unbekannt', dish: 'Unbekannt' };
  };

  const getWeatherBasedSuggestion = (history: OrderHistoryEntry[]): SuggestionWithAction | null => {
    // Wetter-Daten vom Backend verwenden
    if (!weather) {
      return null;
    }
    
    // Finde passende Gerichte basierend auf Wetter
    if (weather.isCold) {
      // Finde warme Gerichte aus der Bestellhistorie
      const warmDishes = history.filter(order => {
        const dishNames = order.items?.map((item) => getDishName(item).toLowerCase()) || [];
        return dishNames.some((name) => 
          name.includes('suppe') || 
          name.includes('soup') || 
          name.includes('curry') || 
          name.includes('pasta') ||
          name.includes('pizza')
        );
      });
      
      if (warmDishes && warmDishes.length > 0) {
        const mostOrdered = getMostOrderedItem(warmDishes);
        return {
          id: 'weather-cold',
          type: 'weather-based',
          title: 'Kaltes Wetter',
          description: `Bei ${weather.temperature}°C: Warme Gerichte wie ${mostOrdered.dish}?`,
          restaurant: mostOrdered.restaurant,
          dish: mostOrdered.dish,
          confidence: 0.75,
          action: () => handleQuickOrder(mostOrdered.restaurant, mostOrdered.dish)
        };
      }
    } else if (weather.isHot) {
      // Finde kalte/erfrischende Gerichte
      const coldDishes = history.filter(order => {
        const dishNames = order.items?.map((item) => getDishName(item).toLowerCase()) || [];
        return dishNames.some((name) => 
          name.includes('salat') || 
          name.includes('salad') || 
          name.includes('smoothie') ||
          name.includes('eis')
        );
      });
      
      if (coldDishes && coldDishes.length > 0) {
        const mostOrdered = getMostOrderedItem(coldDishes);
        return {
          id: 'weather-hot',
          type: 'weather-based',
          title: 'Heißes Wetter',
          description: `Bei ${weather.temperature}°C: Erfrischende Gerichte wie ${mostOrdered.dish}?`,
          restaurant: mostOrdered.restaurant,
          dish: mostOrdered.dish,
          confidence: 0.75,
          action: () => handleQuickOrder(mostOrdered.restaurant, mostOrdered.dish)
        };
      }
    }
    
    return null;
  };

  const handleQuickOrder = useCallback(async (restaurant: string, dish: string) => {
    try {
      // Finde Restaurant
      const restaurantData = restaurants?.find(r => 
        r.name === restaurant || 
        r.id === restaurant ||
        r.name.toLowerCase().includes(restaurant.toLowerCase())
      );
      
      if (!restaurantData) {
        showToast('Restaurant nicht gefunden', 'error');
        return;
      }
      
      // Navigiere zum Restaurant Menu
      navigate(`/restaurant/${restaurantData.id}`);
      
      // Warte kurz, dann versuche Gericht zu finden
      setTimeout(async () => {
        try {
          const restaurantFull = await api.get<{ dishes?: Dish[] }>(`/restaurants/public/${restaurantData.id}`);
          const dishes = restaurantFull.data.dishes || [];
          const dishData = dishes.find((menuDish) => 
            menuDish.id === dish ||
            menuDish.name?.toLowerCase().includes(dish.toLowerCase())
          );
          
          if (dishData) {
            // Speichere Quick Order Intent für Menu Component
            localStorage.setItem('quick_order_intent', JSON.stringify({
              dishId: dishData.id,
              quantity: 1,
              timestamp: Date.now()
            }));
            showToast(`Gericht ${dishData.name} gefunden!`, 'success');
          } else {
            showToast('Gericht nicht gefunden, aber Restaurant geöffnet', 'info');
          }
        } catch (err) {
          // Ignoriere Fehler
        }
      }, 500);
    } catch (error) {
      showToast('Fehler beim Öffnen des Restaurants', 'error');
    }
  }, [restaurants, navigate, showToast]);

  // generateLocalPredictions muss vor useMemo definiert werden
  const generateLocalPredictions = useCallback((history: OrderHistoryEntry[]): SuggestionWithAction[] => {
    const predictions: SuggestionWithAction[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Time-based predictions
    if (currentHour >= 11 && currentHour <= 14) {
      const lunchOrders = history.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getHours() >= 11 && orderDate.getHours() <= 14;
      });
      
      if (lunchOrders.length > 0) {
        const mostOrderedLunch = getMostOrderedItem(lunchOrders);
        predictions.push({
          id: 'time-lunch',
          type: 'time-based',
          title: 'Mittagessen-Zeit!',
          description: `Du bestellst normalerweise um diese Zeit ${mostOrderedLunch.dish} von ${mostOrderedLunch.restaurant}`,
          restaurant: mostOrderedLunch.restaurant,
          dish: mostOrderedLunch.dish,
          confidence: 0.85,
          action: () => handleQuickOrder(mostOrderedLunch.restaurant, mostOrderedLunch.dish)
        });
      }
    }

    if (currentHour >= 18 && currentHour <= 21) {
      const dinnerOrders = history.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getHours() >= 18 && orderDate.getHours() <= 21;
      });
      
      if (dinnerOrders.length > 0) {
        const mostOrderedDinner = getMostOrderedItem(dinnerOrders);
        predictions.push({
          id: 'time-dinner',
          type: 'time-based',
          title: 'Abendessen-Zeit!',
          description: `Deine übliche Abendbestellung: ${mostOrderedDinner.dish} von ${mostOrderedDinner.restaurant}`,
          restaurant: mostOrderedDinner.restaurant,
          dish: mostOrderedDinner.dish,
          confidence: 0.80,
          action: () => handleQuickOrder(mostOrderedDinner.restaurant, mostOrderedDinner.dish)
        });
      }
    }

    // Pattern-based: Weekly patterns
    const sameDayOrders = history.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getDay() === currentDay;
    });

    if (sameDayOrders.length >= 2) {
      const weeklyPattern = getMostOrderedItem(sameDayOrders);
      predictions.push({
        id: 'pattern-weekly',
        type: 'pattern-based',
        title: 'Wöchentliches Muster',
        description: `An ${getDayName(currentDay)} bestellst du oft ${weeklyPattern.dish}`,
        restaurant: weeklyPattern.restaurant,
        dish: weeklyPattern.dish,
        confidence: 0.75,
        action: () => handleQuickOrder(weeklyPattern.restaurant, weeklyPattern.dish)
      });
    }

    // Calendar-based: Regular orders
    const recentOrders = history.slice(0, 5);
    if (recentOrders.length > 0) {
      const lastOrder = recentOrders[0];
      const daysSinceLastOrder = Math.floor(
        (now.getTime() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastOrder >= 2 && daysSinceLastOrder <= 7) {
        predictions.push({
          id: 'calendar-regular',
          type: 'calendar-based',
          title: 'Regelmäßige Bestellung',
          description: `Letzte Bestellung war vor ${daysSinceLastOrder} Tagen. Wiederholen?`,
          restaurant: getRestaurantName(lastOrder.restaurant),
          dish: getDishName(lastOrder.items?.[0]) || 'Letzte Bestellung',
          confidence: 0.70,
          action: () => handleReorder(lastOrder.id)
        });
      }
    }

    // Weather-based (vom Backend)
    const weatherSuggestion = getWeatherBasedSuggestion(history);
    if (weatherSuggestion) {
      predictions.push(weatherSuggestion);
    }

    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }, [handleQuickOrder, weather]);

  // Kombiniere Backend-Vorhersagen mit lokalen Fallback-Vorhersagen
  const allSuggestions = useMemo(() => {
    const backendWithActions: SuggestionWithAction[] = backendSuggestions.map((suggestion) => ({
      ...suggestion,
      action: () => handleQuickOrder(suggestion.restaurant, suggestion.dish),
    }));

    // Wenn Backend-Vorhersagen vorhanden, nutze diese primär
    if (backendWithActions.length > 0) {
      // Füge lokale Vorhersagen nur hinzu, wenn sie nicht bereits im Backend vorhanden sind
      const localPredictions = generateLocalPredictions(orderHistory);
      const localFiltered = localPredictions.filter(
        (local) => !backendWithActions.some((backend) => backend.id === local.id)
      );
      return [...backendWithActions, ...localFiltered].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    }

    // Fallback: Nur lokale Vorhersagen wenn Backend leer ist
    return generateLocalPredictions(orderHistory);
  }, [backendSuggestions, orderHistory, generateLocalPredictions]);

  const handleReorder = async (orderId: string) => {
    try {
      // Finde Bestellung
      const order = orderHistory.find(o => o.id === orderId);
      
      if (!order) {
        // Versuche Bestellung vom Backend zu laden
        try {
          const response = await api.get(`/orders/customer/${orderId}`);
          const orderData = response.data;
          
          if (orderData.restaurant?.id) {
            navigate(`/restaurant/${orderData.restaurant.id}`);
            
            // Speichere Reorder Intent
            if (orderData.items && orderData.items.length > 0) {
              const normalizedItems = orderData.items
                .map((item: OrderItemEntry) => ({
                  dishId: item.dishId || item.dish?.id,
                  quantity: item.quantity || 1
                }))
                .filter((item: { dishId?: string; quantity: number }): item is { dishId: string; quantity: number } => !!item.dishId);

              if (normalizedItems.length > 0) {
                localStorage.setItem('reorder_intent', JSON.stringify({
                  items: normalizedItems,
                  timestamp: Date.now()
                }));
                showToast('Bestellung wird wiederholt...', 'success');
              }
            }
          }
        } catch (err) {
          showToast('Bestellung nicht gefunden', 'error');
        }
        return;
      }
      
      // Navigiere zum Restaurant
      const restaurantId = typeof order.restaurant === 'object' ? order.restaurant?.id : undefined;
      if (restaurantId) {
        navigate(`/restaurant/${restaurantId}`);
        
        // Speichere Reorder Intent
        if (order.items && order.items.length > 0) {
          const normalizedItems = order.items
            .map((item: OrderItemEntry) => ({
              dishId: item.dishId || item.dish?.id,
              quantity: item.quantity || 1
            }))
            .filter((item): item is { dishId: string; quantity: number } => !!item.dishId);

          if (normalizedItems.length > 0) {
            localStorage.setItem('reorder_intent', JSON.stringify({
              items: normalizedItems,
              timestamp: Date.now()
            }));
            showToast('Bestellung wird wiederholt...', 'success');
          }
        }
      } else {
        showToast('Restaurant-Informationen nicht verfügbar', 'error');
      }
    } catch (error) {
      showToast('Fehler beim Wiederholen der Bestellung', 'error');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'time-based':
        return <Clock className="prediction-icon" />;
      case 'weather-based':
        return <Cloud className="prediction-icon" />;
      case 'pattern-based':
        return <TrendingUp className="prediction-icon" />;
      case 'calendar-based':
        return <Calendar className="prediction-icon" />;
      default:
        return <Sparkles className="prediction-icon" />;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'time-based':
        return 'Zeitbasiert';
      case 'weather-based':
        return 'Wetter';
      case 'pattern-based':
        return 'Muster';
      case 'calendar-based':
        return 'Kalender';
      default:
        return 'KI-Empfehlung';
    }
  };

  if (backendLoading) {
    return (
      <Card variant="elevated" className="predictive-card">
        <Skeleton variant="text" width="200px" height="28px" />
        <Skeleton variant="rectangular" width="100%" height="160px" />
      </Card>
    );
  }

  if (allSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="predictive-ordering">
      <Card variant="elevated" className="predictive-card">
        <div className="predictive-header">
          <div className="predictive-header-content">
            <Sparkles className="predictive-title-icon" />
            <h3>{t('predictiveOrdering.title')}</h3>
            <span className="predictive-badge">{allSuggestions.length}</span>
          </div>
          <button
            className="predictive-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? t('predictiveOrdering.collapse') : t('predictiveOrdering.expand')}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {isExpanded && (
          <div className="predictive-suggestions">
            {allSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="predictive-suggestion">
                <div className="suggestion-header">
                  {getIcon(suggestion.type)}
                  <div className="suggestion-info">
                    <div className="suggestion-title-row">
                      <h4>{suggestion.title}</h4>
                      <span className="suggestion-type">{getTypeLabel(suggestion.type)}</span>
                    </div>
                    <p className="suggestion-description">{suggestion.description}</p>
                    <div className="suggestion-details">
                      <span className="suggestion-restaurant">{suggestion.restaurant}</span>
                      <span className="suggestion-dish">{suggestion.dish}</span>
                    </div>
                  </div>
                </div>
                <div className="suggestion-actions">
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${suggestion.confidence * 100}%` }}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={suggestion.action}
                  >
                    Bestellen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isExpanded && (
          <div className="predictive-preview">
            <p className="predictive-preview-text">
              {allSuggestions[0]?.description}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={allSuggestions[0]?.action}
            >
              Jetzt bestellen
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

