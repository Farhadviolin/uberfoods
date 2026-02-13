import React, { useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Card } from '../Card';
import './EnterpriseSync.css';

interface PerformanceMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  timestamp: Date;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    errorRate?: number;
  }>;
  timestamp: Date;
}

export function PerformanceMonitoringPanel() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [errors, setErrors] = useState<any[]>([]);

  useWebSocket({
    onPerformanceMetrics: (m: PerformanceMetrics) => {
      setMetrics(m);
    },
    onSystemHealth: (h: SystemHealth) => {
      setHealth(h);
    },
    onErrorEvent: (error: any) => {
      setErrors(prev => [error, ...prev].slice(0, 20)); // Keep last 20
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#28a745';
      case 'degraded': return '#ffc107';
      case 'unhealthy': return '#fd7e14';
      case 'critical': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getMetricColor = (value: number, threshold: number = 80) => {
    if (value >= threshold) return '#dc3545';
    if (value >= threshold * 0.7) return '#ffc107';
    return '#28a745';
  };

  return (
    <div className="performance-monitoring-panel">
      <Card className="metrics-card">
        <h2>Performance Metrics</h2>
        {metrics ? (
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">CPU</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ 
                    width: `${metrics.cpu}%`, 
                    backgroundColor: getMetricColor(metrics.cpu) 
                  }}
                />
              </div>
              <span className="metric-value">{metrics.cpu}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Memory</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ 
                    width: `${metrics.memory}%`, 
                    backgroundColor: getMetricColor(metrics.memory) 
                  }}
                />
              </div>
              <span className="metric-value">{metrics.memory}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Response Time</span>
              <span className="metric-value">{metrics.responseTime}ms</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Error Rate</span>
              <span className="metric-value" style={{ color: getMetricColor(metrics.errorRate * 100, 5) }}>
                {(metrics.errorRate * 100).toFixed(2)}%
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Throughput</span>
              <span className="metric-value">{metrics.throughput} req/s</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">No metrics available</div>
        )}
      </Card>

      <Card className="health-card">
        <h2>System Health</h2>
        {health ? (
          <div className="health-status">
            <div className="status-indicator" style={{ backgroundColor: getStatusColor(health.status) }}>
              {health.status.toUpperCase()}
            </div>
            <div className="services-list">
              {health.services.map(service => (
                <div key={service.name} className="service-item">
                  <span className="service-name">{service.name}</span>
                  <span className="service-status" style={{ color: getStatusColor(service.status) }}>
                    {service.status.toUpperCase()}
                  </span>
                  {service.responseTime && <span className="service-response">{service.responseTime}ms</span>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">No health data available</div>
        )}
      </Card>

      <Card className="errors-card">
        <h2>Recent Errors</h2>
        {errors.length === 0 ? (
          <div className="empty-state">No errors</div>
        ) : (
          <div className="errors-list">
            {errors.map((error, index) => (
              <div key={index} className="error-item">
                <div className="error-header">
                  <span className="error-type">{error.type}</span>
                  <span className="error-severity" style={{ color: getStatusColor(error.severity || 'medium') }}>
                    {error.severity?.toUpperCase() || 'MEDIUM'}
                  </span>
                </div>
                <div className="error-message">{error.message}</div>
                {error.endpoint && <div className="error-endpoint">Endpoint: {error.endpoint}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

