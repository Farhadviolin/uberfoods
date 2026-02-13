import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  useRestaurantStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useToggleStaffStatus,
  Staff,
} from "../../hooks/useStaff";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import { formatCurrency } from "../../utils/formatters";
import { Skeleton, SkeletonList } from "../common/Skeleton";
import "./Staff.css";

export function StaffManagement() {
  const { restaurantId } = useAuth();
  const { data: staff = [], isLoading } = useRestaurantStaff(restaurantId);
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "WAITER",
    hourlyRate: 0,
    permissions: [] as string[],
  });

  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const toggleStatus = useToggleStaffStatus();

  // Retry-Logik für Mutations
  const retryCreate = useRetry(
    async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      return await createStaff.mutateAsync({ restaurantId, data });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryUpdate = useRetry(
    async ({ id, data }: { id: string; data: any }) => {
      return await updateStaff.mutateAsync({ id, data });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryDelete = useRetry(
    async (id: string) => {
      return await deleteStaff.mutateAsync(id);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryToggle = useRetry(
    async (id: string) => {
      return await toggleStatus.mutateAsync(id);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  // Validierungsfunktionen
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Telefon ist optional
    // Unterstützt verschiedene Telefonnummernformate (international)
    const phoneRegex = /^[\d\s+()-]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    // Validierung
    if (!formData.name.trim()) {
      showToast("Bitte geben Sie einen Namen ein", "error");
      return;
    }

    if (!validateEmail(formData.email)) {
      showToast("Bitte geben Sie eine gültige E-Mail-Adresse ein", "error");
      return;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      showToast(
        "Bitte geben Sie eine gültige Telefonnummer ein (mindestens 6 Ziffern)",
        "error",
      );
      return;
    }

    if (formData.hourlyRate < 0) {
      showToast("Stundenlohn kann nicht negativ sein", "error");
      return;
    }

    try {
      if (editingStaff) {
        await retryUpdate.execute({ id: editingStaff.id, data: formData });
        showToast("Mitarbeiter aktualisiert!", "success");
      } else {
        await retryCreate.execute({ restaurantId, data: formData });
        showToast("Mitarbeiter hinzugefügt!", "success");
      }
      setShowForm(false);
      setEditingStaff(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "WAITER",
        hourlyRate: 0,
        permissions: [],
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Fehler beim Speichern";
      showToast(errorMessage, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Mitarbeiter wirklich löschen?")) return;
    try {
      await retryDelete.execute(id);
      showToast("Mitarbeiter gelöscht", "success");
    } catch (error: any) {
      showToast("Fehler beim Löschen", "error");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await retryToggle.execute(id);
      showToast("Status aktualisiert", "success");
    } catch (error: any) {
      showToast("Fehler beim Aktualisieren", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="staff-management">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Skeleton variant="text" width="200px" height={32} />
          <Skeleton variant="rectangular" width="180px" height={40} />
        </div>
        <SkeletonList count={5} />
      </div>
    );
  }

  return (
    <div className="staff-management">
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
          Mitarbeiter ({staff.length})
        </h1>
        <button
          onClick={() => {
            setEditingStaff(null);
            setShowForm(true);
          }}
          className="fb-button"
        >
          + Neuer Mitarbeiter
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="staff-form">
          <h2 style={{ marginBottom: "20px" }}>
            {editingStaff ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
          </h2>
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
              <label>E-Mail *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="fb-input"
                required
                placeholder="beispiel@email.com"
              />
              {formData.email && !validateEmail(formData.email) && (
                <div
                  style={{
                    fontSize: "var(--fb-font-size-xs)",
                    color: "var(--fb-error)",
                    marginTop: "4px",
                  }}
                >
                  Bitte geben Sie eine gültige E-Mail-Adresse ein
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="fb-input"
                placeholder="+43 123 456789"
              />
              {formData.phone && !validatePhone(formData.phone) && (
                <div
                  style={{
                    fontSize: "var(--fb-font-size-xs)",
                    color: "var(--fb-error)",
                    marginTop: "4px",
                  }}
                >
                  Bitte geben Sie eine gültige Telefonnummer ein (mindestens 6
                  Ziffern)
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Rolle *</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="fb-input"
                required
              >
                <option value="MANAGER">Manager</option>
                <option value="CHEF">Koch</option>
                <option value="WAITER">Kellner</option>
                <option value="CASHIER">Kassierer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Stundenlohn (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hourlyRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="fb-input"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" className="fb-button">
              {editingStaff ? "Aktualisieren" : "Erstellen"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingStaff(null);
              }}
              className="fb-button-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="staff-list">
        {staff.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--fb-space-8)",
              color: "var(--fb-text-secondary)",
            }}
          >
            Keine Mitarbeiter vorhanden
          </div>
        ) : (
          staff.map((member) => (
            <div key={member.id} className="staff-card">
              <div className="staff-info">
                <div>
                  <h3 style={{ margin: 0, marginBottom: "4px" }}>
                    {member.name}
                  </h3>
                  <div
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      color: "var(--fb-text-secondary)",
                    }}
                  >
                    {member.email} • {member.phone || "Keine Telefonnummer"}
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    <span className="staff-role">{member.role}</span>
                    {member.hourlyRate && (
                      <span
                        style={{
                          marginLeft: "12px",
                          color: "var(--fb-text-secondary)",
                        }}
                      >
                        {formatCurrency(member.hourlyRate)}/h
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`staff-status ${member.isActive ? "active" : "inactive"}`}
                >
                  {member.isActive ? "Aktiv" : "Inaktiv"}
                </div>
              </div>
              <div className="staff-actions">
                <button
                  onClick={() => handleToggle(member.id)}
                  className="fb-button-secondary"
                  style={{ fontSize: "var(--fb-font-size-sm)" }}
                >
                  {member.isActive ? "Deaktivieren" : "Aktivieren"}
                </button>
                <button
                  onClick={() => {
                    setEditingStaff(member);
                    setFormData({
                      name: member.name,
                      email: member.email,
                      phone: member.phone || "",
                      role: member.role,
                      hourlyRate: member.hourlyRate || 0,
                      permissions: member.permissions || [],
                    });
                    setShowForm(true);
                  }}
                  className="fb-button-secondary"
                  style={{ fontSize: "var(--fb-font-size-sm)" }}
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
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
          ))
        )}
      </div>
    </div>
  );
}
