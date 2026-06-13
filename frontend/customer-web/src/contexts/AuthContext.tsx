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

function normalizeAuthPayload(payload: unknown) {
  const data = (payload as { data?: unknown })?.data ?? payload ?? {};
  const normalizedData = data as Record<string, unknown>;
  const accessToken =
    (normalizedData.access_token as string | undefined)
    ?? (normalizedData.accessToken as string | undefined)
    ?? (normalizedData.token as string | undefined)
    ?? null;
  const refreshToken =
    (normalizedData.refresh_token as string | undefined)
    ?? (normalizedData.refreshToken as string | undefined)
    ?? null;
  const user = (normalizedData.user as User | undefined) ?? {
    id: normalizedData.id as string,
    email: normalizedData.email as string,
    name: normalizedData.name as string,
    phone: normalizedData.phone as string,
    address: normalizedData.address as string | undefined,
  };

  return { accessToken, refreshToken, user };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string, address?: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
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

  function updateUser(updates: Partial<User>) {
    setUser((current) => {
      const nextUser = current ? { ...current, ...updates } : (updates as User);
      localStorage.setItem('customer_user', JSON.stringify(nextUser));
      return nextUser;
    });
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
          const storedUserData = JSON.parse(storedUser) as Partial<User> | null;
          const normalized = normalizeAuthPayload(response.data);
          const mergedUser: User = {
            ...(storedUserData ?? {}),
            ...normalized.user,
            address: normalized.user?.address ?? storedUserData?.address,
          } as User;
          
          // Token ist gültig - setze User und Token
          setToken(storedToken);
          setUser(mergedUser);
          localStorage.setItem('customer_user', JSON.stringify(mergedUser));
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

      const { accessToken, user } = normalizeAuthPayload(response.data);
      
      localStorage.setItem('customer_token', accessToken ?? '');
      localStorage.setItem('customer_user', JSON.stringify(user));
      
      setToken(accessToken);
      setUser(user);
      if (api?.defaults?.headers?.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
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

      const { accessToken, user } = normalizeAuthPayload(response.data);
      
      localStorage.setItem('customer_token', accessToken ?? '');
      localStorage.setItem('customer_user', JSON.stringify(user));
      
      setToken(accessToken);
      setUser(user);
      if (api?.defaults?.headers?.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
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
        updateUser,
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
      updateUser: () => {},
      isAuthenticated: false,
      loading: false,
    };
  }
  return context;
}

