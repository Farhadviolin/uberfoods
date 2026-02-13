import { useState } from "react";
import { useCreateRevenue } from "../../hooks/useAccounting";
import { useToast } from "../../contexts/ToastContext";
import "./ExpenseEntry.css";

interface RevenueEntryProps {
  restaurantId: string;
  period: string;
  onClose: () => void;
}

export function RevenueEntry({
  restaurantId,
  period: _period,
  onClose,
}: RevenueEntryProps) {
  const { showToast } = useToast();
  const createRevenue = useCreateRevenue();

  const [formData, setFormData] = useState({
    source: "SONSTIGES" as "ORDER" | "SONSTIGES",
    description: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    orderId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      showToast("Bitte geben Sie eine Beschreibung ein", "error");
      return;
    }

    if (formData.amount <= 0) {
      showToast("Betrag muss größer als 0 sein", "error");
      return;
    }

    try {
      await createRevenue.mutateAsync({
        restaurantId,
        source: formData.source,
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        orderId: formData.orderId || undefined,
      });
      showToast("Einnahme erfolgreich erstellt!", "success");
      onClose();
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Fehler beim Erstellen der Einnahme",
        "error",
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content expense-entry-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Neue Einnahme</h2>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label>Quelle *</label>
            <select
              value={formData.source}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value as any })
              }
              className="fb-input"
              required
            >
              <option value="ORDER">Bestellung</option>
              <option value="SONSTIGES">Sonstiges</option>
            </select>
          </div>

          <div className="form-group">
            <label>Beschreibung *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="fb-input"
              placeholder="z.B. Catering-Auftrag, etc."
              required
            />
          </div>

          <div className="form-group">
            <label>Betrag (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: parseFloat(e.target.value) || 0,
                })
              }
              className="fb-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Datum *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="fb-input"
              required
            />
          </div>

          {formData.source === "ORDER" && (
            <div className="form-group">
              <label>Bestellungs-ID (optional)</label>
              <input
                type="text"
                value={formData.orderId}
                onChange={(e) =>
                  setFormData({ ...formData, orderId: e.target.value })
                }
                className="fb-input"
                placeholder="Order ID"
              />
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="fb-button-secondary"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={createRevenue.isPending}
              className="fb-button"
            >
              {createRevenue.isPending ? "Wird gespeichert..." : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
