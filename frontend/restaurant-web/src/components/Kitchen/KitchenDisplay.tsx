import { useState, useMemo, useEffect } from "react";
import { useRestaurantOrders, Order } from "../../hooks/useOrders";
import { useAuth } from "../../contexts/AuthContext";
import { useUpdateOrderStatus } from "../../hooks/useOrders";
import { useRetry } from "../../hooks/useRetry";
import {
  useKitchenOrders,
  useKitchenStations,
  useOrderTimeline,
  useKitchenPerformance,
} from "../../hooks/useKitchenDisplay";
import { formatCurrency, formatTime } from "../../utils/formatters";
import { useToast } from "../../contexts/ToastContext";
import { handleApiError } from "../../utils/errorUtils";
import "./KitchenDisplay.css";

export function KitchenDisplay() {
  const { restaurantId } = useAuth();
  const { data: ordersData = [] } = useRestaurantOrders(restaurantId);

  // Sicherstellen, dass orders immer ein Array ist
  const orders = useMemo(
    () => (Array.isArray(ordersData) ? ordersData : []),
    [ordersData],
  );

  const updateStatus = useUpdateOrderStatus();
  const { showToast } = useToast();

  // Retry-Logik für Status-Updates
  const retryUpdateStatus = useRetry(
    async ({
      id,
      status,
      version,
    }: {
      id: string;
      status: string;
      version?: number;
    }) => {
      return await updateStatus.mutateAsync({ id, status, version });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [fullscreen, setFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alarmThreshold, setAlarmThreshold] = useState(900); // 15 Minuten in Sekunden
  const [selectedOrderId, _setSelectedOrderId] = useState<string | null>(null);

  // Kitchen Display Hooks
  const { data: _kitchenOrders = [] } = useKitchenOrders(restaurantId, {
    station: selectedStation !== "all" ? selectedStation : undefined,
  });
  const { data: _stations = [] } = useKitchenStations(restaurantId);
  const { data: _timeline } = useOrderTimeline(restaurantId, selectedOrderId);
  const { data: _performance } = useKitchenPerformance(restaurantId, "today");

  // Filter active orders
  const activeOrders = useMemo(() => {
    return Array.isArray(orders)
      ? orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status))
      : [];
  }, [orders]);

  // Group orders by station (based on dish category)
  const ordersByStation = useMemo(() => {
    const stations: { [key: string]: Order[] } = {
      all: activeOrders,
      grill: [],
      pizza: [],
      salad: [],
      drinks: [],
      other: [],
    };

    activeOrders.forEach((order) => {
      const categories = new Set(
        order.items.map((item) =>
          (item.dish.category || "other").toLowerCase(),
        ),
      );
      let assigned = false;

      if (
        categories.has("grill") ||
        categories.has("fleisch") ||
        categories.has("burger")
      ) {
        stations.grill.push(order);
        assigned = true;
      }
      if (categories.has("pizza") || categories.has("pasta")) {
        stations.pizza.push(order);
        assigned = true;
      }
      if (
        categories.has("salat") ||
        categories.has("salad") ||
        categories.has("vegetarisch")
      ) {
        stations.salad.push(order);
        assigned = true;
      }
      if (
        categories.has("getränk") ||
        categories.has("drink") ||
        categories.has("getränke")
      ) {
        stations.drinks.push(order);
        assigned = true;
      }
      if (!assigned) {
        stations.other.push(order);
      }
    });

    return stations;
  }, [activeOrders]);

  const displayOrders =
    selectedStation === "all"
      ? activeOrders
      : ordersByStation[selectedStation] || [];

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // Hole aktuelle Order-Version für Optimistic Locking
      const currentOrder = orders.find((o) => o.id === orderId);
      const version = currentOrder?.version;

      await retryUpdateStatus.execute({
        id: orderId,
        status: newStatus,
        version,
      });
      showToast(`Status geändert`, "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      const errorMessage = appError.message;
      if (errorMessage.includes("Version")) {
        showToast("Bestellung wurde geändert. Bitte Seite neu laden.", "error");
      } else {
        showToast(errorMessage, "error");
      }
    }
  };

  useEffect(() => {
    if (fullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [fullscreen]);

  return (
    <div className={`kitchen-display ${fullscreen ? "fullscreen" : ""}`}>
      <div className="kitchen-header">
        <h1>Kitchen Display System (KDS)</h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="fb-input"
            style={{ width: "auto" }}
          >
            <option value="all">Alle Stationen</option>
            <option value="grill">Grill</option>
            <option value="pizza">Pizza</option>
            <option value="salad">Salat</option>
            <option value="drinks">Getränke</option>
            <option value="other">Sonstige</option>
          </select>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="fb-button-secondary"
          >
            {fullscreen ? "✕ Vollbild beenden" : "⛶ Vollbild"}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="fb-button-secondary"
            style={{
              backgroundColor: soundEnabled
                ? "var(--fb-success)"
                : "var(--fb-error)",
            }}
          >
            {soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF"}
          </button>
          <select
            value={alarmThreshold}
            onChange={(e) => setAlarmThreshold(Number(e.target.value))}
            className="fb-input"
            style={{ width: "auto" }}
          >
            <option value={600}>Alarm nach 10 Min</option>
            <option value={900}>Alarm nach 15 Min</option>
            <option value={1200}>Alarm nach 20 Min</option>
            <option value={1800}>Alarm nach 30 Min</option>
          </select>
        </div>
      </div>

      <div className="kitchen-grid">
        {displayOrders.map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            onStatusChange={handleStatusChange}
            soundEnabled={soundEnabled}
            alarmThreshold={alarmThreshold}
          />
        ))}
      </div>

      {displayOrders.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--fb-space-8)",
            color: "var(--fb-text-secondary)",
          }}
        >
          Keine aktiven Bestellungen
        </div>
      )}
    </div>
  );
}

