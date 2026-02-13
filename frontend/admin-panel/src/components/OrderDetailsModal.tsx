import { memo } from 'react';
import { Modal } from './Modal';
import { format } from 'date-fns';
import { config } from '../config';
import './OrderDetailsModal.css';

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
    name: string;
    email: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  driver: {
    id: string;
    name: string;
  } | null;
  items: Array<{
    dish: {
      id: string;
      name: string;
      imageUrl?: string;
    };
    quantity: number;
    price: number;
  }>;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onStatusChange?: (orderId: string, status: string) => void;
  onAssignDriver?: (orderId: string, driverId: string) => void;
  availableDrivers?: Array<{ id: string; name: string; isActive: boolean }>;
}

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

function OrderDetailsModalInner({
  isOpen,
  onClose,
  order,
  onStatusChange,
  onAssignDriver,
  availableDrivers = [],
}: OrderDetailsModalProps) {
  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bestellung #${order.id.slice(-8)}`}
      size="large"
    >
      <div className="order-details">
        {/* Header Info */}
        <div className="order-details-header">
          <div className="order-details-status">
            <span
              className="status-badge"
              style={{ backgroundColor: getStatusColor(order.status) }}
            >
              {getStatusText(order.status)}
            </span>
            <span className="order-date">
              {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
            </span>
          </div>
        </div>

        {/* Customer & Restaurant Info */}
        <div className="order-details-section">
          <h3>Kundeninformationen</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Name:</strong>
              <span>{order.customer.name}</span>
            </div>
            <div className="info-item">
              <strong>E-Mail:</strong>
              <span>{order.customer.email}</span>
            </div>
            <div className="info-item">
              <strong>Telefon:</strong>
              <span>{order.phone}</span>
            </div>
            <div className="info-item">
              <strong>Adresse:</strong>
              <span>{order.address}</span>
            </div>
          </div>
        </div>

        <div className="order-details-section">
          <h3>Restaurant</h3>
          <p>{order.restaurant.name}</p>
        </div>

        {order.driver && (
          <div className="order-details-section">
            <h3>Fahrer</h3>
            <p>{order.driver.name}</p>
          </div>
        )}

        {/* Order Items */}
        <div className="order-details-section">
          <h3>Bestellte Gerichte</h3>
          <div className="order-items-list">
            {order.items.map((item, idx) => (
              <div key={idx} className="order-item-row">
                {item.dish.imageUrl && (
                  <img
                    src={`${config.apiUrl}${item.dish.imageUrl}`}
                    alt={item.dish.name}
                    className="dish-thumbnail"
                  />
                )}
                <div className="order-item-info">
                  <div className="order-item-name">{item.dish.name}</div>
                  <div className="order-item-details">
                    {item.quantity} × {item.price.toFixed(2)} €
                  </div>
                </div>
                <div className="order-item-total">
                  {(item.quantity * item.price).toFixed(2)} €
                </div>
              </div>
            ))}
          </div>
          <div className="order-total-section">
            <strong>Gesamtbetrag: {order.totalAmount.toFixed(2)} €</strong>
          </div>
        </div>

        {order.notes && (
          <div className="order-details-section">
            <h3>Notizen</h3>
            <p className="order-notes">{order.notes}</p>
          </div>
        )}

        {/* Actions */}
        {(onStatusChange || onAssignDriver) && (
          <div className="order-details-actions">
            {onStatusChange && (
              <div className="action-group">
                <label>Status ändern:</label>
                <select
                  value={order.status}
                  onChange={(e) => onStatusChange(order.id, e.target.value)}
                  className="status-select"
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
              </div>
            )}

            {onAssignDriver && !order.driver && (
              <div className="action-group">
                <label>Fahrer zuweisen:</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onAssignDriver(order.id, e.target.value);
                    }
                  }}
                  className="driver-select"
                >
                  <option value="">Fahrer auswählen...</option>
                  {availableDrivers
                    .filter((d) => d.isActive)
                    .map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export const OrderDetailsModal = memo(OrderDetailsModalInner);

