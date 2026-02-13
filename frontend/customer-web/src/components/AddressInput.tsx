import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGeocodeAddress } from '../hooks/useGeocoding';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';
import api from '../utils/api';
import './AddressInput.css';

interface AddressInputProps {
  onAddressSelected: (address: string, coordinates?: { lat: number; lng: number }) => void;
  initialAddress?: string;
}

export function AddressInput({ onAddressSelected, initialAddress }: AddressInputProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [address, setAddress] = useState(initialAddress || user?.address || '');
  const [suggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id: string; label: string; address: string }>>([]);
  const { data: geocodeData } = useGeocodeAddress(address);

  const fetchSavedAddresses = useCallback(async () => {
    if (!user) return; // Nur laden wenn User eingeloggt ist
    try {
      const response = await api.get('/customers/me/addresses');
      setSavedAddresses(response.data || []);
    } catch (error) {
      // Ignore errors
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSavedAddresses();
    }
  }, [user, fetchSavedAddresses]);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (value.length > 2) {
      // Hier könnte man Autocomplete-API verwenden
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectAddress = (selectedAddress: string) => {
    setAddress(selectedAddress);
    setShowSuggestions(false);
    
    // Geocode die Adresse
    if (geocodeData?.coordinates) {
      onAddressSelected(selectedAddress, geocodeData.coordinates);
    } else {
      onAddressSelected(selectedAddress);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await api.post('/geocoding/reverse-geocode', {
              lat: latitude,
              lng: longitude,
            });
            const formattedAddress = response.data.formattedAddress;
            setAddress(formattedAddress);
            onAddressSelected(formattedAddress, { lat: latitude, lng: longitude });
          } catch (error) {
            // Fallback: Verwende Koordinaten direkt
            onAddressSelected(`${latitude}, ${longitude}`, { lat: latitude, lng: longitude });
          }
        },
        (error) => {
          // Stillschweigend behandeln - Geolocation ist optional
          // Nur loggen wenn es ein unerwarteter Fehler ist (nicht PERMISSION_DENIED oder POSITION_UNAVAILABLE)
          if (error.code !== error.PERMISSION_DENIED && error.code !== error.POSITION_UNAVAILABLE && error.code !== error.TIMEOUT) {
            console.error('Geolocation error:', error);
          }
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      handleSelectAddress(address);
    }
  };

  return (
    <Card variant="elevated" className="address-input-card">
      <div className="address-input-header">
        <MapPin size={24} />
        <h2>{t('addressInput.title', { defaultValue: 'Wo soll geliefert werden?' })}</h2>
      </div>

      <form onSubmit={handleSubmit} className="address-input-form">
        <div className="address-input-wrapper">
          <Search size={20} className="address-search-icon" />
          <input
            type="text"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder={t('addressInput.placeholder', { defaultValue: 'Adresse eingeben...' })}
            className="address-input-field"
            autoFocus
          />
          {address && (
            <button
              type="button"
              onClick={() => {
                setAddress('');
                setShowSuggestions(false);
              }}
              className="address-clear-btn"
              aria-label={t('addressInput.clear', { defaultValue: 'Löschen' })}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="address-suggestions">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectAddress(suggestion)}
                className="address-suggestion-item"
              >
                <MapPin size={16} />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        <div className="address-input-actions">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={!address.trim()}
          >
            {t('addressInput.confirm', { defaultValue: 'Adresse bestätigen' })}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleUseCurrentLocation}
            icon={<MapPin size={16} />}
            iconPosition="left"
          >
            {t('addressInput.useCurrentLocation', { defaultValue: 'Aktuellen Standort verwenden' })}
          </Button>
        </div>
      </form>

      {savedAddresses.length > 0 && (
        <div className="saved-addresses">
          <h3>{t('addressInput.savedAddresses', { defaultValue: 'Gespeicherte Adressen' })}</h3>
          <div className="saved-addresses-list">
            {savedAddresses.map((saved) => (
              <button
                key={saved.id}
                type="button"
                onClick={() => handleSelectAddress(saved.address)}
                className="saved-address-item"
              >
                <div className="saved-address-label">{saved.label}</div>
                <div className="saved-address-text">{saved.address}</div>
                <Check size={16} className="saved-address-check" />
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

