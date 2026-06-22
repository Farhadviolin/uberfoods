import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { logError } from '../utils/errorReporting';
import './SocialLogin.css';

interface GoogleAuth {
  load: (module: string, callback: () => void) => void;
  auth2: {
    init: (config: { client_id: string; scope?: string }) => void;
    getAuthInstance: () => {
      signIn: () => Promise<{ getAuthResponse: () => { id_token: string } }>;
    };
  };
  accounts: {
    oauth2: {
      initTokenClient: (config: { client_id: string; scope: string; callback: (response: { access_token: string }) => void }) => {
        requestAccessToken: () => void;
      };
    };
  };
}

interface FacebookSDK {
  init: (config: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (response: { authResponse?: { accessToken: string } }) => void, options: { scope: string }) => void;
  api: (path: string, params: Record<string, string>, callback: (userInfo: { id: string; name: string; email?: string; picture?: { data?: { url?: string } } }) => void) => void;
}

declare global {
  interface Window {
    google?: GoogleAuth;
    FB?: FacebookSDK;
    fbAsyncInit?: () => void;
  }
}

export function SocialLogin() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading('google');
    try {
      // Load Google Sign-In script
      if (!window.google) {
        await loadGoogleScript();
      }

      const auth2 = window.google.auth2.getAuthInstance();
      const googleUser = await auth2.signIn();
      const idToken = googleUser.getAuthResponse().id_token;

      // Send to backend
      const response = await api.post('/auth/customer/social-login', {
        provider: 'google',
        token: idToken,
      });

      // Update auth context
      localStorage.setItem('customer_token', response.data.access_token);
      localStorage.setItem('customer_user', JSON.stringify(response.data.user));
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      
      // Trigger login in context
      window.location.reload();
    } catch (error) {
      logError(error, { component: 'SocialLogin', action: 'handleGoogleLogin', metadata: { provider: 'google' } });
      alert(t('auth.socialLoginFailed') || 'Social Login fehlgeschlagen');
    } finally {
      setLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading('facebook');
    try {
      // Load Facebook SDK
      if (!window.FB) {
        await loadFacebookScript();
      }

      window.FB?.login(async (response) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;

          // Get user info
          window.FB?.api('/me', { fields: 'id,name,email,picture' }, async (userInfo) => {
            try {
              const backendResponse = await api.post('/auth/customer/social-login', {
                provider: 'facebook',
                token: accessToken,
                name: userInfo.name,
                picture: userInfo.picture?.data?.url,
              });

              localStorage.setItem('customer_token', backendResponse.data.access_token);
              localStorage.setItem('customer_user', JSON.stringify(backendResponse.data.user));
              api.defaults.headers.common['Authorization'] = `Bearer ${backendResponse.data.access_token}`;
              
              window.location.reload();
            } catch (error) {
              logError(error, { component: 'SocialLogin', action: 'handleFacebookLogin', metadata: { provider: 'facebook' } });
              alert(t('auth.socialLoginFailed') || 'Social Login fehlgeschlagen');
            } finally {
              setLoading(null);
            }
          });
        } else {
          setLoading(null);
        }
      }, { scope: 'email,public_profile' });
    } catch (error) {
      logError(error, { component: 'SocialLogin', action: 'handleFacebookLogin', metadata: { provider: 'facebook' } });
      setLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setLoading('apple');
    try {
      // Apple Sign-In (requires Apple Developer Account)
      // This is a simplified version - in production, use @apple/sign-in-button
      alert(t('auth.appleLoginNotAvailable') || 'Apple Login ist derzeit nicht verfügbar');
      setLoading(null);
    } catch (error) {
      logError(error, { component: 'SocialLogin', action: 'handleAppleLogin', metadata: { provider: 'apple' } });
      setLoading(null);
    }
  };

  return (
    <div className="social-login">
      <button
        onClick={handleGoogleLogin}
        disabled={loading !== null}
        className="social-btn google"
        type="button"
      >
        {loading === 'google' ? '...' : '🔵 Google'}
      </button>
      <button
        onClick={handleFacebookLogin}
        disabled={loading !== null}
        className="social-btn facebook"
        type="button"
      >
        {loading === 'facebook' ? '...' : '📘 Facebook'}
      </button>
      <button
        onClick={handleAppleLogin}
        disabled={loading !== null}
        className="social-btn apple"
        type="button"
      >
        {loading === 'apple' ? '...' : '🍎 Apple'}
      </button>
    </div>
  );
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/platform.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (clientId) {
        window.google.load('auth2', () => {
          window.google.auth2.init({
            client_id: clientId,
          });
          resolve();
        });
      } else {
        resolve();
      }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadFacebookScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
      if (appId) {
        window.FB?.init({
          appId,
          cookie: true,
          xfbml: true,
          version: 'v18.0',
        });
      }
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

