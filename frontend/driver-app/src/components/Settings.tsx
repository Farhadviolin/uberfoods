import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { SubscriptionTierSelector } from './SubscriptionTierSelector';
import './Settings.css';

interface DriverSettings {
  notifications: {
    newOrder: boolean;
    orderUpdate: boolean;
    payment: boolean;
    rating: boolean;
    system: boolean;
  };
  location: {
    autoUpdate: boolean;
    updateInterval: number;
    accuracy: 'high' | 'medium' | 'low';
  };
  app: {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  privacy: {
    shareLocation: boolean;
    showPhoneNumber: boolean;
  };
}

export function Settings() {
  const { driver } = useAuth();
  const [settings, setSettings] = useState<DriverSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  useEffect(() => {
    if (driver) {
      fetchSettings();
      fetchSubscription();
    }
  }, [driver]);

  const fetchSettings = async () => {
    if (!driver) return;
    try {
      setLoading(true);
      const response = await api.get(`/drivers/${driver.id}/settings`);
      setSettings(response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<DriverSettings>) => {
    if (!driver || !settings) return;
    try {
      setSaving(true);
      const updated = { ...settings, ...newSettings };
      const response = await api.put(`/drivers/${driver.id}/settings`, updated);
      setSettings(response.data);
      alert('Einstellungen gespeichert!');
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const updateNotificationPreference = async (key: keyof DriverSettings['notifications'], value: boolean) => {
    if (!settings) return;
    await updateSettings({
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
  };

  const fetchSubscription = async () => {
    if (!driver) return;
    try {
      setLoadingSubscription(true);
      const response = await api.get(`/drivers/${driver.id}/subscription`);
      setSubscription(response.data);
    } catch (error: any) {
      // Keine Subscription ist kein Fehler
      if (error.response?.status !== 404) {
        console.error('Fehler beim Laden der Subscription:', error);
      }
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleSubscriptionChange = () => {
    fetchSubscription();
  };

  if (!driver) return null;

  if (loading || !settings) {
    return <div className="settings-loading">Lade Einstellungen...</div>;
  }

  return (
    <div className="settings">
      <h2>⚙️ Einstellungen</h2>

      <div className="settings-section">
        <h3>🔔 Benachrichtigungen</h3>
        <div className="settings-group">
          <label className="setting-item">
            <span>Neue Bestellungen</span>
            <input
              type="checkbox"
              checked={settings.notifications.newOrder}
              onChange={(e) => updateNotificationPreference('newOrder', e.target.checked)}
            />
          </label>
          <label className="setting-item">
            <span>Bestellungs-Updates</span>
            <input
              type="checkbox"
              checked={settings.notifications.orderUpdate}
              onChange={(e) => updateNotificationPreference('orderUpdate', e.target.checked)}
            />
          </label>
          <label className="setting-item">
            <span>Zahlungen</span>
            <input
              type="checkbox"
              checked={settings.notifications.payment}
              onChange={(e) => updateNotificationPreference('payment', e.target.checked)}
            />
          </label>
          <label className="setting-item">
            <span>Bewertungen</span>
            <input
              type="checkbox"
              checked={settings.notifications.rating}
              onChange={(e) => updateNotificationPreference('rating', e.target.checked)}
            />
          </label>
          <label className="setting-item">
            <span>System</span>
            <input
              type="checkbox"
              checked={settings.notifications.system}
              onChange={(e) => updateNotificationPreference('system', e.target.checked)}
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>📍 Standort</h3>
        <div className="settings-group">
          <label className="setting-item">
            <span>Automatische Updates</span>
            <input
              type="checkbox"
              checked={settings.location.autoUpdate}
              onChange={(e) => updateSettings({
                location: { ...settings.location, autoUpdate: e.target.checked },
              })}
            />
          </label>
          <label className="setting-item">
            <span>Update-Intervall (Sekunden)</span>
            <input
              type="number"
              value={settings.location.updateInterval}
              onChange={(e) => updateSettings({
                location: { ...settings.location, updateInterval: parseInt(e.target.value) },
              })}
              min={10}
              max={300}
            />
          </label>
          <label className="setting-item">
            <span>Genauigkeit</span>
            <select
              value={settings.location.accuracy}
              onChange={(e) => updateSettings({
                location: { ...settings.location, accuracy: e.target.value as any },
              })}
            >
              <option value="high">Hoch</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>📱 App</h3>
        <div className="settings-group">
          <label className="setting-item">
            <span>Sprache</span>
            <select
              value={settings.app.language}
              onChange={(e) => updateSettings({
                app: { ...settings.app, language: e.target.value },
              })}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="setting-item">
            <span>Theme</span>
            <select
              value={settings.app.theme}
              onChange={(e) => updateSettings({
                app: { ...settings.app, theme: e.target.value as any },
              })}
            >
              <option value="light">Hell</option>
              <option value="dark">Dunkel</option>
              <option value="auto">Automatisch</option>
            </select>
          </label>
          <label className="setting-item">
            <span>Töne aktiviert</span>
            <input
              type="checkbox"
              checked={settings.app.soundEnabled}
              onChange={(e) => updateSettings({
                app: { ...settings.app, soundEnabled: e.target.checked },
              })}
            />
          </label>
          <label className="setting-item">
            <span>Vibration aktiviert</span>
            <input
              type="checkbox"
              checked={settings.app.vibrationEnabled}
              onChange={(e) => updateSettings({
                app: { ...settings.app, vibrationEnabled: e.target.checked },
              })}
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>🔒 Datenschutz</h3>
        <div className="settings-group">
          <label className="setting-item">
            <span>Standort teilen</span>
            <input
              type="checkbox"
              checked={settings.privacy.shareLocation}
              onChange={(e) => updateSettings({
                privacy: { ...settings.privacy, shareLocation: e.target.checked },
              })}
            />
          </label>
          <label className="setting-item">
            <span>Telefonnummer anzeigen</span>
            <input
              type="checkbox"
              checked={settings.privacy.showPhoneNumber}
              onChange={(e) => updateSettings({
                privacy: { ...settings.privacy, showPhoneNumber: e.target.checked },
              })}
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>💳 Subscription</h3>
        {loadingSubscription ? (
          <div className="settings-loading">Lade Subscription...</div>
        ) : (
          <SubscriptionTierSelector
            driverId={driver.id}
            currentSubscription={subscription}
            onSubscriptionChange={handleSubscriptionChange}
          />
        )}
      </div>
    </div>
  );
}

