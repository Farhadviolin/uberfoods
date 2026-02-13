import { useState, memo, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import './PasswordReset.css';

interface PasswordResetProps {
  onClose: () => void;
  onSuccess?: () => void;
}

function PasswordResetInner({ onClose, onSuccess }: PasswordResetProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      showToast('Passwort-Reset-Link wurde an Ihre E-Mail gesendet!', 'success');
      setStep('reset');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Fehler beim Senden des Reset-Links';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [email, showToast]);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    if (newPassword.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      showToast('Passwort erfolgreich zurückgesetzt!', 'success');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Fehler beim Zurücksetzen des Passworts';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, newPassword, confirmPassword, showToast, onSuccess, onClose]);

  return (
    <div className="password-reset">
      <h2>Passwort zurücksetzen</h2>

      {step === 'email' ? (
        <form onSubmit={handleRequestReset}>
          <div className="form-group">
            <label>E-Mail-Adresse</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.com"
              required
              disabled={loading}
            />
            <p className="form-hint">
              Wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
            </p>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Wird gesendet...' : 'Reset-Link senden'}
            </button>
            <button type="button" className="secondary" onClick={onClose} disabled={loading}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label>Reset-Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token aus E-Mail"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Neues Passwort</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Passwort bestätigen</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Wird zurückgesetzt...' : 'Passwort zurücksetzen'}
            </button>
            <button type="button" className="secondary" onClick={onClose} disabled={loading}>
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export const PasswordReset = memo(PasswordResetInner);

