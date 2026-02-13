import { useState, useMemo } from 'react';
import { Apple, Activity, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../design-system/Card';
import { Skeleton } from '../design-system/Skeleton';
import { ProgressBar } from './ProgressBar';
import { useNutritionAnalytics } from '../hooks/useNutrition';
import './NutritionTracker.css';

type NutritionSnapshot = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
};

interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function NutritionTracker() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [goals] = useState<NutritionGoals>({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65
  });

  // API Hook
  const { data: nutritionData, isLoading } = useNutritionAnalytics(selectedPeriod);

  const calculateHealthScore = (nutrition: NutritionSnapshot, goals: NutritionGoals): number => {
    let score = 100;
    
    // Calorie balance
    const calorieDiff = Math.abs(nutrition.calories - goals.calories) / goals.calories;
    score -= calorieDiff * 30;
    
    // Macro balance
    const proteinRatio = nutrition.protein / goals.protein;
    const carbsRatio = nutrition.carbs / goals.carbs;
    const fatRatio = nutrition.fat / goals.fat;
    
    const macroBalance = (proteinRatio + carbsRatio + fatRatio) / 3;
    score -= Math.abs(1 - macroBalance) * 20;
    
    // Sugar penalty
    if (nutrition.sugar > 50) {
      score -= (nutrition.sugar - 50) / 10;
    }
    
    return Math.max(0, Math.min(100, score));
  };

  const currentNutrition = useMemo(() => {
    if (!nutritionData || nutritionData.totalOrders === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
    }
    return {
      calories: nutritionData?.totalCalories || 0,
      protein: nutritionData?.totalProtein || 0,
      carbs: nutritionData?.totalCarbs || 0,
      fat: nutritionData?.totalFat || 0,
      fiber: nutritionData?.totalFiber || 0,
      sugar: nutritionData?.totalSugar || 0
    };
  }, [nutritionData]);

  const averageHealthScore = useMemo(() => {
    if (!nutritionData || nutritionData.totalOrders === 0) {
      return calculateHealthScore(currentNutrition, goals);
    }
    return nutritionData?.healthScore || 0;
  }, [nutritionData, currentNutrition, goals]);

  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#1877F2';
    return '#dc3545';
  };

  const getMacroColor = (macro: string): string => {
    const colors: Record<string, string> = {
      protein: '#1877F2',
      carbs: '#1877F2',
      fat: '#dc3545'
    };
    return colors[macro] || '#65676B';
  };

  if (isLoading) {
    return (
      <Card variant="elevated" className="nutrition-tracker-card">
        <Skeleton variant="text" width="200px" height="24px" />
        <Skeleton variant="rectangular" width="100%" height="200px" />
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="nutrition-tracker-card">
      <div className="nutrition-header">
        <div className="nutrition-title">
          <Apple className="nutrition-icon" />
          <div>
            <h3>{t('nutritionTracker.title')}</h3>
            <p className="nutrition-subtitle">{t('nutritionTracker.subtitle')}</p>
          </div>
        </div>
        <div className="period-selector">
          <button
            className={`period-btn ${selectedPeriod === 'today' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('today')}
          >
            {t('nutritionTracker.today')}
          </button>
          <button
            className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('week')}
          >
            {t('nutritionTracker.week')}
          </button>
          <button
            className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('month')}
          >
            {t('nutritionTracker.month')}
          </button>
        </div>
      </div>

      <div className="health-score-section">
        <div className="health-score-card">
          <Activity className="health-icon" />
          <div className="health-score-content">
            <span className="health-score-label">{t('nutritionTracker.healthScore')}</span>
            <div className="health-score-value-wrapper">
              <span
                className="health-score-value"
                style={{ color: getHealthScoreColor(averageHealthScore) }}
              >
                {Math.round(averageHealthScore)}
              </span>
              <span className="health-score-unit">/100</span>
            </div>
            <ProgressBar
              value={averageHealthScore}
              max={100}
              variant="success"
              size="lg"
            />
          </div>
        </div>
      </div>

      <div className="nutrition-macros">
        <h4>{t('nutritionTracker.macronutrients')}</h4>
        <div className="macros-grid">
          <div className="macro-item">
            <div className="macro-header">
              <span className="macro-label">{t('nutritionTracker.calories')}</span>
              <span className="macro-value">
                {Math.round(currentNutrition.calories)} / {goals.calories}
              </span>
            </div>
            <ProgressBar
              value={currentNutrition.calories}
              max={goals.calories}
              variant="primary"
            />
            <div className="macro-details">
              <span className="macro-unit">kcal</span>
              <span className={`macro-status ${currentNutrition.calories > goals.calories ? 'over' : 'under'}`}>
                {currentNutrition.calories > goals.calories ? t('nutritionTracker.overGoal') : t('nutritionTracker.underGoal')}
              </span>
            </div>
          </div>

          <div className="macro-item">
            <div className="macro-header">
              <span className="macro-label">{t('nutritionTracker.protein')}</span>
              <span className="macro-value">
                {Math.round(currentNutrition.protein)}g / {goals.protein}g
              </span>
            </div>
            <ProgressBar
              value={currentNutrition.protein}
              max={goals.protein}
              variant="primary"
            />
            <div className="macro-details">
              <span className="macro-unit" style={{ color: getMacroColor('protein') }}>
                {t('nutritionTracker.protein')}
              </span>
            </div>
          </div>

          <div className="macro-item">
            <div className="macro-header">
              <span className="macro-label">{t('nutritionTracker.carbs')}</span>
              <span className="macro-value">
                {Math.round(currentNutrition.carbs)}g / {goals.carbs}g
              </span>
            </div>
            <ProgressBar
              value={currentNutrition.carbs}
              max={goals.carbs}
              variant="primary"
            />
            <div className="macro-details">
              <span className="macro-unit" style={{ color: getMacroColor('carbs') }}>
                {t('nutritionTracker.carbs')}
              </span>
            </div>
          </div>

          <div className="macro-item">
            <div className="macro-header">
              <span className="macro-label">{t('nutritionTracker.fat')}</span>
              <span className="macro-value">
                {Math.round(currentNutrition.fat)}g / {goals.fat}g
              </span>
            </div>
            <ProgressBar
              value={currentNutrition.fat}
              max={goals.fat}
              variant="primary"
            />
            <div className="macro-details">
              <span className="macro-unit" style={{ color: getMacroColor('fat') }}>
                {t('nutritionTracker.fat')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="nutrition-insights">
        <h4>{t('nutritionTracker.nutritionInsights')}</h4>
        <div className="insights-list">
          {currentNutrition.sugar > 50 && (
            <div className="insight-item warning">
              <AlertCircle className="insight-icon" />
              <div>
                <strong>{t('nutritionTracker.highSugar')}</strong>
                <p>{t('nutritionTracker.highSugarDesc', { amount: Math.round(currentNutrition.sugar) })}</p>
              </div>
            </div>
          )}
          {currentNutrition.protein < goals.protein * 0.8 && (
            <div className="insight-item info">
              <Target className="insight-icon" />
              <div>
                <strong>{t('nutritionTracker.moreProtein')}</strong>
                <p>{t('nutritionTracker.moreProteinDesc')}</p>
              </div>
            </div>
          )}
          {averageHealthScore >= 80 && (
            <div className="insight-item success">
              <TrendingUp className="insight-icon" />
              <div>
                <strong>{t('nutritionTracker.excellentNutrition')}</strong>
                <p>{t('nutritionTracker.excellentNutritionDesc')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="nutrition-actions">
        <button className="nutrition-btn">
          <Target className="btn-icon" />
          {t('nutritionTracker.adjustGoals')}
        </button>
        <button className="nutrition-btn">
          <Activity className="btn-icon" />
          {t('nutritionTracker.detailedAnalysis')}
        </button>
      </div>
    </Card>
  );
}

