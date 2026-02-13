import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { getImageUrl, getDishPlaceholder } from '../utils/imageUtils';
import { AxiosErrorWithResponse } from '../types';
import './Reviews.css';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
  images?: string[];
}

interface ReviewFormData {
  rating: number;
  comment: string;
  images: File[];
}

export function Reviews() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 5,
    comment: '',
    images: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAllReviews = useCallback(async () => {
    // Nur laden wenn eingeloggt
    if (!isAuthenticated) {
      setReviews([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get('/reviews/my-reviews');
      setReviews(response.data || []);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      // Bei 401, 403 oder 404: leere Liste setzen (stillschweigend)
      // Endpunkt existiert möglicherweise nicht im Backend
      if (axiosError.response?.status === 401 || 
          axiosError.response?.status === 403 ||
          axiosError.response?.status === 404) {
        setReviews([]);
        setError(null);
      } else {
        setError('Fehler beim Laden der Bewertungen');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reviews/restaurant/${id}`);
      setReviews(response.data || []);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      // Bei 401/403 Fehlern (nicht eingeloggt) leere Liste setzen
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        setReviews([]);
        setError(null); // Kein Fehler anzeigen, da erwartet
      } else if (axiosError.response?.status !== 404) {
        setError('Fehler beim Laden der Bewertungen');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchReviews();
    } else if (isAuthenticated) {
      // Nur meine Reviews laden wenn eingeloggt
      fetchAllReviews();
    } else {
      setReviews([]);
      setLoading(false);
    }
  }, [id, isAuthenticated, fetchReviews, fetchAllReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !isAuthenticated) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('restaurantId', id);
      formDataToSend.append('rating', formData.rating.toString());
      formDataToSend.append('comment', formData.comment);
      
      formData.images.forEach((image) => {
        formDataToSend.append(`images`, image);
      });

      await api.post('/reviews', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(t('reviews.submit'));
      setFormData({ rating: 5, comment: '', images: [] });
      setShowForm(false);
      await fetchReviews();
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      setError(axiosError.response?.data?.message || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 3); // Max 3 Bilder
      setFormData({ ...formData, images: files });
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage: reviews.length > 0
      ? (reviews.filter((r) => r.rating === rating).length / reviews.length) * 100
      : 0,
  }));

  if (loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
        <div>Lade Bewertungen...</div>
      </div>
    );
  }

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <div>
          <h2>{id ? 'Bewertungen' : 'Meine Bewertungen'}</h2>
          {id && (
            <div className="rating-summary">
              <div className="average-rating">
                <span className="rating-number">{averageRating.toFixed(1)}</span>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= Math.round(averageRating) ? 'star filled' : 'star'}>
                      ⭐
                    </span>
                  ))}
                </div>
                <span className="review-count">({reviews.length} Bewertungen)</span>
              </div>
            </div>
          )}
        </div>
        {isAuthenticated && id && (
          <button onClick={() => setShowForm(!showForm)} className="add-review-btn">
            {showForm ? '✕ Abbrechen' : '+ Bewertung schreiben'}
          </button>
        )}
      </div>

      {showForm && isAuthenticated && id && (
        <div className="review-form-card">
          <h3>Bewertung schreiben</h3>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Bewertung *</label>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className={`star-btn ${star <= formData.rating ? 'active' : ''}`}
                  >
                    ⭐
                  </button>
                ))}
                <span className="rating-text">
                  {formData.rating === 5 && t('reviews.excellent')}
                  {formData.rating === 4 && t('reviews.veryGood')}
                  {formData.rating === 3 && t('reviews.good')}
                  {formData.rating === 2 && t('reviews.satisfactory')}
                  {formData.rating === 1 && t('reviews.poor')}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>{t('reviews.comment')} *</label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder={t('reviews.shareExperience')}
                rows={5}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('reviews.photos')}</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="file-input"
              />
              {formData.images.length > 0 && (
                <div className="image-preview">
                  {formData.images.map((image, index) => (
                    <div key={index} className="preview-item">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="preview-image"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = [...formData.images];
                          newImages.splice(index, 1);
                          setFormData({ ...formData, images: newImages });
                        }}
                        className="remove-image-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={submitting} className="submit-btn">
                {submitting ? t('reviews.saving') : t('reviews.submit')}
              </button>
            </div>
          </form>
        </div>
      )}

      {!isAuthenticated && (
        <div className="auth-prompt">
          <p>Bitte <a href="/login">anmelden</a> um eine Bewertung zu schreiben</p>
        </div>
      )}

      {id && (
        <div className="rating-breakdown">
          <h3>Bewertungsverteilung</h3>
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="rating-bar">
              <span className="rating-label">{rating} ⭐</span>
              <div className="bar-container">
                <div className="bar" style={{ width: `${percentage}%` }} />
              </div>
              <span className="rating-count">{count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="reviews-list">
        {reviews.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
            <p>Noch keine Bewertungen</p>
            <p style={{ color: '#65676B', fontSize: '14px' }}>
              Seien Sie der Erste, der eine Bewertung schreibt!
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div>
                  <div className="reviewer-name">{review.customer.name}</div>
                  <div className="review-date">
                    {new Date(review.createdAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="review-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={star <= review.rating ? 'star filled' : 'star'}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
              {review.comment && (
                <div className="review-comment">{review.comment}</div>
              )}
              {review.images && review.images.length > 0 && (
                <div className="review-images">
                  {review.images.map((image, index) => (
                    <img
                      key={index}
                      src={getImageUrl(image)}
                      alt={`Review image ${index + 1}`}
                      className="review-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getDishPlaceholder();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