interface KitchenOrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: string) => void;
  soundEnabled: boolean;
  alarmThreshold: number;
}

function KitchenOrderCard({
  order,
  onStatusChange,
  soundEnabled,
  alarmThreshold,
}: KitchenOrderCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isAlarming, setIsAlarming] = useState(false);
  const [hasPlayedAlarm, setHasPlayedAlarm] = useState(false);

  useEffect(() => {
    const startTime = new Date(order.createdAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);

      // Prüfe ob Alarm ausgelöst werden soll
      if (elapsed >= alarmThreshold && !hasPlayedAlarm) {
        setIsAlarming(true);
        if (soundEnabled) {
          playAlarmSound();
        }
        setHasPlayedAlarm(true);
      } else if (elapsed < alarmThreshold) {
        setIsAlarming(false);
        setHasPlayedAlarm(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order.createdAt, alarmThreshold, soundEnabled, hasPlayedAlarm]);

  const playAlarmSound = () => {
    try {
      // Erstelle Audio-Kontext für Alarm-Sound
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Hoher Ton für Alarm
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn("Sound konnte nicht abgespielt werden:", error);
    }
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPriorityColor = (): string => {
    if (elapsedTime > 1800) return "var(--fb-error)"; // > 30 min
    if (elapsedTime > alarmThreshold) return "var(--fb-warning)"; // > Alarm-Schwelle
    return "var(--fb-success)"; // < Alarm-Schwelle
  };

  const isOverdue = elapsedTime > alarmThreshold;

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className={`kitchen-order-card ${isAlarming ? "kitchen-order-alarming" : ""}`}
      style={{
        borderLeft: `4px solid ${getPriorityColor()}`,
        animation: isAlarming ? "pulse-alarm 1s infinite" : "none",
      }}
    >
      <div className="kitchen-order-header">
        <div>
          <div
            style={{ fontWeight: 700, fontSize: "18px", marginBottom: "4px" }}
          >
            #{order.id.slice(0, 8)}
          </div>
          <div
            style={{
              fontSize: "var(--fb-font-size-sm)",
              color: "var(--fb-text-secondary)",
            }}
          >
            {formatTime(order.createdAt)}
          </div>
        </div>
        <div
          className={`kitchen-timer ${isOverdue ? "overdue" : ""}`}
          style={{
            color: getPriorityColor(),
            fontWeight: 700,
            fontSize: "20px",
          }}
        >
          {isOverdue && "⚠️ "}
          {formatTimer(elapsedTime)}
        </div>
      </div>

      <div className="kitchen-order-body">
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
          <div style={{ fontWeight: 600 }}>{order.customer.name}</div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              fontSize: "var(--fb-font-size-sm)",
              color: "var(--fb-text-secondary)",
              marginBottom: "8px",
            }}
          >
            Gerichte ({totalItems})
          </div>
          <div className="kitchen-items">
            {order.items.map((item, idx) => (
              <div key={idx} className="kitchen-item">
                <span style={{ fontWeight: 600 }}>{item.quantity}x</span>
                <span>{item.dish.name}</span>
              </div>
            ))}
          </div>
        </div>

        {order.notes && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px",
              backgroundColor: "var(--fb-bg-secondary)",
              borderRadius: "var(--fb-radius-base)",
            }}
          >
            <div
              style={{
                fontSize: "var(--fb-font-size-sm)",
                color: "var(--fb-text-secondary)",
                marginBottom: "4px",
              }}
            >
              Notiz
            </div>
            <div style={{ fontSize: "var(--fb-font-size-sm)" }}>
              {order.notes}
            </div>
          </div>
        )}

        <div
          style={{
            fontWeight: 700,
            fontSize: "var(--fb-font-size-lg)",
            marginTop: "12px",
          }}
        >
          {formatCurrency(order.totalAmount)}
        </div>
      </div>

      <div className="kitchen-order-footer">
        {order.status === "CONFIRMED" && (
          <button
            onClick={() => onStatusChange(order.id, "PREPARING")}
            className="fb-button"
            style={{ flex: 1 }}
          >
            Zubereiten starten
          </button>
        )}
        {order.status === "PREPARING" && (
          <button
            onClick={() => onStatusChange(order.id, "READY")}
            className="fb-button"
            style={{ flex: 1, backgroundColor: "var(--fb-success)" }}
          >
            Fertig ✓
          </button>
        )}
        {order.status === "READY" && (
          <div
            style={{
              textAlign: "center",
              color: "var(--fb-success)",
              fontWeight: 600,
            }}
          >
            ⏳ Wartet auf Abholung
          </div>
        )}
      </div>
    </div>
  );
}
