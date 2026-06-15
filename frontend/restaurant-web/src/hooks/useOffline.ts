import { useState, useEffect } from "react";

function isLocalLoopbackHost() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  const isLoopbackHost = ["localhost", "127.0.0.1", "::1"].includes(hostname);
  const isLocalhostDomain = hostname === "localhost" || hostname.endsWith(".localhost");
  const isE2EOrDevMode =
    Boolean((import.meta as any)?.env?.MODE === "test") ||
    Boolean((import.meta as any)?.env?.VITE_E2E === "true");

  return isLoopbackHost || isLocalhostDomain || isE2EOrDevMode;
}

export function useOffline() {
  const isLocalHost = isLocalLoopbackHost();
  const [isOnline, setIsOnline] = useState(
    isLocalHost ? true : typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger sync when coming back online
        if (
          "serviceWorker" in navigator &&
          "sync" in ServiceWorkerRegistration.prototype
        ) {
          navigator.serviceWorker.ready.then((registration) => {
            (registration as any).sync.register("sync-orders");
            (registration as any).sync.register("sync-chat");
            (registration as any).sync.register("sync-status-updates");
          });
        }
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      if (isLocalHost) {
        return;
      }
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isLocalHost, wasOffline]);

  return { isOnline, wasOffline };
}
