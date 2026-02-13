import { useAuth } from "../../contexts/AuthContext";
import {
  useRestaurantInventory,
  useRestaurantStockItems,
  useRestaurantInventoryAlerts,
  useUpdateStock,
} from "../../hooks/useInventory";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import { formatCurrency } from "../../utils/formatters";
import { Skeleton, SkeletonStats, SkeletonList } from "../common/Skeleton";
import "./Inventory.css";

export function Inventory() {
  const { restaurantId } = useAuth();
  const { data: inventory, isLoading: inventoryLoading } =
    useRestaurantInventory(restaurantId);
  const { data: stockItems = [], isLoading: stockLoading } =
    useRestaurantStockItems(restaurantId);
  const { data: alerts = [] } = useRestaurantInventoryAlerts(restaurantId);
  const { showToast } = useToast();
  const updateStock = useUpdateStock();

  // Retry-Logik für Stock-Updates
  const retryUpdateStock = useRetry(
    async ({ id, quantity }: { id: string; quantity: number }) => {
      return await updateStock.mutateAsync({ id, quantity });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const isLoading = inventoryLoading || stockLoading;

  const handleUpdateStock = async (
    itemId: string,
    newQuantity: number,
    currentStock: number,
    itemName: string,
  ) => {
    // Validierung: Keine negativen Werte
    if (newQuantity < 0) {
      showToast("Bestand kann nicht negativ sein", "error");
      return;
    }

    // Validierung: Große Änderungen erfordern Bestätigung
    const difference = Math.abs(newQuantity - currentStock);
    const percentageChange =
      currentStock > 0 ? (difference / currentStock) * 100 : 100;

    if (difference > 50 || percentageChange > 50) {
      const confirmed = confirm(
        `Sie möchten den Bestand von "${itemName}" von ${currentStock} auf ${newQuantity} ändern (Änderung: ${difference > 0 ? "+" : ""}${difference}).\n\nMöchten Sie fortfahren?`,
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      await retryUpdateStock.execute({ id: itemId, quantity: newQuantity });
      showToast("Bestand aktualisiert", "success");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Fehler beim Aktualisieren";
      showToast(errorMessage, "error");
    }
  };

  if (isLoading) {
    return (
      <div className="inventory">
        <div style={{ marginBottom: "24px" }}>
          <Skeleton
            variant="text"
            width="200px"
            height={32}
          />
        </div>
        <SkeletonStats />
        <div style={{ marginTop: "32px" }}>
          <div style={{ marginBottom: "20px" }}>
            <Skeleton
              variant="text"
              width="250px"
              height={24}
            />
          </div>
          <SkeletonList count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="inventory">
      <h1
        style={{
          fontSize: "var(--fb-font-size-2xl)",
          fontWeight: 700,
          marginBottom: "24px",
        }}
      >
        Inventar
      </h1>

      {inventory && (
        <div className="inventory-overview">
          <div className="inventory-card">
            <div
              className="inventory-card-icon"
              style={{ backgroundColor: "var(--fb-primary)" }}
            >
              📦
            </div>
            <div className="inventory-card-content">
              <div className="inventory-card-label">Gesamtwert</div>
              <div className="inventory-card-value">
                {formatCurrency(inventory.totalValue)}
              </div>
            </div>
          </div>

          <div className="inventory-card">
            <div
              className="inventory-card-icon"
              style={{ backgroundColor: "var(--fb-success)" }}
            >
              ✅
            </div>
            <div className="inventory-card-content">
              <div className="inventory-card-label">Normal</div>
              <div className="inventory-card-value">
                {inventory.stockLevels.normal}
              </div>
            </div>
          </div>

          <div className="inventory-card">
            <div
              className="inventory-card-icon"
              style={{ backgroundColor: "var(--fb-warning)" }}
            >
              ⚠️
            </div>
            <div className="inventory-card-content">
              <div className="inventory-card-label">Niedrig</div>
              <div className="inventory-card-value">
                {inventory.stockLevels.low}
              </div>
            </div>
          </div>

          <div className="inventory-card">
            <div
              className="inventory-card-icon"
              style={{ backgroundColor: "var(--fb-error)" }}
            >
              🗑️
            </div>
            <div className="inventory-card-content">
              <div className="inventory-card-label">Verschwendung (30d)</div>
              <div className="inventory-card-value">
                {formatCurrency(inventory.monthlyWaste)}
              </div>
            </div>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="alerts-section">
          <h2
            style={{
              marginBottom: "16px",
              fontSize: "var(--fb-font-size-lg)",
              fontWeight: 600,
            }}
          >
            Warnungen ({alerts.length})
          </h2>
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-item ${alert.severity.toLowerCase()}`}
              >
                <div className="alert-icon">
                  {alert.severity === "CRITICAL" ? "🔴" : "⚠️"}
                </div>
                <div className="alert-content">
                  <div style={{ fontWeight: 600 }}>{alert.message}</div>
                  <div
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      color: "var(--fb-text-secondary)",
                    }}
                  >
                    {alert.itemName} • Aktuell: {alert.currentStock}{" "}
                    {alert.unit} • Minimum: {alert.minStock} {alert.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stock-items-section">
        <h2
          style={{
            marginBottom: "20px",
            fontSize: "var(--fb-font-size-lg)",
            fontWeight: 600,
          }}
        >
          Bestandsartikel ({stockItems.length})
        </h2>
        {stockItems.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--fb-space-8)",
              color: "var(--fb-text-secondary)",
            }}
          >
            Keine Bestandsartikel vorhanden
          </div>
        ) : (
          <div className="stock-items-list">
            {stockItems.map((item) => {
              const isLow = item.currentStock <= item.minStock;
              return (
                <div
                  key={item.id}
                  className={`stock-item-card ${isLow ? "low-stock" : ""}`}
                >
                  <div className="stock-item-info">
                    <div>
                      <h3 style={{ margin: 0, marginBottom: "4px" }}>
                        {item.name}
                      </h3>
                      {item.category && (
                        <div
                          style={{
                            fontSize: "var(--fb-font-size-sm)",
                            color: "var(--fb-text-secondary)",
                          }}
                        >
                          {item.category}
                        </div>
                      )}
                    </div>
                    <div className="stock-item-details">
                      <div>
                        <span style={{ color: "var(--fb-text-secondary)" }}>
                          Aktuell:
                        </span>
                        <span style={{ fontWeight: 600, marginLeft: "8px" }}>
                          {item.currentStock} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "var(--fb-text-secondary)" }}>
                          Minimum:
                        </span>
                        <span style={{ marginLeft: "8px" }}>
                          {item.minStock} {item.unit}
                        </span>
                      </div>
                      {item.maxStock && (
                        <div>
                          <span style={{ color: "var(--fb-text-secondary)" }}>
                            Maximum:
                          </span>
                          <span style={{ marginLeft: "8px" }}>
                            {item.maxStock} {item.unit}
                          </span>
                        </div>
                      )}
                      <div>
                        <span style={{ color: "var(--fb-text-secondary)" }}>
                          Preis:
                        </span>
                        <span style={{ marginLeft: "8px" }}>
                          {formatCurrency(item.unitPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="stock-item-actions">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.currentStock}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (isNaN(newValue) || newValue < 0) {
                          return; // Ignoriere ungültige Eingaben
                        }
                        handleUpdateStock(
                          item.id,
                          newValue,
                          item.currentStock,
                          item.name,
                        );
                      }}
                      onBlur={(e) => {
                        // Stelle sicher, dass der Wert beim Verlassen des Feldes validiert wird
                        const newValue = parseFloat(e.target.value);
                        if (isNaN(newValue) || newValue < 0) {
                          e.target.value = item.currentStock.toString();
                        }
                      }}
                      className="fb-input"
                      style={{ width: "100px" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
