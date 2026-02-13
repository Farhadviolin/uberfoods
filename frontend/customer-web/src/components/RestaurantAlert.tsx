import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { logError } from '../utils/errorReporting';
import './RestaurantAlert.css';

interface RestaurantAlertProps {
  restaurantId: string;
  alertType?: string;
}

export function RestaurantAlert({ restaurantId, alertType = 'OPENED' }: RestaurantAlertProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [restaurantId, user, alertType]);

  const checkSubscription = async () => {
    if (!user) return;

    try {
      const response = await api.get(`/customers/me/restaurant-alerts`, {
        params: { customerId: user.id },
      });
      const alerts = response.data || [];
      const hasAlert = alerts.some(
        (alert: any) => alert.restaurantId === restaurantId && alert.alertType === alertType
      );
      setIsSubscribed(hasAlert);
    } catch (error) {
      // Ignore errors
    }
  };

  const toggleAlert = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (isSubscribed) {
        await api.delete(`/customers/me/restaurant-alerts/${restaurantId}`, {
          params: {
            customerId: user.id,
            alertType,
          },
        });
      } else {
        await api.post(`/customers/me/restaurant-alerts`, {
          restaurantId,
          alertType,
        }, {
          params: { customerId: user.id },
        });
      }
      setIsSubscribed(!isSubscribed);
    } catch (error) {
      logError(error, { component: 'RestaurantAlert', action: 'toggleAlert', metadata: { restaurantId } });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <button
      onClick={toggleAlert}
      disabled={loading}
      className={`restaurant-alert-btn ${isSubscribed ? 'active' : ''}`}
      type="button"
    >
      {loading
        ? '...'
        : isSubscribed
        ? '🔔 ' + (t('restaurant.alertActive') || 'Benachrichtigungen aktiv')
        : '🔕 ' + (t('restaurant.alertInactive') || 'Benachrichtigungen aktivieren')}
    </button>
  );
}

