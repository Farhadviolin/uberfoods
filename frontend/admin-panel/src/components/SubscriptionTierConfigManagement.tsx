import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { devWarn, devError } from '../utils/errorLogger';
import { extractErrorMessage, isAxiosErrorResponse } from '../utils/errorHandler';
import './SubscriptionTierConfigManagement.css';

interface TierConfig {
  id: string;
  tier: 'BASIC' | 'PRO' | 'FULLTIME' | 'ENTERPRISE';
  name: string;
  price: number;
  commissionRate: number;
  displayCommission: string;
  features: string[];
  isPopular: boolean;
  deliveryLimit?: number;
  payoutThreshold?: number;
  payoutDelay?: number;
  bonusThreshold?: number;
  bonusRate?: number;
  isActive: boolean;
}

export function SubscriptionTierConfigManagement() {
  const { showToast } = useToast();
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TierConfig>>({});

  useEffect(() => {
    fetchTierConfigs();
  }, []);

  const fetchTierConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users/subscriptions/tier-configs');
      const configs = res.data || [];
      
      // Sicherstellen dass es ein Array ist
      if (!Array.isArray(configs)) {
        devWarn('API returned non-array data, using empty array');
        setTierConfigs([]);
        return;
      }
      
      // Wenn keine Configs vom Backend kommen, verwende leeres Array
      // Fallback-Daten werden nur in handleEdit verwendet, wenn spezifisch eine Config fehlt
      setTierConfigs(configs);
    } catch (error: unknown) {
      // Bei API-Fehler: Leeres Array setzen, Fallback wird in handleEdit verwendet
      devError('Error fetching tier configs:', error);
      setTierConfigs([]);
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tier: string) => {
    // Suche Config in tierConfigs oder verwende Fallback
    let config = Array.isArray(tierConfigs) ? tierConfigs.find((c) => c.tier === tier) : null;
    
    // Wenn keine Config gefunden, erstelle Fallback basierend auf dem Tier
    if (!config) {
      const defaultConfigs: Record<string, Partial<TierConfig>> = {
        BASIC: {
          name: 'Basic',
          price: 29,
          commissionRate: 0.25,
          displayCommission: '25%',
          features: [
            '25% Provision vom Restaurant',
            'Tägliche Auszahlungen ab 50€',
            'Standard Support',
            'Bis zu 50 Lieferungen/Monat',
          ],
          isPopular: false,
          deliveryLimit: 50,
          payoutThreshold: 50,
          payoutDelay: 1,
          isActive: true,
        },
        PRO: {
          name: 'Pro',
          price: 49,
          commissionRate: 0.30,
          displayCommission: '30% (100%)',
          features: [
            '30% Provision (VOLLSTÄNDIG)',
            'Sofortige Auszahlungen ab 20€',
            'Priority Support',
            'Unbegrenzte Lieferungen',
            'Exklusive Features',
          ],
          isPopular: true,
          payoutThreshold: 20,
          payoutDelay: 0,
          isActive: true,
        },
        FULLTIME: {
          name: 'Vollzeit',
          price: 99,
          commissionRate: 0.30,
          displayCommission: '30% + Bonus',
          features: [
            '30% Provision',
            '2% Bonus bei >100 Lieferungen/Monat',
            'Exklusive High-Value Orders',
            'Dedicated Support',
            'Alle Pro-Features',
          ],
          isPopular: false,
          bonusThreshold: 100,
          bonusRate: 0.02,
          payoutThreshold: 20,
          payoutDelay: 0,
          isActive: true,
        },
        ENTERPRISE: {
          name: 'Enterprise',
          price: 0,
          commissionRate: 0.32,
          displayCommission: '32% (Custom)',
          features: [
            'Custom Commission Rate',
            'Unbegrenzte Lieferungen',
            'Dedicated Account Manager',
            'Custom Features',
          ],
          isPopular: false,
          isActive: true,
        },
      };
      
      const fallbackConfig = defaultConfigs[tier];
      config = {
        id: '',
        tier: tier as TierConfig['tier'],
        ...fallbackConfig,
        ...defaultConfigs[tier] || {
          name: tier,
          price: 0,
          commissionRate: 0,
          displayCommission: '0%',
          features: [],
          isPopular: false,
          isActive: true,
        },
      } as TierConfig;
    }
    
    // Setze Editing-Modus und Form-Daten
    setEditingTier(tier);
    setFormData({
      name: config.name,
      price: config.price,
      commissionRate: config.commissionRate,
      displayCommission: config.displayCommission,
      features: [...(config.features || [])],
      isPopular: config.isPopular,
      deliveryLimit: config.deliveryLimit,
      payoutThreshold: config.payoutThreshold,
      payoutDelay: config.payoutDelay,
      bonusThreshold: config.bonusThreshold,
      bonusRate: config.bonusRate,
      isActive: config.isActive,
    });
  };

  const handleSave = async () => {
    if (!editingTier) return;

    try {
      // Bereinige formData - entferne undefined/null/leere String Werte für optionale Felder
      const cleanedFormData: any = {
        name: formData.name || '',
        price: formData.price ?? 0,
        commissionRate: formData.commissionRate ?? 0,
        displayCommission: formData.displayCommission || '',
        features: Array.isArray(formData.features) 
          ? formData.features.filter((f: string) => f && f.trim() !== '') 
          : [],
        isPopular: formData.isPopular ?? false,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
      };

      // Validierung - prüfe required Felder
      if (!cleanedFormData.name || cleanedFormData.name.trim() === '') {
        showToast('Name ist erforderlich', 'error');
        return;
      }

      if (!cleanedFormData.displayCommission || cleanedFormData.displayCommission.trim() === '') {
        showToast('Display Commission ist erforderlich', 'error');
        return;
      }

      if (cleanedFormData.features.length === 0) {
        showToast('Mindestens ein Feature ist erforderlich', 'error');
        return;
      }

      // Füge optionale Felder nur hinzu, wenn sie definiert sind
      if (formData.deliveryLimit !== undefined && formData.deliveryLimit !== null && typeof formData.deliveryLimit === 'number') {
        cleanedFormData.deliveryLimit = formData.deliveryLimit;
      }
      if (formData.payoutThreshold !== undefined && formData.payoutThreshold !== null && typeof formData.payoutThreshold === 'number') {
        cleanedFormData.payoutThreshold = formData.payoutThreshold;
      }
      if (formData.payoutDelay !== undefined && formData.payoutDelay !== null && typeof formData.payoutDelay === 'number') {
        cleanedFormData.payoutDelay = formData.payoutDelay;
      }
      if (formData.bonusThreshold !== undefined && formData.bonusThreshold !== null && typeof formData.bonusThreshold === 'number') {
        cleanedFormData.bonusThreshold = formData.bonusThreshold;
      }
      if (formData.bonusRate !== undefined && formData.bonusRate !== null && typeof formData.bonusRate === 'number') {
        cleanedFormData.bonusRate = formData.bonusRate;
      }

      // Prüfe ob Config existiert
      const existingConfig = Array.isArray(tierConfigs) ? tierConfigs.find((c) => c.tier === editingTier) : null;
      
      if (existingConfig) {
        // Update bestehende Config
        try {
          await api.put(`/admin/users/subscriptions/tier-configs/${editingTier}`, cleanedFormData);
          showToast('Tier-Konfiguration erfolgreich aktualisiert', 'success');
        } catch (updateError: unknown) {
          // Falls Update fehlschlägt (z.B. NotFound), versuche Create
          if (isAxiosErrorResponse(updateError) && updateError.response?.status === 404) {
            await api.post(`/admin/users/subscriptions/tier-configs/${editingTier}`, {
              ...cleanedFormData,
              tier: editingTier,
            });
            showToast('Tier-Konfiguration erfolgreich erstellt', 'success');
          } else {
            throw updateError;
          }
        }
      } else {
        // Erstelle neue Config
        await api.post(`/admin/users/subscriptions/tier-configs/${editingTier}`, {
          ...cleanedFormData,
          tier: editingTier,
        });
        showToast('Tier-Konfiguration erfolgreich erstellt', 'success');
      }
      
      setEditingTier(null);
      setFormData({});
      fetchTierConfigs();
    } catch (error: unknown) {
      devError('Save error:', error);
      if (isAxiosErrorResponse(error)) {
        devError('Error response:', error.response?.data);
      }
      devError('FormData that was sent:', formData);
      showToast(
        (error as any)?.response?.data?.message || (error as Error)?.message || 'Fehler beim Speichern',
        'error'
      );
    }
  };

  const handleAddFeature = () => {
    setFormData({
      ...formData,
      features: [...(formData.features || []), ''],
    });
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures.splice(index, 1);
    setFormData({ ...formData, features: newFeatures });
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'BASIC': return '#6c757d';
      case 'PRO': return '#007bff';
      case 'FULLTIME': return '#28a745';
      case 'ENTERPRISE': return '#ffc107';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Tier-Konfigurationen werden geladen..." />;
  }

  return (
    <div className="tier-config-management">
      <div className="tier-config-header">
        <h2>⚙️ Subscription Tier Konfiguration</h2>
        <p>Bearbeite Preise, Commission Rates, Features und Limits für jedes Tier</p>
      </div>

      <div className="tier-configs-grid">
        {(['BASIC', 'PRO', 'FULLTIME', 'ENTERPRISE'] as const).map((tier) => {
          const config = (Array.isArray(tierConfigs) ? tierConfigs.find((c) => c.tier === tier) : null) || {
            tier,
            name: tier,
            price: 0,
            commissionRate: 0,
            displayCommission: '0%',
            features: [],
            isPopular: false,
            isActive: true,
          };

          const isEditing = editingTier === tier;

          return (
            <div
              key={tier}
              className={`tier-config-card ${isEditing ? 'editing' : ''}`}
              style={{ borderTop: `4px solid ${getTierColor(tier)}` }}
            >
              <div className="tier-config-card-header">
                <h3 style={{ color: getTierColor(tier) }}>
                  {config.name || tier}
                </h3>
                {config.isPopular && (
                  <span className="popular-badge">Beliebt</span>
                )}
                {!config.isActive && (
                  <span className="inactive-badge">Inaktiv</span>
                )}
              </div>

              {!isEditing ? (
                <>
                  <div className="tier-config-info">
                    <div className="info-row">
                      <span className="label">Preis:</span>
                      <span className="value">€{config.price}/Monat</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Commission Rate:</span>
                      <span className="value">
                        {(config.commissionRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Display:</span>
                      <span className="value">{config.displayCommission}</span>
                    </div>
                    {'deliveryLimit' in config && config.deliveryLimit && (
                      <div className="info-row">
                        <span className="label">Lieferlimit:</span>
                        <span className="value">{config.deliveryLimit}/Monat</span>
                      </div>
                    )}
                    {'payoutThreshold' in config && config.payoutThreshold && (
                      <div className="info-row">
                        <span className="label">Auszahlung ab:</span>
                        <span className="value">€{config.payoutThreshold}</span>
                      </div>
                    )}
                    {'bonusThreshold' in config && config.bonusThreshold && (
                      <div className="info-row">
                        <span className="label">Bonus ab:</span>
                        <span className="value">
                          {config.bonusThreshold} Lieferungen
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="tier-config-features">
                    <strong>Features:</strong>
                    <ul>
                      {config.features.map((feature, idx) => (
                        <li key={idx}>{feature}</li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleEdit(tier)}
                    className="btn-edit-tier"
                  >
                    ✏️ Bearbeiten
                  </button>
                </>
              ) : (
                <div className="tier-config-edit-form">
                  <div className="form-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Preis (€/Monat):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value),
                        })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Commission Rate (0-1):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.commissionRate || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commissionRate: parseFloat(e.target.value),
                        })
                      }
                      className="form-input"
                    />
                    <small>
                      Aktuell: {(formData.commissionRate || 0) * 100}%
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Display Commission (z.B. &quot;25%&quot;, &quot;30% (100%)&quot;):</label>
                    <input
                      type="text"
                      value={formData.displayCommission || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          displayCommission: e.target.value,
                        })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Features:</label>
                    {formData.features?.map((feature, idx) => (
                      <div key={idx} className="feature-input-group">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) =>
                            handleFeatureChange(idx, e.target.value)
                          }
                          className="form-input"
                          placeholder="Feature beschreibung"
                        />
                        <button
                          onClick={() => handleRemoveFeature(idx)}
                          className="btn-remove-feature"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddFeature}
                      className="btn-add-feature"
                    >
                      + Feature hinzufügen
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Lieferlimit (optional):</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.deliveryLimit || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryLimit: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="form-input"
                      placeholder="z.B. 50"
                    />
                  </div>

                  <div className="form-group">
                    <label>Auszahlung ab (€, optional):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.payoutThreshold || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payoutThreshold: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="form-input"
                      placeholder="z.B. 50"
                    />
                  </div>

                  <div className="form-group">
                    <label>Auszahlungsverzögerung (Tage, optional):</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.payoutDelay || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payoutDelay: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="form-input"
                      placeholder="z.B. 1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bonus ab (Lieferungen, optional):</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.bonusThreshold || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bonusThreshold: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="form-input"
                      placeholder="z.B. 100"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bonus Rate (optional):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.bonusRate || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bonusRate: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="form-input"
                      placeholder="z.B. 0.02 für 2%"
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isPopular || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isPopular: e.target.checked,
                          })
                        }
                      />
                      Als &quot;Beliebt&quot; markieren
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isActive !== false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                      />
                      Tier aktiv
                    </label>
                  </div>

                  <div className="form-actions">
                    <button onClick={handleSave} className="btn-save">
                      💾 Speichern
                    </button>
                    <button
                      onClick={() => {
                        setEditingTier(null);
                        setFormData({});
                      }}
                      className="btn-cancel"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

