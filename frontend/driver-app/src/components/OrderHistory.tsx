import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Order } from '../types';
import './OrderHistory.css';

export function OrderHistory() {
  const { driver } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (driver) {
      fetchOrders();
    }
  }, [driver]);

  const fetchOrders = async () => {
    if (!driver) return;
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.minAmount) params.minAmount = filters.minAmount;
      if (filters.maxAmount) params.maxAmount = filters.maxAmount;

      const response = await api.get(`/drivers/${driver.id}/orders/history`, { params });
      setOrders(response.data.orders || response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Bestellhistorie:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!driver || !searchQuery.trim()) {
      fetchOrders();
      return;
    }
    try {
      setLoading(true);
      const response = await api.get(`/drivers/${driver.id}/orders/search`, {
        params: { q: searchQuery, limit: 50 },
      });
      setOrders(response.data);
    } catch (error: any) {
      console.error('Fehler bei der Suche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!driver) return;
    try {
      const params: any = { format };
      if (filters.status) params.status = filters.status;

      const response = await api.get(`/drivers/${driver.id}/orders/export`, { params });
      
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bestellungen.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('Fehler beim Export: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'var(--success)';
      case 'CANCELLED':
        return 'var(--danger)';
      case 'IN_TRANSIT':
        return 'var(--info)';
      default:
        return 'var(--warning)';
    }
  };

  if (!driver) return null;

  return (
    <div className="order-history">
      <div className="history-header">
        <h2>📋 Bestellhistorie</h2>
        <div className="export-buttons">
          <button onClick={() => handleExport('csv')}>📥 CSV</button>
          <button onClick={() => handleExport('json')}>📥 JSON</button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Suche nach Bestellungen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>🔍 Suchen</button>
        <button onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? '✕' : '⚙️ Filter'}
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Alle</option>
              <option value="DELIVERED">Geliefert</option>
              <option value="CANCELLED">Storniert</option>
              <option value="IN_TRANSIT">Unterwegs</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Von Datum</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Bis Datum</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Min. Betrag</label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Max. Betrag</label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
            />
          </div>
          <button className="apply-filters" onClick={fetchOrders}>
            Filter anwenden
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">Lade Bestellungen...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">Keine Bestellungen gefunden</div>
      ) : (
        <div className="history-list">
          {orders.map((order) => (
            <div key={order.id} className="history-item">
              <div className="history-main">
                <div className="history-id">#{order.id.slice(-8)}</div>
                <div className="history-status" style={{ color: getStatusColor(order.status) }}>
                  {order.status}
                </div>
                <div className="history-amount">{order.totalAmount.toFixed(2)} €</div>
              </div>
              <div className="history-details">
                <div className="history-restaurant">🍽️ {order.restaurant.name}</div>
                <div className="history-customer">👤 {order.customer.name}</div>
                <div className="history-address">📍 {order.address}</div>
                <div className="history-date">
                  {new Date(order.createdAt).toLocaleString('de-DE')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

