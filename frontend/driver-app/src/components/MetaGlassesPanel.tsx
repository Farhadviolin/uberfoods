import { useState, useEffect } from 'react';
import { MetaGlassesState, ARSettings } from '../types';
import { metaGlassesService } from '../services/metaGlassesService';
import { BatteryIcon, WifiIcon, WifiOffIcon, EyeIcon, VolumeIcon } from './Icons';
import { logger } from '../utils/logger';
import './MetaGlassesPanel.css';

interface MetaGlassesPanelProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function MetaGlassesPanel({ onConnect, onDisconnect }: MetaGlassesPanelProps) {
  const [glassesState, setGlassesState] = useState<MetaGlassesState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [settings, setSettings] = useState<ARSettings>({
    enabled: true,
    overlayOpacity: 0.8,
    voiceGuidance: true,
    hapticFeedback: true,
    autoZoom: true,
    nightMode: false,
    showTraffic: true,
    showPointsOfInterest: true
  });

  useEffect(() => {
    updateGlassesState();
    const interval = setInterval(updateGlassesState, 5000); // Alle 5 Sekunden aktualisieren
    return () => clearInterval(interval);
  }, []);

  const updateGlassesState = () => {
    const state = metaGlassesService.getState();
    setGlassesState(state);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Get driver ID from auth context if available
      const driverId = (window as any).__driverId__ || null;
      const deviceId = `device-${Date.now()}`;
      
      const success = await metaGlassesService.connect(driverId, deviceId);
      if (success) {
        onConnect?.();
        updateGlassesState();
        logger.info('Meta Glasses connected via UI', 'MetaGlassesPanel');
      }
    } catch (error) {
      logger.error('Failed to connect Meta Glasses', 'MetaGlassesPanel', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    metaGlassesService.disconnect();
    onDisconnect?.();
    updateGlassesState();
    logger.info('Meta Glasses disconnected via UI', 'MetaGlassesPanel');
  };

  const handleSettingsChange = (key: keyof ARSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    metaGlassesService.updateSettings(newSettings);
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return '#10b981';
    if (level > 20) return '#f59e0b';
    return '#ef4444';
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 30) return '#10b981';
    if (temp < 35) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="meta-glasses-panel">
      <div className="panel-header">
        <div className="header-content">
          <EyeIcon size={24} className="glasses-icon" />
          <h2>Meta Glasses AR</h2>
        </div>
      </div>

        <div className="panel-content">
          {/* Connection Status */}
          <div className="connection-section">
            <div className="connection-status">
              <div className={`status-indicator ${glassesState?.connected ? 'connected' : 'disconnected'}`}>
                {glassesState?.connected ? <WifiIcon size={20} /> : <WifiOffIcon size={20} />}
                <span>{glassesState?.connected ? 'Verbunden' : 'Nicht verbunden'}</span>
              </div>

              {glassesState?.connected && (
                <div className="device-info">
                  <div className="info-item">
                    <BatteryIcon size={16} color={getBatteryColor(glassesState.batteryLevel)} />
                    <span>{glassesState.batteryLevel}%</span>
                  </div>
                  <div className="info-item">
                    <span className="temp-icon">🌡️</span>
                    <span style={{ color: getTemperatureColor(glassesState.temperature) }}>
                      {glassesState.temperature}°C
                    </span>
                  </div>
                  <div className="info-item">
                    <span>AR: {glassesState.arEnabled ? '✅' : '❌'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="connection-actions">
              {!glassesState?.connected ? (
                <button
                  className="connect-btn"
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  {connecting ? '🔄 Verbinde...' : '🔌 Verbinden'}
                </button>
              ) : (
                <button
                  className="disconnect-btn"
                  onClick={handleDisconnect}
                >
                  🔌 Trennen
                </button>
              )}
            </div>
          </div>

          {/* AR Settings */}
          {glassesState?.connected && (
            <div className="settings-section">
              <h3>AR-Einstellungen</h3>

              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <EyeIcon size={16} />
                    AR aktiv
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => handleSettingsChange('enabled', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <VolumeIcon size={16} />
                    Sprachausgabe
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.voiceGuidance}
                      onChange={(e) => handleSettingsChange('voiceGuidance', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    📳 Haptisches Feedback
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.hapticFeedback}
                      onChange={(e) => handleSettingsChange('hapticFeedback', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    🔍 Auto-Zoom
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.autoZoom}
                      onChange={(e) => handleSettingsChange('autoZoom', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    🌙 Nachtmodus
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.nightMode}
                      onChange={(e) => handleSettingsChange('nightMode', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    🚦 Verkehr anzeigen
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.showTraffic}
                      onChange={(e) => handleSettingsChange('showTraffic', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    🏪 POIs anzeigen
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.showPointsOfInterest}
                      onChange={(e) => handleSettingsChange('showPointsOfInterest', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item full-width">
                  <label className="setting-label">
                    👁️ Overlay-Transparenz
                  </label>
                  <div className="opacity-control">
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={settings.overlayOpacity}
                      onChange={(e) => handleSettingsChange('overlayOpacity', parseFloat(e.target.value))}
                    />
                    <span className="opacity-value">{Math.round(settings.overlayOpacity * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AR Navigation Status */}
          {glassesState?.connected && glassesState.arEnabled && (
            <div className="navigation-section">
              <h3>AR-Navigation</h3>

              {glassesState.navigationSteps.length > 0 ? (
                <div className="navigation-status">
                  <div className="nav-stats">
                    <div className="nav-stat">
                      <span className="stat-label">Aktuelle Route:</span>
                      <span className="stat-value">{glassesState.navigationSteps.length} Schritte</span>
                    </div>
                    <div className="nav-stat">
                      <span className="stat-label">Abgeschlossen:</span>
                      <span className="stat-value">
                        {glassesState.navigationSteps.filter(s => s.completed).length} / {glassesState.navigationSteps.length}
                      </span>
                    </div>
                  </div>

                  <div className="current-step">
                    {(() => {
                      const currentStep = glassesState.navigationSteps.find(s => !s.completed);
                      return currentStep ? (
                        <div className="step-info">
                          <div className="step-instruction">{currentStep.instruction}</div>
                          <div className="step-details">
                            <span>{Math.round(currentStep.distance)}m</span>
                            <span>•</span>
                            <span>{Math.round(currentStep.duration / 60)}min</span>
                          </div>
                        </div>
                      ) : (
                        <div className="no-active-step">Keine aktive Navigation</div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="no-navigation">
                  <div className="no-nav-icon">🗺️</div>
                  <p>Keine aktive AR-Navigation</p>
                  <small>Starten Sie eine Route, um AR-Anweisungen zu erhalten</small>
                </div>
              )}
            </div>
          )}

          {/* Current Overlay Preview */}
          {glassesState?.currentOverlay && (
            <div className="overlay-preview">
              <h4>Aktuelles AR-Overlay</h4>
              <div className={`overlay-preview-card ${glassesState.currentOverlay.type}`}>
                <div className="overlay-position">{glassesState.currentOverlay.position}</div>
                <div className="overlay-content">
                  {glassesState.currentOverlay.icon && (
                    <span className="overlay-icon">{glassesState.currentOverlay.icon}</span>
                  )}
                  <span>{glassesState.currentOverlay.content}</span>
                </div>
                <div className="overlay-priority">{glassesState.currentOverlay.priority}</div>
              </div>
            </div>
          )}

          {/* Features Overview */}
          <div className="features-section">
            <h3>AR-Features</h3>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🧭</div>
                <div className="feature-content">
                  <h4>Live-Navigation</h4>
                  <p>AR-Overlays mit Richtungsanweisungen</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🚦</div>
                <div className="feature-content">
                  <h4>Traffic-Info</h4>
                  <p>Echtzeit-Verkehrsinformationen</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🏪</div>
                <div className="feature-content">
                  <h4>POI-Erkennung</h4>
                  <p>Points of Interest in Sichtfeld</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🎯</div>
                <div className="feature-content">
                  <h4>Ziel-Markierung</h4>
                  <p>Visuelle Hinweise für Ziele</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🔊</div>
                <div className="feature-content">
                  <h4>Sprachausgabe</h4>
                <p>Audio-Anweisungen und Warnungen</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">📳</div>
                <div className="feature-content">
                  <h4>Haptisches Feedback</h4>
                  <p>Vibrations-Hinweise für wichtige Events</p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
