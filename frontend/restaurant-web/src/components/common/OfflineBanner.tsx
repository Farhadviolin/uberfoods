import { useOffline } from "../../hooks/useOffline";
import "./OfflineBanner.css";

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOffline();

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div className={`offline-banner ${isOnline ? "online" : "offline"}`}>
      <div className="offline-banner-content">
        {isOnline ? (
          <>
            <span className="offline-banner-icon">✓</span>
            <span>Sie sind wieder online. Synchronisiere Daten...</span>
          </>
        ) : (
          <>
            <span className="offline-banner-icon">⚠</span>
            <span>
              Sie sind offline. Änderungen werden gespeichert und
              synchronisiert, sobald Sie wieder online sind.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
