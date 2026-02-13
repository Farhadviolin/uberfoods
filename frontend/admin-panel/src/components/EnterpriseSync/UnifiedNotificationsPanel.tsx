import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Card } from '../Card';
import './EnterpriseSync.css';

interface Notification {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  metadata?: any;
}

export function UnifiedNotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'order' | 'payment' | 'system' | 'security' | 'analytics' | 'financial'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  useWebSocket({
    onUnifiedNotification: (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 100)); // Keep last 100
    },
  });

  const filteredNotifications = notifications.filter(n => {
    if (filter !== 'all' && n.type !== filter) return false;
    if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <Card className="unified-notifications-panel">
      <div className="panel-header">
        <h2>Unified Notifications</h2>
        <div className="filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All Types</option>
            <option value="order">Orders</option>
            <option value="payment">Payments</option>
            <option value="system">System</option>
            <option value="security">Security</option>
            <option value="analytics">Analytics</option>
            <option value="financial">Financial</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}>
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">No notifications</div>
        ) : (
          filteredNotifications.map(notification => (
            <div key={notification.id} className="notification-item" style={{ borderLeftColor: getPriorityColor(notification.priority) }}>
              <div className="notification-header">
                <span className="notification-type">{notification.type}</span>
                <span className="notification-priority" style={{ color: getPriorityColor(notification.priority) }}>
                  {notification.priority.toUpperCase()}
                </span>
                <span className="notification-time">{new Date(notification.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

