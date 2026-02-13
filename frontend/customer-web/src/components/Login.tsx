import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { SocialLogin } from './SocialLogin';
import './Login.css';

export function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(t('auth.loginFailed'));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="fb-logo">🍕 UberFoods</div>
          <h2>{t('auth.login')}</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('auth.emailPlaceholder')}
            />
          </div>

          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('auth.passwordPlaceholder')}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        <div className="auth-divider">
          <span>{t('auth.or') || 'oder'}</span>
        </div>

        <SocialLogin />

        <div className="auth-footer">
          <p>
            {t('auth.noAccount')} <Link to="/register">{t('auth.registerNow')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

