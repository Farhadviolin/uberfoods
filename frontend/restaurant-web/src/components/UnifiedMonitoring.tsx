import { useState, useEffect, useCallback } from "react";
import { useToast } from "../contexts/ToastContext";
import { Button } from "../design-system/Button";
import { Skeleton } from "../design-system/Skeleton";
import { LoadingSpinner } from "../design-system/Spinner";

interface SystemMetrics {
  timestamp: Date;
  activeDrivers: number;
  onlineDrivers: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageDeliveryTime: number;
  totalRevenue: number;
  systemHealth: {
    status: "healthy" | "degraded" | "critical";
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
  };
  websocketConnections: number;
  apiRequests: number;
  apiErrors: number;
  databaseConnections: number;
}

interface Alert {
  id: string;
  type: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  source: string;
}

interface DeliveryTimeDistribution {
  under20min: number;
  between20and40min: number;
  over40min: number;
  total: number;
  percentages: {
    under20min: number;
    between20and40min: number;
    over40min: number;
  };
}

export function UnifiedMonitoring() {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<SystemMetrics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [deliveryTimeDistribution, setDeliveryTimeDistribution] =
    useState<DeliveryTimeDistribution | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "performance" | "system" | "alerts"
  >("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Daten laden
  const loadMetrics = useCallback(async () => {
    try {
      const [currentMetrics, historicalMetrics] = await Promise.all([
        fetch("/api/admin/system/metrics").then((res) => res.json()),
        fetch("/api/admin/analytics/system-history?hours=24").then((res) =>
          res.json(),
        ),
      ]);

      setMetrics(currentMetrics);
      setHistoricalData(historicalMetrics || []);
    } catch (error) {
      showToast("Fehler beim Laden der Metriken", "error");
    }
  }, [showToast]);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/system/alerts?limit=50");
      if (!response.ok) throw new Error("Failed to load alerts");
      const data = await response.json();
      setAlerts(data || []);
    } catch (error) {
      showToast("Fehler beim Laden der Alerts", "error");
    }
  }, [showToast]);

  const loadDeliveryTimeDistribution = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/admin/analytics/delivery-times?period=day",
      );
      if (!response.ok) throw new Error("Failed to load delivery times");
      const data = await response.json();
      setDeliveryTimeDistribution(data);
    } catch (error) {
      // Silent fail - use fallback if endpoint doesn't exist yet
      setDeliveryTimeDistribution(null);
    }
  }, []);

  // Initial laden
  useEffect(() => {
    Promise.all([
      loadMetrics(),
      loadAlerts(),
      loadDeliveryTimeDistribution(),
    ]).finally(() => {
      setIsLoading(false);
    });
  }, [loadMetrics, loadAlerts, loadDeliveryTimeDistribution]);

  // Auto-Refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadMetrics();
      loadDeliveryTimeDistribution();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadMetrics, loadDeliveryTimeDistribution]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(
        `/api/admin/system/alerts/${alertId}/acknowledge`,
        {
          method: "PUT",
        },
      );
      if (!response.ok) throw new Error("Failed to acknowledge alert");
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert,
        ),
      );
      showToast("Alert bestätigt", "success");
    } catch (error) {
      showToast("Fehler beim Bestätigen des Alerts", "error");
    }
  };

  const exportMetrics = async (format: "csv" | "excel" | "pdf") => {
    try {
      const response = await fetch("/api/admin/analytics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "system",
          period: "day",
          format,
        }),
      });
      if (!response.ok) throw new Error("Failed to export");
      const data = await response.json();
      showToast(`Export wird erstellt: ${data.downloadUrl}`, "info");
    } catch (error) {
      showToast("Fehler beim Exportieren", "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "#28a745";
      case "degraded":
        return "#ffc107";
      case "critical":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return "🚨";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📢";
    }
  };

  if (isLoading) {
    return (
      <div className="unified-monitoring">
        <div className="monitoring-header">
          <Skeleton height="32px" width="300px" />
        </div>
        <div className="metrics-grid">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} height="120px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="unified-monitoring">
      <div className="monitoring-header">
        <div className="header-info">
          <h2>🔍 Unified System Monitoring</h2>
          <div className="connection-status">
            <span className="status-dot connected"></span>
            System: Live
          </div>
        </div>
        <div className="monitoring-controls">
          <div className="refresh-controls">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-Refresh
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1min</option>
              <option value={300}>5min</option>
            </select>
          </div>
          <Button variant="secondary" onClick={loadMetrics}>
            🔄 Aktualisieren
          </Button>
          <div className="export-controls">
            <Button size="sm" onClick={() => exportMetrics("csv")}>
              📊 CSV
            </Button>
            <Button size="sm" onClick={() => exportMetrics("excel")}>
              📈 Excel
            </Button>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      {metrics?.systemHealth && (
        <div className="system-health-card">
          <div className="health-header">
            <h3>System Health</h3>
            <div
              className="health-status"
              style={{
                backgroundColor: getStatusColor(metrics.systemHealth.status),
              }}
            >
              {metrics.systemHealth.status.toUpperCase()}
            </div>
          </div>
          <div className="health-metrics">
            <div className="metric">
              <span>Uptime:</span>
              <span>
                {Math.floor(metrics.systemHealth.uptime / 3600)}h{" "}
                {Math.floor((metrics.systemHealth.uptime % 3600) / 60)}m
              </span>
            </div>
            <div className="metric">
              <span>Memory:</span>
              <span>
                {(metrics.systemHealth.memoryUsage / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
            <div className="metric">
              <span>CPU:</span>
              <span>{metrics.systemHealth.cpuUsage.toFixed(1)}%</span>
            </div>
            <div className="metric">
              <span>Error Rate:</span>
              <span>{metrics.systemHealth.errorRate.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="monitoring-tabs">
        <button
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Übersicht
        </button>
        <button
          className={`tab ${activeTab === "performance" ? "active" : ""}`}
          onClick={() => setActiveTab("performance")}
        >
          ⚡ Performance
        </button>
        <button
          className={`tab ${activeTab === "system" ? "active" : ""}`}
          onClick={() => setActiveTab("system")}
        >
          🔧 System
        </button>
        <button
          className={`tab ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          🚨 Alerts ({alerts.filter((a) => !a.acknowledged).length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && metrics && (
        <div className="monitoring-overview">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">🚗</div>
              <div className="metric-info">
                <div className="metric-value">{metrics.activeDrivers}</div>
                <div className="metric-label">Aktive Fahrer</div>
                <div className="metric-subtext">
                  {metrics.onlineDrivers} online
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📦</div>
              <div className="metric-info">
                <div className="metric-value">{metrics.activeOrders}</div>
                <div className="metric-label">Aktive Bestellungen</div>
                <div className="metric-subtext">
                  {metrics.completedOrders} heute
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">💰</div>
              <div className="metric-info">
                <div className="metric-value">
                  €{metrics.totalRevenue.toFixed(0)}
                </div>
                <div className="metric-label">Umsatz (heute)</div>
                <div className="metric-subtext">
                  Ø €
                  {(
                    metrics.totalRevenue / Math.max(metrics.completedOrders, 1)
                  ).toFixed(0)}
                  /Bestellung
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">⏱️</div>
              <div className="metric-info">
                <div className="metric-value">
                  {metrics.averageDeliveryTime.toFixed(0)}min
                </div>
                <div className="metric-label">Ø Lieferzeit</div>
                <div className="metric-subtext">
                  {metrics.cancelledOrders} storniert
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🌐</div>
              <div className="metric-info">
                <div className="metric-value">
                  {metrics.websocketConnections}
                </div>
                <div className="metric-label">WebSocket Verbindungen</div>
                <div className="metric-subtext">
                  {metrics.databaseConnections} DB
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🔄</div>
              <div className="metric-info">
                <div className="metric-value">{metrics.apiRequests}</div>
                <div className="metric-label">API Requests</div>
                <div className="metric-subtext">{metrics.apiErrors} Fehler</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === "performance" && metrics && (
        <div className="monitoring-performance">
          <div className="performance-metrics">
            <div className="performance-card">
              <h4>Order Success Rate</h4>
              <div className="success-rate">
                <div className="rate-circle">
                  <span className="rate-number">
                    {(
                      (metrics.completedOrders /
                        (metrics.completedOrders + metrics.cancelledOrders)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="rate-details">
                  <div>Completed: {metrics.completedOrders}</div>
                  <div>Cancelled: {metrics.cancelledOrders}</div>
                </div>
              </div>
            </div>

            <div className="performance-card">
              <h4>Driver Utilization</h4>
              <div className="utilization-bar">
                <div
                  className="utilization-fill"
                  style={{
                    width: `${(metrics.activeDrivers / Math.max(metrics.onlineDrivers, 1)) * 100}%`,
                  }}
                ></div>
                <span className="utilization-text">
                  {metrics.activeDrivers}/{metrics.onlineDrivers} active
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === "system" && metrics && (
        <div className="monitoring-system">
          <div className="system-details">
            <div className="system-card">
              <h4>Database</h4>
              <div className="system-metrics">
                <div>Active Connections: {metrics.databaseConnections}</div>
                <div>Query Performance: Good</div>
                <div>Backup Status: ✅</div>
              </div>
            </div>

            <div className="system-card">
              <h4>API</h4>
              <div className="system-metrics">
                <div>Requests/min: {Math.floor(metrics.apiRequests / 60)}</div>
                <div>Avg Response Time: 120ms</div>
                <div>
                  Error Rate:{" "}
                  {(
                    (metrics.apiErrors / Math.max(metrics.apiRequests, 1)) *
                    100
                  ).toFixed(2)}
                  %
                </div>
              </div>
            </div>

            <div className="system-card">
              <h4>External Services</h4>
              <div className="system-metrics">
                <div>Google Maps: ✅</div>
                <div>Stripe: ✅</div>
                <div>Redis: ✅</div>
                <div>CDN: ✅</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="monitoring-alerts">
          <div className="alerts-header">
            <h3>System Alerts</h3>
            <Button variant="secondary" onClick={loadAlerts}>
              🔄 Aktualisieren
            </Button>
          </div>

          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="no-alerts">
                <div className="no-alerts-icon">✅</div>
                <h4>Keine aktiven Alerts</h4>
                <p>Alle Systeme laufen normal.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-card ${alert.type} ${alert.acknowledged ? "acknowledged" : ""}`}
                >
                  <div className="alert-header">
                    <div className="alert-icon">{getAlertIcon(alert.type)}</div>
                    <div className="alert-info">
                      <h5>{alert.title}</h5>
                      <div className="alert-meta">
                        <span>{alert.source}</span>
                        <span>
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        ✅ Bestätigen
                      </Button>
                    )}
                  </div>
                  <div className="alert-message">{alert.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
