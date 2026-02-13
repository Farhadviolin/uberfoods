import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Modal } from './Modal';
import { PasswordReset } from './PasswordReset';
import './Login.css';

function LoginInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-Focus auf Email-Feld beim Laden
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🍕 UberFoods Admin</h1>
        <p>Bitte melden Sie sich an</p>
        
        {error && (
          <div className="error-message" role="alert" aria-live="polite" data-testid="login-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} aria-label="Login-Formular">
          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              name="email"
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={handleEmailChange}
              onFocus={(e) => e.target.select()}
              placeholder="admin@uberfoods.com"
              required
              disabled={loading}
              autoComplete="email"
              style={{ 
                pointerEvents: loading ? 'none' : 'auto',
                opacity: loading ? 0.6 : 1
              }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onFocus={(e) => e.target.select()}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
              style={{ 
                pointerEvents: loading ? 'none' : 'auto',
                opacity: loading ? 0.6 : 1
              }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="login-button"
            aria-busy={loading}
            aria-label={loading ? 'Wird geladen...' : 'Anmelden'}
          >
            {loading ? 'Wird geladen...' : 'Anmelden'}
          </button>
          
          <button
            type="button"
            onClick={() => setShowPasswordReset(true)}
            className="forgot-password-link"
            disabled={loading}
          >
            Passwort vergessen?
          </button>
        </form>
      </div>

      <Modal
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        title="Passwort zurücksetzen"
        size="small"
      >
        <PasswordReset
          onClose={() => setShowPasswordReset(false)}
          onSuccess={() => {
            setShowPasswordReset(false);
            showToast('Bitte melden Sie sich mit Ihrem neuen Passwort an.', 'success');
          }}
        />
      </Modal>
    </div>
  );
}

export const Login = memo(LoginInner);

