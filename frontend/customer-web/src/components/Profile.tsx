import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './Profile.css';

export function Profile() {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await api.put(`/customers/${user?.id}`, formData);
      updateUser(response.data as Partial<{ name: string; phone: string; address?: string }>);
      setSuccess(t('profile.updateSuccess'));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || t('profile.updateError'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
        <h2>{t('profile.title')}</h2>
        <p style={{ marginTop: '12px', color: '#65676B' }}>
          {t('profile.pleaseLogin')} <Link to="/login" style={{ color: 'var(--primary-500, #1877F2)', textDecoration: 'underline' }}>{t('auth.login')}</Link> {t('profile.toManageProfile')}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>{t('profile.myProfile')}</h1>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>{t('auth.name')}</label>
            <input
              type="text"
              data-testid="profile-name-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="disabled-input"
            />
            <small>{t('profile.emailCannotBeChanged')}</small>
          </div>

          <div className="form-group">
            <label>{t('auth.phone')}</label>
            <input
              type="tel"
              data-testid="profile-phone-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('profile.address')}</label>
            <input
              type="text"
              data-testid="profile-address-input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('auth.addressPlaceholder')}
            />
          </div>

          <button type="submit" data-testid="profile-save-button" disabled={loading} className="save-button">
            {loading ? t('profile.saving') : t('profile.save')}
          </button>
        </form>

        <div className="profile-actions">
          <button onClick={logout} className="logout-button">
            {t('profile.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

