import { memo, useState, useMemo } from 'react';
import { Order } from '../types';
import { OrderCard } from './OrderCard';
import { SkeletonOrderCard } from './SkeletonLoader';

interface OrdersListProps {
  orders: Order[];
  loading: boolean;
  onStatusUpdate: (orderId: string, status: string) => void;
  onAccept?: (orderId: string) => Promise<void>;
  onReject?: (orderId: string, reason?: string) => Promise<void>;
  emptyMessage?: string;
  enablePagination?: boolean;
  itemsPerPage?: number;
}

export const OrdersList = memo(function OrdersList({
  orders,
  loading,
  onStatusUpdate,
  onAccept,
  onReject,
  emptyMessage = 'Keine Bestellungen verfügbar',
  enablePagination = false,
  itemsPerPage = 10,
}: OrdersListProps) {
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);

  // Pagination: Zeige nur erste N Items
  const visibleOrders = useMemo(() => {
    if (!enablePagination || orders.length <= itemsPerPage) {
      return orders;
    }
    return orders.slice(0, visibleCount);
  }, [orders, enablePagination, itemsPerPage, visibleCount]);

  const hasMore = enablePagination && orders.length > visibleCount;

  if (loading) {
    return (
      <div className="orders-container">
        <SkeletonOrderCard count={3} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="orders-container">
        {visibleOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatusUpdate={onStatusUpdate}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
      </div>
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => setVisibleCount(prev => Math.min(prev + itemsPerPage, orders.length))}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            Mehr anzeigen ({orders.length - visibleCount} verbleibend)
          </button>
        </div>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Optimierte Vergleichsfunktion für bessere Performance
  return (
    prevProps.orders.length === nextProps.orders.length &&
    prevProps.loading === nextProps.loading &&
    prevProps.orders.every((order, idx) => {
      const nextOrder = nextProps.orders[idx];
      return (
        order.id === nextOrder.id &&
        order.status === nextOrder.status &&
        order.driverId === nextOrder.driverId
      );
    })
  );
});
