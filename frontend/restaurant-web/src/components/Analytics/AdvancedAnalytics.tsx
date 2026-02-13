import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  useRestaurantAnalytics,
  useRestaurantPerformance,
} from "../../hooks/useRestaurant";
import { formatCurrency } from "../../utils/formatters";
import { Skeleton, SkeletonCard, SkeletonChart } from "../common/Skeleton";
import "./AdvancedAnalytics.css";

export function AdvancedAnalytics() {
  const { restaurantId } = useAuth();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const { data: analytics, isLoading: analyticsLoading } =
    useRestaurantAnalytics(period);
  const { data: performance, isLoading: performanceLoading } =
    useRestaurantPerformance(period);

  const isLoading = analyticsLoading || performanceLoading;

  if (isLoading) {
    return (
      <div className="advanced-analytics">
        <div className="analytics-header">
          <Skeleton variant="text" width="250px" height={32} />
          <div className="period-selector">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton
                key={idx}
                variant="rectangular"
                width="80px"
                height={36}
              />
            ))}
          </div>
        </div>
        <div className="analytics-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="advanced-analytics">
      <div className="analytics-header">
        <h1>Erweiterte Analytics</h1>
        <div className="period-selector">
          <button
            className={period === "7d" ? "active" : ""}
            onClick={() => setPeriod("7d")}
          >
            7 Tage
          </button>
          <button
            className={period === "30d" ? "active" : ""}
            onClick={() => setPeriod("30d")}
          >
            30 Tage
          </button>
          <button
            className={period === "90d" ? "active" : ""}
            onClick={() => setPeriod("90d")}
          >
            90 Tage
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Customer Lifetime Value (CLV)</h3>
          <div className="metric-value">
            {analytics && (analytics as any).customerLifetimeValue
              ? formatCurrency((analytics as any).customerLifetimeValue)
              : "N/A"}
          </div>
          <p className="metric-description">
            Durchschnittlicher Wert eines Kunden über seine gesamte Lebensdauer
          </p>
        </div>

        <div className="analytics-card">
          <h3>Umsatz-Prognose</h3>
          <div className="metric-value">
            {analytics && (analytics as any).revenueForecast
              ? formatCurrency((analytics as any).revenueForecast)
              : "N/A"}
          </div>
          <p className="metric-description">
            Vorhergesagter Umsatz für die nächste Periode
          </p>
        </div>

        <div className="analytics-card">
          <h3>Menu Engineering Score</h3>
          <div className="metric-value">
            {analytics && (analytics as any).menuEngineeringScore
              ? `${(analytics as any).menuEngineeringScore}%`
              : "N/A"}
          </div>
          <p className="metric-description">
            Optimierungsgrad des Menüs basierend auf Popularität und
            Profitabilität
          </p>
        </div>

        <div className="analytics-card">
          <h3>Durchschnittliche Bestellwert</h3>
          <div className="metric-value">
            {analytics?.averageOrderValue
              ? formatCurrency(analytics.averageOrderValue)
              : "N/A"}
          </div>
          <p className="metric-description">
            Durchschnittlicher Wert pro Bestellung
          </p>
        </div>

        <div className="analytics-card">
          <h3>Wiederholungsrate</h3>
          <div className="metric-value">
            {analytics && (analytics as any).repeatCustomerRate
              ? `${(analytics as any).repeatCustomerRate}%`
              : "N/A"}
          </div>
          <p className="metric-description">
            Prozentsatz der Kunden, die erneut bestellen
          </p>
        </div>

        <div className="analytics-card">
          <h3>Peak-Zeiten Analyse</h3>
          <div className="metric-value">
            {performance?.peakHours ? performance.peakHours.join(", ") : "N/A"}
          </div>
          <p className="metric-description">
            Stunden mit den meisten Bestellungen
          </p>
        </div>
      </div>

      {analytics && (analytics as any).topCustomers && (analytics as any).topCustomers.length > 0 && (
        <div className="analytics-section">
          <h2>Top-Kunden</h2>
          <div className="top-customers-list">
            {(analytics as any).topCustomers.map((customer: any, index: number) => (
              <div key={customer.id || index} className="customer-item">
                <div className="customer-rank">#{index + 1}</div>
                <div className="customer-info">
                  <div className="customer-name">
                    {customer.name || "Anonym"}
                  </div>
                  <div className="customer-stats">
                    {customer.totalOrders || 0} Bestellungen •{" "}
                    {formatCurrency(customer.totalSpent || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
