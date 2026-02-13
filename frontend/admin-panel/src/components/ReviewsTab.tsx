import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { config } from '../config';
import { format } from 'date-fns';
import { Pagination } from './Pagination';
import { devError } from '../utils/errorLogger';
import { extractErrorMessage } from '../utils/errorHandler';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email?: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  images: Array<{
    id: string;
    imageUrl: string;
  }>;
}

interface ReviewStats {
  total: number;
  averageRating: number;
  recentCount: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export function ReviewsTab() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const fetchReviews = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/reviews/all', {
        params: { page, limit: pagination.limit },
      });

      if (response.data?.meta) {
        setReviews(Array.isArray(response.data.data) ? response.data.data : []);
        setPagination({
          page: response.data.meta.page,
          limit: response.data.meta.limit,
          total: response.data.meta.total,
          totalPages: response.data.meta.totalPages,
        });
      } else {
        setReviews(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, showToast]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/reviews/stats');
      setStats(response.data);
    } catch (err) {
      devError('Fehler beim Laden der Statistiken:', err);
    }
  }, []);

  useEffect(() => {
    fetchReviews(1);
    fetchStats();
  }, [fetchReviews, fetchStats]);

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Möchten Sie diese Bewertung wirklich löschen?')) return;

    try {
      await api.delete(`/admin/reviews/${id}`);
      showToast('Bewertung erfolgreich gelöscht!', 'success');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#28a745';
    if (rating >= 3) return '#ffc107';
    return '#dc3545';
  };

  const filteredReviews = (Array.isArray(reviews) ? reviews : []).filter(review => {
    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !review.customer.name.toLowerCase().includes(query) &&
        !review.customer.email?.toLowerCase().includes(query) &&
        !review.restaurant.name.toLowerCase().includes(query) &&
        !review.comment?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Rating Filter
    if (ratingFilter !== 'all' && review.rating !== parseInt(ratingFilter)) {
      return false;
    }

    return true;
  });

  return (
    <div>
      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <h3>Gesamt Bewertungen</h3>
            <div className="stat-value">{stats?.total || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Durchschnittsbewertung</h3>
            <div className="stat-value">{stats?.averageRating?.toFixed(1) || '0.0'} ⭐</div>
          </div>
          <div className="stat-card">
            <h3>Letzte 7 Tage</h3>
            <div className="stat-value">{stats?.recentCount || 0}</div>
          </div>
          <div className="stat-card">
            <h3>5-Sterne Bewertungen</h3>
            <div className="stat-value">{stats?.ratingDistribution?.[5] || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Nach Kunde, Restaurant oder Kommentar suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', width: '300px', minWidth: '200px' }}
        />
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#F0F2F5' }}
        >
          <option value="all">Alle Bewertungen</option>
          <option value="5">5 Sterne</option>
          <option value="4">4 Sterne</option>
          <option value="3">3 Sterne</option>
          <option value="2">2 Sterne</option>
          <option value="1">1 Stern</option>
        </select>
      </div>

      {/* Reviews List */}
      {loading && reviews.length === 0 ? (
        <div className="loading">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Bewertungen werden geladen...</p>
        </div>
      ) : (
        <>
          <div className="orders-container">
            {filteredReviews.map(review => (
              <div key={review.id} className="order-card">
                <div className="order-header">
                  <div>
                    <h3>{review.restaurant.name}</h3>
                    <p style={{ color: '#65676B', fontSize: '13px' }}>
                      {review.customer.name} ({review.customer.email})
                    </p>
                  </div>
                  <div
                    style={{
                      background: getRatingColor(review.rating),
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    {getRatingStars(review.rating)} ({review.rating}/5)
                  </div>
                </div>

                {review.comment && (
                  <div className="order-info" style={{ marginTop: '12px' }}>
                    <p><strong>Kommentar:</strong> {review.comment}</p>
                  </div>
                )}

                {review.images && review.images.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {review.images.map(image => (
                      <img
                        key={image.id}
                        src={`${config.apiUrl}${image.imageUrl}`}
                        alt="Review"
                        style={{
                          width: '100px',
                          height: '100px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                        onClick={() => window.open(`${config.apiUrl}${image.imageUrl}`, '_blank')}
                      />
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#65676B' }}>
                    {format(new Date(review.createdAt), 'dd.MM.yyyy HH:mm')}
                  </span>
                  <button
                    className="small danger"
                    onClick={() => handleDeleteReview(review.id)}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredReviews.length === 0 && !loading && (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
              <p>Keine Bewertungen gefunden</p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => {
                setPagination(prev => ({ ...prev, page }));
                fetchReviews(page);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

