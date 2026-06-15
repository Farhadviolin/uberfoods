import { useState, useMemo, useCallback, useEffect } from "react";
import { useRestaurantOrders, Order } from "../../hooks/useOrders";
import { useAuth } from "../../contexts/AuthContext";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useOffline } from "../../hooks/useOffline";
import { useQueryClient } from "@tanstack/react-query";
import { OrderCard } from "./OrderCard";
import { Skeleton, SkeletonCard } from "../common/Skeleton";
import "./OrderList.css";

export function OrderList() {
  const { restaurantId } = useAuth();
  const queryClient = useQueryClient();
  const { data: ordersData, isLoading } = useRestaurantOrders(restaurantId);

  // Sicherstellen, dass orders immer ein Array ist
  const orders = useMemo(
    () => (Array.isArray(ordersData) ? ordersData : []),
    [ordersData],
  );

  const [filter, setFilter] = useState<
    "all" | "active" | "completed" | "cancelled"
  >("all");
  const [search, setSearch] = useState("");

  // WebSocket für Real-time Order Updates
  const handleOrderUpdate = useCallback(
    (updatedOrder: Order) => {
      // Order in der Liste aktualisieren
      queryClient.setQueryData(
        ["orders", restaurantId],
        (oldData: Order[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((order) =>
            order.id === updatedOrder.id
              ? { ...order, ...updatedOrder }
              : order,
          );
        },
      );
    },
    [queryClient, restaurantId],
  );

  const handleNewOrder = useCallback(
    (newOrder: Order) => {
      // Neue Order zur Liste hinzufügen
      queryClient.setQueryData(
        ["orders", restaurantId],
        (oldData: Order[] | undefined) => {
          if (!oldData) return [newOrder];
          return [newOrder, ...oldData];
        },
      );

      // Browser Notification für neue Order
      if (Notification.permission === "granted") {
        new Notification("Neue Bestellung!", {
          body: `Bestellung #${newOrder.id} von ${newOrder.customer.name}`,
          icon: "/favicon.ico",
          tag: `order-${newOrder.id}`,
        });
      }
    },
    [queryClient, restaurantId],
  );

  const { isConnected: wsConnected } = useWebSocket({
    restaurantId,
    onOrderUpdate: handleOrderUpdate,
    onNewOrder: handleNewOrder,
    onOrderCreated: handleNewOrder,
  });

  const { isOnline } = useOffline();

  // Notification Permission bei Mount anfragen
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const filteredOrders = useMemo(() => {
    // Sicherstellen, dass orders ein Array ist
    let filtered = Array.isArray(orders) ? orders : [];

    // Status Filter
    if (filter === "active") {
      filtered = filtered.filter(
        (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
      );
    } else if (filter === "completed") {
      filtered = filtered.filter((o) => o.status === "DELIVERED");
    } else if (filter === "cancelled") {
      filtered = filtered.filter((o) => o.status === "CANCELLED");
    }

    // Search Filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(searchLower) ||
          o.customer.name.toLowerCase().includes(searchLower) ||
          o.customer.phone.includes(search) ||
          o.items.some((item) =>
            item.dish.name.toLowerCase().includes(searchLower),
          ),
      );
    }

    // Sicherstellen, dass filtered ein Array ist, bevor sort() aufgerufen wird
    return Array.isArray(filtered)
      ? filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
      : [];
  }, [orders, filter, search]);

  if (isLoading) {
    return (
      <div className="order-list">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Skeleton variant="text" width="200px" height={32} />
          <div style={{ display: "flex", gap: "12px" }}>
            <Skeleton variant="rectangular" width="200px" height={40} />
            <Skeleton variant="rectangular" width="150px" height={40} />
          </div>
        </div>
        <div className="orders-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="order-list">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1
            style={{
              fontSize: "var(--fb-font-size-2xl)",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Bestellungen ({filteredOrders.length})
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              backgroundColor: wsConnected ? "#d4edda" : "#f8d7da",
              color: wsConnected ? "#155724" : "#721c24",
              border: `1px solid ${wsConnected ? "#c3e6cb" : "#f5c6cb"}`,
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: wsConnected ? "#28a745" : "#dc3545",
              }}
            />
            {wsConnected && isOnline
              ? "Live-Updates"
              : !isOnline
                ? "Offline"
                : "Verbindung getrennt"}
          </div>
          {!isOnline && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "#fff3cd",
                color: "#856404",
                borderRadius: "4px",
                fontSize: "12px",
                border: "1px solid #ffeaa7",
              }}
            >
              ⚠️ Offline-Modus: Änderungen werden synchronisiert, sobald Sie
              wieder online sind
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="fb-input"
            style={{ width: "200px" }}
            aria-label="Bestellungen durchsuchen"
            aria-describedby="search-description"
          />
          <span id="search-description" className="sr-only">
            Durchsucht Bestellungen nach ID, Kundenname, Telefon oder Gericht
          </span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="fb-input"
            style={{ width: "auto" }}
            aria-label="Bestellungen nach Status filtern"
          >
            <option value="all">Alle</option>
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Storniert</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--fb-space-8)",
            color: "var(--fb-text-secondary)",
          }}
        >
          Keine Bestellungen gefunden
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
