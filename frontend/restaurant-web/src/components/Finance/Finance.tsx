import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  useRestaurantFinance,
  useRestaurantTransactions,
} from "../../hooks/useFinance";
import { useToast } from "../../contexts/ToastContext";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { Skeleton, SkeletonStats, SkeletonList } from "../common/Skeleton";
import "./Finance.css";

/* eslint-disable react/jsx-no-undef */

export function Finance() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const {
    data: finance,
    isLoading: financeLoading,
    error: financeError,
  } = useRestaurantFinance(restaurantId, period);
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useRestaurantTransactions(restaurantId, period);

  const isLoading = financeLoading || transactionsLoading;

  useEffect(() => {
    if (financeError) {
      showToast("Fehler beim Laden der Finanzdaten", "error");
    }
  }, [financeError, showToast]);

  useEffect(() => {
    if (transactionsError) {
      showToast("Fehler beim Laden der Transaktionen", "error");
    }
  }, [transactionsError, showToast]);

  if (isLoading) {
    return (
      <div className="finance">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Skeleton variant="text" width="150px" height={32} />
          <Skeleton variant="rectangular" width="200px" height={40} />
        </div>
        <SkeletonStats />
        <div style={{ marginTop: "32px" }}>
          <div style={{ marginBottom: "20px" }}>
            <Skeleton
              variant="text"
              width="200px"
              height={24}
            />
          </div>
          <SkeletonList count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="finance">
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
          Finanzen
        </h1>
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

      {finance && (
        <div className="finance-overview">
          <div className="finance-card">
            <div
              className="finance-card-icon"
              style={{ backgroundColor: "var(--fb-success)" }}
            >
              💰
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">Gesamtumsatz</div>
              <div className="finance-card-value">
                {formatCurrency(finance.totalRevenue)}
              </div>
            </div>
          </div>

          <div className="finance-card">
            <div
              className="finance-card-icon"
              style={{ backgroundColor: "var(--fb-primary)" }}
            >
              📦
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">Bestellungen</div>
              <div className="finance-card-value">{finance.totalOrders}</div>
            </div>
          </div>

          <div className="finance-card">
            <div
              className="finance-card-icon"
              style={{ backgroundColor: "var(--fb-warning)" }}
            >
              📊
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">Ø Bestellwert</div>
              <div className="finance-card-value">
                {formatCurrency(finance.averageOrderValue)}
              </div>
            </div>
          </div>

          <div className="finance-card">
            <div
              className="finance-card-icon"
              style={{ backgroundColor: "var(--fb-error)" }}
            >
              💸
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">Ausgaben</div>
              <div className="finance-card-value">
                {formatCurrency(finance.totalExpenses || 0)}
              </div>
            </div>
          </div>

          <div className="finance-card">
            <div
              className="finance-card-icon"
              style={{ backgroundColor: "var(--fb-success)" }}
            >
              ✅
            </div>
            <div className="finance-card-content">
              <div className="finance-card-label">Gewinn</div>
              <div
                className="finance-card-value"
                style={{ color: "var(--fb-success)" }}
              >
                {formatCurrency(finance.netProfit || finance.totalRevenue)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="transactions-section">
        <h2
          style={{
            marginBottom: "20px",
            fontSize: "var(--fb-font-size-xl)",
            fontWeight: 600,
          }}
        >
          Transaktionen
        </h2>
        {transactions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--fb-space-8)",
              color: "var(--fb-text-secondary)",
            }}
          >
            Keine Transaktionen gefunden
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-info">
                  <div
                    className="transaction-type"
                    data-type={transaction.type.toLowerCase()}
                  >
                    {transaction.type === "REVENUE"
                      ? "💰"
                      : transaction.type === "EXPENSE"
                        ? "💸"
                        : "💳"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {transaction.description}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                      }}
                    >
                      {formatDate(transaction.date)}
                    </div>
                  </div>
                </div>
                <div
                  className="transaction-amount"
                  style={{
                    color:
                      transaction.type === "REVENUE"
                        ? "var(--fb-success)"
                        : transaction.type === "EXPENSE"
                          ? "var(--fb-error)"
                          : "var(--fb-text-primary)",
                  }}
                >
                  {transaction.type === "EXPENSE" ? "-" : "+"}
                  {formatCurrency(Math.abs(transaction.amount))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
