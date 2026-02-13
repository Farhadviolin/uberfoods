import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, MapPin, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useRestaurants } from '../hooks/useRestaurants';
import { useGeocodeAddress } from '../hooks/useGeocoding';
import {
  useDeliveryPatterns,
  usePredictDelivery,
  type HistoricalPattern,
  type DeliveryPrediction as APIDeliveryPrediction,
} from '../hooks/usePredictiveDelivery';
import { AxiosErrorWithResponse } from '../types';
import './PredictiveDelivery.css';

interface DeliveryPrediction {
  restaurant: string;
  dish: string;
  predictedETA: number; // in minutes
  confidence: number;
  factors: {
    traffic: 'low' | 'medium' | 'high';
    weather: 'good' | 'moderate' | 'bad';
    restaurantLoad: 'low' | 'medium' | 'high';
    distance: number; // in km
  };
  recommendations: string[];
}

export function PredictiveDelivery() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: restaurants } = useRestaurants();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [selectedDish, setSelectedDish] = useState<string>('');
  const [prediction, setPrediction] = useState<DeliveryPrediction | null>(null);

  // API Hooks
  const { data: historicalPatterns = [], isLoading: patternsLoading } = useDeliveryPatterns();
  const predictMutation = usePredictDelivery();
  const { data: geocodeResult } = useGeocodeAddress(user?.address || null);

  const calculatePrediction = async () => {
    if (!selectedRestaurantId || !selectedDish) {
      showToast('Bitte Restaurant und Gericht auswählen', 'error');
      return;
    }

    // Finde Restaurant für Name-Anzeige
    const selectedRestaurant = restaurants?.find(r => r.id === selectedRestaurantId);
    if (!selectedRestaurant) {
      showToast('Restaurant nicht gefunden', 'error');
      return;
    }

    // Prüfe ob Geocoding-Ergebnis vorhanden ist
    if (!geocodeResult?.coordinates) {
      showToast(t('predictiveDelivery.addressRequired'), 'error');
      return;
    }

    try {
      const result: APIDeliveryPrediction = await predictMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        dish: selectedDish,
        customerLat: geocodeResult.coordinates.lat,
        customerLng: geocodeResult.coordinates.lng,
      });

      // Transform API response to component format
      const historical = historicalPatterns.find(p => p.restaurantId === selectedRestaurantId);
      const now = new Date();
      const currentHour = now.getHours();

      const recommendations = generateRecommendations(
        result.estimatedDeliveryTime,
        currentHour,
        historical
      );

      const newPrediction: DeliveryPrediction = {
        restaurant: selectedRestaurant.name,
        dish: selectedDish,
        predictedETA: result.estimatedDeliveryTime,
        confidence: result.confidence,
        factors: {
          traffic: result.factors.currentLoad > 0.7 ? 'high' : result.factors.currentLoad > 0.4 ? 'medium' : 'low',
          weather: result.factors.weather === 'bad' ? 'bad' : result.factors.weather === 'moderate' ? 'moderate' : 'good',
          restaurantLoad: result.factors.currentLoad > 0.7 ? 'high' : result.factors.currentLoad > 0.4 ? 'medium' : 'low',
          distance: result.factors.distance,
        },
        recommendations,
      };

      setPrediction(newPrediction);
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('errors.generic'), 'error');
    }
  };

  const generateRecommendations = (
    eta: number,
    currentHour: number,
    historical: HistoricalPattern | undefined
  ): string[] => {
    const recommendations: string[] = [];

    if (eta > 40) {
      recommendations.push('Längere Lieferzeit erwartet. Bestelle jetzt für später.');
    }

    if (historical && historical.peakHours.includes(currentHour)) {
      recommendations.push('Hauptbestellzeit! Erwarte längere Wartezeiten.');
    }

    if (eta < 20) {
      recommendations.push('Schnelle Lieferung erwartet! Perfekt für jetzt.');
    }

    if (historical && currentHour >= 14 && currentHour <= 16) {
      recommendations.push(`Beste Lieferzeit: ${historical.bestDeliveryTime}`);
    }

    return recommendations;
  };

  const getFactorColor = (factor: string): string => {
    const colors: Record<string, string> = {
      'low': '#4CAF50',
      'medium': '#1877F2',
      'high': '#dc3545',
      'good': '#4CAF50',
      'moderate': '#1877F2',
      'bad': '#dc3545'
    };
    return colors[factor] || '#65676B';
  };

  const getFactorLabel = (factor: string): string => {
    const labels: Record<string, string> = {
      'low': t('predictiveDelivery.factors.low'),
      'medium': t('predictiveDelivery.factors.medium'),
      'high': t('predictiveDelivery.factors.high'),
      'good': t('predictiveDelivery.factors.good'),
      'moderate': t('predictiveDelivery.factors.moderate'),
      'bad': t('predictiveDelivery.factors.bad')
    };
    return labels[factor] || factor;
  };

  const formatETA = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} Min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  return (
    <Card variant="elevated" className="predictive-delivery-card">
      <div className="delivery-header">
        <div className="delivery-title">
          <Clock className="delivery-icon" />
          <div>
            <h3>Predictive Delivery</h3>
            <p className="delivery-subtitle">KI-basierte Lieferzeit-Vorhersage</p>
          </div>
        </div>
      </div>

      <div className="delivery-form">
        <div className="form-group">
          <label>Restaurant</label>
          <select
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
            className="delivery-select"
            disabled={!restaurants || restaurants.length === 0}
          >
            <option value="">Restaurant wählen</option>
            {restaurants?.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Gericht</label>
          <input
            type="text"
            value={selectedDish}
            onChange={(e) => setSelectedDish(e.target.value)}
            placeholder={t('predictiveDelivery.dishPlaceholder')}
            className="delivery-input"
          />
        </div>

        <Button
          variant="primary"
          onClick={calculatePrediction}
          disabled={!selectedRestaurantId || !selectedDish || !geocodeResult?.coordinates || predictMutation.isPending}
          className="predict-btn"
        >
          {predictMutation.isPending ? t('predictiveDelivery.calculating') : t('predictiveDelivery.calculate')}
        </Button>
      </div>

      {prediction && (
        <div className="prediction-result">
          <div className="prediction-header">
            <div className="prediction-eta">
              <Clock className="eta-icon" />
              <div>
                <div className="eta-label">Vorhergesagte Lieferzeit</div>
                <div className="eta-value">{formatETA(prediction.predictedETA)}</div>
                <div className="eta-confidence">
                  Konfidenz: {(prediction.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          <div className="prediction-factors">
            <h4>Einflussfaktoren</h4>
            <div className="factors-grid">
              <div className="factor-item">
                <MapPin className="factor-icon" />
                <div className="factor-info">
                  <span className="factor-label">Distanz</span>
                  <span className="factor-value">{prediction.factors.distance} km</span>
                </div>
              </div>

              <div className="factor-item">
                <TrendingUp className="factor-icon" />
                <div className="factor-info">
                  <span className="factor-label">Verkehr</span>
                  <span
                    className="factor-value"
                    style={{ color: getFactorColor(prediction.factors.traffic) }}
                  >
                    {getFactorLabel(prediction.factors.traffic)}
                  </span>
                </div>
              </div>

              <div className="factor-item">
                <AlertCircle className="factor-icon" />
                <div className="factor-info">
                  <span className="factor-label">Wetter</span>
                  <span
                    className="factor-value"
                    style={{ color: getFactorColor(prediction.factors.weather) }}
                  >
                    {getFactorLabel(prediction.factors.weather)}
                  </span>
                </div>
              </div>

              <div className="factor-item">
                <Clock className="factor-icon" />
                <div className="factor-info">
                  <span className="factor-label">Restaurant Auslastung</span>
                  <span
                    className="factor-value"
                    style={{ color: getFactorColor(prediction.factors.restaurantLoad) }}
                  >
                    {getFactorLabel(prediction.factors.restaurantLoad)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {prediction.recommendations.length > 0 && (
            <div className="prediction-recommendations">
              <h4>Empfehlungen</h4>
              <div className="recommendations-list">
                {prediction.recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-item">
                    <CheckCircle className="recommendation-icon" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="prediction-actions">
            <Button variant="primary" className="order-now-btn">
              Jetzt bestellen ({formatETA(prediction.predictedETA)})
            </Button>
            <Button variant="secondary">
              Für später planen
            </Button>
          </div>
        </div>
      )}

      {patternsLoading ? (
        <div className="historical-patterns">
          <Skeleton variant="rectangular" width="100%" height="100px" />
        </div>
      ) : historicalPatterns.length > 0 && (
        <div className="historical-patterns">
          <h4>Historische Muster</h4>
          <div className="patterns-list">
            {historicalPatterns.map((pattern, index) => (
              <div key={index} className="pattern-item">
                <div className="pattern-restaurant">{pattern.restaurant}</div>
                <div className="pattern-details">
                  <span>Ø {pattern.averageDeliveryTime} Min</span>
                  <span>•</span>
                  <span>Beste Zeit: {pattern.bestDeliveryTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

