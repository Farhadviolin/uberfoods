import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Card } from '../Card';
import './EnterpriseSync.css';

interface FinancialEvent {
  type: string;
  data: {
    orderId?: string;
    paymentId?: string;
    payoutId?: string;
    invoiceId?: string;
    refundId?: string;
    amount: number;
    currency?: string;
    customerId?: string;
    restaurantId?: string;
    driverId?: string;
    timestamp: Date;
  };
  timestamp: string;
}

export function FinancialEventsPanel() {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalPayouts: 0, netRevenue: 0 });

  useWebSocket({
    onFinancialEvent: (event: FinancialEvent) => {
      setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50
      // Update summary
      if (event.type === 'payment_completed') {
        setSummary(prev => ({ ...prev, totalRevenue: prev.totalRevenue + event.data.amount }));
      } else if (event.type === 'payout_processed') {
        setSummary(prev => ({ ...prev, totalPayouts: prev.totalPayouts + event.data.amount }));
      }
      setSummary(prev => ({ ...prev, netRevenue: prev.totalRevenue - prev.totalPayouts }));
    },
  });

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
  };

  return (
    <Card className="financial-events-panel">
      <div className="panel-header">
        <h2>Financial Events</h2>
        <div className="summary">
          <div className="summary-item">
            <span className="label">Total Revenue:</span>
            <span className="value positive">{formatCurrency(summary.totalRevenue)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Total Payouts:</span>
            <span className="value negative">{formatCurrency(summary.totalPayouts)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Net Revenue:</span>
            <span className="value">{formatCurrency(summary.netRevenue)}</span>
          </div>
        </div>
      </div>
      <div className="events-list">
        {events.length === 0 ? (
          <div className="empty-state">No financial events</div>
        ) : (
          events.map((event, index) => (
            <div key={`${event.type}-${index}`} className="event-item">
              <div className="event-header">
                <span className="event-type">{event.type.replace('_', ' ').toUpperCase()}</span>
                <span className="event-amount">{formatCurrency(event.data.amount, event.data.currency)}</span>
                <span className="event-time">{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="event-details">
                {event.data.orderId && <span>Order: {event.data.orderId}</span>}
                {event.data.paymentId && <span>Payment: {event.data.paymentId}</span>}
                {event.data.payoutId && <span>Payout: {event.data.payoutId}</span>}
                {event.data.restaurantId && <span>Restaurant: {event.data.restaurantId}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

