import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, MapPin, Star, Phone, Mail, Truck, Euro } from 'lucide-react';
import api from '../utils/api';
import { getImageUrl, getRestaurantPlaceholder } from '../utils/imageUtils';
import { Card } from '../design-system/Card';
import { GoogleMapComponent } from './GoogleMap';
import { RestaurantAlert } from './RestaurantAlert';
import { logDebug, logError } from '../utils/errorReporting';
import { sanitizePhone, sanitizeEmail, validateImageUrl } from '../utils/security';
import './RestaurantDetails.css';

interface RestaurantDetails {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  address: string;
  phone: string;
  email: string;
  rating?: number;
  deliveryFee?: number;
  minOrderAmount?: number;
  estimatedDeliveryTime?: number;
  operatingHours?: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  status?: 'OPEN' | 'CLOSED' | 'IN_WORK';
  latitude?: number;
  longitude?: number;
  dishes?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

export function RestaurantDetails() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<{ isOpen: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      checkOperatingHours();
    }
  }, [id, fetchRestaurant, checkOperatingHours]);

  const fetchRestaurant = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/restaurants/public/${id}`);
      setRestaurant(response.data);
    } catch (err) {
      setError(t('restaurant.loadingDetails'));
      logError(err, { component: 'RestaurantDetails', action: 'fetchRestaurant', metadata: { restaurantId: id } });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkOperatingHours = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/restaurants/${id}/operating-hours`);
      setIsOpen(response.data);
    } catch (err) {
      logDebug('Fehler beim Laden der Öffnungszeiten', err, { component: 'RestaurantDetails', action: 'checkOperatingHours', metadata: { restaurantId: id } });
    }
  }, [id]);

  const formatOperatingHours = (hours: RestaurantDetails['operatingHours']) => {
    if (!hours) return null;

    const days = [
      { key: 'monday', label: t('restaurant.days.monday') },
      { key: 'tuesday', label: t('restaurant.days.tuesday') },
      { key: 'wednesday', label: t('restaurant.days.wednesday') },
      { key: 'thursday', label: t('restaurant.days.thursday') },
      { key: 'friday', label: t('restaurant.days.friday') },
      { key: 'saturday', label: t('restaurant.days.saturday') },
      { key: 'sunday', label: t('restaurant.days.sunday') },
    ];

    return days.map((day) => {
      const dayHours = hours[day.key];
      if (!dayHours || !dayHours.isOpen) {
        return { day: day.label, hours: t('restaurant.closed') };
      }
      return { day: day.label, hours: `${dayHours.open} - ${dayHours.close} ${t('common.min')}` };
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍕</div>
        <div>{t('restaurant.loadingDetails')}</div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div>
        <button className="fb-back-button" onClick={() => navigate('/')}>
          ← {t('common.back')}
        </button>
        <div className="error">{error || t('restaurant.notFound')}</div>
      </div>
    );
  }

  const operatingHoursList = formatOperatingHours(restaurant.operatingHours);
  const validatedImageUrl = validateImageUrl(restaurant.imageUrl);
  const safeImage = validatedImageUrl ? getImageUrl(validatedImageUrl) : getRestaurantPlaceholder();
  const safePhone = sanitizePhone(restaurant.phone);

  return (
    <div className="restaurant-details-page">
      <button className="fb-back-button" onClick={() => navigate('/')}>
        ← Zurück
      </button>

      <div className="restaurant-details-header">
        <img
          src={safeImage}
          alt={restaurant.name}
          className="restaurant-details-image"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getRestaurantPlaceholder();
          }}
        />
        <div className="restaurant-details-info">
          <h1>{restaurant.name}</h1>
          <p className="restaurant-description">{restaurant.description}</p>

          <div className="restaurant-meta">
            {restaurant.rating && (
              <div className="meta-item">
                <Star size={18} />
                <span>{restaurant.rating.toFixed(1)}</span>
              </div>
            )}
            {id && <RestaurantAlert restaurantId={id} />}
            {restaurant.estimatedDeliveryTime && (
              <div className="meta-item">
                <Clock size={18} />
                <span>{restaurant.estimatedDeliveryTime} Min.</span>
              </div>
            )}
            {isOpen && (
              <div className={`meta-item status ${isOpen.isOpen ? 'open' : 'closed'}`}>
                <span>{isOpen.isOpen ? t('restaurant.open') : t('restaurant.closed')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="restaurant-details-grid">
        <Card variant="elevated" className="restaurant-details-card">
          <h3>{t('restaurant.address')}</h3>
          <div className="details-section">
            <div className="detail-item">
              <MapPin size={20} />
              <span>{restaurant.address}</span>
            </div>
            {restaurant.latitude && restaurant.longitude && (
              <div className="restaurant-map-container">
                <GoogleMapComponent
                  center={{ lat: restaurant.latitude, lng: restaurant.longitude }}
                  zoom={15}
                  markers={[
                    {
                      position: { lat: restaurant.latitude, lng: restaurant.longitude },
                      label: restaurant.name?.charAt(0) || '?',
                      title: restaurant.name,
                      icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    },
                  ]}
                  className="restaurant-map"
                />
              </div>
            )}
            <div className="detail-item">
              <Phone size={20} />
              {safePhone ? (
                <a href={`tel:${safePhone}`} rel="noopener noreferrer">{safePhone}</a>
              ) : (
                <span>{t('restaurant.phoneUnavailable') || 'Telefon nicht verfügbar'}</span>
              )}
            </div>
            <div className="detail-item">
              <Mail size={20} />
              <a href={`mailto:${sanitizeEmail(restaurant.email)}`}>{restaurant.email}</a>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="restaurant-details-card">
          <h3>{t('order.deliveryAddress')}</h3>
          <div className="details-section">
            {restaurant.deliveryFee !== undefined && (
              <div className="detail-item">
                <Truck size={20} />
                <span>
                  {t('restaurant.deliveryFeeLabel')} {restaurant.deliveryFee > 0 ? `${restaurant.deliveryFee.toFixed(2)} €` : t('restaurant.freeDelivery')}
                </span>
              </div>
            )}
            {restaurant.minOrderAmount !== undefined && (
              <div className="detail-item">
                <Euro size={20} />
                <span>Mindestbestellwert: {restaurant.minOrderAmount.toFixed(2)} €</span>
              </div>
            )}
            {restaurant.estimatedDeliveryTime && (
              <div className="detail-item">
                <Clock size={20} />
                <span>Geschätzte Lieferzeit: {restaurant.estimatedDeliveryTime} Minuten</span>
              </div>
            )}
          </div>
        </Card>

        {operatingHoursList && (
          <Card variant="elevated" className="restaurant-details-card">
            <h3>Öffnungszeiten</h3>
            <div className="details-section">
              {operatingHoursList.map((day, idx) => (
                <div key={idx} className="detail-item operating-hours-item">
                  <span className="day-label">{day.day}:</span>
                  <span className="hours-value">{day.hours}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="restaurant-details-actions">
        <button
          className="fb-btn fb-btn-primary"
          onClick={() => navigate(`/restaurant/${restaurant.id}`)}
        >
          Menü ansehen
        </button>
      </div>
    </div>
  );
}

