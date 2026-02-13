import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { useGeofencing } from '../hooks/useGeofencing';
import { Order } from '../types';
import './Geofencing.css';

interface GeofencingProps {
  order: Order;
  onCheckIn?: (type: 'restaurant' | 'customer', result: { success: boolean; message?: string }) => void;
}

export function Geofencing({ order, onCheckIn }: GeofencingProps) {
  const { driver } = useAuth();
  const { t } = useTranslation();
  const { location: currentLocation } = useLocation();
  const [checkInStatus, setCheckInStatus] = useState<{
    type: 'restaurant' | 'customer' | null;
    distance: number | null;
    canCheckIn: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    geofences,
    checkLocation,
    isCheckingLocation,
    locationCheckResult,
    refetch: refetchGeofences,
  } = useGeofencing(order.id);

  // Prüfe automatisch ob Check-in möglich ist
  useEffect(() => {
    if (!currentLocation || !driver) return;

    const checkAutoCheckIn = async () => {
      try {
        // Use geofencing API
        const result = await checkLocation(currentLocation);
        
        if (result && result.insideGeofences.length > 0) {
          const geofence = result.insideGeofences[0];
          const distance = calculateDistance(currentLocation, geofence.center);
          
          setCheckInStatus({
            type: geofence.type === 'restaurant' ? 'restaurant' : 'customer',
            distance: distance,
            canCheckIn: true,
          });
          
          onCheckIn?.(geofence.type === 'restaurant' ? 'restaurant' : 'customer', {
            geofence,
            distance,
            success: true,
          });
        } else {
          // Fallback: Prüfe manuell ob im Bereich
          checkManualStatus();
        }
      } catch (err) {
        // Fallback: Prüfe manuell ob im Bereich
        checkManualStatus();
      }
    };

    const checkManualStatus = () => {
      // Echte Geofencing-Logik: Berechne Distanz und prüfe ob im Radius
      const GEOFENCE_RADIUS_METERS = 50; // 50 Meter Radius für Check-in
      
      let targetLocation: { lat: number; lng: number } | null = null;
      let checkInType: 'restaurant' | 'customer' | null = null;

      // Bestimme Ziel-Location basierend auf Order-Status
      if (order.status === 'ACCEPTED' || order.status === 'READY' || order.status === 'CONFIRMED') {
        // Restaurant-Check-in
        if (order.restaurant.location) {
          targetLocation = order.restaurant.location;
          checkInType = 'restaurant';
        }
      } else if (order.status === 'IN_TRANSIT' || order.status === 'PICKED_UP') {
        // Customer-Check-in
        if (order.customerLocation) {
          targetLocation = order.customerLocation;
          checkInType = 'customer';
        }
      }

      if (!targetLocation || !checkInType) {
        setCheckInStatus(null);
        return;
      }

      // Berechne Distanz mit Haversine-Formel
      const distance = calculateDistance(currentLocation, targetLocation);

      // Prüfe ob im Geofence-Radius
      const canCheckIn = distance <= GEOFENCE_RADIUS_METERS;

      setCheckInStatus({
        type: checkInType,
        distance: distance,
        canCheckIn: canCheckIn,
      });
    };

    // Haversine-Formel für Distanzberechnung (in Metern)
    const calculateDistance = (
      from: { lat: number; lng: number },
      to: { lat: number; lng: number }
    ): number => {
      const R = 6371000; // Erdradius in Metern
      const dLat = (to.lat - from.lat) * (Math.PI / 180);
      const dLon = (to.lng - from.lng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(from.lat * (Math.PI / 180)) *
          Math.cos(to.lat * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distanz in Metern
    };

    checkAutoCheckIn();
  }, [currentLocation, order, driver, checkLocation, onCheckIn]);

  const handleCheckIn = async (type: 'restaurant' | 'customer') => {
    if (!currentLocation || !driver) return;

    try {
      setLoading(true);
      setError(null);

      const endpoint =
        type === 'restaurant'
          ? `/drivers/${driver.id}/check-in/restaurant/${order.id}`
          : `/drivers/${driver.id}/check-in/customer/${order.id}`;

      const response = await api.post(endpoint, currentLocation);

      if (response.data.success) {
        setCheckInStatus({
          type,
          distance: response.data.distance || 0,
          canCheckIn: true,
        });
        onCheckIn?.(type, response.data);
      } else {
        setError(response.data.message || t('geofencing.checkInFailed'));
      }
    } catch (err: unknown) {
      let errorMessage = t('geofencing.error');
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!checkInStatus) {
    return null;
  }

  return (
    <div className="geofencing-container">
      {error && (
        <div className="geofencing-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {checkInStatus.type === 'restaurant' && (
        <div className="geofencing-checkin">
          <div className="checkin-info">
            <div className="checkin-icon">🍽️</div>
            <div className="checkin-details">
              <h4>{t('geofencing.restaurantReached')}</h4>
              {checkInStatus.distance !== null && (
                <p>{t('geofencing.distance', { meters: Math.round(checkInStatus.distance) })}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleCheckIn('restaurant')}
            className="checkin-button"
            disabled={loading}
          >
            {loading ? '⏳' : '✅'} {t('geofencing.checkInRestaurant')}
          </button>
        </div>
      )}

      {checkInStatus.type === 'customer' && (
        <div className="geofencing-checkin">
          <div className="checkin-info">
            <div className="checkin-icon">🏠</div>
            <div className="checkin-details">
              <h4>{t('geofencing.customerReached')}</h4>
              {checkInStatus.distance !== null && (
                <p>{t('geofencing.distance', { meters: Math.round(checkInStatus.distance) })}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleCheckIn('customer')}
            className="checkin-button"
            disabled={loading}
          >
            {loading ? '⏳' : '✅'} {t('geofencing.checkInCustomer')}
          </button>
        </div>
      )}
    </div>
  );
}

