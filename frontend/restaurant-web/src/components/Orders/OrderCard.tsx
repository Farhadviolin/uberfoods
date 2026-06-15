import { useState } from "react";
import { Order, useUpdateOrderStatus } from "../../hooks/useOrders";
import { useRetry } from "../../hooks/useRetry";
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
  const updateStatus = useUpdateOrderStatus();

  // Retry-Logik für Status-Updates
  const retryUpdateStatus = useRetry(
    async ({ id, status }: { id: string; status: string }) => {
      return await updateStatus.mutateAsync({ id, status });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const statusColors: Record<string, string> = {
    PENDING: "var(--fb-warning)",
    CONFIRMED: "var(--fb-primary)",
    PREPARING: "var(--fb-primary)",
    READY: "var(--fb-success)",
    ACCEPTED: "var(--fb-primary)",
    PICKED_UP: "var(--fb-primary)",
    IN_TRANSIT: "var(--fb-primary)",
    DELIVERED: "var(--fb-success)",
    CANCELLED: "var(--fb-error)",
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await retryUpdateStatus.execute({ id: order.id, status: newStatus });
      showToast(
        `Status auf ${formatOrderStatus(newStatus)} geändert`,
        "success",
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Fehler beim Aktualisieren des Status";
      showToast(errorMessage, "error");
    }
  };

  const isActive = !["DELIVERED", "CANCELLED"].includes(order.status);
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div
        className={`order-card ${isActive ? "active" : ""}`}
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
            data-testid="order-status"
            style={{
              backgroundColor:
                statusColors[order.status] || "var(--fb-text-secondary)",
            }}
          >
            {formatOrderStatus(order.status)} ({order.status})
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
              {order.status === "PENDING" && (
                <button
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
              {order.status === "CONFIRMED" && (
                <button
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
              {order.status === "PREPARING" && (
                <button
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
