import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { devError } from '../utils/errorLogger';
import { format, subDays, startOfDay } from 'date-fns';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { useToast } from '../contexts/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { LoadingSpinner } from './LoadingSpinner';
import { SkeletonCard, SkeletonOrderCard } from '../design-system/Skeleton';
import { OrderDetailsModal } from './OrderDetailsModal';
import { useFormValidation } from '../hooks/useFormValidation';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  exportOrdersToCSV,
  exportOrdersToPDF,
  exportOrdersToExcel
} from '../utils/export';
import { BulkExportButton } from './BulkExportButton';
import { openCustomerProfile, openCustomerOrder, openDriverProfile, openDriverOrder } from '../utils/navigation';
import { useOrdersInfinite } from '../hooks/useOrders';
import { useRestaurants } from '../hooks/useRestaurants';
import { useDrivers } from '../hooks/useDrivers';
import './OrdersManagement.css';

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  address: string;
  phone: string;
  notes: string;
  createdAt: string;
  customer: {
    id: string;
    name?: string;
    email?: string;
  } | null;
  restaurant: {
    id: string;
    name?: string;
  } | null;
  driver: {
    id: string;
    name?: string;
  } | null;
  driverId?: string;
  assignedDriverId?: string;
  assignedDriver?: {
    id?: string;
  } | null;
  delivery?: {
    driverId?: string;
  } | null;
  items: Array<{
    dish: {
      id: string;
      name: string;
    };
    quantity: number;
    price: number;
  }>;
}

function getOrderCustomerName(order: Order) {
  return order.customer?.name
    || order.customer?.email
    || 'Unknown customer';
}

function getOrderCustomerEmail(order: Order) {
  return order.customer?.email || 'Unknown customer';
}

function getOrderRestaurantName(order: Order) {
  return order.restaurant?.name || 'Unknown restaurant';
}

function getOrderDriverName(order: Order) {
  return order.driver?.name || 'Unassigned';
}

function getAssignedDriverId(order: Order) {
  return order.driverId
    || order.assignedDriverId
    || order.driver?.id
    || order.assignedDriver?.id
    || order.delivery?.driverId
    || '';
}

function getOrderItems(order: Order) {
  return Array.isArray(order.items) ? order.items : [];
}

const visuallyHiddenStyle = {
  position: 'absolute' as const,
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap' as const,
  border: 0,
};

interface Restaurant {
  id: string;
  name: string;
}

interface Driver {
  id: string;
  name: string;
  isActive: boolean;
}

