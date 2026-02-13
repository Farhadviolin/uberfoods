import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import api from "../../utils/api";
import {
  logError,
  handleApiError,
  getErrorMessage,
} from "../../utils/errorUtils";
import "./MultiLocationManagement.css";

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  isActive: boolean;
  operatingHours: Record<string, string>;
  managerId?: string;
  managerName?: string;
  totalOrders: number;
  totalRevenue: number;
}

export function MultiLocationManagement() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Österreich",
    phone: "",
    email: "",
    isActive: true,
  });

  const fetchLocations = async () => {
    try {
      const response = await api.get(`/restaurants/${restaurantId}/locations`);
      setLocations(response.data || []);
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "MultiLocationManagement.fetchLocations");
      showToast(getErrorMessage(appError), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchLocations();
    }
  }, [restaurantId, fetchLocations]);

  const handleCreateLocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      await api.post(`/restaurants/${restaurantId}/locations`, formData);
      showToast("Standort wurde erstellt!", "success");
      setShowForm(false);
      setFormData({
        name: "",
        address: "",
        city: "",
        postalCode: "",
        country: "Österreich",
        phone: "",
        email: "",
        isActive: true,
      });
      fetchLocations();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "MultiLocationManagement.handleCreateLocation");
      showToast(getErrorMessage(appError), "error");
    }
  };

  const handleToggleStatus = async (locationId: string) => {
    try {
      await api.patch(
        `/restaurants/${restaurantId}/locations/${locationId}/toggle-status`,
      );
      showToast("Status wurde aktualisiert", "success");
      fetchLocations();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "MultiLocationManagement.handleToggleStatus");
      showToast(getErrorMessage(appError), "error");
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Möchten Sie diesen Standort wirklich löschen?")) return;

    try {
      await api.delete(`/restaurants/${restaurantId}/locations/${locationId}`);
      showToast("Standort wurde gelöscht", "success");
      fetchLocations();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "MultiLocationManagement.handleDeleteLocation");
      showToast(getErrorMessage(appError), "error");
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div>Lädt Standorte...</div>
      </div>
    );
  }

  return (
    <div className="multi-location-management">
      <div className="location-header">
        <h1>Multi-Standort-Verwaltung</h1>
        <button onClick={() => setShowForm(true)} className="fb-button">
          + Neuer Standort
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateLocation} className="location-form">
          <h2>Neuen Standort erstellen</h2>
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
            <div className="form-group full-width">
              <label>Adresse *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Stadt *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>PLZ *</label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) =>
                  setFormData({ ...formData, postalCode: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Land *</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Telefon *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
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
              />
            </div>
          </div>
          <div className="form-actions">
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

      <div className="locations-grid">
        {locations.length === 0 ? (
          <div className="empty-state">Keine Standorte vorhanden</div>
        ) : (
          locations.map((location) => (
            <div key={location.id} className="location-card">
              <div className="location-card-header">
                <h3>{location.name}</h3>
                <span
                  className={`status-badge ${location.isActive ? "active" : "inactive"}`}
                >
                  {location.isActive ? "Aktiv" : "Inaktiv"}
                </span>
              </div>
              <div className="location-details">
                <div>
                  <strong>Adresse:</strong> {location.address},{" "}
                  {location.postalCode} {location.city}
                </div>
                <div>
                  <strong>Telefon:</strong> {location.phone}
                </div>
                <div>
                  <strong>E-Mail:</strong> {location.email}
                </div>
                {location.managerName && (
                  <div>
                    <strong>Manager:</strong> {location.managerName}
                  </div>
                )}
              </div>
              <div className="location-stats">
                <div className="stat-item">
                  <div className="stat-value">{location.totalOrders}</div>
                  <div className="stat-label">Bestellungen</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    €{location.totalRevenue.toFixed(2)}
                  </div>
                  <div className="stat-label">Umsatz</div>
                </div>
              </div>
              <div className="location-actions">
                <button
                  onClick={() => handleToggleStatus(location.id)}
                  className="fb-button-secondary"
                >
                  {location.isActive ? "Deaktivieren" : "Aktivieren"}
                </button>
                <button
                  onClick={() => handleDeleteLocation(location.id)}
                  className="fb-button-danger"
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
