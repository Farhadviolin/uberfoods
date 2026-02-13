import axios, { AxiosError } from "axios";

// Global Toast Registry für automatische Error-Toasts
let globalToastFunction:
  | ((message: string, type: "success" | "error" | "info" | "warning") => void)
  | null = null;

export function registerGlobalToastFunction(
  toastFn: (
    message: string,
    type: "success" | "error" | "info" | "warning",
  ) => void,
) {
  globalToastFunction = toastFn;
}

export function unregisterGlobalToastFunction() {
  globalToastFunction = null;
}

// Fallback-Umgebung für Tests/Node (kein import.meta.env verfügbar)
const viteEnv = { DEV: true, PROD: false };

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Request Interceptor - fügt Auth-Token hinzu
api.interceptors.request.use(
  (config) => {
    // Hole Token aus localStorage
    const token = localStorage.getItem("restaurant_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor - behandelt Errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;

    // Bei 500 Server-Fehler - logge Details (nur in Development)
    if (status === 500) {
      // Prüfe ob es ein restaurant-web Endpoint ist
      const isRestaurantWebEndpoint =
        url &&
        (url.includes("/restaurants/") ||
          url.includes("/orders/") ||
          url.includes("/statistics/") ||
          url.includes("/dishes/") ||
          url.includes("/staff/") ||
          url.includes("/inventory/") ||
          url.includes("/reviews/") ||
          url.includes("/promotions/") ||
          url.includes("/chat/") ||
          url.includes("/settings/") ||
          url.includes("/accounting/"));

      if (isRestaurantWebEndpoint || viteEnv.DEV) {
        console.error("Server Error (500) in restaurant-web:", {
          url,
          method: error.config?.method?.toUpperCase(),
          message:
            (error.response?.data as { message?: string })?.message || (error as { message?: string }).message,
        });
      }
    }

    // 401-Handling wieder aktivieren
    if (status === 401) {
      localStorage.removeItem("restaurant_token");
      localStorage.removeItem("restaurant_user");
      localStorage.removeItem("restaurant_id");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Bei 404 Not Found - logge nur in Development
    if (status === 404 && viteEnv.DEV) {
      console.warn("API Endpoint not found (404):", url);
    }

    // Automatische Toast-Anzeige für bestimmte Fehler (außer Auth-Fehler)
    if (globalToastFunction && status && status >= 400 && status !== 401) {
      const toastType = status >= 500 ? "error" : "warning";
      const toastMessage =
        status >= 500
          ? "Serverfehler aufgetreten. Bitte versuchen Sie es später erneut."
          : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.";

      // Verwende setTimeout um sicherzustellen, dass der Toast nach dem Error-Handling kommt
      setTimeout(() => {
        if (globalToastFunction) {
          globalToastFunction(toastMessage, toastType);
        }
      }, 0);
    }

    return Promise.reject(error);
  },
);

export default api;
