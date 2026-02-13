import { useDriverLocation, useDriverETA } from "../../hooks/useDriverTracking";
import "./DriverTrackingMap.css";

interface DriverTrackingMapProps {
  driverId: string | null;
  orderId: string | null;
  restaurantLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
}

export function DriverTrackingMap({
  driverId,
  orderId,
  restaurantLocation,
  customerLocation,
}: DriverTrackingMapProps) {
  const { location: driverLocation, isLoading } = useDriverLocation(
    driverId,
    orderId,
  );
  const { eta } = useDriverETA(orderId);

  const centerLat = driverLocation?.lat || restaurantLocation.lat;
  const centerLng = driverLocation?.lng || restaurantLocation.lng;
  const zoom = 13;

  // Sanitize coordinates - ensure they are numbers
  const safeRestaurantLat = Number(restaurantLocation.lat).toFixed(6);
  const safeRestaurantLng = Number(restaurantLocation.lng).toFixed(6);
  const safeCustomerLat = Number(customerLocation.lat).toFixed(6);
  const safeCustomerLng = Number(customerLocation.lng).toFixed(6);
  const safeDriverLat = driverLocation
    ? Number(driverLocation.lat).toFixed(6)
    : null;
  const safeDriverLng = driverLocation
    ? Number(driverLocation.lng).toFixed(6)
    : null;

  // Sanitize OpenStreetMap URL
  const safeMapUrl = `https://www.openstreetmap.org/?mlat=${Number(centerLat).toFixed(6)}&mlon=${Number(centerLng).toFixed(6)}&zoom=${zoom}`;

  return (
    <div className="driver-tracking-map">
      <div className="map-container">
        <div
          style={{
            padding: "20px",
            background: "var(--fb-bg-primary)",
            borderRadius: "var(--fb-radius-base)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h4
              style={{
                margin: "0 0 12px 0",
                fontSize: "var(--fb-font-size-lg)",
              }}
            >
              Kartenansicht
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  padding: "12px",
                  background: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-base)",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--fb-text-secondary)",
                    marginBottom: "4px",
                  }}
                >
                  🍽️ Restaurant
                </div>
                <div style={{ fontWeight: 600 }}>
                  {safeRestaurantLat}, {safeRestaurantLng}
                </div>
              </div>
              <div
                style={{
                  padding: "12px",
                  background: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-base)",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--fb-text-secondary)",
                    marginBottom: "4px",
                  }}
                >
                  🏠 Kunde
                </div>
                <div style={{ fontWeight: 600 }}>
                  {safeCustomerLat}, {safeCustomerLng}
                </div>
              </div>
              {driverLocation && safeDriverLat && safeDriverLng && (
                <div
                  style={{
                    padding: "12px",
                    background: "var(--fb-bg-secondary)",
                    borderRadius: "var(--fb-radius-base)",
                    border: "2px solid var(--fb-primary)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--fb-text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    🚗 Fahrer (Live)
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--fb-primary)" }}>
                    {safeDriverLat}, {safeDriverLng}
                  </div>
                </div>
              )}
            </div>
            <a
              href={safeMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "var(--fb-primary)",
                color: "white",
                borderRadius: "var(--fb-radius-base)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              📍 In OpenStreetMap öffnen
            </a>
          </div>
        </div>
      </div>
      <div className="driver-status">
        {isLoading ? (
          <div>Lädt Fahrer-Position...</div>
        ) : driverLocation ? (
          <div>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>
              Fahrer Position
            </div>
            <div
              style={{
                fontSize: "var(--fb-font-size-sm)",
                color: "var(--fb-text-secondary)",
              }}
            >
              Aktualisiert:{" "}
              {new Date(driverLocation.timestamp).toLocaleTimeString()}
            </div>
            {eta && (
              <div style={{ marginTop: "8px", color: "var(--fb-primary)" }}>
                Geschätzte Ankunft: {Math.round(eta / 60)} Minuten
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: "var(--fb-text-secondary)" }}>
            Fahrer-Position nicht verfügbar
          </div>
        )}
      </div>
    </div>
  );
}
