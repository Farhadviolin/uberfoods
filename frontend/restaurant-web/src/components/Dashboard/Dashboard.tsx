import { useState, useCallback } from "react";
import {
  useRestaurantStats,
  useRestaurantRevenue,
  useRestaurantAnalytics,
  useRestaurantPerformance,
  useRestaurantRatingsSummary,
} from "../../hooks/useRestaurant";
import { useRestaurantOrders } from "../../hooks/useOrders";
import { useAuth } from "../../contexts/AuthContext";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useQueryClient } from "@tanstack/react-query";
import { StatsCards } from "./StatsCards";
import { RevenueChart } from "./RevenueChart";
import { TopDishes } from "./TopDishes";
import { SkeletonStats, SkeletonChart, SkeletonCard } from "../common/Skeleton";
import "./Dashboard.css";

export function Dashboard() {
  const { restaurantId } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "performance"
  >("overview");

  const { data: stats, isLoading: statsLoading } = useRestaurantStats(period);
  const { data: revenueData = [], isLoading: revenueLoading } =
    useRestaurantRevenue(period);
  const { data: ordersData = [], isLoading: ordersLoading } =
    useRestaurantOrders(restaurantId);
  const { data: analytics, isLoading: analyticsLoading } =
    useRestaurantAnalytics(period);
  const { data: performance, isLoading: performanceLoading } =
    useRestaurantPerformance(period);
  const { data: ratingsSummary } = useRestaurantRatingsSummary(restaurantId);

  // WebSocket für Real-time Updates
  const handleOrderUpdate = useCallback(
    (_order: any) => {
      // Invalidate Orders Query für Live-Updates
      queryClient.invalidateQueries({ queryKey: ["orders", restaurantId] });
      queryClient.invalidateQueries({
        queryKey: ["restaurant-stats", restaurantId],
      });
    },
    [queryClient, restaurantId],
  );

  const handleNewOrder = useCallback(
    (order: any) => {
      // Neue Order erhalten - Cache aktualisieren und Notification zeigen
      queryClient.invalidateQueries({ queryKey: ["orders", restaurantId] });
      queryClient.invalidateQueries({
        queryKey: ["restaurant-stats", restaurantId],
      });

      // Browser Notification (falls erlaubt)
      if (Notification.permission === "granted") {
        new Notification("Neue Bestellung!", {
          body: `Bestellung #${order?.id ?? ""} erhalten`,
          icon: "/favicon.ico",
        });
      }
    },
    [queryClient, restaurantId],
  );

  const handleAnalyticsUpdate = useCallback(
    (_data: any) => {
      // Analytics-Daten aktualisiert
      queryClient.invalidateQueries({
        queryKey: ["restaurant-analytics", restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["restaurant-performance", restaurantId],
      });
    },
    [queryClient, restaurantId],
  );

  const { isConnected: wsConnected, connectionError: _wsError } = useWebSocket({
    restaurantId,
    onOrderUpdate: handleOrderUpdate,
    onNewOrder: handleNewOrder,
    onOrderCreated: handleOrderUpdate,
    onRestaurantAnalyticsUpdate: handleAnalyticsUpdate,
  });

  // Sicherstellen, dass orders immer ein Array ist (auch bei Fehlern)
  const orders = Array.isArray(ordersData) ? ordersData : [];

  const isLoading = statsLoading || revenueLoading || ordersLoading;

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "var(--fb-font-size-2xl)",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Dashboard
        </h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* WebSocket Status Indicator */}
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
            {wsConnected ? "Live" : "Offline"}
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "7d" | "30d" | "90d")}
            className="fb-input"
            style={{ width: "auto", padding: "8px 12px" }}
          >
            <option value="7d">Letzte 7 Tage</option>
            <option value="30d">Letzte 30 Tage</option>
            <option value="90d">Letzte 90 Tage</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--fb-border)",
          marginBottom: "24px",
        }}
      >
        {["overview", "analytics", "performance"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: "12px 20px",
              border: "none",
              background: "none",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--fb-primary)"
                  : "2px solid transparent",
              color:
                activeTab === tab
                  ? "var(--fb-primary)"
                  : "var(--fb-text-secondary)",
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab === "overview"
              ? "Übersicht"
              : tab === "analytics"
                ? "Analysen"
                : "Leistung"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          {isLoading ? (
            <>
              <SkeletonStats />
              <SkeletonChart />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatsCards stats={stats} period={period} />
              <RevenueChart revenueData={revenueData} period={period} />
              <TopDishes orders={orders} />
            </>
          )}
        </>
      )}

      {activeTab === "analytics" && (
        <div>
          {analyticsLoading ? (
            <div className="loading">
              <div>Lädt Analysen...</div>
            </div>
          ) : analytics ? (
            <div style={{ display: "grid", gap: "24px" }}>
              {/* Revenue Analytics */}
              <div
                style={{
                  padding: "20px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-md)",
                }}
              >
                <h2 style={{ marginBottom: "16px" }}>Umsatz-Analysen</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Gesamtumsatz
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                      }}
                    >
                      {new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      }).format(analytics.revenue.total)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Durchschnitt
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                      }}
                    >
                      {new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      }).format(analytics.revenue.average)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Wachstum
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                        color:
                          analytics.revenue.growth >= 0
                            ? "var(--fb-success)"
                            : "var(--fb-error)",
                      }}
                    >
                      {analytics.revenue.growth >= 0 ? "+" : ""}
                      {analytics.revenue.growth.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders Analytics */}
              <div
                style={{
                  padding: "20px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-md)",
                }}
              >
                <h2 style={{ marginBottom: "16px" }}>Bestell-Analysen</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Gesamtbestellungen
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                      }}
                    >
                      {analytics.orders.total}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Abgeschlossen
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                        color: "var(--fb-success)",
                      }}
                    >
                      {analytics.orders.completed}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Storniert
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                        color: "var(--fb-error)",
                      }}
                    >
                      {analytics.orders.cancelled}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Ø Bearbeitungszeit
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                      }}
                    >
                      {Math.round(analytics.orders.averageTime)} Min
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Analytics */}
              <div
                style={{
                  padding: "20px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-md)",
                }}
              >
                <h2 style={{ marginBottom: "16px" }}>Kunden-Analysen</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Gesamtkunden
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                      }}
                    >
                      {analytics.customers.total}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Neue Kunden
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                        color: "var(--fb-success)",
                      }}
                    >
                      {analytics.customers.new}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Wiederkehrende
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                        color: "var(--fb-primary)",
                      }}
                    >
                      {analytics.customers.returning}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Selling Dishes */}
              {analytics.dishes.topSelling.length > 0 && (
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "var(--fb-bg-secondary)",
                    borderRadius: "var(--fb-radius-md)",
                  }}
                >
                  <h2 style={{ marginBottom: "16px" }}>Top-Gerichte</h2>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {analytics.dishes.topSelling.map((dish, idx) => (
                      <div
                        key={dish.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          backgroundColor: "var(--fb-bg)",
                          borderRadius: "var(--fb-radius-base)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              backgroundColor: "var(--fb-primary)",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{dish.name}</div>
                            <div
                              style={{
                                fontSize: "var(--fb-font-size-sm)",
                                color: "var(--fb-text-secondary)",
                              }}
                            >
                              {dish.quantity}x verkauft
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--fb-success)",
                          }}
                        >
                          {new Intl.NumberFormat("de-DE", {
                            style: "currency",
                            currency: "EUR",
                          }).format(dish.revenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ratings Summary */}
              {ratingsSummary && (
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "var(--fb-bg-secondary)",
                    borderRadius: "var(--fb-radius-md)",
                  }}
                >
                  <h2 style={{ marginBottom: "16px" }}>Bewertungen</h2>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-3xl)",
                        fontWeight: 700,
                      }}
                    >
                      {ratingsSummary.average.toFixed(1)}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "var(--fb-font-size-sm)",
                          color: "var(--fb-text-secondary)",
                        }}
                      >
                        Durchschnitt
                      </div>
                      <div
                        style={{
                          fontSize: "var(--fb-font-size-sm)",
                          color: "var(--fb-text-secondary)",
                        }}
                      >
                        {ratingsSummary.total} Bewertungen
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div
                        key={rating}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div style={{ width: "40px", textAlign: "right" }}>
                          {rating} ⭐
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: "8px",
                            backgroundColor: "var(--fb-bg)",
                            borderRadius: "var(--fb-radius-base)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${ratingsSummary.total > 0 ? (ratingsSummary.distribution[rating as keyof typeof ratingsSummary.distribution] / ratingsSummary.total) * 100 : 0}%`,
                              backgroundColor: "var(--fb-primary)",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            width: "40px",
                            textAlign: "left",
                            fontSize: "var(--fb-font-size-sm)",
                          }}
                        >
                          {
                            ratingsSummary.distribution[
                              rating as keyof typeof ratingsSummary.distribution
                            ]
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "48px",
                color: "var(--fb-text-secondary)",
              }}
            >
              Keine Analysedaten verfügbar
            </div>
          )}
        </div>
      )}

      {activeTab === "performance" && (
        <div>
          {performanceLoading ? (
            <div className="loading">
              <div>Lädt Leistungsdaten...</div>
            </div>
          ) : performance ? (
            <div style={{ display: "grid", gap: "24px" }}>
              {/* Performance Metrics */}
              <div
                style={{
                  padding: "20px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-md)",
                }}
              >
                <h2 style={{ marginBottom: "16px" }}>Leistungsmetriken</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Ø Zubereitungszeit
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                      }}
                    >
                      {Math.round(performance.averagePreparationTime)} Min
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Ø Lieferzeit
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                      }}
                    >
                      {Math.round(performance.averageDeliveryTime)} Min
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Pünktlichkeitsrate
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                        color:
                          performance.onTimeDeliveryRate >= 90
                            ? "var(--fb-success)"
                            : performance.onTimeDeliveryRate >= 70
                              ? "var(--fb-warning)"
                              : "var(--fb-error)",
                      }}
                    >
                      {performance.onTimeDeliveryRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      Kundenzufriedenheit
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-2xl)",
                        fontWeight: 700,
                        color:
                          performance.customerSatisfaction >= 4
                            ? "var(--fb-success)"
                            : performance.customerSatisfaction >= 3
                              ? "var(--fb-warning)"
                              : "var(--fb-error)",
                      }}
                    >
                      {performance.customerSatisfaction.toFixed(1)}/5
                    </div>
                  </div>
                </div>
              </div>

              {/* Peak Hours */}
              {performance.peakHours.length > 0 && (
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "var(--fb-bg-secondary)",
                    borderRadius: "var(--fb-radius-md)",
                  }}
                >
                  <h2 style={{ marginBottom: "16px" }}>Hauptzeiten</h2>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {performance.peakHours.map((peak) => (
                      <div
                        key={peak.hour}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "60px",
                            textAlign: "right",
                            fontWeight: 600,
                          }}
                        >
                          {peak.hour}:00
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: "24px",
                            backgroundColor: "var(--fb-bg)",
                            borderRadius: "var(--fb-radius-base)",
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(peak.orderCount / Math.max(...performance.peakHours.map((p) => p.orderCount))) * 100}%`,
                              backgroundColor: "var(--fb-primary)",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            width: "60px",
                            textAlign: "left",
                            fontSize: "var(--fb-font-size-sm)",
                            fontWeight: 600,
                          }}
                        >
                          {peak.orderCount} Bestellungen
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "48px",
                color: "var(--fb-text-secondary)",
              }}
            >
              Keine Leistungsdaten verfügbar
            </div>
          )}
        </div>
      )}
    </div>
  );
}
