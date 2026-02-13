import { useAuth } from "../contexts/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  useRestaurantStatus,
  useUpdateRestaurantStatus,
  RestaurantStatus,
} from "../hooks/useRestaurantStatus";
import { useToast } from "../contexts/ToastContext";
import { useState, useCallback, useEffect, useRef } from "react";
import "./Header.css";

interface HeaderProps {
  newOrdersCount: number;
  onNotificationClick: () => void;
}

export function Header({ newOrdersCount, onNotificationClick }: HeaderProps) {
  const { user, restaurantId } = useAuth();
  const { showToast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { data: statusData } = useRestaurantStatus(restaurantId);
  const updateStatus = useUpdateRestaurantStatus();

  const { isConnected } = useWebSocket({
    restaurantId,
    onNewOrder: useCallback(() => {
      // Notification wird durch Parent Component gehandhabt
    }, []),
  });

  const handleStatusChange = async (newStatus: RestaurantStatus) => {
    if (!restaurantId) return;

    try {
      await updateStatus.mutateAsync({ restaurantId, status: newStatus });
      showToast(`Status auf ${getStatusLabel(newStatus)} geändert`, "success");
      setShowStatusMenu(false);
    } catch (error: any) {
      showToast("Fehler beim Ändern des Status", "error");
    }
  };

  const getStatusLabel = (status: RestaurantStatus): string => {
    switch (status) {
      case "OPEN":
        return "Geöffnet";
      case "CLOSED":
        return "Geschlossen";
      case "IN_WORK":
        return "In Arbeit";
      default:
        return status;
    }
  };

  const getStatusColor = (status?: RestaurantStatus): string => {
    switch (status) {
      case "OPEN":
        return "var(--fb-success)";
      case "CLOSED":
        return "var(--fb-error)";
      case "IN_WORK":
        return "var(--fb-warning)";
      default:
        return "var(--fb-text-secondary)";
    }
  };

  const getStatusIcon = (status?: RestaurantStatus): string => {
    switch (status) {
      case "OPEN":
        return "🟢";
      case "CLOSED":
        return "🔴";
      case "IN_WORK":
        return "🟡";
      default:
        return "⚪";
    }
  };

  const currentStatus = statusData?.status || "OPEN";
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Schließe Status-Menü wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target as Node)
      ) {
        setShowStatusMenu(false);
      }
    };

    if (showStatusMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showStatusMenu]);

  return (
    <header className="fb-header">
      <div className="fb-header-content">
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <a href="/" className="fb-logo">
            🍽️ UberFoods Restaurant
          </a>
          {user && (
            <div
              style={{
                fontSize: "var(--fb-font-size-sm)",
                color: "var(--fb-text-secondary)",
              }}
            >
              {user.name}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            position: "relative",
          }}
        >
          {/* WebSocket Status */}
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isConnected
                ? "var(--fb-success)"
                : "var(--fb-error)",
              marginRight: "8px",
            }}
            title={isConnected ? "WebSocket verbunden" : "WebSocket getrennt"}
          />

          {/* Restaurant Status Toggle */}
          <div ref={statusMenuRef} style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusMenu(!showStatusMenu);
              }}
              className="fb-button-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: getStatusColor(currentStatus),
                color: "white",
                border: "none",
                borderRadius: "var(--fb-radius-base)",
                fontWeight: 600,
                fontSize: "var(--fb-font-size-sm)",
              }}
              title="Restaurant-Status ändern"
            >
              <span>{getStatusIcon(currentStatus)}</span>
              <span>{getStatusLabel(currentStatus)}</span>
              <span style={{ fontSize: "12px" }}>▼</span>
            </button>

            {showStatusMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "8px",
                  backgroundColor: "var(--fb-bg-primary)",
                  border: "1px solid var(--fb-border-primary)",
                  borderRadius: "var(--fb-radius-base)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  minWidth: "180px",
                }}
              >
                {(["OPEN", "CLOSED", "IN_WORK"] as RestaurantStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={updateStatus.isPending}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        textAlign: "left",
                        border: "none",
                        background:
                          currentStatus === status
                            ? "var(--fb-bg-secondary)"
                            : "transparent",
                        color: "var(--fb-text-primary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "var(--fb-font-size-base)",
                      }}
                      onMouseEnter={(e) => {
                        if (currentStatus !== status) {
                          e.currentTarget.style.backgroundColor =
                            "var(--fb-bg-secondary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentStatus !== status) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>
                        {getStatusIcon(status)}
                      </span>
                      <span>{getStatusLabel(status)}</span>
                      {currentStatus === status && (
                        <span style={{ marginLeft: "auto" }}>✓</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              onNotificationClick();
            }}
            className="fb-button-secondary"
            style={{
              position: "relative",
              padding: "8px 12px",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Benachrichtigungen"
          >
            🔔
            {newOrdersCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  backgroundColor: "var(--fb-error)",
                  color: "white",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                {newOrdersCount > 9 ? "9+" : newOrdersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