function OrdersManagementInner() {
  const { showToast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // WebSocket Integration - Callbacks disabled due to infinite query architecture
  const { isConnected } = useWebSocket({
    // onOrderUpdate: handleOrderUpdate,
    // onOrderCreated: handleOrderCreated,
  });
  
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderDateFilter, setOrderDateFilter] = useState<string>('all');
  const [orderRestaurantFilter, setOrderRestaurantFilter] = useState<string>('all');
  const [orderDriverFilter, setOrderDriverFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce für bessere Performance

  // Build filters for infinite query
  const filters = useMemo(() => {
    const result: {
      status?: string;
      restaurantId?: string;
      driverId?: string;
    } = {};

    if (orderStatusFilter !== 'all') result.status = orderStatusFilter;
    if (orderRestaurantFilter !== 'all') result.restaurantId = orderRestaurantFilter;
    if (orderDriverFilter !== 'all') result.driverId = orderDriverFilter;

    return result;
  }, [orderStatusFilter, orderRestaurantFilter, orderDriverFilter]);

  // Use new infinite query hook
  const {
    data: ordersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useOrdersInfinite(filters, {
    limit: 50, // Load 50 orders at a time for better performance
    enabled: true,
  });

  // Flatten all pages into a single array
  const orders = useMemo(() => {
    return ordersData?.pages.flatMap(page => page.data) || [];
  }, [ordersData]);

  // Use new hooks for restaurants and drivers
  const { data: restaurantsData } = useRestaurants();
  const { data: driversData } = useDrivers();

  const restaurants = restaurantsData || [];
  const drivers = driversData || [];

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const filteredOrders = useMemo(() => {
    let filtered = orders || [];

    // Note: Client-side filtering is kept minimal since most filtering is done server-side
    // Additional client-side filters can be added here if needed
    return filtered;

    if (orderRestaurantFilter !== 'all') {
      filtered = filtered.filter(o => o.restaurant.id === orderRestaurantFilter);
    }

    if (orderDriverFilter !== 'all') {
      filtered = filtered.filter(o => o.driver?.id === orderDriverFilter);
    }

    if (orderDateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      switch (orderDateFilter) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = startOfDay(subDays(now, 7));
          break;
        case 'month':
          startDate = startOfDay(subDays(now, 30));
          break;
        default:
          startDate = new Date(0);
      }
      filtered = filtered.filter(o => new Date(o.createdAt) >= startDate);
    }

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.id.toLowerCase().includes(query) ||
        getOrderCustomerName(o).toLowerCase().includes(query) ||
        getOrderCustomerEmail(o).toLowerCase().includes(query) ||
        getOrderRestaurantName(o).toLowerCase().includes(query) ||
        o.address.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, orderStatusFilter, orderDateFilter, orderRestaurantFilter, orderDriverFilter, debouncedSearchQuery]);

  const handleUpdateOrderStatus = useCallback(async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      showToast('Bestellstatus erfolgreich aktualisiert!', 'success');
      // Refetch orders after status update
      refetch();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      showToast(errorMsg, 'error');
    }
  }, [showToast, refetch]);

  const handleAssignDriver = useCallback(async (orderId: string, driverId: string) => {
    try {
      await api.patch(`/orders/${orderId}/assign`, { driverId });
      showToast('Fahrer erfolgreich zugewiesen!', 'success');
      // Refetch orders after driver assignment
      refetch();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      showToast(errorMsg, 'error');
    }
  }, [showToast, refetch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrderStatusFilter(e.target.value);
  }, []);

  const handleDateFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrderDateFilter(e.target.value);
  }, []);

  const handleRestaurantFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrderRestaurantFilter(e.target.value);
  }, []);

  const handleDriverFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrderDriverFilter(e.target.value);
  }, []);

  return (
    <div className="orders-management">
      {error && <div className="error-message">{extractErrorMessage(error)}</div>}
      
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '200px' }}>
          <label style={{ fontWeight: 600, minWidth: '80px' }}>Suche:</label>
          <input
            type="text"
            placeholder="Nach ID, Kunde, Restaurant suchen..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', flex: 1 }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600 }}>Status:</label>
          <select
            value={orderStatusFilter}
            onChange={handleStatusFilterChange}
            style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#F0F2F5' }}
          >
            <option value="all">Alle</option>
            <option value="PENDING">Ausstehend</option>
            <option value="CONFIRMED">Bestätigt</option>
            <option value="PREPARING">In Zubereitung</option>
            <option value="READY">Fertig</option>
            <option value="ACCEPTED">Zugewiesen</option>
            <option value="PICKED_UP">Abgeholt</option>
            <option value="IN_TRANSIT">Unterwegs</option>
            <option value="DELIVERED">Geliefert</option>
            <option value="CANCELLED">Storniert</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600 }}>Datum:</label>
          <select
            value={orderDateFilter}
            onChange={handleDateFilterChange}
            style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#F0F2F5' }}
          >
            <option value="all">Alle</option>
            <option value="today">Heute</option>
            <option value="week">Letzte 7 Tage</option>
            <option value="month">Letzte 30 Tage</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600 }}>Restaurant:</label>
          <select
            value={orderRestaurantFilter}
            onChange={handleRestaurantFilterChange}
            style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#F0F2F5' }}
          >
            <option value="all">Alle</option>
            {(restaurants || []).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600 }}>Fahrer:</label>
          <select
            value={orderDriverFilter}
            onChange={handleDriverFilterChange}
            style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#F0F2F5' }}
          >
            <option value="all">Alle</option>
            {(drivers || []).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              background: isConnected ? '#d4edda' : '#f8d7da',
              border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: isConnected ? '#155724' : '#721c24',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#28a745' : '#dc3545',
              display: 'inline-block',
            }}></span>
            {isConnected ? 'Live' : 'Offline'}
          </div>

          <BulkExportButton
            data={filteredOrders as unknown as Record<string, unknown>[]}
            filename="bestellungen"
            title="Bestellungen Übersicht"
            showCount={true}
            variant="primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', padding: '20px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonOrderCard key={i} />
          ))}
        </div>
      ) : (
        <div className="orders-container" data-testid="orders-table">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className="order-card order-row"
              data-testid="order-row"
              data-order-id={order.id}
            >
              <div className="order-header">
                <div>
                  <h3 
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setSelectedOrder(order)}
                  >
                    Bestellung #{order.id.slice(-8)}
                  </h3>
                  <span style={visuallyHiddenStyle}>Order ID: {order.id}</span>
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
                  <p style={{ color: '#65676B', fontSize: '13px' }}>
                    {new Date(order.createdAt).toLocaleString('de-DE')}
                  </p>
                </div>
                <div
                  className="status-badge"
                  data-testid="status"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  <span aria-hidden="true">{getStatusText(order.status)}</span>
                  <span style={visuallyHiddenStyle}>{order.status}</span>
                </div>
              </div>

              <div className="order-info">
                <p><strong>Restaurant:</strong> {getOrderRestaurantName(order)}</p>
                <p>
                  <strong>Kunde:</strong>{' '}
                  <span 
                    style={{ cursor: 'pointer', color: '#1877F2', textDecoration: 'underline' }}
                    onClick={() => openCustomerProfile(order.customer?.id || order.id)}
                    title="In Customer-Web öffnen"
                  >
                    {getOrderCustomerName(order)}
                  </span>
                  {' '}({getOrderCustomerEmail(order)})
                </p>
                <p><strong>Telefon:</strong> {order.phone}</p>
                <p><strong>Adresse:</strong> {order.address}</p>
                {order.driver && (
                  <p>
                    <strong>Fahrer:</strong>{' '}
                    <span 
                      style={{ cursor: 'pointer', color: '#1877F2', textDecoration: 'underline' }}
                      onClick={() => openDriverProfile(order.driver?.id || order.id)}
                      title="In Driver-App öffnen"
                    >
                      {getOrderDriverName(order)}
                    </span>
                  </p>
                )}
                {order.notes && <p><strong>Notizen:</strong> {order.notes}</p>}
              </div>

              <span data-testid="assigned-driver" style={visuallyHiddenStyle}>
                Assigned Driver: {getAssignedDriverId(order)}
              </span>

              <div className="order-items">
                <h4>Gerichte:</h4>
                {getOrderItems(order).map((item, idx) => (
                  <div key={idx} className="order-item">
                    <span>{item.dish.name} × {item.quantity}</span>
                    <span>{item.price.toFixed(2)} €</span>
                  </div>
                ))}
                <div className="order-total">
                  <strong>Gesamt: {order.totalAmount.toFixed(2)} €</strong>
                </div>
              </div>

              <div className="order-actions">
                <select
                  value={order.status}
                  onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', flex: 1, marginBottom: '8px' }}
                >
                  <option value="PENDING">Ausstehend</option>
                  <option value="CONFIRMED">Bestätigt</option>
                  <option value="PREPARING">In Zubereitung</option>
                  <option value="READY">Fertig</option>
                  <option value="ACCEPTED">Zugewiesen</option>
                  <option value="PICKED_UP">Abgeholt</option>
                  <option value="IN_TRANSIT">Unterwegs</option>
                  <option value="DELIVERED">Geliefert</option>
                  <option value="CANCELLED">Storniert</option>
                </select>
                
                {!order.driver && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignDriver(order.id, e.target.value);
                      }
                    }}
                    style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', width: '100%' }}
                  >
                    <option value="">Fahrer zuweisen...</option>
                    {(drivers || []).filter(d => d && d.isActive).map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name || 'Unbenannter Fahrer'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <p>Keine Bestellungen gefunden</p>
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          {hasNextPage && (
            <div ref={loadMoreRef} style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              minHeight: '60px'
            }}>
              {isFetchingNextPage ? (
                <LoadingSpinner />
              ) : (
                <button
                  onClick={() => fetchNextPage()}
                  style={{
                    padding: '10px 20px',
                    background: '#1877F2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Mehr laden ({orders.length} Bestellungen)
                </button>
              )}
            </div>
          )}

          {!hasNextPage && orders.length > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#65676B',
              fontSize: '14px'
            }}>
              Alle Bestellungen geladen ({orders.length} insgesamt)
            </div>
          )}
        </div>
      )}

      <OrderDetailsModal
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onStatusChange={handleUpdateOrderStatus}
        onAssignDriver={handleAssignDriver}
      />
    </div>
  );
}

export const OrdersManagement = memo(OrdersManagementInner);

