import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Order, RouteOptimization } from '../types';
import { Navigation } from './Navigation';
import { advancedRoutingService } from '../services/advancedRoutingService';
import './MultiOrderView.css';

interface Route {
  points: Array<{
    location: { lat: number; lng: number };
    type: string;
    orderId?: string;
    name?: string;
  }>;
  distance: number;
  duration: number;
}

export function MultiOrderView({ orders }: { orders: Order[] }) {
  const { driver } = useAuth();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [advancedRoute, setAdvancedRoute] = useState<RouteOptimization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orders.length > 0) {
      // Automatisch alle aktiven Bestellungen auswählen
      setSelectedOrders(orders.map((o) => o.id));
    }
  }, [orders]);

  useEffect(() => {
    if (selectedOrders.length > 0 && driver) {
      optimizeRoute();
    }
  }, [selectedOrders, driver]);

  const optimizeRoute = async () => {
    if (!driver || selectedOrders.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      // Verwende Advanced Routing Service für ML-basierte Optimierung
      const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.id));
      const optimizedRoute = await advancedRoutingService.optimizeRoute(
        selectedOrderObjects,
        driver,
        driver.location
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
    } catch (err: any) {
      setError('Fehler bei Route-Optimierung: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
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

  if (orders.length === 0) {
    return (
      <div className="multi-order-empty">
        <div>📦</div>
        <p>Keine Bestellungen für Multi-Order-Ansicht verfügbar</p>
      </div>
    );
  }

  return (
    <div className="multi-order-view">
      <div className="multi-order-header">
        <h2>🧭 KI-Route-Optimierung</h2>
        <div className="route-info">
          {advancedRoute && (
            <>
              <div className="route-stat">
                <span className="stat-label">Distanz:</span>
                <span className="stat-value">{advancedRoute.totalDistance.toFixed(1)} km</span>
              </div>
              <div className="route-stat">
                <span className="stat-label">Dauer:</span>
                <span className="stat-value">{formatDuration(advancedRoute.totalTime)}</span>
              </div>
              <div className="route-stat">
                <span className="stat-label">Effizienz:</span>
                <span className={`stat-value efficiency-${advancedRoute.efficiency > 80 ? 'high' : advancedRoute.efficiency > 60 ? 'medium' : 'low'}`}>
                  {advancedRoute.efficiency}%
                </span>
              </div>
              <div className="route-stat">
                <span className="stat-label">Verdienst:</span>
                <span className="stat-value earnings">{advancedRoute.earnings.toFixed(2)}€</span>
              </div>
              <div className="route-stat">
                <span className="stat-label">Kraftstoff:</span>
                <span className="stat-value">{advancedRoute.fuelConsumption.toFixed(1)}L</span>
              </div>
            </>
          )}
          {route && !advancedRoute && (
            <>
              <div className="route-stat">
                <span className="stat-label">Distanz:</span>
                <span className="stat-value">{(route.distance / 1000).toFixed(1)} km</span>
              </div>
              <div className="route-stat">
                <span className="stat-label">Dauer:</span>
                <span className="stat-value">{formatDuration(route.duration)}</span>
              </div>
              <div className="route-stat">
                <span className="stat-label">Stopps:</span>
                <span className="stat-value">{route.points.length - 1}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="multi-order-error">
          <span>⚠️ {error}</span>
          <button onClick={optimizeRoute}>Erneut versuchen</button>
        </div>
      )}

      <div className="multi-order-content">
        <div className="orders-selection">
          <h3>Bestellungen auswählen ({selectedOrders.length}/{orders.length})</h3>
          <div className="orders-list">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`order-item ${selectedOrders.includes(order.id) ? 'selected' : ''}`}
                onClick={() => toggleOrderSelection(order.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order.id)}
                  onChange={() => toggleOrderSelection(order.id)}
                />
                <div className="order-info">
                  <div className="order-header">
                    <strong>Bestellung #{order.id.slice(-8)}</strong>
                    <span className="order-status">{order.status}</span>
                  </div>
                  <div className="order-details">
                    <div>🍽️ {order.restaurant.name}</div>
                    <div>🏠 {order.address}</div>
                    <div>💰 {order.totalAmount.toFixed(2)} €</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="route-visualization">
          {loading && (
            <div className="route-loading">
              <div>🔄 Optimiere Route...</div>
            </div>
          )}

          {route && !loading && (
            <div className="route-details">
              <h3>Optimierte Route</h3>
              <div className="route-points">
                {route.points.map((point, index) => (
                  <div key={index} className="route-point">
                    <div className="point-number">{index + 1}</div>
                    <div className="point-marker">
                      {point.type === 'driver' && '🚗'}
                      {point.type === 'restaurant' && '🍽️'}
                      {point.type === 'customer' && '🏠'}
                    </div>
                    <div className="point-info">
                      <div className="point-name">{point.name || `Stopp ${index + 1}`}</div>
                      {point.orderId && (
                        <div className="point-order">Bestellung #{point.orderId.slice(-8)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {driver && selectedOrders.length > 0 && (
            <div className="navigation-container">
              <Navigation
                orders={orders.filter((o) => selectedOrders.includes(o.id))}
                driverLocation={driver.location || undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

