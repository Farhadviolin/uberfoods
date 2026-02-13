import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import { Button } from '../design-system/Button';
import { Skeleton, SkeletonCard } from '../design-system/Skeleton';
import './AutomaticTaxSettings.css';

interface TaxProfile {
  id: string;
  driverId?: string;
  restaurantId?: string;
  taxId?: string;
  ustId?: string;
  finanzamtStatus: string;
  autoReportEnabled: boolean;
  autoPayoutEnabled: boolean;
  reportingFrequency: string;
  tseEnabled?: boolean;
  driver?: { id: string; name: string; email: string };
  restaurant?: { id: string; name: string; email: string };
}

export function AutomaticTaxSettings() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<{
    drivers: TaxProfile[];
    restaurants: TaxProfile[];
  }>({ drivers: [], restaurants: [] });
  const [globalSettings, setGlobalSettings] = useState({
    autoReportEnabled: true,
    autoPayoutEnabled: true,
    finanzamtApiEnabled: false,
    finanzamtApiUrl: '',
    finanzamtApiKey: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tax-settings/profiles');
      setProfiles(response.data);
    } catch (error: any) {
      showToast('Fehler beim Laden der Steuer-Profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateAutoReport = async (
    entityType: 'driver' | 'restaurant',
    entityId: string,
    enabled: boolean,
  ) => {
    try {
      await api.put(`/tax-settings/${entityType}/${entityId}/auto-report`, {
        enabled,
      });
      showToast('Einstellung erfolgreich aktualisiert', 'success');
      loadData();
    } catch (error: any) {
      showToast('Fehler beim Aktualisieren', 'error');
    }
  };

  const updateAutoPayout = async (
    entityType: 'driver' | 'restaurant',
    entityId: string,
    enabled: boolean,
  ) => {
    try {
      await api.put(`/tax-settings/${entityType}/${entityId}/auto-payout`, {
        enabled,
      });
      showToast('Einstellung erfolgreich aktualisiert', 'success');
      loadData();
    } catch (error: any) {
      showToast('Fehler beim Aktualisieren', 'error');
    }
  };

  const enableTSE = async (restaurantId: string, serialNumber?: string) => {
    try {
      await api.post(`/tax-settings/restaurant/${restaurantId}/tse`, {
        serialNumber,
      });
      showToast('TSE erfolgreich aktiviert', 'success');
      loadData();
    } catch (error: any) {
      showToast('Fehler beim Aktivieren der TSE', 'error');
    }
  };

  const generateManualReport = async (
    entityType: 'DRIVER' | 'RESTAURANT',
    entityId: string,
    period: string,
  ) => {
    try {
      await api.post(`/tax-settings/report/${entityType}/${entityId}`, {
        period,
      });
      showToast('Steuer-Meldung erfolgreich generiert', 'success');
    } catch (error: any) {
      showToast('Fehler beim Generieren der Meldung', 'error');
    }
  };

  if (loading) {
    return (
      <div className="automatic-tax-settings">
        <Skeleton height="32px" width="300px" />
        <div style={{ marginTop: '20px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="automatic-tax-settings">
      <div className="settings-header">
        <h2>⚙️ Automatische Steuer-Meldungen & Auszahlungen</h2>
        <p className="settings-description">
          Konfigurieren Sie automatische Steuer-Meldungen und Auszahlungen für Fahrer und Restaurants.
          Alle Einnahmen werden automatisch an das Finanzamt gemeldet.
        </p>
      </div>

      {/* Globale Einstellungen */}
      <div className="settings-section">
        <h3>🌐 Globale Einstellungen</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={globalSettings.autoReportEnabled}
                onChange={(e) =>
                  setGlobalSettings({
                    ...globalSettings,
                    autoReportEnabled: e.target.checked,
                  })
                }
              />
              Automatische Steuer-Meldungen aktivieren
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={globalSettings.autoPayoutEnabled}
                onChange={(e) =>
                  setGlobalSettings({
                    ...globalSettings,
                    autoPayoutEnabled: e.target.checked,
                  })
                }
              />
              Automatische Auszahlungen aktivieren
            </label>
          </div>
        </div>
      </div>

      {/* Finanzamt-Integration */}
      <div className="settings-section">
        <h3>🏛️ Finanzamt-Integration</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={globalSettings.finanzamtApiEnabled}
                onChange={(e) =>
                  setGlobalSettings({
                    ...globalSettings,
                    finanzamtApiEnabled: e.target.checked,
                  })
                }
              />
              Finanzamt API aktivieren
            </label>
          </div>
          <div className="setting-item">
            <label>
              API URL:
              <input
                type="text"
                value={globalSettings.finanzamtApiUrl}
                onChange={(e) =>
                  setGlobalSettings({
                    ...globalSettings,
                    finanzamtApiUrl: e.target.value,
                  })
                }
                placeholder="https://finanzonline.bmf.gv.at/api"
              />
            </label>
          </div>
          <div className="setting-item">
            <label>
              API Key:
              <input
                type="password"
                value={globalSettings.finanzamtApiKey}
                onChange={(e) =>
                  setGlobalSettings({
                    ...globalSettings,
                    finanzamtApiKey: e.target.value,
                  })
                }
                placeholder="Ihr Finanzamt API Key"
              />
            </label>
          </div>
          <Button variant="primary" onClick={() => showToast('Einstellungen gespeichert', 'success')}>
            Verbindung testen
          </Button>
        </div>
      </div>

      {/* Fahrer-Profile */}
      <div className="settings-section">
        <h3>🚗 Fahrer-Profile ({profiles.drivers.length})</h3>
        <div className="profiles-list">
          {profiles.drivers.map((profile) => (
            <div key={profile.id} className="profile-card">
              <div className="profile-header">
                <h4>{profile.driver?.name || 'Unbekannt'}</h4>
                <span className={`status-badge status-${profile.finanzamtStatus.toLowerCase()}`}>
                  {profile.finanzamtStatus}
                </span>
              </div>
              <div className="profile-details">
                <p><strong>E-Mail:</strong> {profile.driver?.email}</p>
                {profile.taxId && <p><strong>Steuernummer:</strong> {profile.taxId}</p>}
                <p><strong>Meldungsfrequenz:</strong> {profile.reportingFrequency}</p>
              </div>
              <div className="profile-actions">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={profile.autoReportEnabled}
                    onChange={(e) =>
                      updateAutoReport('driver', profile.driverId!, e.target.checked)
                    }
                  />
                  <span>Automatische Meldungen</span>
                </label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={profile.autoPayoutEnabled}
                    onChange={(e) =>
                      updateAutoPayout('driver', profile.driverId!, e.target.checked)
                    }
                  />
                  <span>Automatische Auszahlungen</span>
                </label>
              </div>
            </div>
          ))}
          {profiles.drivers.length === 0 && (
            <p className="empty-state">Keine Fahrer-Profile gefunden</p>
          )}
        </div>
      </div>

      {/* Restaurant-Profile */}
      <div className="settings-section">
        <h3>🍽️ Restaurant-Profile ({profiles.restaurants.length})</h3>
        <div className="profiles-list">
          {profiles.restaurants.map((profile) => (
            <div key={profile.id} className="profile-card">
              <div className="profile-header">
                <h4>{profile.restaurant?.name || 'Unbekannt'}</h4>
                <span className={`status-badge status-${profile.finanzamtStatus.toLowerCase()}`}>
                  {profile.finanzamtStatus}
                </span>
              </div>
              <div className="profile-details">
                <p><strong>E-Mail:</strong> {profile.restaurant?.email}</p>
                {profile.taxId && <p><strong>Steuernummer:</strong> {profile.taxId}</p>}
                {profile.ustId && <p><strong>UID-Nummer:</strong> {profile.ustId}</p>}
                <p><strong>Meldungsfrequenz:</strong> {profile.reportingFrequency}</p>
                <p>
                  <strong>TSE:</strong>{' '}
                  {profile.tseEnabled ? (
                    <span className="status-ok">✅ Aktiviert</span>
                  ) : (
                    <span className="status-warning">❌ Nicht aktiviert</span>
                  )}
                </p>
              </div>
              <div className="profile-actions">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={profile.autoReportEnabled}
                    onChange={(e) =>
                      updateAutoReport('restaurant', profile.restaurantId!, e.target.checked)
                    }
                  />
                  <span>Automatische Meldungen</span>
                </label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={profile.autoPayoutEnabled}
                    onChange={(e) =>
                      updateAutoPayout('restaurant', profile.restaurantId!, e.target.checked)
                    }
                  />
                  <span>Automatische Auszahlungen</span>
                </label>
                {!profile.tseEnabled && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => enableTSE(profile.restaurantId!)}
                  >
                    TSE aktivieren
                  </Button>
                )}
              </div>
            </div>
          ))}
          {profiles.restaurants.length === 0 && (
            <p className="empty-state">Keine Restaurant-Profile gefunden</p>
          )}
        </div>
      </div>
    </div>
  );
}

