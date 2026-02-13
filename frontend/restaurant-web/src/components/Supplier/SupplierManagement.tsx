import { useState, FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import {
  useSuppliers,
  useSupplierOrders,
  useCreateSupplier,
  useCreateSupplierOrder,
  useToggleSupplierStatus,
} from "../../hooks/useSuppliers";
import { formatCurrency } from "../../utils/formatters";
import { Skeleton, SkeletonCard } from "../common/Skeleton";
import "./SupplierManagement.css";

export function SupplierManagement() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "NET_30",
  });
  const [orderForm, setOrderForm] = useState({
    supplierId: "",
    items: [{ name: "", quantity: 0, unitPrice: 0 }],
    deliveryDate: "",
  });

  const { data: suppliers = [], isLoading: suppliersLoading } =
    useSuppliers(restaurantId);
  const { data: orders = [], isLoading: ordersLoading } =
    useSupplierOrders(restaurantId);
  const createSupplier = useCreateSupplier();
  const createSupplierOrder = useCreateSupplierOrder();
  const toggleSupplierStatus = useToggleSupplierStatus();
  const loading = suppliersLoading || ordersLoading;

  // Retry-Logik für Mutations
  const retryCreateSupplier = useRetry(
    async (data: any) => {
      return await createSupplier.mutateAsync(data);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryCreateOrder = useRetry(
    async (data: any) => {
      return await createSupplierOrder.mutateAsync(data);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryToggle = useRetry(
    async (id: string) => {
      return await toggleSupplierStatus.mutateAsync(id);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const handleCreateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      await retryCreateSupplier.execute({
        ...supplierForm,
        restaurantId,
      });
      showToast("Lieferant wurde erstellt!", "success");
      setShowSupplierForm(false);
      setSupplierForm({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        paymentTerms: "NET_30",
      });
    } catch (error: unknown) {
      let errorMessage = "Fehler beim Erstellen des Lieferanten";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(errorMessage, "error");
    }
  };

  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      await retryCreateOrder.execute({
        ...orderForm,
        restaurantId,
      });
      showToast("Bestellung wurde erstellt!", "success");
      setShowOrderForm(false);
      setOrderForm({
        supplierId: "",
        items: [{ name: "", quantity: 0, unitPrice: 0 }],
        deliveryDate: "",
      });
    } catch (error: unknown) {
      showToast(
        (error as any)?.response?.data?.message || "Fehler beim Erstellen der Bestellung",
        "error",
      );
    }
  };

  const handleToggleSupplierStatus = async (supplierId: string) => {
    try {
      await retryToggle.execute(supplierId);
      showToast("Status wurde aktualisiert", "success");
    } catch (error: unknown) {
      showToast("Fehler beim Aktualisieren", "error");
    }
  };

  if (loading) {
    return (
      <div className="supplier-management">
        <div className="supplier-header">
          <Skeleton variant="text" width="250px" height={32} />
          <div className="supplier-actions">
            <Skeleton variant="rectangular" width="150px" height={40} />
            <Skeleton variant="rectangular" width="150px" height={40} />
          </div>
        </div>
        <div style={{ marginTop: "32px" }}>
          <div style={{ marginBottom: "20px" }}>
            <Skeleton
              variant="text"
              width="200px"
              height={24}
            />
          </div>
          <div className="suppliers-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="supplier-management">
      <div className="supplier-header">
        <h1>Lieferanten-Verwaltung</h1>
        <div className="supplier-actions">
          <button
            onClick={() => setShowSupplierForm(true)}
            className="fb-button"
          >
            + Neuer Lieferant
          </button>
          <button
            onClick={() => setShowOrderForm(true)}
            className="fb-button-secondary"
          >
            + Neue Bestellung
          </button>
        </div>
      </div>

      {showSupplierForm && (
        <form onSubmit={handleCreateSupplier} className="supplier-form">
          <h2>Neuen Lieferanten erstellen</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Ansprechpartner *</label>
              <input
                type="text"
                value={supplierForm.contactPerson}
                onChange={(e) =>
                  setSupplierForm({
                    ...supplierForm,
                    contactPerson: e.target.value,
                  })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>E-Mail *</label>
              <input
                type="email"
                value={supplierForm.email}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, email: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Telefon *</label>
              <input
                type="tel"
                value={supplierForm.phone}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, phone: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group full-width">
              <label>Adresse</label>
              <input
                type="text"
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, address: e.target.value })
                }
                className="fb-input"
              />
            </div>
            <div className="form-group">
              <label>Zahlungsbedingungen</label>
              <select
                value={supplierForm.paymentTerms}
                onChange={(e) =>
                  setSupplierForm({
                    ...supplierForm,
                    paymentTerms: e.target.value,
                  })
                }
                className="fb-input"
              >
                <option value="NET_30">Netto 30</option>
                <option value="NET_60">Netto 60</option>
                <option value="IMMEDIATE">Sofort</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="fb-button">
              Erstellen
            </button>
            <button
              type="button"
              onClick={() => setShowSupplierForm(false)}
              className="fb-button-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="suppliers-section">
        <h2>Lieferanten ({suppliers.length})</h2>
        <div className="suppliers-grid">
          {suppliers.length === 0 ? (
            <div className="empty-state">Keine Lieferanten vorhanden</div>
          ) : (
            suppliers.map((supplier) => (
              <div key={supplier.id} className="supplier-card">
                <div className="supplier-header-row">
                  <h3>{supplier.name}</h3>
                  <span
                    className={`status-badge ${
                      supplier.isActive ? "active" : "inactive"
                    }`}
                  >
                    {supplier.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
                <div className="supplier-details">
                  <div>
                    <strong>Ansprechpartner:</strong> {supplier.contactPerson}
                  </div>
                  <div>
                    <strong>E-Mail:</strong> {supplier.email}
                  </div>
                  <div>
                    <strong>Telefon:</strong> {supplier.phone}
                  </div>
                  {supplier.rating && (
                    <div>
                      <strong>Bewertung:</strong> ⭐{" "}
                      {supplier.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="supplier-actions-row">
                  <button
                    onClick={() => handleToggleSupplierStatus(supplier.id)}
                    className="fb-button-secondary"
                  >
                    {supplier.isActive ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="orders-section">
        <h2>Bestellungen bei Lieferanten ({orders.length})</h2>
        <div className="orders-list">
          {orders.length === 0 ? (
            <div className="empty-state">Keine Bestellungen</div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header-row">
                  <div>
                    <strong>Bestellung #{order.id.slice(-8)}</strong>
                    <div>
                      {new Date(order.orderDate).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <span
                    className={`status-badge ${order.status.toLowerCase()}`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      {item.name} × {item.quantity} ={" "}
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                  ))}
                </div>
                <div className="order-total">
                  <strong>Gesamt: {formatCurrency(order.totalAmount)}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
