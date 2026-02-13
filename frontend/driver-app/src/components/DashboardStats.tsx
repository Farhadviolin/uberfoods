import { TFunction } from 'react-i18next';

type DashboardStatsProps = {
  t: TFunction;
  activeOrders: number;
  completedOrders: number;
  todayEarnings: number;
  aiStats: {
    averageScore: number;
    autoAcceptedCount: number;
    recommendations: { accept: number; auto_accept: number };
  };
  aiAnalyzing: boolean;
};

export function DashboardStats({
  t,
  activeOrders,
  completedOrders,
  todayEarnings,
  aiStats,
  aiAnalyzing,
}: DashboardStatsProps) {
  return (
    <div className="stats-grid" aria-label={t('dashboard.title')}>
      <div className="stat-card">
        <h3>{t('dashboard.stats.active')}</h3>
        <div className="stat-value">{activeOrders}</div>
      </div>
      <div className="stat-card">
        <h3>{t('dashboard.stats.completed')}</h3>
        <div className="stat-value">{completedOrders}</div>
      </div>
      <div className="stat-card">
        <h3>{t('dashboard.stats.earnings')}</h3>
        <div className="stat-value">{todayEarnings.toFixed(2)} €</div>
      </div>
      <div className="stat-card ai-stats">
        <h3>{t('dashboard.stats.ai')}</h3>
        <div className="stat-value">{aiStats.averageScore}/100</div>
        <div className="ai-stats-details">
          <span>{t('dashboard.stats.ai.autoAccepted', { count: aiStats.autoAcceptedCount })}</span>
          <span>{t('dashboard.stats.ai.recommended', { count: aiStats.recommendations.accept + aiStats.recommendations.auto_accept })}</span>
        </div>
        {aiAnalyzing && <div className="ai-loading">{t('dashboard.stats.ai.analyzing')}</div>}
      </div>
    </div>
  );
}
