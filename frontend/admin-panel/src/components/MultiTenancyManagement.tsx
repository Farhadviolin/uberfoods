import { useState } from 'react';
import { useMultiTenancyData } from '../hooks/useMultiTenancyData';
import { Skeleton, SkeletonCard } from '../design-system/Skeleton';
import { Button } from '../design-system/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import './MultiTenancyManagement.css';

export function MultiTenancyManagement() {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'tenants' | 'whitelabel' | 'billing' | 'settings'>('tenants');
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showWhitelabelForm, setShowWhitelabelForm] = useState(false);

  const tenantForm = useState({
    name: '',
    domain: '',
    plan: 'basic',
    status: 'active',
  });

  const whitelabelForm = useState({
    tenantId: '',
    logo: '',
    primaryColor: '#1877F2',
    secondaryColor: '#28a745',
    companyName: '',
    supportEmail: '',
  });

  const {
    tenants,
    whitelabelConfigs,
    billingInfo,
    isLoading,
    error,
    refetch,
  } = useMultiTenancyData();

  const handleCreateTenant = async () => {
    try {
      await api.post('/multi-tenancy/tenants', tenantForm[0]);
      showToast('Tenant erfolgreich erstellt!', 'success');
      setShowTenantForm(false);
      tenantForm[1]({ name: '', domain: '', plan: 'basic', status: 'active' });
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Erstellen', 'error');
    }
  };

  const handleUpdateWhitelabel = async () => {
    try {
      await api.patch(`/multi-tenancy/whitelabel/${whitelabelForm[0].tenantId}`, whitelabelForm[0]);
      showToast('White-Label-Konfiguration erfolgreich aktualisiert!', 'success');
      setShowWhitelabelForm(false);
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Aktualisieren', 'error');
    }
  };

  const handleUpdateTenantStatus = async (tenantId: string, status: string) => {
    try {
      await api.patch(`/multi-tenancy/tenants/${tenantId}`, { status });
      showToast('Tenant-Status erfolgreich aktualisiert!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Aktualisieren', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="multi-tenancy-management">
        <div className="tenancy-header">
          <Skeleton height="32px" width="300px" />
        </div>
        <div className="tenancy-grid">
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
        <h3>Fehler beim Laden der Multi-Tenancy-Daten</h3>
        <p>{error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
        <Button onClick={() => refetch()} variant="primary">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="multi-tenancy-management">
      <div className="tenancy-header">
        <h2>Multi-Tenancy & White-Label</h2>
        <div className="tenancy-controls">
          <Button variant="primary" onClick={() => setShowTenantForm(true)}>
            Neuer Tenant
          </Button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="tenancy-sub-tabs">
        <button
          className={`sub-tab ${activeSubTab === 'tenants' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('tenants')}
        >
          🏢 Tenants
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'whitelabel' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('whitelabel')}
        >
          🎨 White-Label
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('billing')}
        >
          💳 Abrechnung
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('settings')}
        >
          ⚙️ Einstellungen
        </button>
      </div>

      {/* Tenants Tab */}
      {activeSubTab === 'tenants' && (
        <div className="tenancy-tenants">
          <div className="tenants-table-section">
            <table className="tenancy-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Domain</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Benutzer</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {tenants && tenants.length > 0 ? (
                  tenants.map((tenant: {
                    id: string;
                    name: string;
                    domain: string;
                    plan: string;
                    status: string;
                    userCount: number;
                    createdAt: string;
                  }) => (
                    <tr key={tenant.id}>
                      <td><strong>{tenant.name}</strong></td>
                      <td><code className="domain-code">{tenant.domain}</code></td>
                      <td>
                        <span className={`plan-badge plan-${tenant.plan.toLowerCase()}`}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td>
                        <select
                          value={tenant.status}
                          onChange={(e) => handleUpdateTenantStatus(tenant.id, e.target.value)}
                          className="status-selector"
                        >
                          <option value="active">Aktiv</option>
                          <option value="suspended">Gesperrt</option>
                          <option value="trial">Trial</option>
                        </select>
                      </td>
                      <td>{tenant.userCount}</td>
                      <td>{new Date(tenant.createdAt).toLocaleDateString('de-DE')}</td>
                      <td>
                        <div className="actions">
                          <Button variant="secondary" size="sm">Bearbeiten</Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              whitelabelForm[1]({ ...whitelabelForm[0], tenantId: tenant.id });
                              setShowWhitelabelForm(true);
                            }}
                          >
                            White-Label
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                      Keine Tenants gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* White-Label Tab */}
      {activeSubTab === 'whitelabel' && (
        <div className="tenancy-whitelabel">
          <div className="whitelabel-grid">
            {whitelabelConfigs && whitelabelConfigs.map((config: {
              id: string;
              tenantName: string;
              companyName: string;
              logo: string;
              primaryColor: string;
              secondaryColor: string;
              supportEmail: string;
            }) => (
              <div key={config.id} className="whitelabel-card">
                <div className="whitelabel-header">
                  <h3>{config.tenantName}</h3>
                </div>
                <div className="whitelabel-preview">
                  <div
                    className="preview-box"
                    style={{
                      backgroundColor: config.primaryColor,
                      color: 'white',
                      padding: '20px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                      {config.companyName}
                    </div>
                    <div style={{ fontSize: '14px' }}>White-Label Vorschau</div>
                  </div>
                </div>
                <div className="whitelabel-details">
                  <div className="whitelabel-detail">
                    <span className="detail-label">Firmenname:</span>
                    <span className="detail-value">{config.companyName}</span>
                  </div>
                  <div className="whitelabel-detail">
                    <span className="detail-label">Primärfarbe:</span>
                    <span className="detail-value">
                      <span
                        className="color-preview"
                        style={{ backgroundColor: config.primaryColor }}
                      />
                      {config.primaryColor}
                    </span>
                  </div>
                  <div className="whitelabel-detail">
                    <span className="detail-label">Sekundärfarbe:</span>
                    <span className="detail-value">
                      <span
                        className="color-preview"
                        style={{ backgroundColor: config.secondaryColor }}
                      />
                      {config.secondaryColor}
                    </span>
                  </div>
                  <div className="whitelabel-detail">
                    <span className="detail-label">Support-E-Mail:</span>
                    <span className="detail-value">{config.supportEmail}</span>
                  </div>
                </div>
                <div className="whitelabel-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      whitelabelForm[1]({
                        tenantId: config.id,
                        logo: config.logo,
                        primaryColor: config.primaryColor,
                        secondaryColor: config.secondaryColor,
                        companyName: config.companyName,
                        supportEmail: config.supportEmail,
                      });
                      setShowWhitelabelForm(true);
                    }}
                  >
                    Bearbeiten
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeSubTab === 'billing' && billingInfo && (
        <div className="tenancy-billing">
          <div className="billing-metrics">
            <div className="metric-card">
              <h3>Aktive Tenants</h3>
              <div className="metric-value">{billingInfo.activeTenants || 0}</div>
              <div className="metric-subtitle">Aktuell</div>
            </div>
            <div className="metric-card">
              <h3>Monatlicher Umsatz</h3>
              <div className="metric-value">
                {billingInfo.monthlyRevenue?.toFixed(2) || '0.00'} €
              </div>
              <div className="metric-subtitle">MRR</div>
            </div>
            <div className="metric-card">
              <h3>Durchschnittlicher Plan</h3>
              <div className="metric-value">
                {billingInfo.avgPlanValue?.toFixed(2) || '0.00'} €
              </div>
              <div className="metric-subtitle">Pro Tenant</div>
            </div>
            <div className="metric-card">
              <h3>Churn Rate</h3>
              <div className="metric-value">
                {billingInfo.churnRate ? `${billingInfo.churnRate.toFixed(1)}%` : '0%'}
              </div>
              <div className="metric-subtitle">Monatlich</div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeSubTab === 'settings' && (
        <div className="tenancy-settings">
          <div className="settings-section">
            <h3>Multi-Tenancy Einstellungen</h3>
            <div className="settings-list">
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>Automatische Tenant-Isolation</span>
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>Automatische Datenbank-Trennung</span>
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" />
                  <span>Shared Resources erlauben</span>
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>White-Label aktivieren</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Form Modal */}
      {showTenantForm && (
        <div className="modal-overlay" onClick={() => setShowTenantForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Neuer Tenant</h3>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={tenantForm[0].name}
                onChange={(e) => tenantForm[1]({ ...tenantForm[0], name: e.target.value })}
                placeholder="z.B. Acme Corporation"
              />
            </div>
            <div className="form-group">
              <label>Domain *</label>
              <input
                type="text"
                value={tenantForm[0].domain}
                onChange={(e) => tenantForm[1]({ ...tenantForm[0], domain: e.target.value })}
                placeholder="z.B. acme.example.com"
              />
            </div>
            <div className="form-group">
              <label>Plan *</label>
              <select
                value={tenantForm[0].plan}
                onChange={(e) => tenantForm[1]({ ...tenantForm[0], plan: e.target.value })}
              >
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status *</label>
              <select
                value={tenantForm[0].status}
                onChange={(e) => tenantForm[1]({ ...tenantForm[0], status: e.target.value })}
              >
                <option value="active">Aktiv</option>
                <option value="trial">Trial</option>
                <option value="suspended">Gesperrt</option>
              </select>
            </div>
            <div className="modal-actions">
              <Button variant="primary" onClick={handleCreateTenant}>
                Erstellen
              </Button>
              <Button variant="secondary" onClick={() => setShowTenantForm(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* White-Label Form Modal */}
      {showWhitelabelForm && (
        <div className="modal-overlay" onClick={() => setShowWhitelabelForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>White-Label Konfiguration</h3>
            <div className="form-group">
              <label>Firmenname *</label>
              <input
                type="text"
                value={whitelabelForm[0].companyName}
                onChange={(e) => whitelabelForm[1]({ ...whitelabelForm[0], companyName: e.target.value })}
                placeholder="z.B. Acme Corporation"
              />
            </div>
            <div className="form-group">
              <label>Primärfarbe</label>
              <input
                type="color"
                value={whitelabelForm[0].primaryColor}
                onChange={(e) => whitelabelForm[1]({ ...whitelabelForm[0], primaryColor: e.target.value })}
              />
              <input
                type="text"
                value={whitelabelForm[0].primaryColor}
                onChange={(e) => whitelabelForm[1]({ ...whitelabelForm[0], primaryColor: e.target.value })}
                style={{ marginLeft: '8px', width: 'calc(100% - 60px)' }}
              />
            </div>
            <div className="form-group">
              <label>Sekundärfarbe</label>
              <input
                type="color"
                value={whitelabelForm[0].secondaryColor}
                onChange={(e) => whitelabelForm[1]({ ...whitelabelForm[0], secondaryColor: e.target.value })}
              />
              <input
                type="text"
                value={whitelabelForm[0].secondaryColor}
                onChange={(e) => whitelabelForm[1]({ ...whitelabelForm[0], secondaryColor: e.target.value })}
                style={{ marginLeft: '8px', width: 'calc(100% - 60px)' }}
              />
            </div>
            <div className="form-group">
              <label>Support-E-Mail</label>
              <input
                type="email"
                value={whitelabelForm[0].supportEmail}
                onChange={(e) => whitelabelForm[1]({ ...whitelabelForm[0], supportEmail: e.target.value })}
                placeholder="support@example.com"
              />
            </div>
            <div className="modal-actions">
              <Button variant="primary" onClick={handleUpdateWhitelabel}>
                Speichern
              </Button>
              <Button variant="secondary" onClick={() => setShowWhitelabelForm(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

