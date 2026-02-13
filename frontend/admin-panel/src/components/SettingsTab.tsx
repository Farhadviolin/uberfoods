import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';
import { useToast } from '../contexts/ToastContext';

interface Setting {
  key: string;
  value: any;
  category: string;
  description?: string;
  updatedAt: string;
}

function SettingsTabInner() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [platformSettings, setPlatformSettings] = useState<any>({});
  const [paymentSettings, setPaymentSettings] = useState<any>({});
  const [emailSettings, setEmailSettings] = useState<any>({});
  const [featureSettings, setFeatureSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('platform');
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [platform, payment, email, features] = await Promise.all([
        api.get('/settings/platform'),
        api.get('/settings/payment'),
        api.get('/settings/email'),
        api.get('/settings/features').catch(() => ({ data: {} })), // Feature-Flags optional
      ]);

      const platformData = extractData(platform.data) || platform.data || {};
      const paymentData = extractData(payment.data) || payment.data || {};
      const emailData = extractData(email.data) || email.data || {};
      const featuresData = extractData(features.data) || features.data || {};

      setPlatformSettings(platformData);
      setPaymentSettings(paymentData);
      setEmailSettings(emailData);
      setFeatureSettings(featuresData);

      // Merge für editedSettings
      setEditedSettings({
        ...platform.data,
        ...payment.data,
        ...email.data,
        ...features.data,
      });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Laden der Einstellungen', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSettingChange = useCallback((key: string, value: any) => {
    setEditedSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    try {
      const settingsArray = Object.entries(editedSettings).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      }));

      await api.put('/settings/bulk/update', { settings: settingsArray });
      showToast('Einstellungen erfolgreich gespeichert!', 'success');
      fetchSettings();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Speichern der Einstellungen', 'error');
    }
  }, [editedSettings, showToast, fetchSettings]);

  const getCurrentSettings = useCallback(() => {
    switch (activeCategory) {
      case 'platform':
        return platformSettings;
      case 'payment':
        return paymentSettings;
      case 'email':
        return emailSettings;
      case 'features':
        return featureSettings;
      default:
        return {};
    }
  }, [activeCategory, platformSettings, paymentSettings, emailSettings, featureSettings]);

  const renderSettingField = useCallback((key: string, label: string, type: string = 'text', options?: any) => {
    const currentValue = editedSettings[key] ?? getCurrentSettings()[key] ?? '';
    
    return (
      <div className="form-group" key={key}>
        <label>{label}</label>
        {type === 'select' ? (
          <select
            value={currentValue}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}
          >
            {options?.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : type === 'checkbox' ? (
          <label>
            <input
              type="checkbox"
              checked={currentValue}
              onChange={(e) => handleSettingChange(key, e.target.checked)}
            />
            {' '}Aktiviert
          </label>
        ) : type === 'number' ? (
          <input
            type="number"
            step="0.01"
            value={currentValue}
            onChange={(e) => handleSettingChange(key, parseFloat(e.target.value) || 0)}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}
          />
        ) : (
          <input
            type={type}
            value={currentValue}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}
          />
        )}
      </div>
    );
  }, [editedSettings, getCurrentSettings, handleSettingChange]);

  return (
    <div>
      {loading ? (
        <div className="loading">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Einstellungen werden geladen...</p>
        </div>
      ) : (
        <>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #E4E6EB' }}>
            <button
              onClick={() => setActiveCategory('platform')}
              style={{
                padding: '12px 24px',
                background: activeCategory === 'platform' ? '#1877F2' : 'transparent',
                color: activeCategory === 'platform' ? 'white' : '#65676B',
                border: 'none',
                borderBottom: activeCategory === 'platform' ? '3px solid #1877F2' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Platform
            </button>
            <button
              onClick={() => setActiveCategory('payment')}
              style={{
                padding: '12px 24px',
                background: activeCategory === 'payment' ? '#1877F2' : 'transparent',
                color: activeCategory === 'payment' ? 'white' : '#65676B',
                border: 'none',
                borderBottom: activeCategory === 'payment' ? '3px solid #1877F2' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Zahlungen
            </button>
            <button
              onClick={() => setActiveCategory('email')}
              style={{
                padding: '12px 24px',
                background: activeCategory === 'email' ? '#1877F2' : 'transparent',
                color: activeCategory === 'email' ? 'white' : '#65676B',
                border: 'none',
                borderBottom: activeCategory === 'email' ? '3px solid #1877F2' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              E-Mail
            </button>
            <button
              onClick={() => setActiveCategory('features')}
              style={{
                padding: '12px 24px',
                background: activeCategory === 'features' ? '#1877F2' : 'transparent',
                color: activeCategory === 'features' ? 'white' : '#65676B',
                border: 'none',
                borderBottom: activeCategory === 'features' ? '3px solid #1877F2' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Features
            </button>
          </div>

          {/* Settings Form */}
          <div className="form-container">
            <h2>
              {activeCategory === 'platform' && 'Platform-Einstellungen'}
              {activeCategory === 'payment' && 'Zahlungs-Einstellungen'}
              {activeCategory === 'email' && 'E-Mail-Einstellungen'}
              {activeCategory === 'features' && 'Customer Web Features'}
            </h2>

            {activeCategory === 'platform' && (
              <div>
                {renderSettingField('platform.name', 'Platform Name')}
                {renderSettingField('platform.email', 'Platform E-Mail', 'email')}
                {renderSettingField('platform.phone', 'Platform Telefon')}
                {renderSettingField('platform.currency', 'Währung', 'select', [
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'GBP', label: 'GBP (£)' },
                ])}
                {renderSettingField('platform.taxRate', 'MwSt. (%)', 'number')}
                {renderSettingField('platform.deliveryFee', 'Liefergebühr (€)', 'number')}
                {renderSettingField('platform.minOrderAmount', 'Mindestbestellwert (€)', 'number')}
              </div>
            )}

            {activeCategory === 'payment' && (
              <div>
                {renderSettingField('payment.stripe.enabled', 'Stripe aktiviert', 'checkbox')}
                {renderSettingField('payment.stripe.publicKey', 'Stripe Public Key')}
                {renderSettingField('payment.paypal.enabled', 'PayPal aktiviert', 'checkbox')}
                {renderSettingField('payment.defaultMethod', 'Standard-Zahlungsmethode', 'select', [
                  { value: 'STRIPE', label: 'Stripe' },
                  { value: 'PAYPAL', label: 'PayPal' },
                ])}
              </div>
            )}

            {activeCategory === 'email' && (
              <div>
                {renderSettingField('email.smtp.host', 'SMTP Host')}
                {renderSettingField('email.smtp.port', 'SMTP Port', 'number')}
                {renderSettingField('email.smtp.user', 'SMTP Benutzer')}
                {renderSettingField('email.smtp.password', 'SMTP Passwort', 'password')}
                {renderSettingField('email.from', 'Absender E-Mail', 'email')}
                {renderSettingField('email.fromName', 'Absender Name')}
              </div>
            )}

            {activeCategory === 'features' && (
              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '18px', fontWeight: 600 }}>Core Features</h3>
                {renderSettingField('features.mealPlanner', 'Meal Planner', 'checkbox')}
                {renderSettingField('features.loyaltyProgram', 'Loyalty Program', 'checkbox')}
                {renderSettingField('features.giftCards', 'Gift Cards', 'checkbox')}
                {renderSettingField('features.scheduledOrders', 'Scheduled Orders', 'checkbox')}
                
                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '18px', fontWeight: 600 }}>Advanced Features</h3>
                {renderSettingField('features.socialFoodNetwork', 'Social Food Network', 'checkbox')}
                {renderSettingField('features.groupOrdering', 'Group Ordering', 'checkbox')}
                {renderSettingField('features.predictiveOrdering', 'Predictive Ordering', 'checkbox')}
                {renderSettingField('features.personalizedChef', 'Personalized Chef', 'checkbox')}
                {renderSettingField('features.gamification', 'Gamification', 'checkbox')}
                {renderSettingField('features.nutritionTracker', 'Nutrition Tracker', 'checkbox')}
                {renderSettingField('features.expenseAnalytics', 'Expense Analytics', 'checkbox')}
                {renderSettingField('features.predictiveDelivery', 'Predictive Delivery', 'checkbox')}
                {renderSettingField('features.liveSocialOrdering', 'Live Social Ordering', 'checkbox')}
                
                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '18px', fontWeight: 600 }}>Communication Features</h3>
                {renderSettingField('features.chat', 'Chat', 'checkbox')}
                {renderSettingField('features.reviews', 'Reviews', 'checkbox')}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleSaveSettings}>
                Einstellungen speichern
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  fetchSettings();
                  showToast('Änderungen verworfen', 'info');
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const SettingsTab = memo(SettingsTabInner);

