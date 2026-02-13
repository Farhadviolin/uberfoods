import React, { useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Card } from '../Card';
import './EnterpriseSync.css';

interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: {
    userId?: string;
    ipAddress?: string;
    endpoint?: string;
    description: string;
    timestamp: Date;
  };
  timestamp: string;
}

export function SecurityEventsPanel() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  useWebSocket({
    onSecurityEvent: (event: SecurityEvent) => {
      setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100
    },
  });

  const filteredEvents = events.filter(e => 
    severityFilter === 'all' || e.severity === severityFilter
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <Card className="security-events-panel">
      <div className="panel-header">
        <h2>Security Events</h2>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as any)}>
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div className="events-list">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">No security events</div>
        ) : (
          filteredEvents.map((event, index) => (
            <div key={`${event.type}-${index}`} className="event-item" style={{ borderLeftColor: getSeverityColor(event.severity) }}>
              <div className="event-header">
                <span className="event-type">{event.type.replace('_', ' ').toUpperCase()}</span>
                <span className="event-severity" style={{ color: getSeverityColor(event.severity) }}>
                  {event.severity.toUpperCase()}
                </span>
                <span className="event-time">{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="event-description">{event.data.description}</div>
              <div className="event-details">
                {event.data.userId && <span>User: {event.data.userId}</span>}
                {event.data.ipAddress && <span>IP: {event.data.ipAddress}</span>}
                {event.data.endpoint && <span>Endpoint: {event.data.endpoint}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

