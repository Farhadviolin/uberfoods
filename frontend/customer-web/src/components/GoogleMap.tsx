import { useMemo, useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { config } from '../config';
import './GoogleMap.css';

interface MapMarker {
  position: { lat: number; lng: number };
  label?: string;
  title?: string;
  icon?: string;
}

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  directions?: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  };
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
}

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'geometry'];

export function GoogleMapComponent({
  center,
  zoom = 15,
  markers = [],
  directions,
  onMapClick,
  onMarkerClick,
  className = '',
}: GoogleMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: config.googleMapsApiKey,
    libraries,
  });

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: false,
      clickableIcons: true,
      scrollwheel: true,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    }),
    []
  );

  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const directionsService = useMemo(() => {
    if (!isLoaded) return null;
    return new google.maps.DirectionsService();
  }, [isLoaded]);

  const directionsRenderer = useMemo(() => {
    if (!isLoaded) return null;
    return new google.maps.DirectionsRenderer();
  }, [isLoaded]);

  // Calculate directions if provided
  useEffect(() => {
    if (!directions || !directionsService || !directionsRenderer) return;

    directionsService.route(
      {
        origin: directions.origin,
        destination: directions.destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResult(result);
        }
      }
    );
  }, [directions, directionsService, directionsRenderer]);

  const onLoad = useCallback((map: google.maps.Map) => {
    if (directionsRenderer && directionsResult) {
      directionsRenderer.setMap(map);
      directionsRenderer.setDirections(directionsResult);
    }
  }, [directionsRenderer, directionsResult]);

  const onUnmount = useCallback(() => {
    // Cleanup if needed
  }, []);

  if (loadError) {
    return (
      <div className="map-error">
        <p>Fehler beim Laden der Karte</p>
        <p className="map-error-detail">
          {config.googleMapsApiKey
            ? 'Bitte überprüfen Sie Ihre Google Maps API Key'
            : 'Google Maps API Key fehlt. Bitte setzen Sie VITE_GOOGLE_MAPS_API_KEY in Ihrer .env Datei.'}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-loading">
        <div className="map-loading-spinner"></div>
        <p>Lade Karte...</p>
      </div>
    );
  }

  return (
    <div className={`google-map-container ${className}`}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={zoom}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onMapClick}
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            label={marker.label}
            title={marker.title}
            icon={marker.icon}
            onClick={() => onMarkerClick?.(marker)}
          />
        ))}

        {directionsResult && <DirectionsRenderer directions={directionsResult} />}
      </GoogleMap>
    </div>
  );
}

