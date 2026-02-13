import { useRestaurantStatus, useEstimatedWait, usePeakHours } from '../hooks/useRestaurantStatus';
import { Card } from '../design-system/Card';
import { Skeleton } from '../design-system/Skeleton';
import { Clock, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './RestaurantStatus.css';

interface RestaurantStatusProps {
  restaurantId: string;
}

const BUSY_LEVEL_COLORS: Record<string, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  VERY_HIGH: '#DC2626',
};

export function RestaurantStatus({ restaurantId }: RestaurantStatusProps) {
  const { t } = useTranslation();
  const { data: status, isLoading: statusLoading } = useRestaurantStatus(restaurantId);
  const { data: estimatedWait, isLoading: waitLoading } = useEstimatedWait(restaurantId);
  const { data: peakHours, isLoading: peakLoading } = usePeakHours(restaurantId);

  if (statusLoading || waitLoading || peakLoading) {
    return (
      <Card variant="elevated" className="restaurant-status">
        <Skeleton variant="text" width="200px" height="24px" />
        <Skeleton variant="rectangular" width="100%" height="100px" />
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const busyColor = BUSY_LEVEL_COLORS[status.busyLevel] || BUSY_LEVEL_COLORS.LOW;
  const busyLabel = t(`restaurantStatus.busyLevel.${status.busyLevel.toLowerCase()}`) || status.busyLevel;

  return (
    <Card variant="elevated" className="restaurant-status">
      <div className="status-header">
        <h3>{t('restaurantStatus.title')}</h3>
        <div className={`status-badge ${status.isOpen ? 'open' : 'closed'}`}>
          {status.isOpen ? `✓ ${t('restaurantStatus.open')}` : `✕ ${t('restaurantStatus.closed')}`}
        </div>
      </div>

      <div className="status-grid">
        <div className="status-item">
          <div className="status-icon" style={{ backgroundColor: `${busyColor}20` }}>
            <Users size={20} style={{ color: busyColor }} />
          </div>
          <div className="status-content">
            <span className="status-label">{t('restaurantStatus.queue')}</span>
            <span className="status-value">{status.queueLength} {t('restaurantStatus.orders')}</span>
          </div>
        </div>

        <div className="status-item">
          <div className="status-icon" style={{ backgroundColor: '#1877F220' }}>
            <Clock size={20} color="#1877F2" />
          </div>
          <div className="status-content">
            <span className="status-label">{t('restaurantStatus.estimatedWait')}</span>
            <span className="status-value">
              {estimatedWait?.estimatedMinutes || status.estimatedWaitMinutes} {t('restaurantStatus.minutes')}
            </span>
          </div>
        </div>

        <div className="status-item">
          <div className="status-icon" style={{ backgroundColor: `${busyColor}20` }}>
            <TrendingUp size={20} style={{ color: busyColor }} />
          </div>
          <div className="status-content">
            <span className="status-label">{t('restaurantStatus.utilization')}</span>
            <span className="status-value" style={{ color: busyColor }}>
              {busyLabel}
            </span>
          </div>
        </div>
      </div>

      {peakHours && peakHours.isPeakHour && (
        <div className="peak-hour-warning">
          <AlertCircle size={16} />
          <span>{t('restaurantStatus.peakHourWarning')}</span>
        </div>
      )}

      {peakHours && peakHours.peakHours.length > 0 && (
        <div className="peak-hours-info">
          <span className="peak-hours-label">{t('restaurantStatus.peakHours')}</span>
          <div className="peak-hours-list">
            {peakHours.peakHours.map((peak) => (
              <span key={peak.hour} className={`peak-hour ${peak.hour === peakHours.currentHour ? 'current' : ''}`}>
                {peak.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

