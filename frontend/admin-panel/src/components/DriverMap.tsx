import { useEffect, useState, memo, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useWebSocket } from '../hooks/useWebSocket';
import 'leaflet/dist/leaflet.css';
import './DriverMap.css';

// Fix für default Marker Icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  location: { lat: number; lng: number } | null;
}

// Custom icon for active drivers
const createDriverIcon = (isActive: boolean) => {
  return L.divIcon({
    className: 'custom-driver-icon',
    html: `<div style="
      width: 30px;
      height: 30px;
      background: ${isActive ? '#28a745' : '#dc3545'};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    ">🚗</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const MapUpdater = memo(function MapUpdater({ drivers }: { drivers: Driver[] }) {
  const map = useMap();

  useEffect(() => {
    if (drivers.length > 0 && drivers.some(d => d.location)) {
      const bounds = L.latLngBounds(
        drivers
          .filter(d => d.location)
          .map(d => [d.location!.lat, d.location!.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [drivers, map]);

  return null;
});

function DriverMapInner({ drivers }: { drivers: Driver[] }) {
  const [realTimeDrivers, setRealTimeDrivers] = useState<Driver[]>(drivers);

  // Update drivers when prop changes
  useEffect(() => {
    setRealTimeDrivers(drivers);
  }, [drivers]);

  // WebSocket connection for real-time updates using centralized hook
  const handleDriverLocationUpdate = useCallback((data: { driverId: string; location: { lat: number; lng: number } }) => {
    setRealTimeDrivers(prev => 
      prev.map(driver => 
        driver.id === data.driverId
          ? { ...driver, location: data.location }
          : driver
      )
    );
  }, []);

  const handleDriverStatusChanged = useCallback((data: { driverId: string; isActive: boolean }) => {
    setRealTimeDrivers(prev => 
      prev.map(driver => 
        driver.id === data.driverId
          ? { ...driver, isActive: data.isActive }
          : driver
      )
    );
  }, []);

  const { isConnected, startDriverMonitoring } = useWebSocket({
    onDriverLocationUpdate: handleDriverLocationUpdate,
    onDriverStatusChanged: handleDriverStatusChanged,
  });

  // Start monitoring when component mounts
  useEffect(() => {
    if (isConnected) {
      startDriverMonitoring(); // Join admin-driver-tracking room
    }
  }, [isConnected, startDriverMonitoring]);

  const activeDriversWithLocation = useMemo(() => 
    realTimeDrivers.filter(d => d.isActive && d.location),
    [realTimeDrivers]
  );

  // Berechne dynamisches Map-Center basierend auf Fahrer-Positionen
  const mapCenter = useMemo((): [number, number] => {
    if (activeDriversWithLocation.length === 0) {
      // Fallback: Wien (wenn keine Fahrer verfügbar)
      return [48.2082, 16.3738];
    }

    // Berechne Durchschnitt der Koordinaten
    const avgLat = activeDriversWithLocation.reduce(
      (sum, driver) => sum + driver.location!.lat,
      0
    ) / activeDriversWithLocation.length;

    const avgLng = activeDriversWithLocation.reduce(
      (sum, driver) => sum + driver.location!.lng,
      0
    ) / activeDriversWithLocation.length;

    return [avgLat, avgLng];
  }, [activeDriversWithLocation]);

  if (activeDriversWithLocation.length === 0) {
    return (
      <div className="map-placeholder">
        <p>Keine aktiven Fahrer mit Standort verfügbar</p>
        {isConnected && (
          <p style={{ fontSize: '12px', color: '#28a745', marginTop: '8px' }}>
            🔴 Real-time Tracking aktiv
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="driver-map-container">
      {isConnected && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: '#28a745',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          🔴 Live Tracking
        </div>
      )}
      <MapContainer
        center={mapCenter}
        zoom={activeDriversWithLocation.length === 1 ? 14 : 12}
        style={{ height: '500px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater drivers={activeDriversWithLocation} />
        {activeDriversWithLocation.map(driver => (
          <Marker
            key={driver.id}
            position={[driver.location!.lat, driver.location!.lng]}
            icon={createDriverIcon(driver.isActive)}
            eventHandlers={{
              click: () => {
                // Driver info wird im Popup angezeigt
              },
            }}
          >
            <Popup>
              <div className="driver-popup">
                <h4>{driver.name}</h4>
                <p>📧 {driver.email}</p>
                <p>📞 {driver.phone}</p>
                <p>
                  Status: {driver.isActive ? '🟢 Aktiv' : '🔴 Inaktiv'}
                </p>
                {driver.location && (
                  <p style={{ fontSize: '11px', color: '#65676B', marginTop: '8px' }}>
                    📍 {driver.location.lat.toFixed(4)}, {driver.location.lng.toFixed(4)}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export const DriverMap = memo(DriverMapInner);

