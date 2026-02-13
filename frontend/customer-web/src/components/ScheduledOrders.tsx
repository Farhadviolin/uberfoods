import { useTranslation } from 'react-i18next';
import { useScheduledOrders, useDeleteScheduledOrder, useExecuteScheduledOrder } from '../hooks/useScheduledOrders';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { Calendar, Clock, Repeat, Trash2, Play, MapPin, Phone } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { getImageUrl, getRestaurantPlaceholder } from '../utils/imageUtils';
import { AxiosErrorWithResponse } from '../types';
import './ScheduledOrders.css';

export function ScheduledOrders() {
  const { t, i18n } = useTranslation();
  const { data: scheduledOrders, isLoading } = useScheduledOrders();
  const deleteMutation = useDeleteScheduledOrder();
  const executeMutation = useExecuteScheduledOrder();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const getFrequencyLabel = (frequency: string) => {
    return t(`scheduledOrders.${frequency.toLowerCase()}`) || frequency;
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('scheduledOrders.deleteConfirm'))) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      showToast(t('scheduledOrders.deleted'), 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('scheduledOrders.deleteError'), 'error');
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await executeMutation.mutateAsync(id);
      showToast(t('scheduledOrders.executed'), 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('scheduledOrders.executeError'), 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="scheduled-orders">
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="rectangular" width="100%" height="200px" />
      </div>
    );
  }

  if (!scheduledOrders || scheduledOrders.length === 0) {
    return (
      <div className="scheduled-orders">
        <h2>{t('sidebar.scheduledOrders')}</h2>
        <Card variant="elevated" className="empty-state">
          <Calendar size={48} color="#8A8D91" />
          <p>{t('scheduledOrders.noOrders')}</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            {t('dashboard.orderNow')}
          </Button>
        </Card>
      </div>
    );
  }

  const activeOrders = scheduledOrders.filter((o) => o.isActive);
  const inactiveOrders = scheduledOrders.filter((o) => !o.isActive);

  return (
    <div className="scheduled-orders">
      <div className="scheduled-orders-header">
        <h2>{t('sidebar.scheduledOrders')}</h2>
        <Button variant="primary" onClick={() => navigate('/')}>
          {t('scheduledOrders.newScheduledOrder')}
        </Button>
      </div>

      {activeOrders.length > 0 && (
        <div className="scheduled-orders-section">
          <h3>{t('scheduledOrders.activeOrders')}</h3>
          <div className="scheduled-orders-grid">
            {activeOrders.map((order) => (
              <Card key={order.id} variant="elevated" className="scheduled-order-card">
                <div className="order-header">
                  <img
                    src={getImageUrl(order.restaurant.imageUrl) || getRestaurantPlaceholder()}
                    alt={order.restaurant.name}
                    className="restaurant-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getRestaurantPlaceholder();
                    }}
                  />
                  <div className="restaurant-info">
                    <h4>{order.restaurant.name}</h4>
                    <p className="restaurant-address">
                      <MapPin size={14} />
                      {order.restaurant.address}
                    </p>
                  </div>
                </div>

                <div className="order-details">
                  <div className="detail-item">
                    <Calendar size={16} />
                    <div>
                      <span className="detail-label">{t('scheduledOrders.scheduledFor')}:</span>
                      <span className="detail-value">
                        {new Date(order.scheduledAt).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {order.frequency && order.frequency !== 'ONCE' && (
                    <div className="detail-item">
                      <Repeat size={16} />
                      <div>
                        <span className="detail-label">{t('scheduledOrders.repetition')}:</span>
                        <span className="detail-value">{getFrequencyLabel(order.frequency)}</span>
                      </div>
                    </div>
                  )}

                  {order.nextOrder && (
                    <div className="detail-item">
                      <Clock size={16} />
                      <div>
                        <span className="detail-label">{t('scheduledOrders.nextOrder')}:</span>
                        <span className="detail-value">
                          {new Date(order.nextOrder).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="detail-item">
                    <Phone size={16} />
                    <div>
                      <span className="detail-label">{t('order.deliveryAddress')}:</span>
                      <span className="detail-value">{order.address}</span>
                    </div>
                  </div>

                  <div className="order-items-count">
                    {order.items.length} {t('scheduledOrders.items')}
                  </div>
                </div>

                <div className="order-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Play size={16} />}
                    iconPosition="left"
                    onClick={() => handleExecute(order.id)}
                    disabled={executeMutation.isPending}
                  >
                    {t('scheduledOrders.executeNow')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    iconPosition="left"
                    onClick={() => handleDelete(order.id)}
                    disabled={deleteMutation.isPending}
                    className="delete-btn"
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {inactiveOrders.length > 0 && (
        <div className="scheduled-orders-section">
          <h3>{t('scheduledOrders.completedOrders')}</h3>
          <div className="scheduled-orders-grid">
            {inactiveOrders.map((order) => (
              <Card key={order.id} variant="outlined" className="scheduled-order-card inactive">
                <div className="order-header">
                  <img
                    src={getImageUrl(order.restaurant.imageUrl) || getRestaurantPlaceholder()}
                    alt={order.restaurant.name}
                    className="restaurant-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getRestaurantPlaceholder();
                    }}
                  />
                  <div className="restaurant-info">
                    <h4>{order.restaurant.name}</h4>
                    <p className="restaurant-address">
                      <MapPin size={14} />
                      {order.restaurant.address}
                    </p>
                  </div>
                </div>
                <div className="order-details">
                  <div className="detail-item">
                    <Calendar size={16} />
                    <div>
                      <span className="detail-label">{t('scheduledOrders.scheduledFor')}:</span>
                      <span className="detail-value">
                        {new Date(order.scheduledAt).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  {order.lastOrdered && (
                    <div className="detail-item">
                      <Clock size={16} />
                      <div>
                        <span className="detail-label">{t('scheduledOrders.lastExecuted')}:</span>
                        <span className="detail-value">
                          {new Date(order.lastOrdered).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="order-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(order.id)}
                    disabled={deleteMutation.isPending}
                    className="delete-btn"
                  >
                    <Trash2 size={16} />
                    {t('common.delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

