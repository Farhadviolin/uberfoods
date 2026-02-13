import { useState, useEffect } from 'react';
import { GoogleMap, DirectionsRenderer, Marker, useJsApiLoader } from '@react-google-maps/api';
import api from '../utils/api';
import { Order, RouteOptimization } from '../types';
import { useVoiceNavigation } from '../hooks/useVoiceNavigation';
import { advancedRoutingService } from '../services/advancedRoutingService';
import { metaGlassesService } from '../services/metaGlassesService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './Navigation.css';

const libraries = ['places'] as const;

interface NavigationProps {
  orders: Order[];
  driverLocation?: { lat: number; lng: number };
  onRouteOptimized?: (route: any) => void;
}

interface Route {
  points: Array<{
    location: { lat: number; lng: number };
    type: string;
    orderId?: string;
    name?: string;
  }>;
  distance: number;
  duration: number;
  waypoints?: Array<{ lat: number; lng: number }>;
  polyline?: string;
}

export function Navigation({ orders, driverLocation, onRouteOptimized }: NavigationProps) {
  const { driver } = useAuth();
  const { i18n } = useTranslation();
  const [route, setRoute] = useState<Route | null>(null);
  const [advancedRoute, setAdvancedRoute] = useState<RouteOptimization | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<{ [orderId: string]: number }>({});
  const [voiceEnabled] = useState(true);
  const { announceDirection, announceArrival, isSupported: voiceSupported } = useVoiceNavigation({ 
    enabled: voiceEnabled,
    language: (i18n.language || 'de').startsWith('en') ? 'en-US' : 'de-DE',
  });

  // Google Maps API Loader
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (globalThis as any).importMetaEnv?.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const mapContainerStyle = {
    width: '100%',
    height: '100%',
  };

  const center = driverLocation || { lat: 48.2082, lng: 16.3738 }; // Wien Default

  // Optimiere Route wenn Bestellungen vorhanden sind
  useEffect(() => {
    if (orders.length > 0 && driverLocation && driver) {
      optimizeRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, driverLocation, driver]);

  // Berechne ETA für jede Bestellung
  useEffect(() => {
    if (orders.length > 0 && driverLocation) {
      calculateETAs();
    }
  }, [orders, driverLocation]);

  const optimizeRoute = async () => {
    if (!driverLocation || !driver) return;

    try {
      setLoading(true);
      setError(null);

      // Verwende Advanced Routing Service für ML-basierte Optimierung
      const optimizedRoute = await advancedRoutingService.optimizeRoute(
        orders,
        driver,
        driverLocation
      );

      setAdvancedRoute(optimizedRoute);

      // Konvertiere für backward compatibility
      const legacyRoute: Route = {
        points: optimizedRoute.optimizedRoute.map(point => ({
          location: point.location,
          type: point.type,
          orderId: point.orderId,
          name: point.name
        })),
        distance: optimizedRoute.totalDistance,
        duration: optimizedRoute.totalTime
      };

      setRoute(legacyRoute);
      onRouteOptimized?.(legacyRoute);
      const isEn = (i18n.language || 'de').startsWith('en');
      announceDirection(
        isEn
          ? `Route updated, ${orders.length} stops planned.`
          : `Route aktualisiert, ${orders.length} Stopps geplant.`
      );

      // Erstelle Google Maps Directions wenn API geladen ist
      if (isLoaded && window.google) {
        createDirections(legacyRoute);
      }

      // Starte Meta Glasses AR-Navigation wenn verbunden
      const glassesState = metaGlassesService.getState();
      if (glassesState.connected && glassesState.arEnabled) {
        try {
          await metaGlassesService.startNavigation(optimizedRoute, orders);
          announceDirection('AR-Navigation gestartet');
        } catch (arError) {
          console.warn('Meta Glasses AR-Navigation konnte nicht gestartet werden:', arError);
        }
      }

    } catch (err: unknown) {
      let errorMessage = 'Fehler bei Route-Optimierung';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const msg = axiosError.response?.data?.message;
        if (msg) {
          errorMessage = `Fehler bei Route-Optimierung: ${msg}`;
        }
      } else if (err instanceof Error) {
        errorMessage = `Fehler bei Route-Optimierung: ${err.message}`;
      }
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createDirections = (route: Route) => {
    if (!window.google || !driverLocation) return;

    const directionsService = new window.google.maps.DirectionsService();
    const waypoints = route.points.slice(1, -1).map((point) => ({
      location: new window.google.maps.LatLng(point.location.lat, point.location.lng),
      stopover: true,
    }));

    const origin = new window.google.maps.LatLng(
      driverLocation.lat,
      driverLocation.lng,
    );
    const destination = route.points[route.points.length - 1];
    const dest = new window.google.maps.LatLng(
      destination.location.lat,
      destination.location.lng,
    );

    directionsService.route(
      {
        origin,
        destination: dest,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          console.error('Directions request failed:', status);
        }
      },
    );
  };

  const calculateETAs = async () => {
    if (!driverLocation) return;

    try {
      const driverData = localStorage.getItem('driver_user');
      if (!driverData) return;

      const driver = JSON.parse(driverData);
      const etaPromises = orders.map(async (order) => {
        try {
          const response = await api.get(`/drivers/${driver.id}/eta/${order.id}`);
          return { orderId: order.id, eta: response.data.eta };
        } catch (err) {
          console.error(`ETA für Bestellung ${order.id} fehlgeschlagen:`, err);
          return { orderId: order.id, eta: null };
        }
      });

      const results = await Promise.all(etaPromises);
      const etaMap: { [orderId: string]: number } = {};
      results.forEach((result) => {
        if (result.eta !== null) {
          etaMap[result.orderId] = result.eta;
        }
      });
      setEta(etaMap);
    } catch (err) {
      console.error('Fehler bei ETA-Berechnung:', err);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} Min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  if (loadError) {
    return (
      <div className="navigation-error">
        <p>⚠️ Google Maps konnte nicht geladen werden</p>
        <p>Verwende Fallback-Karte...</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="navigation-loading">
        <div>🗺️ Lade Karte...</div>
      </div>
    );
  }

  return (
    <div className="navigation-container">
      {loading && (
        <div className="navigation-loading-overlay">
          <div>🔄 Optimiere Route...</div>
        </div>
      )}

      {error && (
        <div className="navigation-error-banner">
          <span>⚠️ {error}</span>
          <button onClick={optimizeRoute}>Erneut versuchen</button>
        </div>
      )}

      {route && (
        <div className="navigation-info">
          <div className="route-stats">
            <div className="stat">
              <span className="stat-label">Distanz:</span>
              <span className="stat-value">{(route.distance / 1000).toFixed(1)} km</span>
            </div>
            <div className="stat">
              <span className="stat-label">Dauer:</span>
              <span className="stat-value">{formatDuration(route.duration)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Stopps:</span>
              <span className="stat-value">{route.points.length - 1}</span>
            </div>
            {advancedRoute && (
              <>
                <div className="stat">
                  <span className="stat-label">Effizienz:</span>
                  <span className={`stat-value efficiency-${advancedRoute.efficiency > 80 ? 'high' : advancedRoute.efficiency > 60 ? 'medium' : 'low'}`}>
                    {advancedRoute.efficiency}%
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Kraftstoff:</span>
                  <span className="stat-value">{advancedRoute.fuelConsumption.toFixed(1)}L</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Verdienst:</span>
                  <span className="stat-value earnings">{advancedRoute.earnings.toFixed(2)}€</span>
                </div>
              </>
            )}
          </div>

          <div className="route-points">
            {route.points.map((point, index) => (
              <div key={index} className="route-point">
                <div className="point-marker">
                  {point.type === 'driver' && '🚗'}
                  {point.type === 'restaurant' && '🍽️'}
                  {point.type === 'customer' && '🏠'}
                </div>
                <div className="point-info">
                  <div className="point-name">{point.name || `Stopp ${index + 1}`}</div>
                  {point.orderId && eta[point.orderId] && (
                    <div className="point-eta">ETA: {formatDuration(eta[point.orderId])}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {driverLocation && (
          <Marker
            position={driverLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            }}
            title="Ihr Standort"
          />
        )}

        {directions && <DirectionsRenderer directions={directions} />}

        {!directions &&
          route?.points.map((point, index) => (
            <Marker
              key={index}
              position={point.location}
              icon={{
                url:
                  point.type === 'restaurant'
                    ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                    : point.type === 'customer'
                      ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                      : 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              }}
              title={point.name || `Stopp ${index + 1}`}
            />
          ))}
      </GoogleMap>
    </div>
  );
}

