import { useState } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { ConfirmationDialog } from './ConfirmationDialog';
import './DriverPasswordReset.css';

interface DriverPasswordResetProps {
  driverId: string;
  driverEmail: string;
  onClose: () => void;
}

export function DriverPasswordReset({ driverId, driverEmail, onClose }: DriverPasswordResetProps) {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [resetMethod, setResetMethod] = useState<'email' | 'temporary'>('email');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const canReset = hasPermission('driver:update') || hasPermission('driver:*');

  const handlePasswordReset = async () => {
    if (!canReset) {
      showToast('Keine Berechtigung zum Zurücksetzen von Passwörtern', 'error');
      return;
    }

    setLoading(true);
    try {
      if (resetMethod === 'email') {
        await api.post(`/admin/drivers/${driverId}/reset-password`, {
          method: 'email',
        });
        showToast('Passwort-Reset-Link wurde per E-Mail gesendet', 'success');
        onClose();
      } else {
        const response = await api.post(`/admin/drivers/${driverId}/reset-password`, {
          method: 'temporary',
        });
        setTemporaryPassword(response.data.temporaryPassword);
        showToast('Temporäres Passwort wurde generiert', 'success');
      }
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err.response as any)?.data?.message || 'Fehler beim Zurücksetzen des Passworts'
        : 'Fehler beim Zurücksetzen des Passworts';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!canReset) {
    return (
      <div className="driver-password-reset-no-permission">
        <p>Keine Berechtigung zum Zurücksetzen von Passwörtern</p>
      </div>
    );
  }

  return (
    <div className="driver-password-reset">
      <div className="driver-password-reset-header">
        <h2>🔐 Passwort zurücksetzen</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      <div className="driver-password-reset-info">
        <p>Fahrer: <strong>{driverEmail}</strong></p>
      </div>

      <div className="reset-method-selection">
        <label>
          <input
            type="radio"
            value="email"
            checked={resetMethod === 'email'}
            onChange={(e) => setResetMethod(e.target.value as 'email')}
          />
          <span>Reset-Link per E-Mail senden</span>
        </label>
        <label>
          <input
            type="radio"
            value="temporary"
            checked={resetMethod === 'temporary'}
            onChange={(e) => setResetMethod(e.target.value as 'temporary')}
          />
          <span>Temporäres Passwort generieren</span>
        </label>
      </div>

      {temporaryPassword && (
        <div className="temporary-password-display">
          <h3>⚠️ WICHTIG: Temporäres Passwort</h3>
          <div className="password-box">
            <code>{temporaryPassword}</code>
            <button
              className="copy-button"
              onClick={() => {
                navigator.clipboard.writeText(temporaryPassword);
                showToast('Passwort in Zwischenablage kopiert', 'success');
              }}
            >
              📋 Kopieren
            </button>
          </div>
          <p className="password-warning">
            Bitte geben Sie dieses Passwort dem Fahrer weiter. Der Fahrer sollte es beim nächsten Login ändern.
          </p>
        </div>
      )}

      <div className="reset-actions">
        <button
          className="reset-button"
          onClick={() => setShowConfirmDialog(true)}
          disabled={loading}
        >
          {loading ? 'Wird verarbeitet...' : 'Passwort zurücksetzen'}
        </button>
        <button className="cancel-button" onClick={onClose}>
          Abbrechen
        </button>
      </div>

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title="Passwort zurücksetzen"
        message={`Möchten Sie das Passwort für ${driverEmail} wirklich zurücksetzen?`}
        variant="warning"
        onConfirm={() => {
          setShowConfirmDialog(false);
          handlePasswordReset();
        }}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}

