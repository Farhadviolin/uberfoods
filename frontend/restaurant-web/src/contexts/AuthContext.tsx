import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import api from "../utils/api";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readStoredUser(): User | null {
  const stored = localStorage.getItem("restaurant_user");
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    return isRecord(parsed) ? (parsed as unknown as User) : null;
  } catch {
    return null;
  }
}

function unwrapApiResponse(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    throw new Error("Ungültige Auth-Antwort.");
  }

  if ("success" in payload) {
    if (payload.success !== true || !isRecord(payload.data)) {
      throw new Error("Ungültige Auth-Antwort.");
    }
    return payload.data;
  }

  return payload;
}

function normalizeRestaurantUser(
  payload: Record<string, unknown>,
  fallback?: User | null,
): User {
  const candidate = isRecord(payload.user) ? payload.user : payload;
  const id = typeof candidate.id === "string"
    ? candidate.id
    : typeof candidate.sub === "string"
      ? candidate.sub
      : fallback?.id;
  const email = typeof candidate.email === "string" ? candidate.email : fallback?.email;
  const role = typeof candidate.role === "string" ? candidate.role : fallback?.role;
  if (!id || !email || !role || !["restaurant", "restaurant_owner"].includes(role.toLowerCase())) {
    throw new Error("Ungültige Restaurant-Session.");
  }

  return {
    id,
    email,
    role,
    name: typeof candidate.name === "string" ? candidate.name : fallback?.name ?? "",
    ...(typeof candidate.restaurantId === "string" ? { restaurantId: candidate.restaurantId } : {}),
    ...(candidate.mustChangePassword === true || fallback?.mustChangePassword === true
      ? { mustChangePassword: true }
      : {}),
  };
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
    return readStoredUser();
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
  const initializationStarted = useRef(false);
  const mountedRef = useRef(true);

  // Initialisierung: Echte Authentifizierung - KEINE Demo-Werte mehr
  useEffect(() => {
    mountedRef.current = true;
    if (initializationStarted.current) {
      return () => {
        mountedRef.current = false;
      };
    }
    initializationStarted.current = true;

    const clearStoredSession = () => {
      localStorage.removeItem("restaurant_token");
      localStorage.removeItem("restaurant_user");
      localStorage.removeItem("restaurant_id");
      delete api.defaults.headers.common["Authorization"];
      if (mountedRef.current) {
        setUser(null);
        setToken(null);
        setRestaurantId(null);
        setMustChangePassword(false);
      }
    };

    const initialize = async () => {
      // Test/Storybook: initialAuthState überschreibt LocalStorage
      if (initialAuthState) {
        const { user, token: initialToken, restaurantId, mustChangePassword } =
          initialAuthState;
        setUser(user);
        setToken(initialToken);
        setRestaurantId(restaurantId ?? user?.restaurantId ?? null);
        setMustChangePassword(Boolean(mustChangePassword));
        if (initialToken) {
          api.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
          localStorage.setItem("restaurant_token", initialToken);
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
        if (mountedRef.current) setLoading(false);
        return;
      }

      // Production oder Development ohne Skip-Auth: gespeicherte Session laden
      // und vor dem Anzeigen der geschützten Shell über den Auth-/Me-Vertrag prüfen.
      const storedToken = localStorage.getItem("restaurant_token");
      const storedUser = localStorage.getItem("restaurant_user");
      const storedRestaurantId = localStorage.getItem("restaurant_id");

      if (!storedToken || !storedUser) {
        clearStoredSession();
        if (mountedRef.current) setLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser);
        if (!isRecord(parsedUser)) throw new Error("Ungültige Restaurant-Session.");

        api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        const response = await api.get("/auth/me");
        const validatedUser = normalizeRestaurantUser(
          unwrapApiResponse(response.data),
          parsedUser as unknown as User,
        );
        const validatedRestaurantId =
          storedRestaurantId || validatedUser.restaurantId || validatedUser.id;

        if (!mountedRef.current) return;
        setToken(storedToken);
        setUser(validatedUser);
        setRestaurantId(validatedRestaurantId);
        setMustChangePassword(Boolean(validatedUser.mustChangePassword));
        localStorage.setItem("restaurant_user", JSON.stringify(validatedUser));
        localStorage.setItem("restaurant_id", validatedRestaurantId);
      } catch (_error) {
        clearStoredSession();
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    void initialize();
    return () => {
      mountedRef.current = false;
    };
  }, [initialAuthState]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/restaurant/login", {
        email,
        password,
      });

      const payload = unwrapApiResponse(response.data);
      const accessToken = typeof payload.access_token === "string"
        ? payload.access_token
        : "";
      if (!accessToken) {
        throw new Error("Ungültige Auth-Antwort: Access-Token fehlt.");
      }
      const userData = normalizeRestaurantUser(payload);
      const restaurantId = userData.id;
      const needsPasswordChange = userData.mustChangePassword === true;

      localStorage.setItem("restaurant_token", accessToken);
      localStorage.setItem(
        "restaurant_user",
        JSON.stringify({
          ...userData,
          mustChangePassword: needsPasswordChange,
        }),
      );
      localStorage.setItem("restaurant_id", restaurantId);
      setToken(accessToken);
      setUser({ ...userData, mustChangePassword: needsPasswordChange });
      setRestaurantId(restaurantId);
      setMustChangePassword(needsPasswordChange);
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
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
