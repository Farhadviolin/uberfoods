import { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../design-system/Card';
import { Skeleton } from '../design-system/Skeleton';
import { Chart } from './Charts';
import { useExpenseAnalytics, useExpenseCategoryBreakdown } from '../hooks/useExpenseAnalytics';
import './ExpenseAnalytics.css';

export function ExpenseAnalytics() {
  const { t, i18n } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [budget, setBudget] = useState(500); // Monthly budget

  // API Hooks
  const { data: expenseData, isLoading: expensesLoading } = useExpenseAnalytics(selectedPeriod);
  const { data: categoryBreakdown = [], isLoading: breakdownLoading } = useExpenseCategoryBreakdown(selectedPeriod);

  const totalSpent = useMemo(() => {
    return expenseData?.summary?.totalSpent || 0;
  }, [expenseData]);

  const averageDaily = useMemo(() => {
    const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365;
    return totalSpent / days;
  }, [totalSpent, selectedPeriod]);

  const projectedMonthly = useMemo(() => {
    if (selectedPeriod === 'month') return totalSpent;
    const days = selectedPeriod === 'week' ? 7 : 365;
    return (totalSpent / days) * 30;
  }, [totalSpent, selectedPeriod]);

  const chartData = useMemo(() => {
    if (!expenseData || !expenseData.expensesByDate || expenseData.expensesByDate.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: t('expenseAnalytics.expenses'),
          data: [],
          borderColor: '#1877F2',
          backgroundColor: 'rgba(24, 119, 242, 0.1)',
          tension: 0.4,
          fill: true
        }]
      };
    }

    const groupedByDate: Record<string, number> = {};

    (expenseData.expensesByDate || []).forEach((expense: any) => {
      const date = new Date(expense.date).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
      groupedByDate[date] = (groupedByDate[date] || 0) + expense.amount;
    });

    return {
      labels: Object.keys(groupedByDate),
      datasets: [{
        label: t('expenseAnalytics.expenses'),
        data: Object.values(groupedByDate),
        borderColor: '#1877F2',
        backgroundColor: 'rgba(24, 119, 242, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }, [expenseData, t, i18n.language]);

  const pieChartData = useMemo(() => {
    if (!categoryBreakdown || !Array.isArray(categoryBreakdown) || categoryBreakdown.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: t('expenseAnalytics.categories'),
          data: [],
          backgroundColor: [
            '#1877F2',
            '#dc3545',
            '#1877F2',
            '#4CAF50',
            '#9C27B0',
            '#FFC107',
            '#00BCD4'
          ]
        }]
      };
    }

    return {
      labels: categoryBreakdown.map(c => c.category),
      datasets: [{
        label: t('expenseAnalytics.categories'),
        data: categoryBreakdown.map(c => c.amount),
        backgroundColor: [
          '#1877F2',
          '#dc3545',
          '#1877F2',
          '#4CAF50',
          '#9C27B0',
          '#FFC107',
          '#00BCD4'
        ]
      }]
    };
  }, [categoryBreakdown, t]);

  const isOverBudget = projectedMonthly > budget;
  const budgetRemaining = budget - projectedMonthly;
  const budgetPercentage = (projectedMonthly / budget) * 100;

  if (expensesLoading || breakdownLoading) {
    return (
      <Card variant="elevated" className="expense-analytics-card">
        <div className="expense-header">
          <Skeleton variant="text" width="200px" height="24px" />
          <Skeleton variant="text" width="120px" height="20px" />
        </div>
        <div className="expense-stats">
          {[1, 2, 3].map((item) => (
            <div className="expense-stat-card" key={item}>
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="100px" height="32px" />
              <Skeleton variant="text" width="120px" />
            </div>
          ))}
        </div>
        <Skeleton variant="rectangular" width="100%" height="200px" />
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="expense-analytics-card">
      <div className="expense-header">
        <div className="expense-title">
          <DollarSign className="expense-icon" />
          <div>
            <h3>{t('expenseAnalytics.title')}</h3>
            <p className="expense-subtitle">{t('expenseAnalytics.subtitle')}</p>
          </div>
        </div>
        <div className="period-selector">
          <button
            className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('week')}
          >
            {t('expenseAnalytics.week')}
          </button>
          <button
            className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('month')}
          >
            {t('expenseAnalytics.month')}
          </button>
          <button
            className={`period-btn ${selectedPeriod === 'year' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('year')}
          >
            {t('expenseAnalytics.year')}
          </button>
        </div>
      </div>

      <div className="expense-stats">
        <div className="expense-stat-card">
          <div className="stat-header">
            <span className="stat-label">{t('expenseAnalytics.totalExpenses')}</span>
            <DollarSign className="stat-icon" />
          </div>
          <div className="stat-value">€{totalSpent.toFixed(2)}</div>
          <div className="stat-footer">
            {selectedPeriod === 'week' && t('expenseAnalytics.thisWeek')}
            {selectedPeriod === 'month' && t('expenseAnalytics.thisMonth')}
            {selectedPeriod === 'year' && t('expenseAnalytics.thisYear')}
          </div>
        </div>

        <div className="expense-stat-card">
          <div className="stat-header">
            <span className="stat-label">{t('expenseAnalytics.dailyAverage')}</span>
            <Calendar className="stat-icon" />
          </div>
          <div className="stat-value">€{averageDaily.toFixed(2)}</div>
          <div className="stat-footer">
            {t('expenseAnalytics.averagePerDay')}
          </div>
        </div>

        <div className="expense-stat-card">
          <div className="stat-header">
            <span className="stat-label">{t('expenseAnalytics.monthlyProjection')}</span>
            <TrendingUp className="stat-icon" />
          </div>
          <div className={`stat-value ${isOverBudget ? 'over-budget' : ''}`}>
            €{projectedMonthly.toFixed(2)}
          </div>
          <div className="stat-footer">
            {isOverBudget ? t('expenseAnalytics.overBudget') : t('expenseAnalytics.underBudget')}
          </div>
        </div>
      </div>

      <div className="budget-section">
        <div className="budget-header">
          <h4>{t('expenseAnalytics.monthlyBudget')}</h4>
          <div className="budget-input-wrapper">
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="budget-input"
              min="0"
              step="50"
            />
            <span className="budget-currency">€</span>
          </div>
        </div>
        <div className="budget-progress">
          <div className="budget-progress-bar">
            <div
              className={`budget-progress-fill ${isOverBudget ? 'over' : ''}`}
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            />
          </div>
          <div className="budget-info">
            <span className="budget-spent">€{projectedMonthly.toFixed(2)} {t('expenseAnalytics.spent')}</span>
            <span className={`budget-remaining ${isOverBudget ? 'over' : ''}`}>
              {isOverBudget ? (
                <>
                  <TrendingUp className="budget-icon" />
                  €{Math.abs(budgetRemaining).toFixed(2)} {t('expenseAnalytics.overBudget')}
                </>
              ) : (
                <>
                  <TrendingDown className="budget-icon" />
                  €{budgetRemaining.toFixed(2)} {t('expenseAnalytics.remaining')}
                </>
              )}
            </span>
          </div>
        </div>
        {isOverBudget && (
          <div className="budget-alert">
            <AlertCircle className="alert-icon" />
            <div>
              <strong>{t('expenseAnalytics.overBudgetAlert')}</strong>
              <p>{t('expenseAnalytics.budgetPercentage', { percentage: budgetPercentage.toFixed(0) })}</p>
            </div>
          </div>
        )}
      </div>

      <div className="expense-charts">
        <div className="chart-section">
          <h4>{t('expenseAnalytics.expenseTrend')}</h4>
          <div className="chart-container">
            <Chart type="line" data={chartData} />
          </div>
        </div>

        <div className="chart-section">
          <h4>{t('expenseAnalytics.categoryDistribution')}</h4>
          <div className="chart-container">
            <Chart type="doughnut" data={pieChartData} />
          </div>
        </div>
      </div>

      <div className="category-breakdown">
        <h4>{t('expenseAnalytics.topCategories')}</h4>
        <div className="categories-list">
          {categoryBreakdown && Array.isArray(categoryBreakdown) && categoryBreakdown.length > 0 ? (
            categoryBreakdown.slice(0, 5).map((category, index) => (
              <div key={category.category} className="category-item">
                <div className="category-rank">#{index + 1}</div>
                <div className="category-info">
                  <div className="category-header">
                    <span className="category-name">{category.category}</span>
                    <span className="category-percentage">{category.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="category-details">
                    <span>€{category.amount.toFixed(2)}</span>
                    <span>•</span>
                    <span>{category.amount ? Math.round(category.amount / (expenseData?.summary?.averageOrderValue || 1)) : 0} {t('expenseAnalytics.orders')}</span>
                  </div>
                  <div className="category-bar">
                    <div
                      className="category-bar-fill"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-categories" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {breakdownLoading ? t('expenseAnalytics.loading') : t('expenseAnalytics.noCategories')}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

