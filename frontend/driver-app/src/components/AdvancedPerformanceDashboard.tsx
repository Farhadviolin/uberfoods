import { useState, useEffect } from 'react';
import { Driver, PerformanceMetrics, AICoachingTip, PerformanceTrend, GoalProgress } from '../types';
import { performanceAnalyticsService } from '../services/performanceAnalyticsService';
import { TrendingUpIcon, TrendingDownIcon, TargetIcon, AwardIcon, LightbulbIcon, AlertCircleIcon, ClockIcon, DollarSignIcon, StarIcon } from './Icons';
import { logger } from '../utils/logger';
import './AdvancedPerformanceDashboard.css';

interface AdvancedPerformanceDashboardProps {
  driver: Driver;
}

export function AdvancedPerformanceDashboard({ driver }: AdvancedPerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [coachingTips, setCoachingTips] = useState<AICoachingTip[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'goals' | 'coaching'>('overview');

  useEffect(() => {
    loadData();
  }, [driver]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [metricsData, tipsData, trendsData, goalsData] = await Promise.all([
        performanceAnalyticsService.getPerformanceMetrics(driver.id),
        performanceAnalyticsService.generateAICoachingTips(driver, await performanceAnalyticsService.getPerformanceMetrics(driver.id)),
        performanceAnalyticsService.getPerformanceTrends(driver.id),
        performanceAnalyticsService.getGoals(driver.id)
      ]);

      setMetrics(metricsData);
      setCoachingTips(tipsData);
      setTrends(trendsData);
      setGoals(goalsData);

    } catch (error) {
      logger.error('Fehler beim Laden der Performance-Daten', 'AdvancedPerformanceDashboard', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)}€`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatRating = (rating: number) => rating.toFixed(1);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUpIcon size={16} className="trend-up" />;
      case 'down': return <TrendingDownIcon size={16} className="trend-down" />;
      default: return <div className="trend-stable">—</div>;
    }
  };

  const getGoalStatusColor = (status: GoalProgress['status']) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'ahead': return '#059669';
      case 'on_track': return '#3b82f6';
      case 'behind': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getTipIcon = (type: AICoachingTip['type']) => {
    switch (type) {
      case 'celebration': return <AwardIcon size={20} className="tip-celebration" />;
      case 'warning': return <AlertCircleIcon size={20} className="tip-warning" />;
      case 'improvement': return <TrendingUpIcon size={20} className="tip-improvement" />;
      default: return <LightbulbIcon size={20} className="tip-tip" />;
    }
  };

  if (loading) {
    return (
      <div className="advanced-performance-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Lade Performance-Daten...</p>
      </div>
    );
  }

  return (
    <div className="advanced-performance-dashboard">
      <div className="performance-header">
        <div className="header-content">
          <h2>🚀 Performance Analytics</h2>
          <p className="driver-name">{driver.name}</p>
        </div>
      </div>

        <div className="performance-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Übersicht
          </button>
          <button
            className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            📈 Trends
          </button>
          <button
            className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            🎯 Ziele
          </button>
          <button
            className={`tab-btn ${activeTab === 'coaching' ? 'active' : ''}`}
            onClick={() => setActiveTab('coaching')}
          >
            🧠 AI-Coaching
          </button>
        </div>

        <div className="performance-content">
          {activeTab === 'overview' && metrics && (
            <div className="overview-tab">
              {/* Haupt-KPIs */}
              <div className="kpi-grid">
                <div className="kpi-card primary">
                  <div className="kpi-icon">
                    <DollarSignIcon size={24} />
                  </div>
                  <div className="kpi-content">
                    <div className="kpi-value">{formatCurrency(metrics.daily.earnings)}</div>
                    <div className="kpi-label">Heute verdient</div>
                    <div className="kpi-trend">
                      {getTrendIcon(metrics.weekly.trend)}
                      <span>{metrics.weekly.trend === 'up' ? '+' : metrics.weekly.trend === 'down' ? '-' : ''}12%</span>
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon">
                    <StarIcon size={24} />
                  </div>
                  <div className="kpi-content">
                    <div className="kpi-value">{formatRating(metrics.daily.rating)}</div>
                    <div className="kpi-label">Bewertung</div>
                    <div className="kpi-subtext">Ø {formatRating(metrics.monthly.rating)}</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon">
                    <ClockIcon size={24} />
                  </div>
                  <div className="kpi-content">
                    <div className="kpi-value">{formatPercent(metrics.daily.onTimeRate)}</div>
                    <div className="kpi-label">Pünktlichkeit</div>
                    <div className="kpi-subtext">{metrics.streaks.onTimeStreak} Tage Streak</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon">
                    <TargetIcon size={24} />
                  </div>
                  <div className="kpi-content">
                    <div className="kpi-value">{metrics.daily.deliveries}</div>
                    <div className="kpi-label">Lieferungen</div>
                    <div className="kpi-subtext">Ø {formatCurrency(metrics.efficiency.avgEarningsPerHour)}/h</div>
                  </div>
                </div>
              </div>

              {/* Streaks & Rekorde */}
              <div className="streaks-section">
                <h3>🏆 Rekorde & Streaks</h3>
                <div className="streaks-grid">
                  <div className="streak-card">
                    <div className="streak-icon">🎯</div>
                    <div className="streak-content">
                      <div className="streak-value">{metrics.streaks.perfectDeliveries}</div>
                      <div className="streak-label">Perfekte Lieferungen</div>
                    </div>
                  </div>
                  <div className="streak-card">
                    <div className="streak-icon">⏰</div>
                    <div className="streak-content">
                      <div className="streak-value">{metrics.streaks.onTimeStreak}</div>
                      <div className="streak-label">Pünktlich in Folge</div>
                    </div>
                  </div>
                  <div className="streak-card">
                    <div className="streak-icon">⭐</div>
                    <div className="streak-content">
                      <div className="streak-value">{metrics.streaks.highRatingStreak}</div>
                      <div className="streak-label">Hohe Bewertungen</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Effizienz-Metriken */}
              <div className="efficiency-section">
                <h3>⚡ Effizienz</h3>
                <div className="efficiency-metrics">
                  <div className="metric-item">
                    <span className="metric-label">Ø Lieferzeit:</span>
                    <span className="metric-value">{Math.round(metrics.efficiency.avgDeliveryTime)}min</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Verdienst/Stunde:</span>
                    <span className="metric-value">{formatCurrency(metrics.efficiency.avgEarningsPerHour)}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Kraftstoffeffizienz:</span>
                    <span className="metric-value">{metrics.efficiency.fuelEfficiency.toFixed(1)} km/l</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Route-Optimierung:</span>
                    <span className="metric-value">{formatPercent(metrics.efficiency.routeOptimization)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="trends-tab">
              <h3>📈 Performance-Trends</h3>
              <div className="trends-list">
                {trends.map((trend, index) => (
                  <div key={index} className="trend-item">
                    <div className="trend-metric">
                      <span className="metric-name">{trend.metric}</span>
                      <span className="metric-period">{trend.period}</span>
                    </div>
                    <div className="trend-values">
                      <span className="current-value">
                        {trend.metric === 'earnings' ? formatCurrency(trend.current) :
                         trend.metric === 'rating' ? formatRating(trend.current) :
                         trend.current}
                      </span>
                      <div className="trend-change">
                        {getTrendIcon(trend.trend)}
                        <span className={`change-value ${trend.trend}`}>
                          {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="goals-tab">
              <h3>🎯 Persönliche Ziele</h3>
              <div className="goals-list">
                {goals.map((goal) => (
                  <div key={goal.id} className="goal-item">
                    <div className="goal-header">
                      <div className="goal-title">
                        {goal.type === 'deliveries' && '📦 Lieferungen'}
                        {goal.type === 'earnings' && '💰 Verdienst'}
                        {goal.type === 'rating' && '⭐ Bewertung'}
                        {goal.type === 'hours' && '⏰ Arbeitsstunden'}
                      </div>
                      <div className="goal-status" style={{ color: getGoalStatusColor(goal.status) }}>
                        {goal.status === 'completed' && '✅ Abgeschlossen'}
                        {goal.status === 'on_track' && '🎯 Auf Kurs'}
                        {goal.status === 'behind' && '⚠️ Zurück'}
                        {goal.status === 'ahead' && '🚀 Voraus'}
                      </div>
                    </div>
                    <div className="goal-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(100, goal.progress)}%`,
                            backgroundColor: getGoalStatusColor(goal.status)
                          }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        <span>{goal.current} / {goal.target}</span>
                        <span>{goal.progress.toFixed(0)}%</span>
                      </div>
                    </div>
                    {goal.reward && (
                      <div className="goal-reward">
                        🎁 Belohnung: {goal.reward}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'coaching' && (
            <div className="coaching-tab">
              <h3>🧠 AI-Coaching</h3>
              <div className="coaching-tips">
                {coachingTips.map((tip) => (
                  <div key={tip.id} className={`coaching-tip ${tip.type}`}>
                    <div className="tip-header">
                      {getTipIcon(tip.type)}
                      <div className="tip-title-section">
                        <h4>{tip.title}</h4>
                        <span className="tip-category">{tip.category}</span>
                      </div>
                      <span className={`tip-impact ${tip.impact}`}>
                        {tip.impact === 'high' && '🔴 Hoch'}
                        {tip.impact === 'medium' && '🟡 Mittel'}
                        {tip.impact === 'low' && '🟢 Niedrig'}
                      </span>
                    </div>
                    <p className="tip-description">{tip.description}</p>
                    {tip.actionable && (
                      <div className="tip-action">
                        <button className="action-btn">📝 Als erledigt markieren</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
