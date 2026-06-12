import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../utils/api';
import { logger } from '../utils/logger';
import { Driver } from '../types';

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

  useEffect(() => {
    // ECHTE JWT-AUTHENTIFIZIERUNG - Token aus localStorage laden
    const storedToken = localStorage.getItem('driver_token');
    const storedDriver = localStorage.getItem('driver_data') || localStorage.getItem('driver_user');

    if (storedToken && storedDriver) {
      try {
        const driverData = JSON.parse(storedDriver);
        setDriver(driverData);
        setToken(storedToken);
        // Token in API-Headers setzen
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        localStorage.setItem('driver_data', JSON.stringify(driverData));
        localStorage.setItem('driver_user', JSON.stringify(driverData));
      } catch (error) {
        logger.error('Fehler beim Laden der gespeicherten Auth-Daten', 'AuthContext', error);
        localStorage.removeItem('driver_token');
        localStorage.removeItem('driver_data');
        localStorage.removeItem('driver_user');
      }
    }

    setLoading(false);
  }, []);

  const validateToken = async (token: string) => {
    try {
      // Versuche Profil abzurufen um Token zu validieren
      const response = await api.get('/drivers/me');
      setDriver(response.data);
      localStorage.setItem('driver_user', JSON.stringify(response.data));
    } catch (error: any) {
      // Token ungültig - entferne Session
      logger.error('Token-Validierung fehlgeschlagen', 'AuthContext', error);
      localStorage.removeItem('driver_token');
      localStorage.removeItem('driver_user');
      delete api.defaults.headers.common['Authorization'];
      setToken(null);
      setDriver(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/driver/login', {
        email,
        password,
      });

      const { access_token, refresh_token, mustChangePassword: mustChange, ...driverData } = response.data;
      const needsPasswordChange = mustChange === true;
      
      localStorage.setItem('driver_token', access_token);
      if (refresh_token) {
        localStorage.setItem('driver_refresh_token', refresh_token);
      }
      const storedDriver = { ...driverData, mustChangePassword: needsPasswordChange };
      localStorage.setItem('driver_data', JSON.stringify(storedDriver));
      localStorage.setItem('driver_user', JSON.stringify(storedDriver));
      
      setToken(access_token);
      setDriver(storedDriver as Driver);
      setMustChangePassword(needsPasswordChange);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
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
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_refresh_token');
    localStorage.removeItem('driver_data');
    localStorage.removeItem('driver_user');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setDriver(null);
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
        isAuthenticated: !!token,
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

