import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  address?: string;
}

interface InitialAuthState {
  user: User | null;
  token: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string, address?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialAuthState }: { children: ReactNode; initialAuthState?: InitialAuthState }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function logout() {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    if (initialAuthState) {
      setUser(initialAuthState.user);
      setToken(initialAuthState.token);
      if (initialAuthState.token && api?.defaults?.headers?.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${initialAuthState.token}`;
        localStorage.setItem('customer_token', initialAuthState.token);
      }
      if (initialAuthState.user) {
        localStorage.setItem('customer_user', JSON.stringify(initialAuthState.user));
      }
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      const storedToken = localStorage.getItem('customer_token');
      const storedUser = localStorage.getItem('customer_user');
      
      if (storedToken && storedUser) {
        try {
          // Prüfe ob Token noch gültig ist
          if (api?.defaults?.headers?.common) {
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          }
          const response = await api.get('/auth/customer/me');
          
          // Token ist gültig - setze User und Token
          setToken(storedToken);
          setUser(response.data);
        } catch (error) {
          // Token ist ungültig oder abgelaufen - entferne ungültige Daten
          localStorage.removeItem('customer_token');
          localStorage.removeItem('customer_user');
      if (api?.defaults?.headers?.common) {
        delete api.defaults.headers.common['Authorization'];
      }
          setToken(null);
          setUser(null);
        }
      } else {
        // Kein Token vorhanden - User ist nicht authentifiziert
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    };
    
    validateToken();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/customer/login', {
        email,
        password,
      });

      const { access_token, ...userData } = response.data;
      
      localStorage.setItem('customer_token', access_token);
      localStorage.setItem('customer_user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      if (api?.defaults?.headers?.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Login fehlgeschlagen');
    }
  };

  const register = async (email: string, password: string, name: string, phone: string, address?: string) => {
    try {
      const response = await api.post('/auth/customer/register', {
        email,
        password,
        name,
        phone,
        address,
      });

      const { access_token, ...userData } = response.data;
      
      localStorage.setItem('customer_token', access_token);
      localStorage.setItem('customer_user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      if (api?.defaults?.headers?.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Registrierung fehlgeschlagen');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!token,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Statt Fehler zu werfen, gib einen Default-Context zurück (für Guest-Modus)
    return {
      user: null,
      token: null,
      login: async () => {},
      register: async () => {},
      logout: () => {},
      isAuthenticated: false,
      loading: false,
    };
  }
  return context;
}

