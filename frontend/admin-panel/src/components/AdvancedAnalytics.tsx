import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { extractErrorMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import './AdvancedAnalytics.css';

interface CLVData {
  driverId: string;
  historicalValue: number;
  predictedValue: number;
  totalValue: number;
  confidence: number;
  segments: {
    recency: 'high' | 'medium' | 'low';
    frequency: 'high' | 'medium' | 'low';
    monetary: 'high' | 'medium' | 'low';
  };
  recommendations: string[];
}

interface ChurnData {
  driverId: string;
  churnProbability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  factors: string[];
  recommendations: string[];
}

interface ChurnAnalysis {
  timeframe: string;
  totalDrivers: number;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  churnRate: number;
  atRiskPercentage: number;
}

type TabType = 'clv' | 'churn' | 'segmentation' | 'predictions';

export function AdvancedAnalytics() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('clv');
  const [loading, setLoading] = useState(false);

  // CLV State
  const [clvData, setClvData] = useState<CLVData[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Churn State
  const [churnAnalysis, setChurnAnalysis] = useState<ChurnAnalysis | null>(null);
  const [topChurnRisks, setTopChurnRisks] = useState<ChurnData[]>([]);
  const [driverChurnPrediction, setDriverChurnPrediction] = useState<ChurnData | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTopCLV(),
        loadChurnAnalysis(),
        loadTopChurnRisks()
      ]);
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTopCLV = async () => {
    try {
      const res = await api.get('/admin/subscriptions/analytics/clv/top-customers?limit=20');
      setClvData(res.data);
    } catch (error) {
      logger.error('Failed to load CLV data:', error);
    }
  };

  const loadChurnAnalysis = async () => {
    try {
      const res = await api.get('/admin/subscriptions/analytics/churn/analysis?timeframe=30d');
      setChurnAnalysis(res.data);
    } catch (error) {
      logger.error('Failed to load churn analysis:', error);
    }
  };

  const loadTopChurnRisks = async () => {
    try {
      const res = await api.get('/admin/subscriptions/analytics/churn/top-risks?limit=20');
      setTopChurnRisks(res.data);
    } catch (error) {
      logger.error('Failed to load top churn risks:', error);
    }
  };

  const loadDriverCLV = async (driverId: string) => {
    try {
      const res = await api.get(`/admin/subscriptions/analytics/clv/${driverId}`);
      // Update the CLV data for this driver
      setClvData(prev => prev.map(item =>
        item.driverId === driverId ? res.data : item
      ));
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const loadDriverChurnPrediction = async (driverId: string) => {
    try {
      const res = await api.get(`/admin/users/subscriptions/analytics/churn/prediction/${driverId}`);
      setDriverChurnPrediction(res.data);
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'high': return '#28a745';
      case 'medium': return '#ffc107';
      case 'low': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return '#28a745';
      case 'MEDIUM': return '#ffc107';
      case 'HIGH': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading && !clvData.length && !churnAnalysis) {
    return <LoadingSpinner text="Erweiterte Analytics werden geladen..." />;
  }

  return (
    <div className="advanced-analytics">
      <div className="analytics-header">
        <h2>🚀 Erweiterte Analytics</h2>
        <div className="analytics-tabs">
          <button
            className={activeTab === 'clv' ? 'active' : ''}
            onClick={() => setActiveTab('clv')}
          >
            Customer Lifetime Value
          </button>
          <button
            className={activeTab === 'churn' ? 'active' : ''}
            onClick={() => setActiveTab('churn')}
          >
            Churn Prediction
          </button>
          <button
            className={activeTab === 'segmentation' ? 'active' : ''}
            onClick={() => setActiveTab('segmentation')}
          >
            Kunden-Segmente
          </button>
          <button
            className={activeTab === 'predictions' ? 'active' : ''}
            onClick={() => setActiveTab('predictions')}
          >
            Einzelne Vorhersagen
          </button>
        </div>
      </div>

      {activeTab === 'clv' && (
        <CLVTab
          clvData={clvData}
          onRefresh={loadTopCLV}
          onLoadDriverCLV={loadDriverCLV}
          selectedDriverId={selectedDriverId}
          onDriverSelect={setSelectedDriverId}
          getSegmentColor={getSegmentColor}
        />
      )}

      {activeTab === 'churn' && (
        <ChurnTab
          churnAnalysis={churnAnalysis}
          topChurnRisks={topChurnRisks}
          onRefresh={() => Promise.all([loadChurnAnalysis(), loadTopChurnRisks()])}
          getRiskColor={getRiskColor}
        />
      )}

      {activeTab === 'segmentation' && (
        <SegmentationTab
          clvData={clvData}
          getSegmentColor={getSegmentColor}
        />
      )}

      {activeTab === 'predictions' && (
        <PredictionsTab
          driverChurnPrediction={driverChurnPrediction}
          onLoadPrediction={loadDriverChurnPrediction}
          selectedDriverId={selectedDriverId}
          onDriverSelect={setSelectedDriverId}
          getRiskColor={getRiskColor}
        />
      )}
    </div>
  );
}

// CLV Tab Component
function CLVTab({ clvData, onRefresh, onLoadDriverCLV, selectedDriverId, onDriverSelect, getSegmentColor }: any) {
  return (
    <div className="clv-tab">
      <div className="tab-header">
        <h3>Customer Lifetime Value (CLV)</h3>
        <button onClick={onRefresh} className="btn-refresh">Aktualisieren</button>
      </div>

      <div className="clv-metrics">
        <div className="metric-card">
          <h4>Durchschnittlicher CLV</h4>
          <p className="metric-value">
            €{clvData.length > 0
              ? (clvData.reduce((sum: number, item: CLVData) => sum + item.totalValue, 0) / clvData.length).toFixed(2)
              : '0.00'
            }
          </p>
        </div>
        <div className="metric-card">
          <h4>Gesamt CLV</h4>
          <p className="metric-value">
            €{clvData.reduce((sum: number, item: CLVData) => sum + item.totalValue, 0).toFixed(2)}
          </p>
        </div>
        <div className="metric-card">
          <h4>Top Kunde CLV</h4>
          <p className="metric-value">
            €{clvData.length > 0 ? Math.max(...clvData.map((item: CLVData) => item.totalValue)).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      <div className="clv-table-container">
        <table className="clv-table">
          <thead>
            <tr>
              <th>Driver ID</th>
              <th>Historischer Wert</th>
              <th>Prognostizierter Wert</th>
              <th>Gesamtwert</th>
              <th>Konfidenz</th>
              <th>Segmente</th>
              <th>Empfehlungen</th>
            </tr>
          </thead>
          <tbody>
            {clvData.map((item: CLVData) => (
              <tr key={item.driverId}>
                <td>
                  <button
                    onClick={() => {
                      onDriverSelect(item.driverId);
                      onLoadDriverCLV(item.driverId);
                    }}
                    className="driver-link"
                  >
                    {item.driverId.slice(-8)}
                  </button>
                </td>
                <td>€{item.historicalValue.toFixed(2)}</td>
                <td>€{item.predictedValue.toFixed(2)}</td>
                <td className="total-value">€{item.totalValue.toFixed(2)}</td>
                <td>{(item.confidence * 100).toFixed(1)}%</td>
                <td>
                  <div className="segments">
                    <span style={{ color: getSegmentColor(item.segments.recency) }}>
                      R:{item.segments.recency}
                    </span>
                    <span style={{ color: getSegmentColor(item.segments.frequency) }}>
                      F:{item.segments.frequency}
                    </span>
                    <span style={{ color: getSegmentColor(item.segments.monetary) }}>
                      M:{item.segments.monetary}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="recommendations">
                    {item.recommendations.slice(0, 2).map((rec: string, idx: number) => (
                      <div key={idx} className="recommendation-item" title={rec}>
                        {rec.length > 30 ? `${rec.slice(0, 30)}...` : rec}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Churn Tab Component
function ChurnTab({ churnAnalysis, topChurnRisks, onRefresh, getRiskColor }: any) {
  return (
    <div className="churn-tab">
      <div className="tab-header">
        <h3>Churn Prediction & Analysis</h3>
        <button onClick={onRefresh} className="btn-refresh">Aktualisieren</button>
      </div>

      {churnAnalysis && (
        <div className="churn-metrics">
          <div className="metric-card">
            <h4>Gesamt Churn Rate</h4>
            <p className="metric-value">{churnAnalysis.churnRate.toFixed(2)}%</p>
          </div>
          <div className="metric-card">
            <h4>Gefährdete Kunden</h4>
            <p className="metric-value">{churnAnalysis.atRiskPercentage.toFixed(1)}%</p>
          </div>
          <div className="metric-card">
            <h4>Risiko-Verteilung</h4>
            <div className="risk-distribution">
              <span style={{ color: getRiskColor('HIGH') }}>
                Hoch: {churnAnalysis.riskDistribution.high}
              </span>
              <span style={{ color: getRiskColor('MEDIUM') }}>
                Mittel: {churnAnalysis.riskDistribution.medium}
              </span>
              <span style={{ color: getRiskColor('LOW') }}>
                Niedrig: {churnAnalysis.riskDistribution.low}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="churn-risks-table">
        <h4>Top Churn Risiken</h4>
        <table className="churn-risks-table">
          <thead>
            <tr>
              <th>Driver ID</th>
              <th>Churn Wahrscheinlichkeit</th>
              <th>Risiko Level</th>
              <th>Konfidenz</th>
              <th>Hauptfaktoren</th>
              <th>Empfehlungen</th>
            </tr>
          </thead>
          <tbody>
            {topChurnRisks.map((risk: ChurnData) => (
              <tr key={risk.driverId}>
                <td>{risk.driverId.slice(-8)}</td>
                <td>{(risk.churnProbability * 100).toFixed(1)}%</td>
                <td>
                  <span
                    className="risk-badge"
                    style={{ background: getRiskColor(risk.riskLevel) }}
                  >
                    {risk.riskLevel}
                  </span>
                </td>
                <td>{(risk.confidence * 100).toFixed(1)}%</td>
                <td>
                  <div className="factors">
                    {risk.factors.slice(0, 3).map((factor: string, idx: number) => (
                      <span key={idx} className="factor-tag">{factor}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="recommendations">
                    {risk.recommendations.slice(0, 2).map((rec: string, idx: number) => (
                      <div key={idx} className="recommendation-item" title={rec}>
                        {rec.length > 40 ? `${rec.slice(0, 40)}...` : rec}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Segmentation Tab Component
function SegmentationTab({ clvData, getSegmentColor }: any) {
  const segmentCounts = clvData.reduce((acc: Record<string, number>, item: CLVData) => {
    const key = `${item.segments.recency}-${item.segments.frequency}-${item.segments.monetary}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="segmentation-tab">
      <h3>Kunden-Segmentierung (RFM Analyse)</h3>

      <div className="segmentation-grid">
        {(Object.entries(segmentCounts) as [string, number][]).map(([segment, count]) => {
          const [recency, frequency, monetary] = segment.split('-');
          return (
            <div key={segment} className="segment-card">
              <h4>Segment {segment.replace(/-/g, '')}</h4>
              <div className="segment-rfm">
                <span style={{ color: getSegmentColor(recency) }}>Recency: {recency}</span>
                <span style={{ color: getSegmentColor(frequency) }}>Frequency: {frequency}</span>
                <span style={{ color: getSegmentColor(monetary) }}>Monetary: {monetary}</span>
              </div>
              <p className="segment-count">{count} Kunden</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Predictions Tab Component
function PredictionsTab({ driverChurnPrediction, onLoadPrediction, selectedDriverId, onDriverSelect, getRiskColor }: any) {
  return (
    <div className="predictions-tab">
      <h3>Einzelne Vorhersagen</h3>

      <div className="prediction-input">
        <input
          type="text"
          placeholder="Driver ID eingeben"
          value={selectedDriverId}
          onChange={(e) => onDriverSelect(e.target.value)}
          className="driver-input"
        />
        <button
          onClick={() => onLoadPrediction(selectedDriverId)}
          disabled={!selectedDriverId}
          className="btn-predict"
        >
          Vorhersage laden
        </button>
      </div>

      {driverChurnPrediction && (
        <div className="prediction-result">
          <h4>Churn Prediction für Driver {driverChurnPrediction.driverId.slice(-8)}</h4>

          <div className="prediction-metrics">
            <div className="metric-card">
              <h5>Churn Wahrscheinlichkeit</h5>
              <p className="metric-value large">
                {(driverChurnPrediction.churnProbability * 100).toFixed(1)}%
              </p>
            </div>
            <div className="metric-card">
              <h5>Risiko Level</h5>
              <span
                className="risk-badge large"
                style={{ background: getRiskColor(driverChurnPrediction.riskLevel) }}
              >
                {driverChurnPrediction.riskLevel}
              </span>
            </div>
            <div className="metric-card">
              <h5>Konfidenz</h5>
              <p className="metric-value">{(driverChurnPrediction.confidence * 100).toFixed(1)}%</p>
            </div>
          </div>

          <div className="prediction-details">
            <div className="factors-section">
              <h5>Beitragende Faktoren</h5>
              <div className="factors-list">
                {driverChurnPrediction.factors.map((factor: string, idx: number) => (
                  <span key={idx} className="factor-tag">{factor}</span>
                ))}
              </div>
            </div>

            <div className="recommendations-section">
              <h5>Empfehlungen</h5>
              <ul className="recommendations-list">
                {driverChurnPrediction.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
