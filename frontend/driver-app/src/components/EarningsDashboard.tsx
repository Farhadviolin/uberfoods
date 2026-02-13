import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import api from '../utils/api';
import './EarningsDashboard.css';

interface EarningsPeriod {
  today: number;
  week: number;
  month: number;
  total: number;
}

interface EarningsHistory {
  id: string;
  orderId: string;
  amount: number;
  commission: number;
  netEarnings: number;
  status: string;
  createdAt: string;
  order?: {
    id: string;
    status: string;
    totalAmount: number;
  };
}

export function EarningsDashboard() {
  const { driver } = useAuth();
  const { subscription, insights } = useSubscription();
  const [earnings, setEarnings] = useState<EarningsPeriod | null>(null);
  const [history, setHistory] = useState<EarningsHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [showPayout, setShowPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    if (driver) {
      fetchEarnings();
      fetchHistory();
    }
  }, [driver, period]);

  useEffect(() => {
    if (subscription && earnings) {
      calculateComparison();
    }
  }, [subscription, earnings, period]);

  const fetchEarnings = async () => {
    if (!driver) return;
    try {
      setLoading(true);
      const response = await api.get(`/drivers/${driver.id}/earnings?period=${period}`);
      setEarnings(response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Verdienste:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!driver) return;
    try {
      const response = await api.get(`/drivers/${driver.id}/earnings/history?limit=20`);
      setHistory(response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Historie:', error);
    }
  };

  // Subscription wird jetzt über useSubscription Hook verwaltet

  const calculateComparison = () => {
    if (!subscription || !earnings) return;

    const currentEarnings = period === 'day' ? earnings.today : 
                           period === 'week' ? earnings.week : earnings.month;

    // Commission Rates
    const rates = {
      BASIC: 0.25,
      PRO: 0.30,
      FULLTIME: 0.30,
    };

    const currentRate = rates[subscription.tier as keyof typeof rates] || 0.25;
    
    // Berechne was mit höheren Tiers möglich wäre
    const proEarnings = currentRate < 0.30 ? currentEarnings * (0.30 / currentRate) : currentEarnings;
    const fulltimeEarnings = currentRate < 0.30 ? currentEarnings * (0.30 / currentRate) * 1.067 : currentEarnings * 1.067;

    setComparison({
      current: currentEarnings,
      currentTier: subscription.tier,
      currentRate,
      pro: subscription.tier !== 'PRO' && subscription.tier !== 'FULLTIME' ? proEarnings : null,
      fulltime: subscription.tier !== 'FULLTIME' ? fulltimeEarnings : null,
      proDiff: subscription.tier !== 'PRO' && subscription.tier !== 'FULLTIME' ? proEarnings - currentEarnings : null,
      fulltimeDiff: subscription.tier !== 'FULLTIME' ? fulltimeEarnings - currentEarnings : null,
    });
  };

  const handlePayoutRequest = async () => {
    if (!driver || !payoutAmount) return;
    try {
      await api.post(`/drivers/${driver.id}/payouts/request`, {
        amount: parseFloat(payoutAmount),
        paymentMethodId: 'default-bank',
      });
      alert('Auszahlungsanfrage erfolgreich gesendet!');
      setShowPayout(false);
      setPayoutAmount('');
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    }
  };

  if (!driver) return null;

  return (
    <div className="earnings-dashboard">
      <div className="earnings-header">
        <h2>💰 Verdienste</h2>
        <div className="period-selector">
          <button
            className={period === 'day' ? 'active' : ''}
            onClick={() => setPeriod('day')}
          >
            Heute
          </button>
          <button
            className={period === 'week' ? 'active' : ''}
            onClick={() => setPeriod('week')}
          >
            Woche
          </button>
          <button
            className={period === 'month' ? 'active' : ''}
            onClick={() => setPeriod('month')}
          >
            Monat
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Lade Verdienste...</div>
      ) : earnings ? (
        <>
          <div className="earnings-summary">
            <div className="earnings-card">
              <div className="earnings-label">Verdienst ({period})</div>
              <div className="earnings-value">
                {period === 'day' && `${earnings.today.toFixed(2)} €`}
                {period === 'week' && `${earnings.week.toFixed(2)} €`}
                {period === 'month' && `${earnings.month.toFixed(2)} €`}
              </div>
              {subscription && (
                <div className="subscription-info" style={{
                  marginTop: '8px',
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  Tier: <strong>{subscription.tier}</strong> ({subscription.commissionRate * 100}% Commission)
                </div>
              )}
            </div>
            <div className="earnings-card">
              <div className="earnings-label">Gesamt</div>
              <div className="earnings-value">{earnings.total.toFixed(2)} €</div>
            </div>
          </div>

          {comparison && (comparison.proDiff || comparison.fulltimeDiff) && (
            <div className="comparison-card" style={{
              background: '#f0f9ff',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '1.5rem',
              marginTop: '1.5rem'
            }}>
              <h3 style={{ marginTop: 0, color: '#1e40af' }}>💡 Upgrade-Empfehlung</h3>
              {comparison.proDiff && comparison.proDiff > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Mit Pro:</strong> {comparison.pro.toFixed(2)} € 
                  <span style={{ color: '#10b981', marginLeft: '8px' }}>
                    (+{comparison.proDiff.toFixed(2)} €)
                  </span>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                    30% Commission statt {comparison.currentRate * 100}%
                  </div>
                </div>
              )}
              {comparison.fulltimeDiff && comparison.fulltimeDiff > 0 && (
                <div>
                  <strong>Mit Vollzeit:</strong> {comparison.fulltime.toFixed(2)} €
                  <span style={{ color: '#10b981', marginLeft: '8px' }}>
                    (+{comparison.fulltimeDiff.toFixed(2)} €)
                  </span>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                    30% + 2% Bonus bei {'>'}100 Lieferungen/Monat
                  </div>
                </div>
              )}
              <button
                onClick={() => window.location.hash = '#settings'}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Jetzt upgraden →
              </button>
            </div>
          )}

          <div className="earnings-actions">
            <button
              className="payout-button"
              onClick={() => setShowPayout(true)}
            >
              💸 Auszahlung anfordern
            </button>
          </div>

          {showPayout && (
            <div className="payout-modal">
              <div className="payout-modal-content">
                <h3>Auszahlung anfordern</h3>
                <input
                  type="number"
                  placeholder="Betrag"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                />
                <div className="payout-modal-actions">
                  <button onClick={handlePayoutRequest}>Anfordern</button>
                  <button onClick={() => setShowPayout(false)}>Abbrechen</button>
                </div>
              </div>
            </div>
          )}

          <div className="earnings-history">
            <h3>Verdiensthistorie</h3>
            {history.length === 0 ? (
              <div className="empty-state">Keine Verdienste gefunden</div>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-info">
                      <div className="history-amount">+{item.netEarnings.toFixed(2)} €</div>
                      <div className="history-date">
                        {new Date(item.createdAt).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <div className="history-details">
                      <div>Bestellung: {item.orderId.slice(-8)}</div>
                      <div className="history-commission">
                        Provision: -{item.commission.toFixed(2)} €
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

