import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DriverService } from '../services/driverService';
import './RatingsView.css';

interface DriverRating {
  id: string;
  orderId: string;
  customerName: string;
  rating: number;
  comment?: string;
  response?: string;
  createdAt: string;
  order?: {
    id: string;
    totalAmount: number;
    status: string;
  };
}

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentRatings: DriverRating[];
}

export function RatingsView() {
  const { driver } = useAuth();
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [ratings, setRatings] = useState<DriverRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    if (driver) {
      fetchStats();
      fetchRatings();
    }
  }, [driver]);

  const fetchStats = async () => {
    if (!driver) return;
    try {
      const result = await DriverService.getRatingsStats(driver.id);
      setStats(result.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const fetchRatings = async () => {
    if (!driver) return;
    try {
      setLoading(true);
      const result = await DriverService.getRatings(driver.id, 1, 50);
      setRatings(result.data.ratings || result.data || []);
    } catch (error: any) {
      console.error('Fehler beim Laden der Bewertungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (reviewId: string) => {
    if (!driver || !responseText.trim()) return;
    try {
      await DriverService.respondToRating(driver.id, reviewId, responseText);
      setRespondingTo(null);
      setResponseText('');
      fetchRatings();
      fetchStats();
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    }
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (!driver) return null;

  return (
    <div className="ratings-view">
      <h2>⭐ Bewertungen</h2>

      {stats && (
        <div className="ratings-stats">
          <div className="stats-card">
            <div className="average-rating">
              <div className="rating-value">{stats.averageRating.toFixed(1)}</div>
              <div className="rating-stars">{renderStars(Math.round(stats.averageRating))}</div>
              <div className="rating-count">{stats.totalRatings} Bewertungen</div>
            </div>
          </div>

          <div className="rating-distribution">
            <h3>Verteilung</h3>
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="distribution-item">
                <span>{stars} ⭐</span>
                <div className="distribution-bar">
                  <div
                    className="distribution-fill"
                    style={{
                      width: `${(stats.ratingDistribution[stars as keyof typeof stats.ratingDistribution] / stats.totalRatings) * 100}%`,
                    }}
                  />
                </div>
                <span>{stats.ratingDistribution[stars as keyof typeof stats.ratingDistribution]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ratings-list">
        <h3>Bewertungen</h3>
        {loading ? (
          <div className="loading">Lade Bewertungen...</div>
        ) : ratings.length === 0 ? (
          <div className="empty-state">Keine Bewertungen gefunden</div>
        ) : (
          ratings.map((rating) => (
            <div key={rating.id} className="rating-item">
              <div className="rating-header">
                <div className="rating-info">
                  <div className="rating-customer">{rating.customerName}</div>
                  <div className="rating-stars-small">{renderStars(rating.rating)}</div>
                  <div className="rating-date">
                    {new Date(rating.createdAt).toLocaleDateString('de-DE')}
                  </div>
                </div>
                {rating.order && (
                  <div className="rating-order">
                    Bestellung #{rating.order.id.slice(-8)}
                  </div>
                )}
              </div>

              {rating.comment && (
                <div className="rating-comment">{rating.comment}</div>
              )}

              {rating.response ? (
                <div className="rating-response">
                  <strong>Ihre Antwort:</strong> {rating.response}
                </div>
              ) : (
                <div className="rating-actions">
                  {respondingTo === rating.id ? (
                    <div className="response-form">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Ihre Antwort..."
                        rows={3}
                      />
                      <div className="response-actions">
                        <button onClick={() => handleRespond(rating.id)}>Senden</button>
                        <button onClick={() => {
                          setRespondingTo(null);
                          setResponseText('');
                        }}>Abbrechen</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="respond-button"
                      onClick={() => setRespondingTo(rating.id)}
                    >
                      Antworten
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

