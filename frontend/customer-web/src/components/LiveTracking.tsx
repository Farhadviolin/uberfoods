import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useGeocodeAddress } from '../hooks/useGeocoding';
import { GoogleMapComponent } from './GoogleMap';
import api from '../utils/api';
import { AxiosErrorWithResponse } from '../types';
import { sanitizePhone, validateImageUrl } from '../utils/security';
import './LiveTracking.css';

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: string;
}

interface Order {
  id: string;
  status: string;
  address: string;
  restaurant: {
    id: string;
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    latitude?: number;
    longitude?: number;
    photoUrl?: string;
    vehicleInfo?: {
      type: string;
      make: string;
      model: string;
      licensePlate: string;
    };
  } | null;
}

export function LiveTracking() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantLocation, setRestaurantLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryAddressLocation, setDeliveryAddressLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Geocoding für Lieferadresse
  const { data: deliveryGeocode } = useGeocodeAddress(order?.address || null);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      const orderData = response.data;
      setOrder(orderData);

      if (orderData.driver?.latitude && orderData.driver?.longitude) {
        setDriverLocation({
          lat: orderData.driver.latitude,
          lng: orderData.driver.longitude,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      // Bei 401/403 Fehlern (nicht eingeloggt) keine Fehlermeldung anzeigen
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        setError(null); // Kein Fehler anzeigen, da erwartet
      } else {
        setError(axiosError.response?.data?.message || 'Fehler beim Laden der Bestellung');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id, fetchOrder]);

  // WebSocket für Live-Updates
  const { socket } = useWebSocket(user?.id || null);

  useEffect(() => {
    if (socket && order?.driver) {
      const driverId = order.driver.id;
      socket.emit('join-room', `driver-${driverId}`);

      socket.on('driver-location-update', (location: DriverLocation) => {
        setDriverLocation(location);
      });

      return () => {
        socket.emit('leave-room', `driver-${driverId}`);
        socket.off('driver-location-update');
      };
    }
    return undefined;
  }, [socket, order?.driver]);

  useEffect(() => {
    if (order) {
      // Geocode restaurant address
      if (order.restaurant.latitude && order.restaurant.longitude) {
        setRestaurantLocation({
          lat: order.restaurant.latitude,
          lng: order.restaurant.longitude,
        });
      }
    }
  }, [order]);

  useEffect(() => {
    // Verwende Geocoding-Ergebnis für Lieferadresse
    if (deliveryGeocode?.coordinates) {
      setDeliveryAddressLocation({
        lat: deliveryGeocode.coordinates.lat,
        lng: deliveryGeocode.coordinates.lng,
      });
    } else if (order?.address && !deliveryGeocode) {
      // Fallback: Versuche Koordinaten aus Order-Daten zu extrahieren
      // Oder verwende Default (Vienna)
      setDeliveryAddressLocation({
        lat: 48.2082, // Vienna default
        lng: 16.3738,
      });
    }
  }, [deliveryGeocode, order]);

  const getMapCenter = () => {
    if (driverLocation) {
      return { lat: driverLocation.lat, lng: driverLocation.lng };
    }
    if (restaurantLocation) {
      return restaurantLocation;
    }
    return { lat: 48.2082, lng: 16.3738 }; // Vienna default
  };

  const getMapMarkers = () => {
    const markers = [];
    
    if (restaurantLocation) {
      markers.push({
        position: restaurantLocation,
        label: 'R',
        title: order?.restaurant.name || 'Restaurant',
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      });
    }
    
    if (driverLocation) {
      markers.push({
        position: { lat: driverLocation.lat, lng: driverLocation.lng },
        label: 'D',
        title: order?.driver?.name || 'Fahrer',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      });
    }
    
    if (deliveryAddressLocation) {
      markers.push({
        position: deliveryAddressLocation,
        label: 'H',
        title: 'Lieferadresse',
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
      });
    }
    
    return markers;
  };

  const getDirections = () => {
    if (driverLocation && deliveryAddressLocation) {
      return {
        origin: { lat: driverLocation.lat, lng: driverLocation.lng },
        destination: deliveryAddressLocation,
      };
    }
    return undefined;
  };

  const calculateETA = (): string => {
    if (!order || !driverLocation) return 'Berechne...';

    // Einfache ETA-Berechnung (in Production: Google Maps Directions API)
    // Annahme: 30 km/h Durchschnittsgeschwindigkeit
    const distance = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      parseFloat(order.address.split(',')[0]) || 0, // Vereinfacht
      parseFloat(order.address.split(',')[1]) || 0
    );

    const minutes = Math.round((distance / 30) * 60);
    return `${minutes} Minuten`;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    // Haversine-Formel für Entfernungsberechnung
    const R = 6371; // Erdradius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (loading) {
    return (
      <div className="tracking-loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
        <div>Lade Tracking...</div>
      </div>
    );
  }

  if (!order || !order.driver) {
    return (
      <div className="tracking-error">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
        <p>Noch kein Fahrer zugewiesen</p>
        <p style={{ color: '#65676B', fontSize: '14px' }}>
          Sobald ein Fahrer zugewiesen wurde, sehen Sie hier die Live-Position
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="live-tracking">
      <div className="tracking-header">
        <h3>📍 Live-Tracking</h3>
        <div className="driver-info">
          <div className="driver-details">
            {(() => {
              const safePhoto = validateImageUrl(order.driver.photoUrl || '');
              if (!safePhoto) return null;
              return (
                <img
                  src={safePhoto}
                  alt={order.driver.name}
                  className="driver-photo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              );
            })()}
            <div>
              <span className="driver-name">🚗 {order.driver.name}</span>
              {order.driver.vehicleInfo && (
                <span className="driver-vehicle">
                  {order.driver.vehicleInfo.type} • {order.driver.vehicleInfo.licensePlate}
                </span>
              )}
            </div>
          </div>
          {(() => {
            const safePhone = sanitizePhone(order.driver.phone);
            return safePhone ? (
              <a href={`tel:${safePhone}`} className="driver-phone" rel="noopener noreferrer">
                📞 {safePhone}
              </a>
            ) : (
              <span className="driver-phone">📞 —</span>
            );
          })()}
        </div>
      </div>

      {driverLocation && (
        <>
          <div className="eta-info">
            <div className="eta-label">Geschätzte Ankunft:</div>
            <div className="eta-value">{calculateETA()}</div>
          </div>

          <div className="map-container">
            <GoogleMapComponent
              center={getMapCenter()}
              zoom={13}
              markers={getMapMarkers()}
              directions={getDirections()}
              className="live-tracking-map"
            />
          </div>

          <div className="tracking-details">
            <div className="detail-item">
              <strong>Restaurant:</strong>
              <span>{order.restaurant.name}</span>
            </div>
            <div className="detail-item">
              <strong>Lieferadresse:</strong>
              <span>{order.address}</span>
            </div>
            {driverLocation && (
              <div className="detail-item">
                <strong>Letzte Aktualisierung:</strong>
                <span>
                  {new Date(driverLocation.timestamp).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

