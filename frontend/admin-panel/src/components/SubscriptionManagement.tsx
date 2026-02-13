import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { Pagination } from './Pagination';
import { SubscriptionEditModal } from './SubscriptionEditModal';
import { extractErrorMessage } from '../utils/errorHandler';
import { devError } from '../utils/errorLogger';
import './SubscriptionManagement.css';

interface Subscription {
  id: string;
  driverId: string;
  tier: 'BASIC' | 'PRO' | 'FULLTIME' | 'ENTERPRISE';
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  driver: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  price: number;
  monthlyDeliveries: number;
  monthlyEarnings: number;
  commissionRate: number;
}

interface Analytics {
  period: string;
  totalSubscriptions: number;
  tierDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  mrr: number;
  churnRate: number;
  avgEarningsByTier: Record<string, number>;
}

type TabType = 'overview' | 'analytics' | 'bulk' | 'lifecycle' | 'financial' | 'insights' | 'audit';

export function SubscriptionManagement() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    fetchAnalytics();
  }, [pagination.page, selectedTier, selectedStatus]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: ((pagination.page - 1) * pagination.limit).toString(),
      });
      
      if (selectedTier !== 'all') params.append('tier', selectedTier);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await api.get(`/admin/users/subscriptions?${params}`);
      setSubscriptions(res.data.subscriptions || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/users/subscriptions/analytics?period=month');
      // Sicherstellen, dass alle erforderlichen Felder vorhanden sind
      const analyticsData = res.data || {};
      setAnalytics({
        period: analyticsData.period || 'month',
        totalSubscriptions: analyticsData.totalSubscriptions ?? 0,
        tierDistribution: analyticsData.tierDistribution || {},
        statusDistribution: analyticsData.statusDistribution || {},
        mrr: analyticsData.mrr ?? 0,
        churnRate: analyticsData.churnRate ?? 0,
        avgEarningsByTier: analyticsData.avgEarningsByTier || {},
      });
    } catch (error: unknown) {
      devError('Analytics Fehler:', error);
      // Set default analytics object on error
      setAnalytics({
        period: 'month',
        totalSubscriptions: 0,
        tierDistribution: {},
        statusDistribution: {},
        mrr: 0,
        churnRate: 0,
        avgEarningsByTier: {},
      });
    }
  };

  const handleUpgrade = async (driverId: string, newTier: string) => {
    try {
      await api.post(`/admin/users/subscriptions/${driverId}/upgrade`, { tier: newTier });
      showToast('Subscription erfolgreich upgegradet', 'success');
      fetchSubscriptions();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const handleCancel = async (driverId: string) => {
    if (!confirm('Möchten Sie diese Subscription wirklich kündigen?')) return;
    
    try {
      await api.post(`/admin/users/subscriptions/${driverId}/cancel`, { cancelAtPeriodEnd: true });
      showToast('Subscription wird am Periodenende gekündigt', 'success');
      fetchSubscriptions();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const handleReactivate = async (driverId: string) => {
    try {
      await api.post(`/admin/users/subscriptions/${driverId}/reactivate`);
      showToast('Subscription erfolgreich reaktiviert', 'success');
      fetchSubscriptions();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsEditModalOpen(true);
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'BASIC': return '#6c757d';
      case 'PRO': return '#007bff';
      case 'FULLTIME': return '#28a745';
      case 'ENTERPRISE': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#28a745';
      case 'TRIALING': return '#17a2b8';
      case 'PAST_DUE': return '#ffc107';
      case 'CANCELED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading && subscriptions.length === 0) {
    return <LoadingSpinner text="Subscriptions werden geladen..." />;
  }

  return (
    <div className="subscription-management">
      <div className="subscription-header">
        <h2>📋 Subscription Verwaltung</h2>
        <div className="subscription-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Übersicht
          </button>
          <button
            className={activeTab === 'analytics' ? 'active' : ''}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button
            className={activeTab === 'bulk' ? 'active' : ''}
            onClick={() => setActiveTab('bulk')}
          >
            Bulk Operations
          </button>
          <button
            className={activeTab === 'lifecycle' ? 'active' : ''}
            onClick={() => setActiveTab('lifecycle')}
          >
            Lifecycle
          </button>
          <button
            className={activeTab === 'financial' ? 'active' : ''}
            onClick={() => setActiveTab('financial')}
          >
            Finanzen
          </button>
          <button
            className={activeTab === 'insights' ? 'active' : ''}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
          <button
            className={activeTab === 'audit' ? 'active' : ''}
            onClick={() => setActiveTab('audit')}
          >
            Audit Trail
          </button>
        </div>
        <div className="subscription-filters">
          <select
            value={selectedTier}
            onChange={(e) => {
              setSelectedTier(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <option value="all">Alle Tiers</option>
            <option value="BASIC">Basic</option>
            <option value="PRO">Pro</option>
            <option value="FULLTIME">Vollzeit</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <option value="all">Alle Status</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="TRIALING">Trial</option>
            <option value="PAST_DUE">Überfällig</option>
            <option value="CANCELED">Gekündigt</option>
          </select>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="analytics-cards">
          <div className="analytics-card">
            <h3>Gesamt Subscriptions</h3>
            <p className="analytics-value">{analytics.totalSubscriptions}</p>
          </div>
          <div className="analytics-card">
            <h3>MRR (Monatlich)</h3>
            <p className="analytics-value">€{(analytics.mrr ?? 0).toLocaleString()}</p>
          </div>
          <div className="analytics-card">
            <h3>Churn Rate</h3>
            <p className="analytics-value">{(analytics.churnRate ?? 0).toFixed(1)}%</p>
          </div>
          <div className="analytics-card">
            <h3>Tier Verteilung</h3>
            <div className="tier-distribution">
              {Object.entries(analytics.tierDistribution).map(([tier, count]) => (
                <span key={tier} style={{ color: getTierBadgeColor(tier) }}>
                  {tier}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          subscriptions={subscriptions}
          loading={loading}
          selectedTier={selectedTier}
          selectedStatus={selectedStatus}
          pagination={pagination}
          onTierChange={setSelectedTier}
          onStatusChange={setSelectedStatus}
          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
          onUpgrade={handleUpgrade}
          onCancel={handleCancel}
          onReactivate={handleReactivate}
          onEdit={handleEdit}
          getTierBadgeColor={getTierBadgeColor}
          getStatusBadgeColor={getStatusBadgeColor}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab analytics={analytics} />
      )}

      {activeTab === 'bulk' && (
        <BulkOperationsTab
          subscriptions={subscriptions}
          onRefresh={fetchSubscriptions}
        />
      )}

      {activeTab === 'lifecycle' && (
        <LifecycleTab onRefresh={fetchSubscriptions} />
      )}

      {activeTab === 'financial' && (
        <FinancialTab subscriptions={subscriptions} />
      )}

      {activeTab === 'insights' && (
        <InsightsTab />
      )}

      {activeTab === 'audit' && (
        <AuditTab />
      )}

      {/* Edit Modal */}
      {editingSubscription && (
        <SubscriptionEditModal
          subscription={editingSubscription}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSubscription(null);
          }}
          onSuccess={() => {
            fetchSubscriptions();
            fetchAnalytics();
          }}
        />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  subscriptions,
  loading,
  selectedTier,
  selectedStatus,
  pagination,
  onTierChange,
  onStatusChange,
  onPageChange,
  onUpgrade,
  onCancel,
  onReactivate,
  onEdit,
  getTierBadgeColor,
  getStatusBadgeColor,
}: any) {
  return (
    <>
      <div className="subscription-filters">
        <select value={selectedTier} onChange={(e) => onTierChange(e.target.value)}>
          <option value="all">Alle Tiers</option>
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="FULLTIME">Vollzeit</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <select value={selectedStatus} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="all">Alle Status</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="TRIALING">Trial</option>
          <option value="PAST_DUE">Überfällig</option>
          <option value="CANCELED">Gekündigt</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <div className="subscriptions-table-wrapper">
        <table className="subscriptions-table">
          <thead>
            <tr>
              <th>Fahrer</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Preis</th>
              <th>Commission Rate</th>
              <th>Monatliche Lieferungen</th>
              <th>Monatliche Earnings</th>
              <th>Period End</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr key={sub.id}>
                <td>
                  <div>
                    <strong>{sub.driver.name}</strong>
                    <br />
                    <small>{sub.driver.email}</small>
                  </div>
                </td>
                <td>
                  <span
                    className="tier-badge"
                    style={{ background: getTierBadgeColor(sub.tier) }}
                  >
                    {sub.tier}
                  </span>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ background: getStatusBadgeColor(sub.status) }}
                  >
                    {sub.status}
                  </span>
                </td>
                <td>€{sub.price}/Monat</td>
                <td>{(sub.commissionRate * 100).toFixed(1)}%</td>
                <td>{sub.monthlyDeliveries}</td>
                <td>€{sub.monthlyEarnings.toFixed(2)}</td>
                <td>{new Date(sub.currentPeriodEnd).toLocaleDateString('de-DE')}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => onEdit(sub)}
                      className="btn-edit"
                      title="Bearbeiten"
                    >
                      ✏️ Bearbeiten
                    </button>
                    {sub.tier !== 'ENTERPRISE' && (
                      <button
                        onClick={() => {
                          const tiers = ['BASIC', 'PRO', 'FULLTIME', 'ENTERPRISE'];
                          const nextTier = tiers[tiers.indexOf(sub.tier) + 1];
                          if (nextTier) onUpgrade(sub.driverId, nextTier);
                        }}
                        className="btn-upgrade"
                      >
                        Upgrade
                      </button>
                    )}
                    {sub.status === 'ACTIVE' && (
                      <button
                        onClick={() => onCancel(sub.driverId)}
                        className="btn-cancel"
                      >
                        Kündigen
                      </button>
                    )}
                    {sub.status === 'CANCELED' && (
                      <button
                        onClick={() => onReactivate(sub.driverId)}
                        className="btn-reactivate"
                      >
                        Reaktivieren
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {subscriptions.length === 0 && !loading && (
        <div className="empty-state" style={{
          padding: '40px',
          textAlign: 'center',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginTop: '20px'
        }}>
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '10px' }}>
            Keine Subscriptions gefunden.
          </p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            Erstelle eine Subscription für einen Fahrer, um zu beginnen.
          </p>
        </div>
      )}

      <Pagination
        currentPage={pagination.page}
        totalPages={Math.ceil(pagination.total / pagination.limit)}
        onPageChange={onPageChange}
      />
    </>
  );
}

// Analytics Tab Component
function AnalyticsTab({ analytics }: { analytics: Analytics | null }) {
  const [revenueCharts, setRevenueCharts] = useState<any>(null);
  const [churnPrediction, setChurnPrediction] = useState<any>(null);
  const [ltv, setLtv] = useState<any>(null);

  useEffect(() => {
    fetchRevenueCharts();
    fetchChurnPrediction();
    fetchLTV();
  }, []);

  const fetchRevenueCharts = async () => {
    try {
      const res = await api.get('/admin/users/subscriptions/analytics/revenue-charts?period=30d');
      setRevenueCharts(res.data);
    } catch (error) {
      if (import.meta.env.DEV) {

        devError('Revenue Charts Fehler:', error);
      }
    }
  };

  const fetchChurnPrediction = async () => {
    try {
      const res = await api.get('/admin/users/subscriptions/analytics/churn-prediction');
      setChurnPrediction(res.data);
    } catch (error) {
      if (import.meta.env.DEV) {

        devError('Churn Prediction Fehler:', error);
      }
    }
  };

  const fetchLTV = async () => {
    try {
      const res = await api.get('/admin/users/subscriptions/analytics/lifetime-value');
      setLtv(res.data);
    } catch (error) {
      if (import.meta.env.DEV) {

        devError('LTV Fehler:', error);
      }
    }
  };

  return (
    <div className="analytics-tab">
      <h3>Erweiterte Analytics</h3>
      {analytics && (
        <div className="analytics-summary">
          <div className="metric-card">
            <h4>MRR</h4>
            <p>€{(analytics.mrr ?? 0).toLocaleString()}</p>
          </div>
          <div className="metric-card">
            <h4>Churn Rate</h4>
            <p>{(analytics.churnRate ?? 0).toFixed(1)}%</p>
          </div>
          <div className="metric-card">
            <h4>Total Subscriptions</h4>
            <p>{analytics.totalSubscriptions}</p>
          </div>
        </div>
      )}
      {churnPrediction && (
        <div className="churn-prediction">
          <h4>Churn Prediction</h4>
          <p>High Risk: {churnPrediction.highRisk}</p>
          <p>Medium Risk: {churnPrediction.mediumRisk}</p>
          <p>Low Risk: {churnPrediction.lowRisk}</p>
        </div>
      )}
    </div>
  );
}

// Bulk Operations Tab Component
function BulkOperationsTab({ subscriptions, onRefresh }: any) {
  const { showToast } = useToast();
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('upgrade');
  const [bulkTier, setBulkTier] = useState<string>('PRO');
  const [bulkEmailSubject, setBulkEmailSubject] = useState<string>('');
  const [bulkEmailMessage, setBulkEmailMessage] = useState<string>('');

  const handleBulkAction = async () => {
    if (selectedDrivers.size === 0) {
      showToast('Bitte wähle mindestens einen Fahrer aus', 'error');
      return;
    }

    try {
      const driverIds = Array.from(selectedDrivers);
      let res;

      switch (bulkAction) {
        case 'upgrade':
          res = await api.post('/admin/users/subscriptions/bulk/upgrade', {
            driverIds,
            tier: bulkTier,
            sendEmail: true,
          });
          break;
        case 'cancel':
          res = await api.post('/admin/users/subscriptions/bulk/cancel', {
            driverIds,
            cancelAtPeriodEnd: true,
            sendEmail: true,
          });
          break;
        case 'email':
          res = await api.post('/admin/users/subscriptions/bulk/email', {
            driverIds,
            subject: bulkEmailSubject,
            message: bulkEmailMessage,
          });
          break;
      }

      showToast(`Bulk Action erfolgreich: ${res.data.success} erfolgreich`, 'success');
      setSelectedDrivers(new Set());
      onRefresh();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  return (
    <div className="bulk-operations-tab">
      <h3>Bulk Operations</h3>
      <div className="bulk-controls">
        <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
          <option value="upgrade">Upgrade</option>
          <option value="cancel">Kündigen</option>
          <option value="email">Email senden</option>
        </select>
        {bulkAction === 'upgrade' && (
          <select value={bulkTier} onChange={(e) => setBulkTier(e.target.value)}>
            <option value="PRO">Pro</option>
            <option value="FULLTIME">Vollzeit</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        )}
        {bulkAction === 'email' && (
          <>
            <input
              type="text"
              placeholder="Betreff"
              value={bulkEmailSubject}
              onChange={(e) => setBulkEmailSubject(e.target.value)}
            />
            <textarea
              placeholder="Nachricht"
              value={bulkEmailMessage}
              onChange={(e) => setBulkEmailMessage(e.target.value)}
            />
          </>
        )}
        <button onClick={handleBulkAction}>Ausführen ({selectedDrivers.size} ausgewählt)</button>
      </div>
      <div className="bulk-selection">
        <table className="subscriptions-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDrivers(new Set(subscriptions.map((s: any) => s.driverId)));
                    } else {
                      setSelectedDrivers(new Set());
                    }
                  }}
                />
              </th>
              <th>Fahrer</th>
              <th>Tier</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub: any) => (
              <tr key={sub.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedDrivers.has(sub.driverId)}
                    onChange={(e) => {
                      const newSet = new Set(selectedDrivers);
                      if (e.target.checked) {
                        newSet.add(sub.driverId);
                      } else {
                        newSet.delete(sub.driverId);
                      }
                      setSelectedDrivers(newSet);
                    }}
                  />
                </td>
                <td>{sub.driver.name}</td>
                <td>{sub.tier}</td>
                <td>{sub.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Lifecycle Tab Component
function LifecycleTab({ onRefresh }: any) {
  const { showToast } = useToast();
  const [trialsEnding, setTrialsEnding] = useState<any[]>([]);
  const [paymentFailures, setPaymentFailures] = useState<any[]>([]);

  useEffect(() => {
    fetchTrialsEnding();
    fetchPaymentFailures();
  }, []);

  const fetchTrialsEnding = async () => {
    try {
      const res = await api.get('/admin/users/subscriptions/lifecycle/trials-ending?days=3');
      setTrialsEnding(res.data || []);
    } catch (error) {
      if (import.meta.env.DEV) {

        devError('Trials Ending Fehler:', error);
      }
    }
  };

  const fetchPaymentFailures = async () => {
    try {
      const res = await api.get('/admin/users/subscriptions/lifecycle/payment-failures');
      setPaymentFailures(res.data || []);
    } catch (error) {
      if (import.meta.env.DEV) {

        devError('Payment Failures Fehler:', error);
      }
    }
  };

  const handleExtendTrial = async (driverId: string) => {
    try {
      await api.post(`/admin/users/subscriptions/${driverId}/lifecycle/extend-trial`, {
        additionalDays: 7,
      });
      showToast('Trial verlängert', 'success');
      fetchTrialsEnding();
    } catch (error) {
      showToast('Fehler bei Trial Verlängerung', 'error');
    }
  };

  const handleRetryPayment = async (driverId: string) => {
    try {
      await api.post(`/admin/users/subscriptions/${driverId}/lifecycle/retry-payment`);
      showToast('Payment Retry gestartet', 'success');
      fetchPaymentFailures();
    } catch (error) {
      showToast('Fehler bei Payment Retry', 'error');
    }
  };

  return (
    <div className="lifecycle-tab">
      <h3>Lifecycle Management</h3>
      <div className="lifecycle-sections">
        <div className="lifecycle-section">
          <h4>Trials Ending Soon ({trialsEnding.length})</h4>
          <table className="subscriptions-table">
            <thead>
              <tr>
                <th>Fahrer</th>
                <th>Tier</th>
                <th>Trial Endet</th>
                <th>Tage verbleibend</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {trialsEnding.map((trial: any) => (
                <tr key={trial.driverId}>
                  <td>{trial.driverName}</td>
                  <td>{trial.tier}</td>
                  <td>{new Date(trial.trialEndsAt).toLocaleDateString('de-DE')}</td>
                  <td>{trial.daysRemaining}</td>
                  <td>
                    <button onClick={() => handleExtendTrial(trial.driverId)}>
                      Trial verlängern
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lifecycle-section">
          <h4>Payment Failures ({paymentFailures.length})</h4>
          <table className="subscriptions-table">
            <thead>
              <tr>
                <th>Fahrer</th>
                <th>Tier</th>
                <th>Tage überfällig</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {paymentFailures.map((failure: any) => (
                <tr key={failure.driverId}>
                  <td>{failure.driverName}</td>
                  <td>{failure.tier}</td>
                  <td>{failure.daysOverdue}</td>
                  <td>
                    <button onClick={() => handleRetryPayment(failure.driverId)}>
                      Payment Retry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Financial Tab Component
function FinancialTab({ subscriptions }: any) {
  const [revenueRecognition, setRevenueRecognition] = useState<any>(null);

  useEffect(() => {
    fetchRevenueRecognition();
  }, []);

  const fetchRevenueRecognition = async () => {
    try {
      const res = await api.get('/admin/users/subscriptions/financial/revenue-recognition?period=month');
      setRevenueRecognition(res.data);
    } catch (error) {
      if (import.meta.env.DEV) {

        devError('Revenue Recognition Fehler:', error);
      }
    }
  };

  return (
    <div className="financial-tab">
      <h3>Financial Management</h3>
      {revenueRecognition && (
        <div className="revenue-recognition">
          <h4>Revenue Recognition</h4>
          <pre>{JSON.stringify(revenueRecognition, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// Insights Tab Component
function InsightsTab() {
  const [allInsights, setAllInsights] = useState<any>(null);

  useEffect(() => {
    fetchAllInsights();
  }, []);

  const fetchAllInsights = async () => {
    try {
      const res = await api.get('/admin/users/subscriptions/insights/all-drivers?limit=100');
      setAllInsights(res.data);
    } catch (error) {
      if (import.meta.env.DEV) {

        devError('Insights Fehler:', error);
      }
    }
  };

  return (
    <div className="insights-tab">
      <h3>Driver Insights</h3>
      {allInsights && (
        <div className="insights-summary">
          <p>Total Drivers: {allInsights.total}</p>
          <p>Average ROI: {allInsights.avgROI.toFixed(2)}%</p>
          <p>Total Net Profit: €{allInsights.totalNetProfit.toFixed(2)}</p>
          <p>Drivers with Recommendations: {allInsights.driversWithRecommendations}</p>
        </div>
      )}
    </div>
  );
}

// Audit Tab Component
function AuditTab() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/users/subscriptions/audit/filtered');
      setAuditLogs(res.data || []);
    } catch (error) {
      if (import.meta.env.DEV) {

        devError('Audit Logs Fehler:', error);
      }
    }
  };

  return (
    <div className="audit-tab">
      <h3>Audit Trail</h3>
      <table className="subscriptions-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Performed By</th>
            <th>Field</th>
            <th>Old Value</th>
            <th>New Value</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map((log: any) => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString('de-DE')}</td>
              <td>{log.action}</td>
              <td>{log.performedBy}</td>
              <td>{log.field || '-'}</td>
              <td>{log.oldValue || '-'}</td>
              <td>{log.newValue || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


