import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import api from '../utils/api';
import { config } from '../config';
import { clearAuthData, getAccessToken, getRefreshToken, getStoredUser, setAuthData, StoredUser } from '../utils/tokenStorage';
import { logger } from '../utils/logger';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Session Timeout: 30 Minuten Inaktivität
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minuten

  const setupSessionTimeout = () => {
    // Clear existing timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      logout();
      alert('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
    }, SESSION_TIMEOUT_MS);

    setSessionTimeout(timeout);
  };

  const resetSessionTimeout = () => {
    setupSessionTimeout();
  };

  // Reset timeout on user activity
  useEffect(() => {
    if (token) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      const resetTimeout = () => resetSessionTimeout();

      events.forEach(event => {
        document.addEventListener(event, resetTimeout, { passive: true });
      });

      setupSessionTimeout();

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, resetTimeout);
        });
        if (sessionTimeout) {
          clearTimeout(sessionTimeout);
        }
      };
    }
  }, [token]); // sessionTimeout wird in setupSessionTimeout verwendet

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    const storedRefreshToken = getRefreshToken();
    if (!storedRefreshToken) {
      return false;
    }

    try {
      const response = await api.post('/auth/refresh', {
        refresh_token: storedRefreshToken,
      });

      const { access_token, refresh_token: newRefreshToken, ...userData } = response.data;

      setAuthData({ accessToken: access_token, refreshToken: newRefreshToken ?? storedRefreshToken, user: userData });
      setToken(access_token);
      setUser(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      resetSessionTimeout();
      return true;
    } catch (error) {
      // Refresh failed - logout
      logout();
      return false;
    }
  }, []);

  useEffect(() => {
    // KRITISCH: Auto-Login NUR in Development und NUR wenn explizit aktiviert
    // In Production wird dies IMMER blockiert, auch wenn VITE_SKIP_AUTH gesetzt ist
    // STANDARD: Auto-Login ist DEAKTIVIERT - muss explizit mit VITE_SKIP_AUTH=true aktiviert werden
    const skipAuthEnabled = import.meta.env.VITE_SKIP_AUTH === 'true';
    const isDevelopment = config.isDevelopment && !config.isProduction;
    
    // Auto-Login nur wenn explizit aktiviert UND in Development
    if (isDevelopment && skipAuthEnabled) {
      // Auto-Login: Setze Dummy-User ohne Authentifizierung
      // Verwendet dev-token-no-auth-required für Development-Modus im Backend
      logger.warn('⚠️ Development-Modus aktiviert - VITE_SKIP_AUTH=true');
      logger.warn('⚠️ In Production wird dieser Modus automatisch deaktiviert!');
      
      const devToken = import.meta.env.VITE_DEV_AUTH_TOKEN;
      if (!devToken) {
        logger.error('❌ SECURITY: VITE_DEV_AUTH_TOKEN fehlt - Auto-Login deaktiviert');
        setLoading(false);
        return;
      }

      const dummyUser: User = {
        id: 'admin-1',
        email: 'admin@UberFoods.com',
        name: 'Admin',
        role: 'admin',
      };
      
      setUser(dummyUser);
      setToken(devToken);
      setAuthData({ accessToken: devToken, refreshToken: null, user: dummyUser });
      
      // WICHTIG: Setze Authorization Header für API-Requests
      api.defaults.headers.common['Authorization'] = `Bearer ${devToken}`;
      
      setLoading(false);
    } else if (config.isProduction && skipAuthEnabled) {
      // KRITISCH: In Production niemals Auto-Login erlauben
      logger.error('❌ SECURITY ERROR: VITE_SKIP_AUTH ist in Production aktiviert!');
      logger.error('❌ Auto-Login wird in Production blockiert!');
      // Setze loading auf false, damit User normal einloggen kann
      setLoading(false);
    } else {
      // Standard-Verhalten: Versuche gespeicherten Token zu verwenden (nur wenn gültig)
      const storedToken = getAccessToken();
      const storedUser = getStoredUser();
      
      if (storedToken && storedUser) {
        try {
          const userData = storedUser as StoredUser;
          setToken(storedToken);
          setUser(userData);
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          resetSessionTimeout();
          
          // In Production: Validiere Token mit Backend
          if (config.isProduction) {
            // Token-Validierung wird beim ersten API-Call automatisch geprüft
            // Bei 401 wird der User automatisch ausgeloggt
          }
        } catch (error) {
          // Invalid stored data - clear it
          clearAuthData();
        }
      } else {
        // Kein gespeicherter Token - User muss sich einloggen
        // Stelle sicher, dass alle Auth-Daten gelöscht sind
        clearAuthData();
      }
      
      setLoading(false);
    }
  }, []); // Nur einmal beim Mount ausführen

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { access_token, refresh_token, ...userData } = response.data;
      
      setAuthData({ accessToken: access_token, refreshToken: refresh_token ?? null, user: userData });
      setRefreshToken(refresh_token ?? null);
      setToken(access_token);
      setUser(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      resetSessionTimeout();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login fehlgeschlagen');
    }
  }, [resetSessionTimeout]);

  const logout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
    clearAuthData();
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, [sessionTimeout]);

  const contextValue = useMemo(() => ({
    user,
    token,
    refreshToken,
    login,
    logout,
    refreshAuth,
    isAuthenticated: Boolean(token),
    loading,
  }), [user, token, refreshToken, login, logout, refreshAuth, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return safe defaults instead of throwing to prevent hook order issues
    // This prevents "Rendered fewer hooks than expected" errors
    logger.warn('useAuth must be used within an AuthProvider, returning defaults');
    return {
      user: null,
      token: null,
      refreshToken: null,
      login: async () => {
        throw new Error('AuthProvider not available');
      },
      logout: () => {},
      refreshAuth: async () => false,
      isAuthenticated: false,
      loading: false,
    };
  }
  return context;
}

