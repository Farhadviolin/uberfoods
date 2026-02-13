import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Order } from '../types';
import './DriverMap.css';

// Fix für Leaflet Icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DriverMapProps {
  orders: Order[];
  driverLocation?: { lat: number; lng: number };
}

export function DriverMap({ orders, driverLocation }: DriverMapProps) {
  const center: LatLngExpression = driverLocation 
    ? [driverLocation.lat, driverLocation.lng]
    : [48.2082, 16.3738]; // Wien Default

  return (
    <div className="driver-map-container">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]}>
            <Popup>Ihr Standort</Popup>
          </Marker>
        )}

        {orders.map((order) => {
          // Restaurant Marker (vereinfacht - würde normalerweise geocodiert werden)
          const restaurantCoords = order.restaurant.location 
            ? [order.restaurant.location.lat, order.restaurant.location.lng]
            : null;
          
          const customerCoords = order.customerLocation
            ? [order.customerLocation.lat, order.customerLocation.lng]
            : null;

          // Nur Marker anzeigen wenn Koordinaten vorhanden
          if (!restaurantCoords && !customerCoords) {
            return null;
          }

          return (
            <div key={order.id}>
              {restaurantCoords && (
                <Marker position={restaurantCoords as LatLngExpression}>
                  <Popup>
                    <strong>{order.restaurant.name}</strong>
                    <br />
                    Bestellung #{order.id.slice(-8)}
                    <br />
                    {order.restaurant.address}
                  </Popup>
                </Marker>
              )}
              {customerCoords && (
                <Marker position={customerCoords as LatLngExpression}>
                  <Popup>
                    <strong>Lieferadresse</strong>
                    <br />
                    {order.address}
                    <br />
                    Bestellung #{order.id.slice(-8)}
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}
        
        {orders.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            <p>Keine Bestellungen mit Standorten verfügbar</p>
          </div>
        )}
      </MapContainer>
    </div>
  );
}

