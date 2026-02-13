import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Card } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import { EmptyState } from '../design-system/EmptyState';
import { Tag, Calendar, Percent, Gift } from 'lucide-react';
import './Promotions.css';

interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  restaurantId?: string;
  restaurantName?: string;
  isActive: boolean;
}

export function Promotions() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [myPromotions, setMyPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/promotions/public/active');
      setPromotions(response.data || []);
    } catch (err) {
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyPromotions = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await api.get('/promotions/public/my-promotions/active', {
        params: { customerId: user.id },
      });
      setMyPromotions(response.data || []);
    } catch (err) {
      setMyPromotions([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPromotions();
    if (user?.id) {
      loadMyPromotions();
    }
  }, [user?.id, loadPromotions, loadMyPromotions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatDiscount = (promotion: Promotion) => {
    if (promotion.discountType === 'percentage') {
      return `${promotion.discountValue}%`;
    }
    return `€${promotion.discountValue.toFixed(2)}`;
  };

  const isExpiringSoon = (validUntil: string) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const displayPromotions = activeTab === 'all' ? promotions : myPromotions;

  return (
    <div className="promotions-container">
      <div className="promotions-header">
        <div>
          <h1>{t('promotions.title')}</h1>
          <p>{t('promotions.subtitle')}</p>
        </div>
      </div>

      <div className="promotions-tabs">
        <button
          className={`promotions-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Tag size={18} />
          {t('promotions.allPromotions')}
        </button>
        {user && (
          <button
            className={`promotions-tab ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            <Gift size={18} />
            {t('promotions.myPromotions')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="promotions-skeleton">
          <Skeleton variant="rectangular" width="100%" height="150px" />
          <Skeleton variant="rectangular" width="100%" height="150px" />
        </div>
      ) : displayPromotions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tag size={48} />}
            title={t('promotions.noPromotions')}
            description={t('promotions.noPromotionsDesc')}
          />
        </Card>
      ) : (
        <div className="promotions-list">
          {displayPromotions.map((promotion) => (
            <Card key={promotion.id} className="promotion-card">
              <div className="promotion-header">
                <div className="promotion-discount">
                  <Percent size={24} />
                  <span>{formatDiscount(promotion)}</span>
                </div>
                <div className="promotion-info">
                  <h3>{promotion.title}</h3>
                  <p>{promotion.description}</p>
                  {promotion.restaurantName && (
                    <Badge variant="primary" size="small">
                      {promotion.restaurantName}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="promotion-details">
                <div className="promotion-code">
                  <strong>{t('promotions.code')}:</strong>
                  <code>{promotion.code}</code>
                </div>
                {promotion.minOrderAmount && (
                  <div className="promotion-min-order">
                    {t('promotions.minOrder')}: €{promotion.minOrderAmount.toFixed(2)}
                  </div>
                )}
                <div className="promotion-validity">
                  <Calendar size={14} />
                  <span>
                    {t('promotions.validUntil')}: {formatDate(promotion.validUntil)}
                  </span>
                  {isExpiringSoon(promotion.validUntil) && (
                    <Badge variant="warning" size="small">
                      {t('promotions.expiringSoon')}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

