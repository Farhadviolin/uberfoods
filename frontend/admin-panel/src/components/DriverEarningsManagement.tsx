import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { usePermissions } from '../hooks/usePermissions';
import { ConfirmationDialog } from './ConfirmationDialog';
import { extractErrorMessage, isAxiosErrorResponse } from '../utils/errorHandler';
import { devError } from '../utils/errorLogger';
import './DriverEarningsManagement.css';

interface EarningsData {
  today: number;
  week: number;
  month: number;
  total: number;
  pendingPayouts: number;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedAt: string;
  processedAt?: string;
}

interface DriverEarningsManagementProps {
  driverId: string;
  driverName: string;
  onClose: () => void;
}

export function DriverEarningsManagement({ driverId, driverName, onClose }: DriverEarningsManagementProps) {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    amount: '',
    reason: '',
    type: 'bonus' as 'bonus' | 'deduction' | 'adjustment',
  });

  const canManage = hasPermission('driver:update') || hasPermission('financial:*');
  const canView = hasPermission('driver:read') || hasPermission('financial:read');

  useEffect(() => {
    if (driverId && canView) {
      fetchEarnings();
      fetchPayoutRequests();
    }
  }, [driverId, canView]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/drivers/${driverId}/earnings?period=month`).catch(() => ({
        data: {
          today: 0,
          week: 0,
          month: 0,
          total: 0,
          pendingPayouts: 0,
        },
      }));
      setEarnings(response.data);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutRequests = async () => {
    try {
      const response = await api.get(`/drivers/${driverId}/payouts/requests`).catch(() => ({
        data: { requests: [] },
      }));
      setPayoutRequests(response.data.requests || []);
    } catch (err: unknown) {
      // Error wird bereits durch errorHandler behandelt
      devError('Error fetching payout requests:', err);
    }
  };

  const handleAdjustEarnings = async () => {
    if (!adjustForm.amount || !adjustForm.reason) {
      showToast('Bitte füllen Sie alle Felder aus', 'error');
      return;
    }

    try {
      // Map frontend types to backend types
      const backendType = adjustForm.type === 'deduction' ? 'penalty' : adjustForm.type === 'adjustment' ? 'correction' : 'bonus';
      
      await api.post(`/admin/financial/adjust-driver-balance`, {
        driverId,
        amount: parseFloat(adjustForm.amount),
        reason: adjustForm.reason,
        type: backendType,
      });
      showToast('Verdienst erfolgreich angepasst', 'success');
      setShowAdjustDialog(false);
      setAdjustForm({ amount: '', reason: '', type: 'bonus' });
      fetchEarnings();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleProcessPayout = async (requestId: string) => {
    try {
      await api.post(`/admin/financial/payouts/${requestId}/process`, {
        driverId,
      }).catch(async (err: unknown) => {
        // Fallback to old endpoint if new one doesn't exist
        if (isAxiosErrorResponse(err) && err.response?.status === 404) {
          const request = payoutRequests.find(r => r.id === requestId);
          if (request) {
            await api.post('/admin/financial/process-payout', {
              driverId,
              amount: request.amount,
              priority: 'normal',
            });
          }
        } else {
          throw err;
        }
      });
      showToast('Auszahlung erfolgreich verarbeitet', 'success');
      fetchPayoutRequests();
      fetchEarnings();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  if (!canView) {
    return (
      <div className="driver-earnings-no-permission">
        <p>Keine Berechtigung zum Anzeigen von Verdiensten</p>
      </div>
    );
  }

  return (
    <div className="driver-earnings-management">
      <div className="earnings-header">
        <h2>💰 Verdienst-Verwaltung: {driverName}</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      {loading ? (
        <LoadingSpinner text="Verdienste werden geladen..." />
      ) : (
        <>
          {earnings && (
            <div className="earnings-overview">
              <div className="earnings-card">
                <h3>Heute</h3>
                <div className="earnings-value">€{earnings.today.toFixed(2)}</div>
              </div>
              <div className="earnings-card">
                <h3>Diese Woche</h3>
                <div className="earnings-value">€{earnings.week.toFixed(2)}</div>
              </div>
              <div className="earnings-card">
                <h3>Dieser Monat</h3>
                <div className="earnings-value">€{earnings.month.toFixed(2)}</div>
              </div>
              <div className="earnings-card total">
                <h3>Gesamt</h3>
                <div className="earnings-value">€{earnings.total.toFixed(2)}</div>
              </div>
              <div className="earnings-card pending">
                <h3>Ausstehend</h3>
                <div className="earnings-value">€{earnings.pendingPayouts.toFixed(2)}</div>
              </div>
            </div>
          )}

          {canManage && (
            <div className="earnings-actions">
              <button
                className="adjust-button"
                onClick={() => setShowAdjustDialog(true)}
              >
                ➕ Verdienst anpassen
              </button>
            </div>
          )}

          <div className="payout-requests-section">
            <h3>💰 Auszahlungsanfragen</h3>
            {payoutRequests.length === 0 ? (
              <div className="no-payouts">
                <p>Keine ausstehenden Auszahlungsanfragen</p>
              </div>
            ) : (
              <table className="payouts-table">
                <thead>
                  <tr>
                    <th>Betrag</th>
                    <th>Status</th>
                    <th>Angefragt</th>
                    <th>Verarbeitet</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRequests.map((request) => (
                    <tr key={request.id}>
                      <td>€{request.amount.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge status-${request.status}`}>
                          {request.status === 'pending' && '⏳ Ausstehend'}
                          {request.status === 'approved' && '✅ Genehmigt'}
                          {request.status === 'rejected' && '❌ Abgelehnt'}
                          {request.status === 'processed' && '✅ Verarbeitet'}
                        </span>
                      </td>
                      <td>{new Date(request.requestedAt).toLocaleDateString('de-DE')}</td>
                      <td>
                        {request.processedAt
                          ? new Date(request.processedAt).toLocaleDateString('de-DE')
                          : '-'}
                      </td>
                      <td>
                        {request.status === 'pending' && canManage && (
                          <button
                            className="process-button"
                            onClick={() => handleProcessPayout(request.id)}
                          >
                            ✅ Verarbeiten
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <ConfirmationDialog
        isOpen={showAdjustDialog}
        onClose={() => setShowAdjustDialog(false)}
        title="Verdienst anpassen"
        message={
          <div className="adjust-form">
            <div className="form-group">
              <label>Typ:</label>
              <select
                value={adjustForm.type}
                onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as any })}
              >
                <option value="bonus">Bonus</option>
                <option value="deduction">Abzug</option>
                <option value="adjustment">Anpassung</option>
              </select>
            </div>
            <div className="form-group">
              <label>Betrag (€):</label>
              <input
                type="number"
                step="0.01"
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Grund:</label>
              <textarea
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="Grund für die Anpassung..."
                rows={3}
              />
            </div>
          </div>
        }
        variant="info"
        onConfirm={handleAdjustEarnings}
        onCancel={() => {
          setShowAdjustDialog(false);
          setAdjustForm({ amount: '', reason: '', type: 'bonus' });
        }}
      />
    </div>
  );
}

