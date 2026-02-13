import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../utils/api';
import { logger } from '../utils/logger';

interface SystemMetrics {
  activeDrivers?: number;
  activeOrders?: number;
  totalRevenue?: number;
  websocketConnections?: number;
  apiRequests?: number;
  systemHealth?: { status?: string };
}

export function UnifiedMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics>({});
  const [isLoading, setIsLoading] = useState(true);

  const { isConnected } = useWebSocket({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await api.get('/admin/system/metrics');
        setMetrics(response.data || {});
      } catch (error) {
        logger.error('Failed to load metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return <div>Loading monitoring data...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 System Monitoring</h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginTop: '20px'
      }}>
        <div style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚗</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {metrics?.activeDrivers ?? 0}
          </div>
          <div style={{ color: '#666' }}>Aktive Fahrer</div>
        </div>

        <div style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📦</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {metrics?.activeOrders ?? 0}
          </div>
          <div style={{ color: '#666' }}>Aktive Bestellungen</div>
        </div>

        <div style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            €{(metrics?.totalRevenue ?? 0).toFixed(0)}
          </div>
          <div style={{ color: '#666' }}>Umsatz</div>
        </div>

        <div style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔗</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {metrics?.websocketConnections ?? 0}
          </div>
          <div style={{ color: '#666' }}>WebSocket</div>
        </div>

        <div style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {metrics?.apiRequests ?? 0}
          </div>
          <div style={{ color: '#666' }}>API Requests</div>
        </div>

        <div style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>❤️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {metrics?.systemHealth?.status === 'healthy' ? '🟢' : '🔴'}
          </div>
          <div style={{ color: '#666' }}>System Health</div>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
        WebSocket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
    </div>
  );
}
