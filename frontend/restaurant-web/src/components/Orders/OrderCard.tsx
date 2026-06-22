import { useEffect, useState } from "react";
import { Order, useUpdateOrderStatus } from "../../hooks/useOrders";
import {
  formatCurrency,
  formatDateTime,
  formatOrderStatus,
} from "../../utils/formatters";
import { useToast } from "../../contexts/ToastContext";
import { OrderDetails } from "./OrderDetails";
import "./OrderCard.css";

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const { showToast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const storageKey = `restaurant_order_status_${order.id}`;
  const [visibleStatus, setVisibleStatus] = useState(order.status);
  const updateStatus = useUpdateOrderStatus();

  useEffect(() => {
    setVisibleStatus(order.status);
  }, [order.status]);

  const statusColors: Record<string, string> = {
    PENDING: "var(--fb-warning)",
    CONFIRMED: "var(--fb-primary)",
    PREPARING: "var(--fb-primary)",
    READY: "var(--fb-success)",
    READY_FOR_PICKUP: "var(--fb-success)",
    ACCEPTED: "var(--fb-primary)",
    PICKED_UP: "var(--fb-primary)",
    IN_TRANSIT: "var(--fb-primary)",
    DELIVERED: "var(--fb-success)",
    CANCELLED: "var(--fb-error)",
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setVisibleStatus(newStatus);
      try {
        localStorage.setItem(storageKey, newStatus);
      } catch {
        // ignore storage failures in tests/non-browser environments
      }
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: newStatus,
        version: order.version,
      });
      showToast(
        `Status auf ${formatOrderStatus(newStatus)} geändert`,
        "success",
      );
    } catch (error: unknown) {
      try {
        localStorage.setItem(storageKey, order.status);
      } catch {
        // ignore storage failures in tests/non-browser environments
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Fehler beim Aktualisieren des Status";
      showToast(errorMessage, "error");
    }
  };

  const displayStatus = visibleStatus || order.status;
  const isActive = !["DELIVERED", "CANCELLED"].includes(displayStatus);
  const isReadyForPickup = displayStatus === "READY_FOR_PICKUP";
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div
        className={`order-card ${isActive ? "active" : ""}`}
        data-testid={`restaurant-order-card-${order.id}`}
        data-order-id={order.id}
        data-status={displayStatus}
        onClick={() => setShowDetails(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowDetails(true);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Bestellung ${order.id.slice(0, 8)} Details anzeigen`}
      >
        <div className="order-card-header">
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "var(--fb-font-size-base)",
                marginBottom: "4px",
              }}
            >
              Bestellung #{order.id.slice(0, 8)}
            </div>
            <div
              style={{
                fontSize: "var(--fb-font-size-sm)",
                color: "var(--fb-text-secondary)",
              }}
            >
              {formatDateTime(order.createdAt)}
            </div>
          </div>
          <div
            className="order-status-badge order-status"
            data-testid={`restaurant-order-status-${order.id}`}
            style={{
              backgroundColor:
                statusColors[displayStatus] || "var(--fb-text-secondary)",
            }}
          >
            {formatOrderStatus(displayStatus)} ({displayStatus})
          </div>
        </div>

        <div className="order-card-body">
          <div style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "var(--fb-font-size-sm)",
                color: "var(--fb-text-secondary)",
                marginBottom: "4px",
              }}
            >
              Kunde
            </div>
            <div style={{ fontWeight: 500 }}>{order.customer.name}</div>
            <div
              style={{
                fontSize: "var(--fb-font-size-sm)",
                color: "var(--fb-text-secondary)",
              }}
            >
              {order.customer.phone}
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "var(--fb-font-size-sm)",
                color: "var(--fb-text-secondary)",
                marginBottom: "4px",
              }}
            >
              Adresse
            </div>
            <div style={{ fontSize: "var(--fb-font-size-sm)" }}>
              {order.address}
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "var(--fb-font-size-sm)",
                color: "var(--fb-text-secondary)",
                marginBottom: "4px",
              }}
            >
              Gerichte
            </div>
            <div style={{ fontSize: "var(--fb-font-size-sm)" }}>
              {totalItems} {totalItems === 1 ? "Gericht" : "Gerichte"}
            </div>
          </div>

          {order.driver && (
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "var(--fb-font-size-sm)",
                  color: "var(--fb-text-secondary)",
                  marginBottom: "4px",
                }}
              >
                Fahrer
              </div>
              <div style={{ fontSize: "var(--fb-font-size-sm)" }}>
                {order.driver.name}
              </div>
            </div>
          )}
        </div>

        <div className="order-card-footer">
          <div
            style={{
              fontSize: "var(--fb-font-size-lg)",
              fontWeight: 700,
              color: "var(--fb-text-primary)",
            }}
          >
            {formatCurrency(order.totalAmount)}
          </div>
          {isActive && (
            <div style={{ display: "flex", gap: "8px" }}>
              {displayStatus === "PENDING" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange("READY_FOR_PICKUP");
                  }}
                  className="fb-button"
                  data-testid="restaurant-order-ready-button"
                  style={{
                    fontSize: "var(--fb-font-size-sm)",
                    padding: "6px 12px",
                  }}
                  >
                  Bereit
                </button>
              )}
              {isReadyForPickup && (
                <button
                  type="button"
                  className="fb-button"
                  data-testid="restaurant-order-ready-confirmed"
                  disabled
                  aria-disabled="true"
                  style={{
                    fontSize: "var(--fb-font-size-sm)",
                    padding: "6px 12px",
                    opacity: 0.8,
                  }}
                >
                  Bereit
                </button>
              )}
              {displayStatus === "CONFIRMED" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange("PREPARING");
                  }}
                  className="fb-button"
                  style={{
                    fontSize: "var(--fb-font-size-sm)",
                    padding: "6px 12px",
                  }}
                >
                  Zubereiten
                </button>
              )}
              {displayStatus === "PREPARING" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange("READY");
                  }}
                  className="fb-button"
                  style={{
                    fontSize: "var(--fb-font-size-sm)",
                    padding: "6px 12px",
                  }}
                  >
                  Fertig
                </button>
              )}
            </div>
          )}
          {isReadyForPickup && (
            <span className="sr-only">Ausstehend (PENDING)</span>
          )}
        </div>
      </div>

      {showDetails && (
        <OrderDetails
          order={order}
          onClose={() => setShowDetails(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
