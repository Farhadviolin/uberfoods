import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { randomUUID } from "crypto";
import { useAuth, useLogin, useLogout, useRefreshToken } from "../useAuth";
import { AuthProvider } from "../../contexts/AuthContext";
import { ToastProvider } from "../../contexts/ToastContext";

// Mock API
jest.mock("../../utils/api");
import api from "../../utils/api";

const mockApi = api as jest.Mocked<typeof api>;

const generateTestPassword = () =>
  process.env.TEST_PASSWORD ?? `pw-${randomUUID()}`;

// Test wrapper
const createWrapper = (initialAuthState: any = { user: null, token: null }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialAuthState={initialAuthState}>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("useAuth", () => {
    it("should return auth state from context", () => {
      const mockUser = {
        id: "restaurant-1",
        email: "owner@pizza-palace.com",
        name: "Pizza Palace",
        role: "restaurant_owner",
        restaurantId: "rest-1",
        isVerified: true,
      };

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({ user: mockUser, token: "valid-token" }),
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toEqual("valid-token");
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should return null when not authenticated", () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("useLogin", () => {
    it("should login restaurant successfully", async () => {
      const loginData = {
        email: "owner@pizza-palace.com",
        password: generateTestPassword(),
      };

      const mockResponse = {
        user: {
          id: "restaurant-1",
          email: "owner@pizza-palace.com",
          name: "Pizza Palace",
          role: "restaurant_owner",
          restaurantId: "rest-1",
          isVerified: true,
        },
        token: "jwt-token-123",
        refreshToken: "refresh-token-456",
        restaurant: {
          id: "rest-1",
          name: "Pizza Palace",
          isOpen: true,
          rating: 4.5,
        },
      };

      mockApi.post.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(loginData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        "/auth/restaurant/login",
        loginData,
      );
      expect(result.current.data).toEqual(mockResponse);
    });

    it("should handle login errors", async () => {
      const loginData = {
        email: "invalid@example.com",
        password: generateTestPassword(),
      };

      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: "Invalid restaurant credentials" },
        },
      });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(loginData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const err = result.current.error as any;
      expect(err?.response?.status).toBe(401);
    });

    it("should handle network errors", async () => {
      mockApi.post.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        email: "test@example.com",
        password: generateTestPassword(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useLogout", () => {
    it("should logout successfully", async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper({ user: { id: "1" }, token: "token" }),
      });

      result.current.mutate(undefined);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith("/auth/restaurant/logout");
    });

    it("should handle logout errors gracefully", async () => {
      mockApi.post.mockRejectedValueOnce(new Error("Logout failed"));

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper({ user: { id: "1" }, token: "token" }),
      });

      result.current.mutate(undefined);

      // Should still succeed even if API call fails
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe("useRefreshToken", () => {
    it("should refresh token successfully", async () => {
      const mockResponse = {
        token: "new-jwt-token",
        refreshToken: "new-refresh-token",
      };

      mockApi.post.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useRefreshToken(), {
        wrapper: createWrapper({ user: { id: "1" }, token: "old-token" }),
      });

      result.current.mutate(undefined);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith("/auth/restaurant/refresh");
      expect(result.current.data).toEqual(mockResponse);
    });

    it("should handle refresh token errors", async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: "Invalid refresh token" },
        },
      });

      const { result } = renderHook(() => useRefreshToken(), {
        wrapper: createWrapper({ user: { id: "1" }, token: "invalid-token" }),
      });

      result.current.mutate(undefined);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
