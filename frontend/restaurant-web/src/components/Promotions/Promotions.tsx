import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";
import { useRetry } from "../../hooks/useRetry";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { useToast } from "../../contexts/ToastContext";
import { handleApiError } from "../../utils/errorUtils";
import { SkeletonCard, Skeleton } from "../common/Skeleton";
import "./Promotions.css";

interface Promotion {
  id: string;
  name: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  restaurantId: string;
}

export function Promotions() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Retry-Logik für Mutations
  const retryCreate = useRetry(
    async (data: any) => {
      return await api.post("/promotions", data);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryToggle = useRetry(
    async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await api.patch(`/promotions/${id}`, { isActive: !isActive });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryDelete = useRetry(
    async (id: string) => {
      return await api.delete(`/promotions/${id}`);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    startDate: "",
    endDate: "",
    isActive: true,
  });

  const loadPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/promotions?restaurantId=${restaurantId}`,
      );
      setPromotions(response.data || []);
    } catch (error: unknown) {
      console.error("Error loading promotions:", error);
      const appError = handleApiError(error);
      const errorMessage = appError.message;
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    if (restaurantId) {
      loadPromotions();
    }
  }, [restaurantId, loadPromotions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validierung
    if (!formData.name.trim()) {
      showToast("Bitte geben Sie einen Namen für die Aktion ein", "error");
      return;
    }

    if (formData.discountValue <= 0) {
      showToast("Rabatt-Wert muss größer als 0 sein", "error");
      return;
    }

    if (
      formData.discountType === "PERCENTAGE" &&
      formData.discountValue > 100
    ) {
      showToast("Prozent-Rabatt kann nicht über 100% liegen", "error");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      showToast("Bitte wählen Sie Start- und Enddatum", "error");
      return;
    }

    // Validierung: Enddatum muss nach Startdatum liegen
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate <= startDate) {
      showToast("Enddatum muss nach dem Startdatum liegen", "error");
      return;
    }

    // Validierung: Startdatum darf nicht in der Vergangenheit liegen (optional, kann entfernt werden)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      const confirmed = confirm(
        "Das Startdatum liegt in der Vergangenheit. Möchten Sie trotzdem fortfahren?",
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      await retryCreate.execute({
        ...formData,
        restaurantId,
      });
      showToast("Aktion erfolgreich erstellt!", "success");
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: 0,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        startDate: "",
        endDate: "",
        isActive: true,
      });
      loadPromotions();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await retryToggle.execute({ id, isActive });
      showToast("Status aktualisiert", "success");
      loadPromotions();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diese Aktion wirklich löschen?")) return;
    try {
      await retryDelete.execute(id);
      showToast("Aktion gelöscht", "success");
      loadPromotions();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="promotions">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Skeleton variant="text" width="200px" height={32} />
          <Skeleton variant="rectangular" width="140px" height={40} />
        </div>
        <div className="promotions-list">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="promotions">
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
          Aktionen ({promotions.length})
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="fb-button">
          {showForm ? "✕ Abbrechen" : "+ Neue Aktion"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="promotion-form">
          <h2 style={{ marginBottom: "20px" }}>Neue Aktion erstellen</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Beschreibung</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="fb-input"
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>Rabatt-Typ *</label>
              <select
                value={formData.discountType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountType: e.target.value as any,
                  })
                }
                className="fb-input"
              >
                <option value="PERCENTAGE">Prozent</option>
                <option value="FIXED">Fester Betrag</option>
              </select>
            </div>
            <div className="form-group">
              <label>Rabatt-Wert *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountValue: parseFloat(e.target.value) || 0,
                  })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Mindestbestellwert (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.minOrderAmount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minOrderAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="fb-input"
              />
            </div>
            <div className="form-group">
              <label>Max. Rabatt (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.maxDiscountAmount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDiscountAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="fb-input"
              />
            </div>
            <div className="form-group">
              <label>Startdatum *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Enddatum *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" className="fb-button">
              Erstellen
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="fb-button-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="promotions-list">
        {promotions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--fb-space-8)",
              color: "var(--fb-text-secondary)",
            }}
          >
            Keine Aktionen vorhanden
          </div>
        ) : (
          promotions.map((promo) => {
            const minOrder = promo.minOrderAmount ?? 0;
            return (
              <div key={promo.id} className="promotion-card">
                <div className="promotion-header">
                  <div>
                    <h3 style={{ margin: 0, marginBottom: "4px" }}>
                      {promo.name}
                    </h3>
                    {promo.description && (
                      <p
                        style={{
                          fontSize: "var(--fb-font-size-sm)",
                          color: "var(--fb-text-secondary)",
                          margin: 0,
                        }}
                      >
                        {promo.description}
                      </p>
                    )}
                  </div>
                  <div
                    className={`promotion-status ${promo.isActive ? "active" : "inactive"}`}
                  >
                    {promo.isActive ? "Aktiv" : "Inaktiv"}
                  </div>
                </div>

                <div className="promotion-details">
                  <div className="detail-item">
                    <span className="detail-label">Rabatt:</span>
                    <span className="detail-value">
                      {promo.discountType === "PERCENTAGE"
                        ? `${promo.discountValue}%`
                        : formatCurrency(promo.discountValue)}
                    </span>
                  </div>
                  {minOrder > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">Mindestbestellwert:</span>
                      <span className="detail-value">
                        {formatCurrency(minOrder)}
                      </span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Zeitraum:</span>
                    <span className="detail-value">
                      {formatDate(promo.startDate)} -{" "}
                      {formatDate(promo.endDate)}
                    </span>
                  </div>
                </div>

                <div className="promotion-actions">
                  <button
                    onClick={() => handleToggle(promo.id, promo.isActive)}
                    className={`fb-button-secondary ${promo.isActive ? "inactive-btn" : "active-btn"}`}
                    style={{ fontSize: "var(--fb-font-size-sm)" }}
                  >
                    {promo.isActive ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="fb-button-secondary"
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      color: "var(--fb-error)",
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
