import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { devError } from '../utils/errorLogger';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { SkeletonTable } from '../design-system/Skeleton';
import { ConfirmationDialog } from './ConfirmationDialog';
import { VirtualizedDataTable } from './VirtualizedTable';
import { useDebounce } from '../hooks/useDebounce';
import { 
  exportCustomersToCSV, 
  exportCustomersToPDF, 
  exportCustomersToExcel 
} from '../utils/export';
import { BulkExportButton } from './BulkExportButton';
import { openCustomerProfile, openCustomerOrder } from '../utils/navigation';
import './CustomersManagement.css';

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  address: string;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  items: Array<{
    dish: {
      id: string;
      name: string;
    };
    quantity: number;
    price: number;
  }>;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orders?: Order[];
}

function CustomersManagementInner() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce für bessere Performance
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/customers');
      setCustomers(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/admin/orders');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        devError('Error fetching orders:', err);
      }
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchOrders();
  }, [fetchCustomers, fetchOrders]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: '#ffc107',
      CONFIRMED: '#17a2b8',
      PREPARING: '#ff6b35',
      READY: '#28a745',
      ACCEPTED: '#007bff',
      PICKED_UP: '#6610f2',
      IN_TRANSIT: '#007bff',
      DELIVERED: '#28a745',
      CANCELLED: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'Ausstehend',
      CONFIRMED: 'Bestätigt',
      PREPARING: 'In Zubereitung',
      READY: 'Fertig',
      ACCEPTED: 'Zugewiesen',
      PICKED_UP: 'Abgeholt',
      IN_TRANSIT: 'Unterwegs',
      DELIVERED: 'Geliefert',
      CANCELLED: 'Storniert',
    };
    return texts[status] || status;
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await api.post('/admin/customers', customerForm);
      showToast('Kunde erfolgreich erstellt!', 'success');
      setCustomerForm({ name: '', email: '', phone: '', address: '' });
      fetchCustomers();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setError(null);
      await api.put(`/admin/customers/${editingCustomer.id}`, customerForm);
      showToast('Kunde erfolgreich aktualisiert!', 'success');
      setEditingCustomer(null);
      setCustomerForm({ name: '', email: '', phone: '', address: '' });
      fetchCustomers();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setConfirmationDialog({
      isOpen: true,
      title: 'Kunde löschen',
      message: 'Möchten Sie diesen Kunden wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/customers/${id}`);
          showToast('Kunde erfolgreich gelöscht!', 'success');
          fetchCustomers();
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        } catch (err) {
          setError('Fehler beim Löschen des Kunden');
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        }
      },
    });
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || '',
    });
  };

  const handleBulkSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (items: Customer[]) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleBulkDeleteCustomers = async () => {
    if (selectedItems.size === 0) return;
    
    setConfirmationDialog({
      isOpen: true,
      title: 'Kunden löschen',
      message: `Möchten Sie wirklich ${selectedItems.size} Kunde(n) löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedItems).map(id => api.delete(`/customers/${id}`)));
          showToast(`${selectedItems.size} Kunde(n) erfolgreich gelöscht!`, 'success');
          setSelectedItems(new Set());
          setBulkMode(false);
          fetchCustomers();
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        } catch (err) {
          setError('Fehler beim Löschen der Kunden');
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        }
      },
    });
  };

  const filteredCustomers = useMemo(() => 
    customers.filter(c => 
      !debouncedSearchQuery || 
      c.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ), [customers, debouncedSearchQuery]
  );

  // Spalten-Definition für VirtualizedDataTable
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      width: '200px',
      render: (customer: Customer) => (
        <span 
          style={{ cursor: 'pointer', color: '#1877F2', textDecoration: 'underline', fontWeight: 600 }}
          onClick={() => openCustomerProfile(customer.id)}
          title="In Customer-Web öffnen"
        >
          {customer.name}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'E-Mail',
      width: '250px',
    },
    {
      key: 'phone',
      label: 'Telefon',
      width: '150px',
    },
    {
      key: 'address',
      label: 'Adresse',
      render: (customer: Customer) => customer.address || 'Nicht angegeben',
    },
    {
      key: 'orders',
      label: 'Bestellungen',
      width: '120px',
      render: (customer: Customer) => {
        const customerOrders = customer.orders || orders.filter(o => o.customer?.id === customer.id);
        return (
          <span style={{ background: '#1877F2', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
            {customerOrders.length}
          </span>
        );
      },
    },
  ], [orders]);

  const customerOrders = selectedCustomer 
    ? (selectedCustomer.orders || orders.filter(o => o.customer?.id === selectedCustomer.id))
    : [];

  return (
    <div className="customers-management">
      {error && <div className="error-message">{error}</div>}
      
      {!selectedCustomer && (
        <div className="form-container" style={{ marginBottom: '20px' }}>
          <h2>{editingCustomer ? 'Kunde bearbeiten' : 'Neuen Kunden erstellen'}</h2>
          <form onSubmit={editingCustomer ? handleUpdateCustomer : handleCreateCustomer}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                required
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>E-Mail *</label>
              <input
                type="email"
                required
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Telefon *</label>
              <input
                type="tel"
                required
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Adresse</label>
              <input
                type="text"
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit">
                {editingCustomer ? 'Aktualisieren' : 'Erstellen'}
              </button>
              {editingCustomer && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingCustomer(null);
                    setCustomerForm({ name: '', email: '', phone: '', address: '' });
                  }}
                >
                  Abbrechen
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {selectedCustomer ? (
        <div>
          <button
            onClick={() => setSelectedCustomer(null)}
            style={{ marginBottom: '20px', padding: '8px 16px', background: '#65676B', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            ← Zurück
          </button>
          <div className="customer-details-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{selectedCustomer.name}</h2>
              <button
                onClick={() => openCustomerProfile(selectedCustomer.id)}
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '14px',
                  background: '#1877F2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="In Customer-Web öffnen"
              >
                🔗 In Customer-Web öffnen
              </button>
            </div>
            <div style={{ marginTop: '20px' }}>
              <p><strong>E-Mail:</strong> {selectedCustomer.email}</p>
              <p><strong>Telefon:</strong> {selectedCustomer.phone}</p>
              <p><strong>Adresse:</strong> {selectedCustomer.address || 'Nicht angegeben'}</p>
              <p><strong>Anzahl Bestellungen:</strong> {customerOrders.length}</p>
              <p><strong>Gesamtumsatz:</strong> {
                customerOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)
              } €</p>
            </div>
            <div style={{ marginTop: '30px' }}>
              <h3>Bestellhistorie</h3>
              <div className="orders-container" style={{ marginTop: '16px' }}>
                {customerOrders.map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div>
                        <h3>Bestellung #{order.id.slice(-8)}</h3>
                        <p style={{ color: '#65676B', fontSize: '13px' }}>
                          {new Date(order.createdAt).toLocaleString('de-DE')}
                        </p>
                        <button
                          onClick={() => openCustomerOrder(order.id)}
                          style={{ 
                            marginTop: '4px', 
                            padding: '4px 8px', 
                            fontSize: '11px',
                            background: '#1877F2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="In Customer-Web öffnen"
                        >
                          🔗 In Customer-Web öffnen
                        </button>
                      </div>
                      <div
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        {getStatusText(order.status)}
                      </div>
                    </div>
                    <div className="order-info">
                      <p><strong>Restaurant:</strong> {order.restaurant.name}</p>
                      <p><strong>Adresse:</strong> {order.address}</p>
                    </div>
                    <div className="order-items">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="order-item">
                          <span>{item.dish.name} × {item.quantity}</span>
                          <span>{item.price.toFixed(2)} €</span>
                        </div>
                      ))}
                      <div className="order-total">
                        <strong>Gesamt: {order.totalAmount.toFixed(2)} €</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Nach Kunde suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', width: '300px' }}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setBulkMode(!bulkMode)}
                style={{ padding: '8px 16px', background: bulkMode ? '#6c757d' : '#1877F2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                {bulkMode ? '✖ Bulk-Modus beenden' : '✓ Bulk-Modus'}
              </button>
              <BulkExportButton
                data={customers as unknown as Record<string, unknown>[]}
                filename="kunden"
                title="Kunden Übersicht"
                showCount={true}
                variant="primary"
              />
            </div>
          </div>
          {bulkMode && selectedItems.size > 0 && (
            <div className="bulk-actions-bar">
              <span style={{ fontWeight: 600 }}>{selectedItems.size} ausgewählt</span>
              <div className="bulk-actions-buttons">
                <button
                  onClick={handleBulkDeleteCustomers}
                  style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  🗑 Löschen
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <SkeletonTable rows={10} columns={5} />
          ) : (
            <VirtualizedDataTable
              items={filteredCustomers}
              columns={columns}
              height={600}
              rowHeight={70}
              bulkMode={bulkMode}
              selectedItems={selectedItems}
              onBulkSelect={handleBulkSelect}
              onSelectAll={() => handleSelectAll(filteredCustomers)}
              renderRowActions={(customer) => (
                <div className="actions" style={{ display: 'flex', gap: '8px' }}>
                  <button className="small secondary" onClick={() => handleEditCustomer(customer)}>
                    Bearbeiten
                  </button>
                  <button className="small secondary" onClick={() => setSelectedCustomer(customer)}>
                    Details
                  </button>
                  <button className="small danger" onClick={() => handleDeleteCustomer(customer.id)}>
                    Löschen
                  </button>
                </div>
              )}
              emptyMessage="Keine Kunden gefunden"
            />
          )}

          {filteredCustomers.length === 0 && !loading && (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <p>Keine Kunden gefunden</p>
            </div>
          )}
        </>
      )}

      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog({ ...confirmationDialog, isOpen: false })}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        variant={confirmationDialog.variant || 'info'}
        onConfirm={confirmationDialog.onConfirm}
        onCancel={() => setConfirmationDialog({ ...confirmationDialog, isOpen: false })}
      />
    </div>
  );
}

export const CustomersManagement = memo(CustomersManagementInner);

