import React, { useEffect, useMemo, useState, FormEvent, useCallback } from 'react';
import api from '../utils/api';
import { useRestaurants } from '../hooks/useRestaurants';
import { useToast } from '../contexts/ToastContext';
import { extractErrorMessage } from '../utils/errorHandler';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

interface Supplier {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
}

interface SupplierOrder {
  id: string;
  supplierId: string;
  restaurantId?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
}

export const SupplierManagement = React.memo(function SupplierManagement() {
  const { data: restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { showToast } = useToast();

  const [restaurantId, setRestaurantId] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const [supplierForm, setSupplierForm] = useState({ name: '', contactEmail: '', contactPhone: '' });
  const [orderForm, setOrderForm] = useState({ supplierId: '', notes: '' });

  const restaurantOptions = useMemo(() => restaurants || [], [restaurants]);

  useEffect(() => {
    if (!restaurantId && restaurantOptions.length > 0) {
      setRestaurantId(restaurantOptions[0].id);
    }
  }, [restaurantId, restaurantOptions]);

  const loadData = useCallback(async (targetRestaurantId: string) => {
    if (!targetRestaurantId) return;
    setLoading(true);
    try {
      const [suppliersRes, ordersRes] = await Promise.all([
        api.get<Supplier[]>('/suppliers', { params: { restaurantId: targetRestaurantId } }),
        api.get<SupplierOrder[]>('/supplier-orders', { params: { restaurantId: targetRestaurantId } }),
      ]);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      if (!orderForm.supplierId && suppliersRes.data?.[0]?.id) {
        setOrderForm((prev) => ({ ...prev, supplierId: suppliersRes.data[0].id }));
      }
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
      setSuppliers([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [showToast, orderForm.supplierId]);

  useEffect(() => {
    if (restaurantId) {
      loadData(restaurantId);
    }
  }, [restaurantId, loadData]);

  const createSupplier = useCallback(async (e: FormEvent) => {
    setLoading(true);
    e.preventDefault();
    if (!restaurantId) {
      showToast('Bitte wählen Sie ein Restaurant aus', 'error');
      return;
    }
    if (!supplierForm.name.trim()) {
      showToast('Bitte geben Sie einen Lieferantennamen ein', 'error');
      return;
    }
    if (supplierForm.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierForm.contactEmail)) {
      showToast('Bitte geben Sie eine gültige E-Mail-Adresse ein', 'error');
      return;
    }
    try {
      await api.post('/suppliers', { ...supplierForm, restaurantId });
      showToast('Lieferant angelegt', 'success');
      setSupplierForm({ name: '', contactEmail: '', contactPhone: '' });
      loadData(restaurantId);
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  }, [supplierForm, restaurantId, showToast, loadData]);

  const toggleSupplier = useCallback(async (supplierId: string) => {
    // Optimistic local state update
    setSuppliers((prev) => prev.map(s => s.id === supplierId ? { ...s, isActive: !s.isActive } : s));
    try {
      await api.patch(`/suppliers/${supplierId}/toggle-status`);
      showToast('Status geändert', 'success');
      loadData(restaurantId);
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  }, [restaurantId, showToast, loadData]);

  const createSupplierOrder = useCallback(async (e: FormEvent) => {
    setLoading(true);
    e.preventDefault();
    if (!restaurantId) {
      showToast('Bitte wählen Sie ein Restaurant aus', 'error');
      return;
    }
    if (!orderForm.supplierId) {
      showToast('Bitte wählen Sie einen Lieferanten aus', 'error');
      return;
    }
    try {
      await api.post('/supplier-orders', { ...orderForm, restaurantId });
      showToast('Bestellung angelegt', 'success');
      setOrderForm((prev) => ({ ...prev, notes: '' }));
      loadData(restaurantId);
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  }, [orderForm, restaurantId, showToast, loadData]);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Supplier Management</h2>
        <p className="text-muted">Lieferanten und Bestellungen verwalten.</p>
      </div>

      <div className="card-section">
        <label htmlFor="supplier-restaurant-select">Restaurant</label>
        {restaurantsLoading ? (
          <LoadingSpinner />
        ) : (
          <select
            id="supplier-restaurant-select"
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            aria-label="Restaurant auswählen"
          >
            {restaurantOptions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid two-cols gap">
        <form className="card-section" onSubmit={createSupplier} aria-label="Lieferant anlegen">
          <h3>Lieferant anlegen</h3>
          <label htmlFor="supplier-name">Name</label>
          <input
            id="supplier-name"
            value={supplierForm.name}
            onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
            aria-required="true"
            aria-label="Lieferant Name"
          />
          <label htmlFor="supplier-email">Email</label>
          <input
            id="supplier-email"
            type="email"
            value={supplierForm.contactEmail}
            onChange={(e) => setSupplierForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
            aria-label="Lieferant Email"
          />
          <label htmlFor="supplier-phone">Telefon</label>
          <input
            id="supplier-phone"
            type="tel"
            value={supplierForm.contactPhone}
            onChange={(e) => setSupplierForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
            aria-label="Lieferant Telefon"
          />
          <button type="submit" className="btn primary" aria-label="Lieferant speichern">Speichern</button>
        </form>

        <form className="card-section" onSubmit={createSupplierOrder} aria-label="Bestellung anlegen">
          <h3>Bestellung anlegen</h3>
          <label htmlFor="order-supplier-select">Lieferant</label>
          <select
            id="order-supplier-select"
            value={orderForm.supplierId}
            onChange={(e) => setOrderForm((prev) => ({ ...prev, supplierId: e.target.value }))}
            aria-required="true"
            aria-label="Lieferant auswählen"
          >
            <option value="">Bitte wählen</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <label htmlFor="order-notes">Notiz</label>
          <input
            id="order-notes"
            value={orderForm.notes}
            onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
            aria-label="Bestellungsnotiz (optional)"
          />
          <button type="submit" className="btn" aria-label="Bestellung speichern">Bestellen</button>
        </form>
      </div>

      <div className="grid two-cols gap">
        <div className="card-section" role="region" aria-label="Lieferanten Liste">
          <h3>Lieferanten</h3>
          {loading ? (
            <LoadingSpinner />
          ) : suppliers.length === 0 ? (
            <EmptyState
              message="Keine Lieferanten vorhanden. Erstellen Sie einen neuen Lieferanten."
              icon="🚚"
              action={restaurantId ? {
                label: "Lieferant erstellen",
                onClick: () => {
                  const form = document.querySelector('form[aria-label="Lieferant anlegen"]');
                  form?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              } : undefined}
            />
          ) : (
            <ul role="list">
              {suppliers.map((s) => (
                <li key={s.id} role="listitem">
                  <strong>{s.name}</strong> – <span aria-label={`Status: ${s.isActive ? 'aktiv' : 'inaktiv'}`}>{s.isActive ? 'aktiv' : 'inaktiv'}</span>{' '}
                  <button type="button" className="btn" onClick={() => toggleSupplier(s.id)} aria-label={`${s.name} Status umschalten`}>Toggle</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-section" role="region" aria-label="Lieferanten-Bestellungen Liste">
          <h3>Lieferanten-Bestellungen</h3>
          {loading ? (
            <LoadingSpinner />
          ) : orders.length === 0 ? (
            <EmptyState
              message="Keine Bestellungen vorhanden. Erstellen Sie eine neue Bestellung."
              icon="📦"
              action={restaurantId && suppliers.length > 0 ? {
                label: "Bestellung erstellen",
                onClick: () => {
                  const form = document.querySelector('form[aria-label="Bestellung anlegen"]');
                  form?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              } : undefined}
            />
          ) : (
            <ul role="list">
              {orders.map((o) => (
                <li key={o.id} role="listitem">
                  {o.id} – Supplier {o.supplierId} – <span aria-label={`Status: ${o.status || 'open'}`}>{o.status || 'open'}</span>
                  {o.notes && <span className="text-muted"> ({o.notes})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
});
