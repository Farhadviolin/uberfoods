import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import api from '../utils/api';
import { SubscriptionTierSelector } from './SubscriptionTierSelector';
import './SubscriptionDashboard.css';

export function SubscriptionDashboard() {
  const { driver } = useAuth();
  const {
    subscription,
    insights,
    loading,
    trialDaysRemaining,
    isTrialEndingSoon,
    upgradeSubscription,
  } = useSubscription();

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'payment' | 'manage'>('overview');

  useEffect(() => {
    if (driver?.id && subscription) {
      fetchPaymentHistory();
      fetchPerformance();
    }
  }, [driver?.id, subscription]);

  const fetchPaymentHistory = async () => {
    if (!driver?.id) return;
    try {
      const res = await api.get(`/drivers/${driver.id}/earnings/history?limit=20`);
      // Transform earnings history to payment history format
      setPaymentHistory((res.data || []).map((item: any) => ({
        id: item.id,
        type: 'COMMISSION',
        amount: item.netEarnings || item.commission || 0,
        date: new Date(item.createdAt),
        status: item.status === 'PAID' ? 'PAID' : 'PENDING',
        description: `Commission für Order ${item.orderId}`,
      })));
    } catch (error) {
      console.error('Payment History Error:', error);
    }
  };

  const fetchPerformance = async () => {
    if (!driver?.id) return;
    try {
      const res = await api.get(`/drivers/${driver.id}/insights/performance?period=30d`);
      setPerformance(res.data);
    } catch (error: any) {
      // Fallback wenn Endpoint nicht existiert
      if (error.response?.status === 404) {
        setPerformance(null);
      } else {
        console.error('Performance Error:', error);
      }
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'BASIC': return '#6b7280';
      case 'PRO': return '#3b82f6';
      case 'FULLTIME': return '#10b981';
      case 'ENTERPRISE': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#10b981';
      case 'TRIALING': return '#3b82f6';
      case 'PAST_DUE': return '#ef4444';
      case 'CANCELED': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return <div className="subscription-dashboard-loading">Lade Subscription...</div>;
  }

  return (
    <div className="subscription-dashboard">
      <div className="subscription-header">
        <h2>💳 Subscription Verwaltung</h2>
        <div className="subscription-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Übersicht
          </button>
          <button
            className={activeTab === 'insights' ? 'active' : ''}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
          <button
            className={activeTab === 'payment' ? 'active' : ''}
            onClick={() => setActiveTab('payment')}
          >
            Zahlungen
          </button>
          <button
            className={activeTab === 'manage' ? 'active' : ''}
            onClick={() => setActiveTab('manage')}
          >
            Verwalten
          </button>
        </div>
      </div>

      {/* Trial Warning */}
      {isTrialEndingSoon && (
        <div className="trial-warning">
          ⚠️ Dein Trial endet in {trialDaysRemaining} Tagen! Bitte aktualisiere deine Zahlungsmethode.
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="subscription-overview">
          {subscription ? (
            <>
              <div className="subscription-status-card">
                <div className="status-header">
                  <div>
                    <h3>Aktuelle Subscription</h3>
                    <span
                      className="tier-badge"
                      style={{ background: getTierColor(subscription.tier) }}
                    >
                      {subscription.tier}
                    </span>
                    <span
                      className="status-badge"
                      style={{ background: getStatusColor(subscription.status) }}
                    >
                      {subscription.status}
                    </span>
                  </div>
                </div>

                <div className="subscription-details">
                  <div className="detail-item">
                    <span className="label">Preis:</span>
                    <span className="value">€{subscription.price}/Monat</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Commission Rate:</span>
                    <span className="value">{(subscription.commissionRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Aktuelle Periode:</span>
                    <span className="value">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString('de-DE')} -{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  {subscription.trialEndsAt && (
                    <div className="detail-item">
                      <span className="label">Trial endet:</span>
                      <span className="value">
                        {new Date(subscription.trialEndsAt).toLocaleDateString('de-DE')}
                        {trialDaysRemaining !== null && (
                          <span style={{ marginLeft: '8px', color: '#ef4444' }}>
                            ({trialDaysRemaining} Tage verbleibend)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {insights && (
                  <div className="roi-section">
                    <h4>Dein ROI</h4>
                    <div className="roi-metrics">
                      <div className="roi-metric">
                        <span className="roi-label">ROI:</span>
                        <span className={`roi-value ${insights.roi > 0 ? 'positive' : 'negative'}`}>
                          {insights.roi > 0 ? '+' : ''}{insights.roi.toFixed(1)}%
                        </span>
                      </div>
                      <div className="roi-metric">
                        <span className="roi-label">Net Profit:</span>
                        <span className={`roi-value ${insights.netProfit > 0 ? 'positive' : 'negative'}`}>
                          €{insights.netProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="roi-metric">
                        <span className="roi-label">Durchschnitt/Monat:</span>
                        <span className="roi-value positive">
                          €{insights.avgEarningsPerMonth.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {performance && (
                  <div className="performance-section">
                    <h4>Performance (30 Tage)</h4>
                    <div className="performance-metrics">
                      <div className="perf-metric">
                        <span>Lieferungen:</span>
                        <strong>{performance.metrics.totalDeliveries}</strong>
                      </div>
                      <div className="perf-metric">
                        <span>Earnings:</span>
                        <strong>€{performance.metrics.totalEarnings.toFixed(2)}</strong>
                      </div>
                      <div className="perf-metric">
                        <span>Performance Score:</span>
                        <strong>{performance.metrics.performanceScore}/100</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-subscription">
              <h3>Keine aktive Subscription</h3>
              <p>Wähle ein Subscription-Tier, um zu beginnen!</p>
            </div>
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="subscription-insights">
          {insights ? (
            <>
              <div className="insights-card">
                <h3>Upgrade-Empfehlungen</h3>
                {insights.recommendations && insights.recommendations.length > 0 ? (
                  <div className="recommendations-list">
                    {insights.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="recommendation-item">
                        <div className="rec-header">
                          <span className="rec-tier" style={{ color: getTierColor(rec.tier) }}>
                            {rec.tier}
                          </span>
                          <span className={`rec-confidence ${rec.confidence.toLowerCase()}`}>
                            {rec.confidence}
                          </span>
                        </div>
                        <p className="rec-reason">{rec.reason}</p>
                        <div className="rec-benefits">
                          <div className="benefit">
                            <span>Potenzielle Earnings:</span>
                            <strong>€{rec.potentialEarnings.toFixed(2)}</strong>
                          </div>
                          <div className="benefit">
                            <span>Net Benefit:</span>
                            <strong className={rec.netBenefit > 0 ? 'positive' : 'negative'}>
                              €{rec.netBenefit.toFixed(2)}
                            </strong>
                          </div>
                        </div>
                        <button
                          className="upgrade-button"
                          onClick={() => upgradeSubscription(rec.tier)}
                        >
                          Zu {rec.tier} upgraden
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Keine Upgrade-Empfehlungen verfügbar.</p>
                )}
              </div>

              <div className="insights-card">
                <h3>ROI Analyse</h3>
                <div className="roi-breakdown">
                  <div className="breakdown-item">
                    <span>Gesamt Subscription Kosten:</span>
                    <strong>€{insights.totalSubscriptionCost.toFixed(2)}</strong>
                  </div>
                  <div className="breakdown-item">
                    <span>Gesamt Earnings:</span>
                    <strong>€{insights.totalEarnings.toFixed(2)}</strong>
                  </div>
                  <div className="breakdown-item">
                    <span>Net Profit:</span>
                    <strong className={insights.netProfit > 0 ? 'positive' : 'negative'}>
                      €{insights.netProfit.toFixed(2)}
                    </strong>
                  </div>
                  <div className="breakdown-item">
                    <span>ROI:</span>
                    <strong className={insights.roi > 0 ? 'positive' : 'negative'}>
                      {insights.roi > 0 ? '+' : ''}{insights.roi.toFixed(1)}%
                    </strong>
                  </div>
                  <div className="breakdown-item">
                    <span>Monate aktiv:</span>
                    <strong>{insights.monthsActive}</strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p>Lade Insights...</p>
          )}
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <div className="subscription-payment">
          <h3>Zahlungshistorie</h3>
          {paymentHistory.length > 0 ? (
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Typ</th>
                  <th>Betrag</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.date instanceof Date ? payment.date.toLocaleDateString('de-DE') : new Date(payment.date).toLocaleDateString('de-DE')}</td>
                    <td>{payment.type}</td>
                    <td>€{payment.amount.toFixed(2)}</td>
                    <td>
                      <span
                        className="payment-status"
                        style={{
                          color: payment.status === 'PAID' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Keine Zahlungen gefunden.</p>
          )}
        </div>
      )}

      {/* Manage Tab */}
      {activeTab === 'manage' && (
        <div className="subscription-manage">
          {driver && (
            <SubscriptionTierSelector
              driverId={driver.id}
              currentSubscription={subscription}
              onSubscriptionChange={() => {
                // Refetch wird automatisch durch useSubscription Hook gemacht
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

