import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../utils/api';
import { logger } from '../utils/logger';
import { Driver } from '../types';
import {
  clearDriverAuthArtifacts,
  DRIVER_AUTH_RESET_EVENT,
  isDriver,
  parseDriverAuthEnvelope,
  readPersistedDriverSession,
} from '../utils/authSession';
import { markDriverSessionActive } from '../utils/api';

// ECHTE JWT-AUTHENTIFIZIERUNG - KEINE MOCK-DATEN MEHR

interface AuthContextType {
  driver: Driver | null;
  token: string | null;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  updateLocation: (lat: number, lng: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearDriverAuthArtifacts();
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setDriver(null);
    setMustChangePassword(false);
  }, []);

  useEffect(() => {
    const handleAuthReset = () => clearSession();
    window.addEventListener(DRIVER_AUTH_RESET_EVENT, handleAuthReset);

    const hydrate = async () => {
      const persisted = readPersistedDriverSession();
      if (!persisted) {
        clearSession();
        setLoading(false);
        return;
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${persisted.accessToken}`;
      try {
        const response = await api.get('/auth/me');
        const serverIdentity = response.data?.data || response.data;
        if (
          !isDriver({ ...persisted.driver, ...serverIdentity }) ||
          serverIdentity.id !== persisted.driver.id ||
          serverIdentity.isActive !== true
        ) {
          throw new Error('Ungültige serverseitige Fahrer-Identität');
        }
        localStorage.setItem('driver_data', JSON.stringify(persisted.driver));
        localStorage.setItem('driver_user', JSON.stringify(persisted.driver));
        setDriver(persisted.driver);
        setToken(persisted.accessToken);
        setMustChangePassword(persisted.driver.mustChangePassword === true);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    void hydrate();
    return () => window.removeEventListener(DRIVER_AUTH_RESET_EVENT, handleAuthReset);
  }, [clearSession]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/driver/login', {
        email,
        password,
      });

      const session = parseDriverAuthEnvelope(response.data);
      markDriverSessionActive();
      localStorage.setItem('driver_token', session.accessToken);
      if (session.refreshToken) {
        localStorage.setItem('driver_refresh_token', session.refreshToken);
      }
      const storedDriver = { ...session.driver, mustChangePassword: session.mustChangePassword };
      localStorage.setItem('driver_data', JSON.stringify(storedDriver));
      localStorage.setItem('driver_user', JSON.stringify(storedDriver));
      
      setToken(session.accessToken);
      setDriver(storedDriver);
      setMustChangePassword(session.mustChangePassword);
      api.defaults.headers.common['Authorization'] = `Bearer ${session.accessToken}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login fehlgeschlagen');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await api.post('/auth/driver/change-password', {
        currentPassword,
        newPassword,
      });
      
      // Aktualisiere mustChangePassword Status
      setMustChangePassword(false);
      if (driver) {
        const updatedDriver = { ...driver, mustChangePassword: false };
        setDriver(updatedDriver);
        localStorage.setItem('driver_user', JSON.stringify(updatedDriver));
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Passwort-Änderung fehlgeschlagen');
    }
  };

  const logout = () => {
    clearSession();
  };

  const updateLocation = useCallback(async (lat: number, lng: number) => {
    if (!driver) return;
    
    try {
      await api.put(`/drivers/${driver.id}/location`, { lat, lng });
      // ✅ WICHTIG: Nur updaten wenn sich der Standort wirklich geändert hat
      setDriver((prevDriver) => {
        if (!prevDriver) return null;
        // Prüfe ob sich der Standort wirklich geändert hat
        const currentLat = prevDriver.location?.lat;
        const currentLng = prevDriver.location?.lng;
        // Runde auf 6 Dezimalstellen für Vergleich (ca. 10cm Genauigkeit)
        const roundedLat = Math.round(lat * 1000000) / 1000000;
        const roundedLng = Math.round(lng * 1000000) / 1000000;
        const roundedCurrentLat = currentLat ? Math.round(currentLat * 1000000) / 1000000 : null;
        const roundedCurrentLng = currentLng ? Math.round(currentLng * 1000000) / 1000000 : null;
        
        if (roundedCurrentLat === roundedLat && roundedCurrentLng === roundedLng) {
          return prevDriver; // Keine Änderung - kein Re-Render
        }
        return { ...prevDriver, location: { lat, lng } };
      });
    } catch (error) {
      logger.error('Fehler beim Aktualisieren des Standorts', 'AuthContext', error);
    }
  }, [driver?.id]); // Nur driver.id als Dependency

  return (
    <AuthContext.Provider
      value={{
        driver,
        token,
        mustChangePassword,
        login,
        logout,
        changePassword,
        isAuthenticated: Boolean(token) && isDriver(driver),
        loading,
        updateLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

