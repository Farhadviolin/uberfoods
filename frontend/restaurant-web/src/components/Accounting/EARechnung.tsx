import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  useEARechnung,
  useGenerateEARechnung,
  useExpenses,
  useRevenues,
  useDeleteExpense,
  useDeleteRevenue,
  Expense,
  Revenue,
} from "../../hooks/useAccounting";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { ExpenseEntry } from "./ExpenseEntry";
import { RevenueEntry } from "./RevenueEntry";
import { Skeleton, SkeletonCard } from "../common/Skeleton";
import "./EARechnung.css";

export function EARechnung() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const [period, setPeriod] = useState<
    "current-month" | "last-month" | "current-quarter" | "current-year"
  >("current-month");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showRevenueForm, setShowRevenueForm] = useState(false);

  const {
    data: eaRechnung,
    isLoading,
    refetch,
  } = useEARechnung(restaurantId, period);
  const { data: expenses = [] } = useExpenses(restaurantId, period);
  const { data: revenues = [] } = useRevenues(restaurantId, period);
  const generateEA = useGenerateEARechnung();
  const deleteExpense = useDeleteExpense();
  const deleteRevenue = useDeleteRevenue();

  // Retry-Logik für Mutations
  const retryGenerate = useRetry(
    async ({
      restaurantId,
      period,
    }: {
      restaurantId: string;
      period: string;
    }) => {
      return await generateEA.mutateAsync({ restaurantId, period });
    },
    { maxRetries: 2, retryDelay: 2000, exponentialBackoff: true },
  );

  const retryDeleteExpense = useRetry(
    async ({ id, restaurantId }: { id: string; restaurantId: string }) => {
      return await deleteExpense.mutateAsync({ id, restaurantId });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryDeleteRevenue = useRetry(
    async ({ id, restaurantId }: { id: string; restaurantId: string }) => {
      return await deleteRevenue.mutateAsync({ id, restaurantId });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const handleGeneratePDF = async () => {
    if (!restaurantId) return;
    try {
      const result = await retryGenerate.execute({ restaurantId, period });
      showToast("E/A-Rechnung erfolgreich generiert!", "success");
      // Öffne PDF in neuem Tab
      if (result.pdfUrl) {
        window.open(result.pdfUrl, "_blank");
      }
      refetch();
    } catch (error: any) {
      showToast(
        error.response?.data?.message ||
          "Fehler beim Generieren der E/A-Rechnung",
        "error",
      );
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (
      !confirm(
        `Möchten Sie die Ausgabe "${expense.description}" wirklich löschen?`,
      )
    )
      return;
    try {
      await retryDeleteExpense.execute({
        id: expense.id,
        restaurantId: expense.restaurantId,
      });
      showToast("Ausgabe erfolgreich gelöscht!", "success");
      refetch();
    } catch (error: any) {
      showToast("Fehler beim Löschen der Ausgabe", "error");
    }
  };

  const handleDeleteRevenue = async (revenue: Revenue) => {
    if (
      !confirm(
        `Möchten Sie die Einnahme "${revenue.description}" wirklich löschen?`,
      )
    )
      return;
    try {
      await retryDeleteRevenue.execute({
        id: revenue.id,
        restaurantId: revenue.restaurantId,
      });
      showToast("Einnahme erfolgreich gelöscht!", "success");
      refetch();
    } catch (error: any) {
      showToast("Fehler beim Löschen der Einnahme", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="ea-rechnung">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Skeleton variant="text" width="300px" height={32} />
          <div style={{ display: "flex", gap: "12px" }}>
            <Skeleton variant="rectangular" width="200px" height={40} />
            <Skeleton variant="rectangular" width="180px" height={40} />
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="ea-rechnung">
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
        <h1
          style={{
            fontSize: "var(--fb-font-size-2xl)",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Einnahmen-Ausgaben-Rechnung
        </h1>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="fb-input"
            style={{ width: "auto", padding: "8px 12px" }}
          >
            <option value="current-month">Aktueller Monat</option>
            <option value="last-month">Letzter Monat</option>
            <option value="current-quarter">Aktuelles Quartal</option>
            <option value="current-year">Aktuelles Jahr</option>
          </select>
          <button
            onClick={handleGeneratePDF}
            disabled={generateEA.isPending}
            className="fb-button"
          >
            {generateEA.isPending ? "Wird generiert..." : "📄 PDF generieren"}
          </button>
        </div>
      </div>

      {/* Prominente Buchungs-Buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        <button
          onClick={() => setShowExpenseForm(true)}
          className="fb-button"
          style={{
            padding: "24px",
            fontSize: "var(--fb-font-size-lg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "var(--fb-error)",
            color: "white",
            border: "none",
            borderRadius: "var(--fb-radius-base)",
            cursor: "pointer",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span style={{ fontSize: "48px" }}>➖</span>
          <span style={{ fontWeight: 700, fontSize: "var(--fb-font-size-xl)" }}>
            Ausgabe buchen
          </span>
          <span style={{ fontSize: "var(--fb-font-size-sm)", opacity: 0.9 }}>
            Neue Ausgabe erfassen
          </span>
        </button>
        <button
          onClick={() => setShowRevenueForm(true)}
          className="fb-button"
          style={{
            padding: "24px",
            fontSize: "var(--fb-font-size-lg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "var(--fb-success)",
            color: "white",
            border: "none",
            borderRadius: "var(--fb-radius-base)",
            cursor: "pointer",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span style={{ fontSize: "48px" }}>➕</span>
          <span style={{ fontWeight: 700, fontSize: "var(--fb-font-size-xl)" }}>
            Einnahme buchen
          </span>
          <span style={{ fontSize: "var(--fb-font-size-sm)", opacity: 0.9 }}>
            Neue Einnahme erfassen
          </span>
        </button>
      </div>

      {eaRechnung && (
        <>
          <div className="ea-rechnung-content">
            {/* Einnahmen-Sektion */}
            <div className="ea-section">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h2>Einnahmen</h2>
                <button
                  onClick={() => setShowRevenueForm(true)}
                  className="fb-button-secondary"
                  style={{
                    fontSize: "var(--fb-font-size-sm)",
                    padding: "6px 12px",
                  }}
                >
                  + Einnahme hinzufügen
                </button>
              </div>
              <div className="ea-row">
                <span>Umsatzerlöse (Bestellungen)</span>
                <span className="ea-amount positive">
                  {formatCurrency(eaRechnung.revenue)}
                </span>
              </div>
              <div className="ea-row">
                <span>Sonstige Einnahmen</span>
                <span className="ea-amount positive">
                  {formatCurrency(eaRechnung.otherRevenue)}
                </span>
              </div>
              <div className="ea-row ea-total">
                <span style={{ fontWeight: 700 }}>Gesamteinnahmen</span>
                <span
                  className="ea-amount positive"
                  style={{ fontWeight: 700 }}
                >
                  {formatCurrency(eaRechnung.totalRevenue)}
                </span>
              </div>
            </div>

            {/* Ausgaben-Sektion */}
            <div className="ea-section">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h2>Ausgaben</h2>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="fb-button-secondary"
                  style={{
                    fontSize: "var(--fb-font-size-sm)",
                    padding: "6px 12px",
                  }}
                >
                  + Ausgabe hinzufügen
                </button>
              </div>
              <div className="ea-row">
                <span>Wareneinkauf</span>
                <span className="ea-amount negative">
                  {formatCurrency(eaRechnung.costOfGoods)}
                </span>
              </div>
              <div className="ea-row">
                <span>Personal</span>
                <span className="ea-amount negative">
                  {formatCurrency(eaRechnung.personnel)}
                </span>
              </div>
              <div className="ea-row">
                <span>Miete</span>
                <span className="ea-amount negative">
                  {formatCurrency(eaRechnung.rent)}
                </span>
              </div>
              <div className="ea-row">
                <span>Betriebskosten</span>
                <span className="ea-amount negative">
                  {formatCurrency(eaRechnung.utilities)}
                </span>
              </div>
              <div className="ea-row">
                <span>Sonstige Ausgaben</span>
                <span className="ea-amount negative">
                  {formatCurrency(eaRechnung.otherExpenses)}
                </span>
              </div>
              <div className="ea-row ea-total">
                <span style={{ fontWeight: 700 }}>Gesamtausgaben</span>
                <span
                  className="ea-amount negative"
                  style={{ fontWeight: 700 }}
                >
                  {formatCurrency(eaRechnung.totalExpenses)}
                </span>
              </div>
            </div>

            {/* Gewinn */}
            <div className="ea-section ea-profit">
              <div className="ea-row ea-total">
                <span
                  style={{
                    fontSize: "var(--fb-font-size-xl)",
                    fontWeight: 700,
                  }}
                >
                  Gewinn/Verlust
                </span>
                <span
                  className="ea-amount"
                  style={{
                    fontSize: "var(--fb-font-size-xl)",
                    fontWeight: 700,
                    color:
                      eaRechnung.profit >= 0
                        ? "var(--fb-success)"
                        : "var(--fb-error)",
                  }}
                >
                  {formatCurrency(eaRechnung.profit)}
                </span>
              </div>
            </div>
          </div>

          {/* Ausgaben-Liste */}
          <div className="ea-list-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "var(--fb-font-size-lg)",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                Ausgaben ({expenses.length})
              </h3>
              {expenses.length === 0 && (
                <span
                  style={{
                    fontSize: "var(--fb-font-size-sm)",
                    color: "var(--fb-text-secondary)",
                  }}
                >
                  Klicken Sie auf "Ausgabe buchen" um eine neue Ausgabe zu
                  erfassen
                </span>
              )}
            </div>
            {expenses.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--fb-text-secondary)",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-base)",
                  border: "2px dashed var(--fb-border-primary)",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
                <div
                  style={{
                    fontSize: "var(--fb-font-size-lg)",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Noch keine Ausgaben erfasst
                </div>
              </div>
            ) : (
              <div className="ea-list">
                {expenses.map((expense) => (
                  <div key={expense.id} className="ea-list-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                        {expense.description}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--fb-font-size-sm)",
                          color: "var(--fb-text-secondary)",
                        }}
                      >
                        {formatDate(expense.date)} • {expense.category}{" "}
                        {expense.taxDeductible && "• ✅ Abzugsfähig"}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        className="ea-amount negative"
                        style={{
                          fontSize: "var(--fb-font-size-lg)",
                          fontWeight: 700,
                        }}
                      >
                        {formatCurrency(expense.amount)}
                      </div>
                      <button
                        onClick={() => handleDeleteExpense(expense)}
                        className="fb-button-secondary"
                        style={{
                          padding: "6px 12px",
                          fontSize: "var(--fb-font-size-sm)",
                          color: "var(--fb-error)",
                        }}
                        title="Ausgabe löschen"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Einnahmen-Liste */}
          <div className="ea-list-section" style={{ marginTop: "32px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "var(--fb-font-size-lg)",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                Einnahmen ({revenues.length})
              </h3>
              {revenues.length === 0 && (
                <span
                  style={{
                    fontSize: "var(--fb-font-size-sm)",
                    color: "var(--fb-text-secondary)",
                  }}
                >
                  Klicken Sie auf "Einnahme buchen" um eine neue Einnahme zu
                  erfassen
                </span>
              )}
            </div>
            {revenues.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--fb-text-secondary)",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-base)",
                  border: "2px dashed var(--fb-border-primary)",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>💰</div>
                <div
                  style={{
                    fontSize: "var(--fb-font-size-lg)",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Noch keine Einnahmen erfasst
                </div>
              </div>
            ) : (
              <div className="ea-list">
                {revenues.map((revenue) => (
                  <div key={revenue.id} className="ea-list-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                        {revenue.description}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--fb-font-size-sm)",
                          color: "var(--fb-text-secondary)",
                        }}
                      >
                        {formatDate(revenue.date)} • {revenue.source}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        className="ea-amount positive"
                        style={{
                          fontSize: "var(--fb-font-size-lg)",
                          fontWeight: 700,
                        }}
                      >
                        {formatCurrency(revenue.amount)}
                      </div>
                      <button
                        onClick={() => handleDeleteRevenue(revenue)}
                        className="fb-button-secondary"
                        style={{
                          padding: "6px 12px",
                          fontSize: "var(--fb-font-size-sm)",
                          color: "var(--fb-error)",
                        }}
                        title="Einnahme löschen"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showExpenseForm && (
        <ExpenseEntry
          restaurantId={restaurantId || ""}
          period={period}
          onClose={() => {
            setShowExpenseForm(false);
            refetch();
          }}
        />
      )}

      {showRevenueForm && (
        <RevenueEntry
          restaurantId={restaurantId || ""}
          period={period}
          onClose={() => {
            setShowRevenueForm(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
