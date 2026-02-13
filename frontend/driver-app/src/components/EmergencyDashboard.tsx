import { useState, useEffect } from 'react';
import { EmergencyEvent } from '../services/emergencyIntelligenceService';
import { emergencyIntelligenceService } from '../services/emergencyIntelligenceService';
import { Driver } from '../types';
import { AlertTriangleIcon, HeartIcon, CarIcon, MapPinIcon, CheckCircleIcon } from './Icons';
import { logger } from '../utils/logger';
import './EmergencyDashboard.css';

interface EmergencyDashboardProps {
  driver: Driver;
}

export function EmergencyDashboard({ driver }: EmergencyDashboardProps) {
  const [emergencies, setEmergencies] = useState<EmergencyEvent[]>([]);
  const [monitoringActive, setMonitoringActive] = useState(false);

  useEffect(() => {
    loadEmergencyData();

    // Start monitoring wenn Dashboard geladen wird
    if (!monitoringActive) {
      emergencyIntelligenceService.startMonitoring(driver, {
        enableHealthMonitoring: true,
        enableVehicleMonitoring: true,
        enableBehaviorMonitoring: true
      });
      setMonitoringActive(true);
    }

    return () => {
      // Cleanup beim Unmount
      if (monitoringActive) {
        emergencyIntelligenceService.stopMonitoring();
        setMonitoringActive(false);
      }
    };
  }, [driver, monitoringActive]);

  const loadEmergencyData = () => {
    const emergencyEvents = emergencyIntelligenceService.getEmergencyEvents();
    setEmergencies(emergencyEvents);
  };

  const getSeverityColor = (severity: EmergencyEvent['severity']) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (type: EmergencyEvent['type']) => {
    switch (type) {
      case 'health': return <HeartIcon size={20} />;
      case 'vehicle': return <CarIcon size={20} />;
      case 'traffic': return <AlertTriangleIcon size={20} />;
      case 'behavior': return <AlertTriangleIcon size={20} />;
      case 'location': return <MapPinIcon size={20} />;
      default: return <AlertTriangleIcon size={20} />;
    }
  };

  const getSeverityLabel = (severity: EmergencyEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'KRITISCH';
      case 'high': return 'HOCH';
      case 'medium': return 'MITTEL';
      case 'low': return 'NIEDRIG';
      default: return String(severity).toUpperCase();
    }
  };

  const resolveEmergency = async (emergencyId: string) => {
    try {
      await emergencyIntelligenceService.resolveEmergency(emergencyId);
      loadEmergencyData(); // Refresh data
      logger.info(`Emergency resolved: ${emergencyId}`, 'EmergencyDashboard');
    } catch (error) {
      logger.error('Failed to resolve emergency', 'EmergencyDashboard', error);
    }
  };

  const triggerManualEmergency = async () => {
    if (window.confirm('🚨 Manuellen Notfall auslösen?\n\nDies wird alle Notfall-Protokolle aktivieren.')) {
      try {
        await emergencyIntelligenceService.triggerManualEmergency(
          'behavior',
          'Manueller Notfall ausgelöst durch Fahrer'
        );
        loadEmergencyData();
      } catch (error) {
        logger.error('Failed to trigger manual emergency', 'EmergencyDashboard', error);
      }
    }
  };

  const activeEmergencies = emergencies.filter(e => !e.resolved);
  const resolvedEmergencies = emergencies.filter(e => e.resolved);

  return (
    <div className="emergency-dashboard">
      <div className="emergency-header">
        <div className="emergency-title">
          <AlertTriangleIcon size={24} className="emergency-icon" />
          <h2>Notfall-Intelligenz Dashboard</h2>
        </div>
      </div>

        <div className="emergency-status">
          <div className="status-indicator">
            <div className={`status-dot ${monitoringActive ? 'active' : 'inactive'}`}></div>
            <span>{monitoringActive ? 'Monitoring aktiv' : 'Monitoring inaktiv'}</span>
          </div>

          <div className="emergency-stats">
            <div className="stat-item">
              <span className="stat-number critical">{activeEmergencies.filter(e => e.severity === 'critical').length}</span>
              <span className="stat-label">Kritisch</span>
            </div>
            <div className="stat-item">
              <span className="stat-number high">{activeEmergencies.filter(e => e.severity === 'high').length}</span>
              <span className="stat-label">Hoch</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{activeEmergencies.length}</span>
              <span className="stat-label">Aktiv</span>
            </div>
          </div>
        </div>

        <div className="emergency-actions">
          <button
            className="emergency-btn manual-emergency"
            onClick={triggerManualEmergency}
          >
            <AlertTriangleIcon size={18} />
            Manueller Notfall
          </button>

          <button
            className="emergency-btn refresh"
            onClick={loadEmergencyData}
          >
            Aktualisieren
          </button>
        </div>

        <div className="emergency-content">
          {/* Active Emergencies */}
          {activeEmergencies.length > 0 && (
            <div className="emergency-section">
              <h3>⚠️ Aktive Notfälle</h3>
              <div className="emergency-list">
                {activeEmergencies.map((emergency) => (
                  <div
                    key={emergency.id}
                    className={`emergency-item ${emergency.severity}`}
                    style={{ borderLeftColor: getSeverityColor(emergency.severity) }}
                  >
                    <div className="emergency-icon-type">
                      {getSeverityIcon(emergency.type)}
                    </div>

                    <div className="emergency-content">
                      <div className="emergency-header">
                        <div className="emergency-description">
                          {emergency.description}
                        </div>
                        <div className="emergency-severity">
                          {getSeverityLabel(emergency.severity)}
                        </div>
                      </div>

                      <div className="emergency-meta">
                        <span className="emergency-time">
                          {emergency.timestamp.toLocaleTimeString('de-DE')}
                        </span>
                        <span className="emergency-type">
                          {emergency.type.toUpperCase()}
                        </span>
                      </div>

                      {emergency.actions.length > 0 && (
                        <div className="emergency-actions-list">
                          {emergency.actions.map((action) => (
                            <div key={action.id} className={`action-item ${action.executed ? 'executed' : 'pending'}`}>
                              <span className="action-type">{action.type.replace('_', ' ').toUpperCase()}</span>
                              {action.executed && <CheckCircleIcon size={14} className="action-check" />}
                              {action.result && (
                                <span className="action-result">{action.result}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="emergency-controls">
                      <button
                        className="resolve-btn"
                        onClick={() => resolveEmergency(emergency.id)}
                        title="Notfall als behoben markieren"
                      >
                        <CheckCircleIcon size={16} />
                        Beheben
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolved Emergencies */}
          {resolvedEmergencies.length > 0 && (
            <div className="emergency-section resolved">
              <h3>✅ Behobene Notfälle</h3>
              <div className="emergency-list resolved">
                {resolvedEmergencies.slice(0, 10).map((emergency) => (
                  <div key={emergency.id} className="emergency-item resolved">
                    <div className="emergency-icon-type resolved">
                      <CheckCircleIcon size={20} />
                    </div>

                    <div className="emergency-content">
                      <div className="emergency-description resolved">
                        {emergency.description}
                      </div>
                      <div className="emergency-meta">
                        <span className="emergency-time">
                          Behoben: {emergency.timestamp.toLocaleTimeString('de-DE')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Emergencies */}
          {emergencies.length === 0 && (
            <div className="emergency-empty">
              <div className="empty-icon">🛡️</div>
              <h3>Alles in Ordnung</h3>
              <p>Keine Notfälle erkannt. Das System überwacht kontinuierlich Ihre Sicherheit.</p>
            </div>
          )}
        </div>
    </div>
  );
}
