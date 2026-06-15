import { useState, useEffect } from "react";

export function useOffline() {
  const isLocalHost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  const [isOnline, setIsOnline] = useState(isLocalHost ? true : navigator.onLine);
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
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}
