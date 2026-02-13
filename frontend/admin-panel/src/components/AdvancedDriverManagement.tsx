import { useState, useEffect, useCallback } from 'react';
import { Chart } from './Charts';
import { useDriverData } from '../hooks/useDriverData';
import { Skeleton, SkeletonCard } from '../design-system/Skeleton';
import { Button } from '../design-system/Button';
import { useToast } from '../contexts/ToastContext';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../utils/api';
import './AdvancedDriverManagement.css';

export function AdvancedDriverManagement() {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'monitoring' | 'scheduling' | 'performance' | 'earnings' | 'analytics'>('overview');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [liveDrivers, setLiveDrivers] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [monitoringDriver, setMonitoringDriver] = useState<string | null>(null);

  const {
    driverOverview,
    schedules,
    performanceData,
    earningsData,
    driverAnalytics,
    isLoading,
    error,
    refetch,
  } = useDriverData();

  // WebSocket für Cross-System Kommunikation
  const {
    isConnected,
    sendAdminCommand,
    sendEmergencyBroadcast,
    sendAdminBroadcast,
    startDriverMonitoring,
    stopDriverMonitoring,
  } = useWebSocket({
    onDriverStatusChanged: (data) => {
      setLiveDrivers(prev => prev.map(driver =>
        driver.id === data.driverId
          ? { ...driver, status: data.status, lastUpdate: data.timestamp }
          : driver
      ));
      showToast(`Driver ${data.driverId} Status: ${data.status}`, 'info');
    },
    onSystemStatus: (data) => {
      setSystemStatus(data);
    },
    onEmergencyAlert: (data) => {
      showToast(`🚨 EMERGENCY: ${data.message}`, 'error');
    },
    onAdminCommandResponse: (data) => {
      if (data.success) {
        showToast(`Admin Command erfolgreich: ${data.command}`, 'success');
      } else {
        showToast(`Admin Command fehlgeschlagen: ${data.error}`, 'error');
      }
    },
  });

  const loadLiveDrivers = useCallback(async () => {
    try {
      const response = await api.get('/admin/drivers');
      setLiveDrivers(response.data.drivers || []);
    } catch (error) {
      showToast('Fehler beim Laden der Live-Driver-Daten', 'error');
    }
  }, [showToast]);

  // Live Driver Daten laden
  useEffect(() => {
    if (activeSubTab === 'monitoring' && isConnected) {
      loadLiveDrivers();
    }
  }, [activeSubTab, isConnected, loadLiveDrivers]);

  const handleCreateSchedule = async (driverId: string, schedule: any) => {
    try {
      await api.post(`/drivers/${driverId}/shifts/schedule`, schedule);
      showToast('Schicht erfolgreich erstellt!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Erstellen der Schicht', 'error');
    }
  };

  const handleUpdateEarnings = async (driverId: string, earnings: any) => {
    try {
      await api.patch(`/drivers/${driverId}/earnings`, earnings);
      showToast('Verdienst erfolgreich aktualisiert!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Aktualisieren', 'error');
    }
  };

  // ============================================
  // LIVE ADMIN CONTROL METHODS
  // ============================================

  const handleForceDriverStatus = async (driverId: string, status: string, reason?: string) => {
    try {
      sendAdminCommand({
        command: 'status_change',
        targetDriverId: driverId,
        data: { status },
        reason: reason || 'Admin override',
      });
      showToast(`Status-Änderung für Driver ${driverId} gesendet`, 'info');
    } catch (error) {
      showToast('Fehler beim Senden des Admin-Befehls', 'error');
    }
  };

  const handleEmergencyAssign = async (driverId: string, orderId: string, priority?: string) => {
    try {
      sendAdminCommand({
        command: 'emergency_assign',
        targetDriverId: driverId,
        data: { orderId },
        priority: priority || 'urgent',
        reason: 'Emergency assignment by admin',
      });
      showToast(`Emergency-Assignment für Driver ${driverId} gesendet`, 'warning');
    } catch (error) {
      showToast('Fehler beim Emergency-Assignment', 'error');
    }
  };

  const handleBroadcastMessage = async (message: string, priority: 'low' | 'medium' | 'high' = 'medium', targetDrivers?: string[]) => {
    try {
      sendAdminBroadcast({
        message,
        priority,
        targetDrivers,
      });
      showToast('Broadcast-Nachricht gesendet', 'success');
    } catch (error) {
      showToast('Fehler beim Senden der Broadcast-Nachricht', 'error');
    }
  };

  const handleEmergencyBroadcast = async (message: string, emergencyType?: string) => {
    try {
      sendEmergencyBroadcast({
        message,
        priority: 'critical',
        emergencyType,
      });
      showToast('🚨 Emergency Broadcast gesendet!', 'error');
    } catch (error) {
      showToast('Fehler beim Emergency Broadcast', 'error');
    }
  };

  const handleStartMonitoring = (driverId: string) => {
    startDriverMonitoring(driverId);
    setMonitoringDriver(driverId);
    showToast(`Überwachung für Driver ${driverId} gestartet`, 'info');
  };

  const handleStopMonitoring = (driverId: string) => {
    stopDriverMonitoring(driverId);
    setMonitoringDriver(null);
    showToast(`Überwachung für Driver ${driverId} beendet`, 'info');
  };

  const handleForceLocationUpdate = (driverId: string, lat: number, lng: number) => {
    sendAdminCommand({
      command: 'location_update',
      targetDriverId: driverId,
      data: { lat, lng },
      reason: 'Admin location override',
    });
    showToast(`Standort-Update für Driver ${driverId} gesendet`, 'info');
  };

  if (isLoading) {
    return (
      <div className="advanced-drivers">
        <div className="drivers-header">
          <Skeleton height="32px" width="300px" />
        </div>
        <div className="drivers-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Fehler beim Laden der Fahrerdaten</h3>
        <p>{error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
        <Button onClick={() => refetch()} variant="primary">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  // Performance Chart
  const performanceChartData = driverAnalytics?.performanceTrend ? {
    labels: driverAnalytics.performanceTrend.map((item: { date: string }) => 
      new Date(item.date).toLocaleDateString('de-DE')
    ),
    datasets: [
      {
        label: 'Durchschnittliche Lieferzeit (Min)',
        data: driverAnalytics.performanceTrend.map((item: { avgDeliveryTime: number }) => item.avgDeliveryTime),
        borderColor: '#1877F2',
        backgroundColor: 'rgba(24, 119, 242, 0.1)',
        tension: 0.4,
      },
    ],
  } : null;

  // Earnings Chart
  const earningsChartData = earningsData?.monthlyBreakdown ? {
    labels: earningsData.monthlyBreakdown.map((item: { month: string }) => item.month),
    datasets: [{
      label: 'Verdienst (€)',
      data: earningsData.monthlyBreakdown.map((item: { earnings: number }) => item.earnings),
      backgroundColor: '#28a745',
      borderColor: '#28a745',
    }],
  } : null;

  return (
    <div className="advanced-drivers">
      <div className="drivers-header">
        <h2>Erweiterte Fahrerverwaltung</h2>
        <div className="drivers-controls">
          {driverOverview && (
            <div className="overview-stats">
              <span className="stat-item">
                <strong>{driverOverview.activeDrivers || 0}</strong> Aktive Fahrer
              </span>
              <span className="stat-item">
                <strong>{driverOverview.totalDeliveries || 0}</strong> Lieferungen heute
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="drivers-sub-tabs">
        <button
          className={`sub-tab ${activeSubTab === 'monitoring' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('monitoring')}
        >
          👁️ Live Monitoring
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('overview')}
        >
          📊 Übersicht
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'scheduling' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('scheduling')}
        >
          📅 Schichtplanung
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('performance')}
        >
          ⚡ Performance
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'earnings' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('earnings')}
        >
          💰 Verdienst
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('analytics')}
        >
          📈 Analytics
        </button>
      </div>

      {/* Live Monitoring Tab */}
      {activeSubTab === 'monitoring' && (
        <div className="drivers-monitoring">
          <div className="monitoring-header">
            <div className="system-status">
              <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                WebSocket: {isConnected ? '🟢 Verbunden' : '🔴 Getrennt'}
              </div>
              {systemStatus && (
                <div className="system-metrics">
                  <span>Aktive Driver: {systemStatus.connectedDrivers || 0}</span>
                  <span>Aktive Orders: {systemStatus.activeOrders || 0}</span>
                </div>
              )}
            </div>
            <div className="monitoring-controls">
              <Button
                variant="secondary"
                onClick={() => handleBroadcastMessage('System-Test: Dies ist eine Testnachricht von Admin')}
              >
                📢 Broadcast Test
              </Button>
              <Button
                variant="danger"
                onClick={() => handleEmergencyBroadcast('SYSTEM TEST: Emergency Broadcast Test')}
              >
                🚨 Emergency Test
              </Button>
            </div>
          </div>

          <div className="live-drivers-grid">
            {liveDrivers.map(driver => (
              <div key={driver.id} className={`driver-card ${driver.online ? 'online' : 'offline'}`}>
                <div className="driver-header">
                  <div className="driver-info">
                    <h4>{driver.name}</h4>
                    <span className={`status-badge ${driver.currentStatus?.toLowerCase()}`}>
                      {driver.currentStatus || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="driver-controls">
                    <Button
                      size="sm"
                      variant={monitoringDriver === driver.id ? 'primary' : 'secondary'}
                      onClick={() => monitoringDriver === driver.id
                        ? handleStopMonitoring(driver.id)
                        : handleStartMonitoring(driver.id)
                      }
                    >
                      {monitoringDriver === driver.id ? '🛑 Stop' : '👁️ Monitor'}
                    </Button>
                  </div>
                </div>

                <div className="driver-details">
                  <div className="driver-metric">
                    <span>Rating:</span>
                    <span>{driver.rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <div className="driver-metric">
                    <span>Aktive Orders:</span>
                    <span>{driver.activeOrders || 0}</span>
                  </div>
                  <div className="driver-metric">
                    <span>Status:</span>
                    <span className={driver.online ? 'online-text' : 'offline-text'}>
                      {driver.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="driver-actions">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleForceDriverStatus(driver.id, e.target.value, 'Admin override');
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Status ändern...</option>
                    <option value="ONLINE">Online setzen</option>
                    <option value="OFFLINE">Offline setzen</option>
                    <option value="BREAK">Pause setzen</option>
                    <option value="EMERGENCY">Emergency setzen</option>
                  </select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const orderId = prompt('Order ID für Emergency Assignment:');
                      if (orderId) {
                        handleEmergencyAssign(driver.id, orderId);
                      }
                    }}
                  >
                    🚨 Emergency Assign
                  </Button>
                </div>

                {driver.location && (
                  <div className="driver-location">
                    📍 {driver.location.lat?.toFixed(4)}, {driver.location.lng?.toFixed(4)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const lat = parseFloat(prompt('Neuer Latitude:', driver.location.lat.toString()) || '0');
                        const lng = parseFloat(prompt('Neuer Longitude:', driver.location.lng.toString()) || '0');
                        if (lat && lng) {
                          handleForceLocationUpdate(driver.id, lat, lng);
                        }
                      }}
                    >
                      📍 Update Location
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {liveDrivers.length === 0 && !isLoading && (
            <div className="no-drivers">
              <p>Keine Driver gefunden oder WebSocket nicht verbunden.</p>
              <Button onClick={loadLiveDrivers}>🔄 Neu laden</Button>
            </div>
          )}
        </div>
      )}

      {/* Overview Tab */}
      {activeSubTab === 'overview' && driverOverview && (
        <div className="drivers-overview">
          <div className="drivers-metrics">
            <div className="metric-card">
              <h3>Aktive Fahrer</h3>
              <div className="metric-value">{driverOverview.activeDrivers || 0}</div>
              <div className="metric-subtitle">von {driverOverview.totalDrivers || 0} insgesamt</div>
            </div>
            <div className="metric-card">
              <h3>Lieferungen heute</h3>
              <div className="metric-value">{driverOverview.totalDeliveries || 0}</div>
              <div className="metric-subtitle">Abgeschlossen</div>
            </div>
            <div className="metric-card">
              <h3>Durchschnittliche Lieferzeit</h3>
              <div className="metric-value">{driverOverview.avgDeliveryTime || 0} Min</div>
              <div className="metric-subtitle">Heute</div>
            </div>
            <div className="metric-card">
              <h3>Durchschnittliche Bewertung</h3>
              <div className="metric-value">
                {driverOverview.avgRating ? driverOverview.avgRating.toFixed(1) : '0.0'}/5
              </div>
              <div className="metric-subtitle">Fahrer-Bewertung</div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Tab */}
      {activeSubTab === 'scheduling' && (
        <div className="drivers-scheduling">
          <div className="schedules-table-section">
            <table className="drivers-table">
              <thead>
                <tr>
                  <th>Fahrer</th>
                  <th>Datum</th>
                  <th>Schicht</th>
                  <th>Status</th>
                  <th>Bestellungen</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {schedules && schedules.length > 0 ? (
                  schedules.map((schedule: {
                    id: string;
                    driverName: string;
                    date: string;
                    shiftStart: string;
                    shiftEnd: string;
                    status: string;
                    orderCount: number;
                  }) => (
                    <tr key={schedule.id}>
                      <td><strong>{schedule.driverName}</strong></td>
                      <td>{new Date(schedule.date).toLocaleDateString('de-DE')}</td>
                      <td>
                        {new Date(schedule.shiftStart).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(schedule.shiftEnd).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span className={`status-badge status-${schedule.status.toLowerCase()}`}>
                          {schedule.status}
                        </span>
                      </td>
                      <td>{schedule.orderCount}</td>
                      <td>
                        <Button variant="secondary" size="sm">Bearbeiten</Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                      Keine Schichten gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeSubTab === 'performance' && performanceData && (
        <div className="drivers-performance">
          <div className="performance-table-section">
            <table className="drivers-table">
              <thead>
                <tr>
                  <th>Fahrer</th>
                  <th>Lieferungen</th>
                  <th>Ø Lieferzeit</th>
                  <th>Bewertung</th>
                  <th>Pünktlichkeit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.map((driver: {
                  id: string;
                  name: string;
                  totalDeliveries: number;
                  avgDeliveryTime: number;
                  rating: number;
                  onTimeRate: number;
                  status: string;
                }) => (
                  <tr key={driver.id}>
                    <td><strong>{driver.name}</strong></td>
                    <td>{driver.totalDeliveries}</td>
                    <td>{driver.avgDeliveryTime} Min</td>
                    <td>
                      <span className="rating-badge">
                        ⭐ {driver.rating.toFixed(1)}/5
                      </span>
                    </td>
                    <td>
                      <span className={`on-time-badge ${driver.onTimeRate >= 90 ? 'excellent' : driver.onTimeRate >= 75 ? 'good' : 'poor'}`}>
                        {driver.onTimeRate.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${driver.status.toLowerCase()}`}>
                        {driver.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Earnings Tab */}
      {activeSubTab === 'earnings' && earningsData && (
        <div className="drivers-earnings">
          <div className="earnings-metrics">
            <div className="metric-card">
              <h3>Gesamtverdienst</h3>
              <div className="metric-value">
                {earningsData.totalEarnings?.toFixed(2) || '0.00'} €
              </div>
              <div className="metric-subtitle">Dieser Monat</div>
            </div>
            <div className="metric-card">
              <h3>Durchschnitt pro Fahrer</h3>
              <div className="metric-value">
                {earningsData.avgEarningsPerDriver?.toFixed(2) || '0.00'} €
              </div>
              <div className="metric-subtitle">Monatlich</div>
            </div>
            <div className="metric-card">
              <h3>Ausstehende Zahlungen</h3>
              <div className="metric-value">
                {earningsData.pendingPayments?.toFixed(2) || '0.00'} €
              </div>
              <div className="metric-subtitle">Zu zahlen</div>
            </div>
          </div>

          {earningsChartData && (
            <div className="drivers-chart-card">
              <h3>Verdienst-Entwicklung</h3>
              <div style={{ height: '300px' }}>
                <Chart
                  type="bar"
                  data={{
                    data: earningsChartData,
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return value + ' €';
                            },
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeSubTab === 'analytics' && driverAnalytics && (
        <div className="drivers-analytics">
          <div className="analytics-metrics">
            <div className="metric-card">
              <h3>Wachstumsrate</h3>
              <div className="metric-value">
                {driverAnalytics.growthRate ? `${driverAnalytics.growthRate.toFixed(1)}%` : '0%'}
              </div>
              <div className="metric-subtitle">Fahrer-Wachstum</div>
            </div>
            <div className="metric-card">
              <h3>Retention Rate</h3>
              <div className="metric-value">
                {driverAnalytics.retentionRate ? `${driverAnalytics.retentionRate.toFixed(1)}%` : '0%'}
              </div>
              <div className="metric-subtitle">Fahrer-Retention</div>
            </div>
            <div className="metric-card">
              <h3>Durchschnittliche Aktivität</h3>
              <div className="metric-value">
                {driverAnalytics.avgActivityHours || 0} Std
              </div>
              <div className="metric-subtitle">Pro Woche</div>
            </div>
          </div>

          {performanceChartData && (
            <div className="drivers-chart-card">
              <h3>Performance-Trend</h3>
              <div style={{ height: '300px' }}>
                <Chart
                  type="line"
                  data={{
                    data: performanceChartData,
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return value + ' Min';
                            },
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

