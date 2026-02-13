import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { usePermissions } from '../hooks/usePermissions';
import { ConfirmationDialog } from './ConfirmationDialog';
import { extractErrorMessage } from '../utils/errorHandler';
import './DriverSubscriptionQuickManage.css';

interface Subscription {
  id: string;
  driverId: string;
  tier: 'BASIC' | 'PRO' | 'FULLTIME' | 'ENTERPRISE';
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIAL';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface DriverSubscriptionQuickManageProps {
  driverId: string;
  driverName: string;
  onClose: () => void;
  onSubscriptionUpdated?: () => void;
}

export function DriverSubscriptionQuickManage({ driverId, driverName, onClose, onSubscriptionUpdated }: DriverSubscriptionQuickManageProps) {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('PRO');

  const canManage = hasPermission('subscription:update') || hasPermission('subscription:*');
  const canView = hasPermission('subscription:read') || hasPermission('subscription:*');

  useEffect(() => {
    if (driverId && canView) {
      fetchSubscription();
    }
  }, [driverId, canView]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/subscriptions`).catch(() => ({ data: { subscriptions: [] } }));
      const subscriptions = response.data.subscriptions || [];
      const driverSubscription = subscriptions.find((sub: Subscription) => sub.driverId === driverId);
      setSubscription(driverSubscription || null);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!canManage) {
      showToast('Keine Berechtigung zum Upgraden der Subscription', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/admin/users/subscriptions/${driverId}/upgrade`, {
        tier: selectedTier,
      });
      showToast('Subscription erfolgreich upgegradet', 'success');
      setShowUpgradeDialog(false);
      fetchSubscription();
      onSubscriptionUpdated?.();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!canManage) {
      showToast('Keine Berechtigung zum Kündigen der Subscription', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/admin/users/subscriptions/${driverId}/cancel`, {
        cancelAtPeriodEnd: true,
      });
      showToast('Subscription wird am Periodenende gekündigt', 'success');
      fetchSubscription();
      onSubscriptionUpdated?.();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!canManage) {
      showToast('Keine Berechtigung zum Reaktivieren der Subscription', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/admin/users/subscriptions/${driverId}/reactivate`);
      showToast('Subscription erfolgreich reaktiviert', 'success');
      fetchSubscription();
      onSubscriptionUpdated?.();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="driver-subscription-no-permission">
        <p>Keine Berechtigung zum Anzeigen von Subscriptions</p>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      BASIC: '#6c757d',
      PRO: '#1877f2',
      FULLTIME: '#28a745',
      ENTERPRISE: '#ffc107',
    };
    return colors[tier] || '#6c757d';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: '#28a745',
      CANCELED: '#dc3545',
      PAST_DUE: '#ffc107',
      TRIAL: '#17a2b8',
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div className="driver-subscription-quick-manage">
      <div className="subscription-header">
        <h2>💳 Subscription: {driverName}</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      {loading ? (
        <LoadingSpinner text="Subscription wird geladen..." />
      ) : !subscription ? (
        <div className="no-subscription">
          <p>Keine aktive Subscription für diesen Fahrer gefunden.</p>
          {canManage && (
            <button
              className="create-subscription-button"
              onClick={() => {
                showToast('Bitte verwenden Sie die Subscription-Verwaltung für neue Subscriptions', 'info');
              }}
            >
              Subscription erstellen
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="subscription-info">
            <div className="info-card">
              <h3>Tier</h3>
              <div className="info-value" style={{ color: getTierColor(subscription.tier) }}>
                {subscription.tier}
              </div>
            </div>
            <div className="info-card">
              <h3>Status</h3>
              <div className="info-value" style={{ color: getStatusColor(subscription.status) }}>
                {subscription.status}
              </div>
            </div>
            <div className="info-card">
              <h3>Periodenende</h3>
              <div className="info-value">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('de-DE')}
              </div>
            </div>
            {subscription.cancelAtPeriodEnd && (
              <div className="info-card warning">
                <h3>⚠️ Kündigung</h3>
                <div className="info-value">
                  Wird am Periodenende gekündigt
                </div>
              </div>
            )}
          </div>

          {canManage && (
            <div className="subscription-actions">
              {subscription.tier !== 'ENTERPRISE' && subscription.status === 'ACTIVE' && (
                <button
                  className="upgrade-button"
                  onClick={() => setShowUpgradeDialog(true)}
                  disabled={actionLoading}
                >
                  ⬆️ Upgrade
                </button>
              )}
              {subscription.status === 'ACTIVE' && !subscription.cancelAtPeriodEnd && (
                <button
                  className="cancel-button"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  ❌ Kündigen
                </button>
              )}
              {subscription.status === 'CANCELED' && (
                <button
                  className="reactivate-button"
                  onClick={handleReactivate}
                  disabled={actionLoading}
                >
                  ✅ Reaktivieren
                </button>
              )}
            </div>
          )}
        </>
      )}

      <ConfirmationDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        title="Subscription upgraden"
        message={
          <div className="upgrade-form">
            <p>Wählen Sie den neuen Tier für {driverName}:</p>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              style={{ padding: '8px 12px', width: '100%', marginTop: '10px' }}
            >
              <option value="PRO">PRO</option>
              <option value="FULLTIME">FULLTIME</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>
        }
        variant="info"
        onConfirm={handleUpgrade}
        onCancel={() => setShowUpgradeDialog(false)}
      />
    </div>
  );
}

