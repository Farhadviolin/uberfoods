import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api from "../utils/api";
import { config } from "../config";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  restaurantId?: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  restaurantId: string | null;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface InitialAuthState {
  user: User | null;
  token: string | null;
  restaurantId?: string | null;
  mustChangePassword?: boolean;
}

export function AuthProvider({
  children,
  initialAuthState,
}: {
  children: ReactNode;
  initialAuthState?: InitialAuthState;
}) {
  const [user, setUser] = useState<User | null>(() => {
    if (initialAuthState?.user) return initialAuthState.user;
    const stored = localStorage.getItem("restaurant_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (initialAuthState?.token) return initialAuthState.token;
    return localStorage.getItem("restaurant_token");
  });
  const [restaurantId, setRestaurantId] = useState<string | null>(() => {
    if (initialAuthState?.restaurantId) return initialAuthState.restaurantId;
    if (initialAuthState?.user?.restaurantId)
      return initialAuthState.user.restaurantId;
    return localStorage.getItem("restaurant_id");
  });
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialisierung: Echte Authentifizierung - KEINE Demo-Werte mehr
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    // Test/Storybook: initialAuthState überschreibt LocalStorage
    if (initialAuthState) {
      const { user, token, restaurantId, mustChangePassword } =
        initialAuthState;
      setUser(user);
      setToken(token);
      setRestaurantId(restaurantId ?? user?.restaurantId ?? null);
      setMustChangePassword(Boolean(mustChangePassword));
      if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        localStorage.setItem("restaurant_token", token);
      }
      if (restaurantId ?? user?.restaurantId) {
        localStorage.setItem(
          "restaurant_id",
          restaurantId ?? user?.restaurantId ?? "",
        );
      }
      if (user) {
        localStorage.setItem("restaurant_user", JSON.stringify(user));
      }
      setLoading(false);
      return;
    }

    // Production oder Development ohne Skip-Auth: Versuche gespeicherten Token zu verwenden
    const storedToken = localStorage.getItem("restaurant_token");
    const storedUser = localStorage.getItem("restaurant_user");
    const storedRestaurantId = localStorage.getItem("restaurant_id");

    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        setRestaurantId(storedRestaurantId || userData.id);
        api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;

        // In Production: Validiere Token mit Backend
        if (config.isProduction) {
          // Token-Validierung wird beim ersten API-Call automatisch geprüft
          // Bei 401 wird der User automatisch ausgeloggt
        }
      } catch (error) {
        // Invalid stored data - clear it
        localStorage.removeItem("restaurant_token");
        localStorage.removeItem("restaurant_user");
        localStorage.removeItem("restaurant_id");
      }
    }

    setLoading(false);
  }, [initialAuthState, token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/restaurant/login", {
        email,
        password,
      });

      const {
        access_token,
        mustChangePassword: mustChange,
        ...userData
      } = response.data;
      const restaurantId = userData.id;
      const needsPasswordChange = mustChange === true;

      localStorage.setItem("restaurant_token", access_token);
      localStorage.setItem(
        "restaurant_user",
        JSON.stringify({
          ...userData,
          mustChangePassword: needsPasswordChange,
        }),
      );
      localStorage.setItem("restaurant_id", restaurantId);

      setToken(access_token);
      setUser({ ...userData, mustChangePassword: needsPasswordChange });
      setRestaurantId(restaurantId);
      setMustChangePassword(needsPasswordChange);
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login fehlgeschlagen");
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    try {
      await api.post("/auth/restaurant/change-password", {
        currentPassword,
        newPassword,
      });

      // Aktualisiere mustChangePassword Status
      setMustChangePassword(false);
      if (user) {
        const updatedUser = { ...user, mustChangePassword: false };
        setUser(updatedUser);
        localStorage.setItem("restaurant_user", JSON.stringify(updatedUser));
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Passwort-Änderung fehlgeschlagen",
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("restaurant_token");
    localStorage.removeItem("restaurant_user");
    localStorage.removeItem("restaurant_id");
    delete api.defaults.headers.common["Authorization"];

    // Vollständig ausloggen - KEINE Demo-Werte mehr
    setUser(null);
    setToken(null);
    setRestaurantId(null);
    setMustChangePassword(false);
  };

  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        restaurantId,
        mustChangePassword,
        login,
        logout,
        changePassword,
        isAuthenticated,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
