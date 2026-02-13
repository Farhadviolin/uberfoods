import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";
import { useAuth as useAuthContext } from "../contexts/AuthContext";

// Expose context hook for tests
export function useAuth() {
  return useAuthContext();
}

// Login
export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.post("/auth/restaurant/login", credentials);

      // Tokens und Benutzerinformationen speichern, falls vorhanden
      const data: any = response.data;
      if (data?.token) {
        localStorage.setItem("restaurant_token", data.token);
        api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      }
      if (data?.refreshToken) {
        localStorage.setItem("restaurant_refresh_token", data.refreshToken);
      }
      if (data?.restaurant) {
        localStorage.setItem(
          "restaurant_user",
          JSON.stringify(data.restaurant),
        );
        localStorage.setItem("restaurant_id", data.restaurant.id);
      }

      return data;
    },
  });
}

// Refresh Token
export function useRefreshToken() {
  return useMutation({
    mutationFn: async (_refreshToken?: string) => {
      const response = await api.post<{
        access_token: string;
        refresh_token?: string;
      }>("/auth/restaurant/refresh");

      // Update token in localStorage
      if (response.data.access_token) {
        localStorage.setItem("restaurant_token", response.data.access_token);
        api.defaults.headers.common["Authorization"] =
          `Bearer ${response.data.access_token}`;
      }

      if (response.data.refresh_token) {
        localStorage.setItem(
          "restaurant_refresh_token",
          response.data.refresh_token,
        );
      }

      return response.data;
    },
  });
}

// Logout
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await api.post("/auth/restaurant/logout");
      } catch (_err) {
        // Fehler tolerieren, Logout soll trotzdem Zustand bereinigen
      }
    },
    onSettled: () => {
      // Clear all cached data
      queryClient.clear();

      // Remove tokens
      localStorage.removeItem("restaurant_token");
      localStorage.removeItem("restaurant_refresh_token");
      localStorage.removeItem("restaurant_user");
      localStorage.removeItem("restaurant_id");

      // Remove auth header
      delete api.defaults.headers.common["Authorization"];
    },
  });
}

// Session Info
export interface SessionInfo {
  userId: string;
  restaurantId: string;
  email: string;
  role: string;
  loginTime: string;
  lastActivity: string;
  ipAddress?: string;
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await api.get<SessionInfo>("/auth/restaurant/session");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

// Permissions
export interface Permission {
  id: string;
  name: string;
  description: string;
}

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const response = await api.get<Permission[]>(
        "/auth/restaurant/permissions",
      );
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 Minuten
  });
}

// Email Verification
export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post<{ message: string }>(
        "/auth/restaurant/verify-email",
        { token },
      );
      return response.data;
    },
  });
}

// 2FA
export interface TwoFactorSetup {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export function useEnable2FA() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<TwoFactorSetup>(
        "/auth/restaurant/2fa/enable",
      );
      return response.data;
    },
  });
}

export function useDisable2FA() {
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post<{ message: string }>(
        "/auth/restaurant/2fa/disable",
        { code },
      );
      return response.data;
    },
  });
}

export function useVerify2FA() {
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post<{ message: string; verified: boolean }>(
        "/auth/restaurant/2fa/verify",
        { code },
      );
      return response.data;
    },
  });
}
