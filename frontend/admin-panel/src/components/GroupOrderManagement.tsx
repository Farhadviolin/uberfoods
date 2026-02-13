import React, { useEffect, useState, FormEvent, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { extractErrorMessage } from '../utils/errorHandler';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

interface GroupOrder {
  id: string;
  code?: string;
  restaurantId?: string;
  status?: string;
  expiresAt?: string;
  members?: Array<{ customerId: string; ready: boolean }>;
}

export const GroupOrderManagement = React.memo(function GroupOrderManagement() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [code, setCode] = useState('');
  const [newOrderRestaurant, setNewOrderRestaurant] = useState('');
  const [expirationForm, setExpirationForm] = useState({ id: '', expiresAt: '' });
  const [readyForm, setReadyForm] = useState({ id: '', customerId: '' });

  const loadByCode = useCallback(async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await api.get<GroupOrder>(`/group-orders/${code}`);
      setOrders(res.data ? [res.data] : []);
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [code, showToast]);

  const createGroupOrder = useCallback(async (e: FormEvent) => {
    setLoading(true);
    e.preventDefault();
    try {
      const res = await api.post('/group-orders', { restaurantId: newOrderRestaurant || undefined });
      showToast('Group Order erstellt', 'success');
      setOrders((prev) => [res.data, ...prev]);
      setNewOrderRestaurant('');
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  }, [newOrderRestaurant, showToast]);

  const setExpiration = useCallback(async (e: FormEvent) => {
    setLoading(true);
    e.preventDefault();
    if (!expirationForm.id) {
      showToast('Bitte geben Sie eine Order ID ein', 'error');
      return;
    }
    if (!expirationForm.expiresAt) {
      showToast('Bitte geben Sie ein Ablaufdatum ein', 'error');
      return;
    }
    const expirationDate = new Date(expirationForm.expiresAt);
    if (isNaN(expirationDate.getTime())) {
      showToast('Bitte geben Sie ein gültiges Datum/Zeit ein', 'error');
      return;
    }
    if (expirationDate < new Date()) {
      showToast('Ablaufdatum muss in der Zukunft liegen', 'error');
      return;
    }
    try {
      await api.put(`/group-orders/${expirationForm.id}/expiration`, { expiresAt: expirationForm.expiresAt });
      showToast('Ablaufzeit gesetzt', 'success');
      loadByCode();
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  }, [expirationForm, showToast, loadByCode]);

  const markReady = useCallback(async (e: FormEvent) => {
    setLoading(true);
    e.preventDefault();
    if (!readyForm.id || !readyForm.customerId) return;
    try {
      await api.put(`/group-orders/${readyForm.id}/members/${readyForm.customerId}/ready`);
      showToast('Mitglied als bereit markiert', 'success');
      loadByCode();
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  }, [readyForm, showToast, loadByCode]);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Group Orders</h2>
        <p className="text-muted">Group Orders erstellen, abrufen und verwalten.</p>
      </div>

      <div className="grid two-cols gap card-section">
        <form onSubmit={createGroupOrder} className="card-section" aria-label="Neue Group Order erstellen">
          <h3>Neue Group Order</h3>
          <label htmlFor="group-order-restaurant">Restaurant ID (optional)</label>
          <input
            id="group-order-restaurant"
            value={newOrderRestaurant}
            onChange={(e) => setNewOrderRestaurant(e.target.value)}
            placeholder="restaurant-123"
            aria-label="Restaurant ID (optional)"
          />
          <button type="submit" className="btn primary" aria-label="Group Order erstellen">Erstellen</button>
        </form>

        <div className="card-section" role="region" aria-label="Group Order per Code laden">
          <h3>Per Code laden</h3>
          <div className="input-row">
            <label htmlFor="group-order-code" className="sr-only">Group Order Code</label>
            <input
              id="group-order-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="group-order-id"
              aria-label="Group Order Code"
            />
            <button type="button" className="btn" onClick={loadByCode} aria-label="Group Order laden">Laden</button>
          </div>
        </div>
      </div>

      <div className="grid two-cols gap card-section">
        <form onSubmit={setExpiration} className="card-section" aria-label="Ablaufzeit setzen">
          <h3>Ablaufzeit setzen</h3>
          <label htmlFor="expiration-order-id">Order ID</label>
          <input
            id="expiration-order-id"
            value={expirationForm.id}
            onChange={(e) => setExpirationForm((prev) => ({ ...prev, id: e.target.value }))}
            aria-required="true"
            aria-label="Order ID"
          />
          <label htmlFor="expiration-date">ExpiresAt (ISO)</label>
          <input
            id="expiration-date"
            type="datetime-local"
            value={expirationForm.expiresAt}
            onChange={(e) => setExpirationForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
            aria-required="true"
            aria-label="Ablaufzeit"
          />
          <button type="submit" className="btn" aria-label="Ablaufzeit speichern">Speichern</button>
        </form>

        <form onSubmit={markReady} className="card-section" aria-label="Mitglied als bereit markieren">
          <h3>Mitglied bereit</h3>
          <label htmlFor="ready-order-id">Order ID</label>
          <input
            id="ready-order-id"
            value={readyForm.id}
            onChange={(e) => setReadyForm((prev) => ({ ...prev, id: e.target.value }))}
            aria-required="true"
            aria-label="Order ID"
          />
          <label htmlFor="ready-customer-id">Customer ID</label>
          <input
            id="ready-customer-id"
            value={readyForm.customerId}
            onChange={(e) => setReadyForm((prev) => ({ ...prev, customerId: e.target.value }))}
            aria-required="true"
            aria-label="Customer ID"
          />
          <button type="submit" className="btn" aria-label="Mitglied als bereit markieren">Markieren</button>
        </form>
      </div>

      <div className="card-section">
        <div className="card-header-row">
          <h3>Ergebnisse</h3>
          {loading && <LoadingSpinner />}
        </div>
        {orders.length === 0 ? (
          <EmptyState
            message={code ? "Keine Group Order mit diesem Code gefunden." : "Laden Sie eine Group Order per Code oder erstellen Sie eine neue."}
            icon="👥"
            action={!code ? {
              label: "Group Order erstellen",
              onClick: () => {
                const form = document.querySelector('form[aria-label="Neue Group Order erstellen"]');
                form?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            } : undefined}
          />
        ) : (
          <div className="stack">
            {orders.map((order) => (
              <div key={order.id} className="card nested">
                <div className="card-header-row">
                  <strong>{order.id}</strong>
                  <span className="badge">{order.status}</span>
                </div>
                {order.code && <p>Code: {order.code}</p>}
                {order.expiresAt && <p className="text-muted">Läuft ab: {new Date(order.expiresAt).toLocaleString()}</p>}
                {order.members && order.members.length > 0 && (
                  <ul>
                    {order.members.map((m) => (
                      <li key={m.customerId}>
                        {m.customerId} – {m.ready ? 'bereit' : 'offen'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
