import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import './SubscriptionEditModal.css';

interface SubscriptionEditModalProps {
  subscription: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubscriptionEditModal({
  subscription,
  isOpen,
  onClose,
  onSuccess,
}: SubscriptionEditModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    tier: subscription?.tier || 'BASIC',
    status: subscription?.status || 'ACTIVE',
    trialEndsAt: subscription?.trialEndsAt 
      ? new Date(subscription.trialEndsAt).toISOString().split('T')[0]
      : '',
    customCommissionRate: subscription?.customCommissionRate || '',
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subscription) {
      setFormData({
        tier: subscription.tier || 'BASIC',
        status: subscription.status || 'ACTIVE',
        trialEndsAt: subscription.trialEndsAt 
          ? new Date(subscription.trialEndsAt).toISOString().split('T')[0]
          : '',
        customCommissionRate: subscription.customCommissionRate || '',
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
      });
    }
  }, [subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        tier: formData.tier,
        status: formData.status,
        cancelAtPeriodEnd: formData.cancelAtPeriodEnd,
      };

      if (formData.trialEndsAt) {
        updateData.trialEndsAt = new Date(formData.trialEndsAt).toISOString();
      }

      if (formData.customCommissionRate) {
        updateData.customCommissionRate = parseFloat(formData.customCommissionRate);
      }

      await api.put(`/admin/users/subscriptions/${subscription.driverId}`, updateData);
      showToast('Subscription erfolgreich aktualisiert', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Fehler beim Aktualisieren',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content subscription-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 Subscription bearbeiten</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="subscription-edit-form">
          <div className="form-group">
            <label>
              Fahrer:
              <input
                type="text"
                value={subscription?.driver?.name || ''}
                disabled
                className="form-input"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              Email:
              <input
                type="text"
                value={subscription?.driver?.email || ''}
                disabled
                className="form-input"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              Tier: *
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="form-input"
                required
              >
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
                <option value="FULLTIME">FULLTIME</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </label>
          </div>

          <div className="form-group">
            <label>
              Status: *
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-input"
                required
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIALING">TRIALING</option>
                <option value="PAST_DUE">PAST_DUE</option>
                <option value="CANCELED">CANCELED</option>
                <option value="UNPAID">UNPAID</option>
                <option value="INCOMPLETE">INCOMPLETE</option>
              </select>
            </label>
          </div>

          <div className="form-group">
            <label>
              Trial endet am:
              <input
                type="date"
                value={formData.trialEndsAt}
                onChange={(e) => setFormData({ ...formData, trialEndsAt: e.target.value })}
                className="form-input"
              />
              <small className="form-hint">Leer lassen, um Trial zu entfernen</small>
            </label>
          </div>

          {formData.tier === 'ENTERPRISE' && (
            <div className="form-group">
              <label>
                Custom Commission Rate (0-1):
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.customCommissionRate}
                  onChange={(e) => setFormData({ ...formData, customCommissionRate: e.target.value })}
                  className="form-input"
                  placeholder="z.B. 0.32 für 32%"
                />
                <small className="form-hint">Nur für ENTERPRISE Tier</small>
              </label>
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.cancelAtPeriodEnd}
                onChange={(e) => setFormData({ ...formData, cancelAtPeriodEnd: e.target.checked })}
              />
              Am Periodenende kündigen
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Abbrechen
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Wird gespeichert...' : '💾 Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

