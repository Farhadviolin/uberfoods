import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './ChangePassword.css';

export function ChangePassword() {
  const { changePassword } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push(t('password.requirement.minLength'));
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t('password.requirement.uppercase'));
    }
    if (!/[a-z]/.test(password)) {
      errors.push(t('password.requirement.lowercase'));
    }
    if (!/[0-9]/.test(password)) {
      errors.push(t('password.requirement.number'));
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validierung
    const validationErrors: { [key: string]: string } = {};

    if (!currentPassword) {
      validationErrors.currentPassword = t('password.currentRequired');
    }

    if (!newPassword) {
      validationErrors.newPassword = t('password.newRequired');
    } else {
      const passwordErrors = validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        validationErrors.newPassword = passwordErrors.join(', ');
      }
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword = t('password.confirmRequired');
    } else if (newPassword !== confirmPassword) {
      validationErrors.confirmPassword = t('password.mismatch');
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast(t('password.changeSuccess'), 'success');
      // Formular zurücksetzen
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(errorMessage || t('password.changeFailed'), 'error');
      if (errorMessage.includes('Aktuelles Passwort') || errorMessage.includes('current password')) {
        setErrors({ currentPassword: t('password.currentIncorrect') });
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordRequirements = [
    t('password.requirement.minLength'),
    t('password.requirement.uppercase'),
    t('password.requirement.lowercase'),
    t('password.requirement.number'),
  ];

  return (
    <div className="change-password-overlay">
      <div className="change-password-modal">
        <div className="change-password-header">
          <h2>{t('password.changeRequired')}</h2>
          <p>{t('password.changeReason')}</p>
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="form-group">
            <label>{t('password.current')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`fb-input ${errors.currentPassword ? 'error' : ''}`}
              placeholder={t('password.current')}
              required
              disabled={loading}
            />
            {errors.currentPassword && (
              <span className="error-message">{errors.currentPassword}</span>
            )}
          </div>

          <div className="form-group">
            <label>{t('password.new')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`fb-input ${errors.newPassword ? 'error' : ''}`}
              placeholder={t('password.new')}
              required
              disabled={loading}
            />
            {errors.newPassword && (
              <span className="error-message">{errors.newPassword}</span>
            )}
            <div className="password-requirements">
              <p>{t('password.requirements')}:</p>
              <ul>
                {passwordRequirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label>{t('password.confirm')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`fb-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder={t('password.confirm')}
              required
              disabled={loading}
            />
            {errors.confirmPassword && (
              <span className="error-message">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="fb-button"
            disabled={loading}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {loading ? t('password.changing') : t('password.change')}
          </button>
        </form>
      </div>
    </div>
  );
}

