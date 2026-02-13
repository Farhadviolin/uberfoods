import { useState } from "react";
import { useCreateExpense } from "../../hooks/useAccounting";
import { useToast } from "../../contexts/ToastContext";
// import { formatCurrency } from '../../utils/formatters'; // Not used
import "./ExpenseEntry.css";

interface ExpenseEntryProps {
  restaurantId: string;
  period: string;
  onClose: () => void;
}

export function ExpenseEntry({
  restaurantId,
  period: _period,
  onClose,
}: ExpenseEntryProps) {
  const { showToast } = useToast();
  const createExpense = useCreateExpense();

  const [formData, setFormData] = useState({
    category: "WARE" as "WARE" | "PERSONAL" | "MIETE" | "BETRIEB" | "SONSTIGES",
    description: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    taxDeductible: true,
    receiptUrl: "",
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
      await createExpense.mutateAsync({
        restaurantId,
        category: formData.category,
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        taxDeductible: formData.taxDeductible,
        receiptUrl: formData.receiptUrl || undefined,
      });
      showToast("Ausgabe erfolgreich erstellt!", "success");
      onClose();
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Fehler beim Erstellen der Ausgabe",
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
          <h2>Neue Ausgabe</h2>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label>Kategorie *</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as any })
              }
              className="fb-input"
              required
            >
              <option value="WARE">Wareneinkauf</option>
              <option value="PERSONAL">Personal</option>
              <option value="MIETE">Miete</option>
              <option value="BETRIEB">Betriebskosten</option>
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
              placeholder="z.B. Warenlieferung, Gehalt, etc."
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

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.taxDeductible}
                onChange={(e) =>
                  setFormData({ ...formData, taxDeductible: e.target.checked })
                }
              />
              <span style={{ marginLeft: "8px" }}>Steuerlich abzugsfähig</span>
            </label>
          </div>

          <div className="form-group">
            <label>Beleg-URL (optional)</label>
            <input
              type="url"
              value={formData.receiptUrl}
              onChange={(e) =>
                setFormData({ ...formData, receiptUrl: e.target.value })
              }
              className="fb-input"
              placeholder="https://..."
            />
          </div>

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
              disabled={createExpense.isPending}
              className="fb-button"
            >
              {createExpense.isPending ? "Wird gespeichert..." : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
