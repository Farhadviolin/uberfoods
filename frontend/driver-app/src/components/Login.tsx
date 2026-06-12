import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { webauthnService } from '../services/webauthnService';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const passkeySupported = webauthnService.isSupported();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // Navigation wird automatisch durch Route Guard gehandhabt
      navigate('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasskey = async () => {
    if (!passkeySupported) {
      setError(t('login.passkey.notSupported'));
      return;
    }
    setError(null);
    await webauthnService.startAuthentication();
    alert(t('login.passkey.comingSoon'));
  };

  // Aktiviere UberEats Theme für Login
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', 'uber-eats');
    document.body.style.backgroundColor = '#000000';
  }

  return (
    <div className="login-container">
      <div className="login-card" aria-labelledby="login-title">
        <div className="login-header">
          <h1 id="login-title" data-testid="login-title">{t('login.title')}</h1>
          <p data-testid="login-subtitle">{t('login.subtitle')}</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form" data-testid="login-form">
          <div className="form-group">
            <label htmlFor="email">{t('login.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('login.placeholder.email')}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">{t('login.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('login.placeholder.password')}
            />
          </div>
          
          <button type="submit" disabled={loading} className="login-button">
            {loading ? t('login.loading') : t('login.submit')}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handlePasskey}
            disabled={loading}
            aria-disabled={!passkeySupported}
            title={passkeySupported ? '' : t('login.passkey.notSupported')}
          >
            {t('login.passkey.label')}
          </button>
        </form>
      </div>
    </div>
  );
}

