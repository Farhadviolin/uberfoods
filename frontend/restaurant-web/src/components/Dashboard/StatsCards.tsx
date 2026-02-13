import { RestaurantStats } from "../../hooks/useRestaurant";
import { formatCurrency } from "../../utils/formatters";
import "./StatsCards.css";

interface StatsCardsProps {
  stats: RestaurantStats | null | undefined;
  period: "7d" | "30d" | "90d";
}

export function StatsCards({ stats, period }: StatsCardsProps) {
  // Verwende API-Daten statt clientseitige Berechnung
  const totalOrders = stats?.totalOrders || 0;
  const completedOrders = stats?.completedOrders || 0;
  const activeOrders = stats?.activeOrders || 0;
  const totalRevenue = stats?.totalRevenue || 0;
  const averageOrderValue = stats?.averageOrderValue || 0;
  const completionRate = stats?.completionRate || 0;

  return (
    <div className="stats-cards">
      <div className="stat-card">
        <div
          className="stat-icon"
          style={{ backgroundColor: "var(--fb-primary)" }}
        >
          📦
        </div>
        <div className="stat-content">
          <div className="stat-label">Bestellungen ({period})</div>
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-detail">
            {completedOrders} abgeschlossen • {activeOrders} aktiv
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div
          className="stat-icon"
          style={{ backgroundColor: "var(--fb-success)" }}
        >
          💰
        </div>
        <div className="stat-content">
          <div className="stat-label">Gesamtumsatz</div>
          <div className="stat-value">{formatCurrency(totalRevenue)}</div>
          <div className="stat-detail">
            Ø {formatCurrency(averageOrderValue)} pro Bestellung
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div
          className="stat-icon"
          style={{ backgroundColor: "var(--fb-warning)" }}
        >
          ✅
        </div>
        <div className="stat-content">
          <div className="stat-label">Erfolgsrate</div>
          <div className="stat-value">{completionRate.toFixed(1)}%</div>
          <div className="stat-detail">
            {completedOrders} von {totalOrders} Bestellungen
          </div>
        </div>
      </div>

      {stats && (
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: "var(--fb-primary)" }}
          >
            🍽️
          </div>
          <div className="stat-content">
            <div className="stat-label">Gerichte</div>
            <div className="stat-value">{stats.totalDishes}</div>
            <div className="stat-detail">{stats.activeDishes} verfügbar</div>
          </div>
        </div>
      )}
    </div>
  );
}
