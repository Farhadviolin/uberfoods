import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { logger } from '../utils/logger';

interface PerformanceMetrics {
  overallScore: number;
  deliveryScore: number;
  ratingScore: number;
  efficiencyScore: number;
  rank?: number;
  percentile?: number;
}

interface PerformanceTrends {
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  period: string;
}

interface PerformanceInsights {
  insights: Array<{
    type: string;
    message: string;
    confidence: number;
  }>;
  predictions: {
    nextWeekScore: number;
    confidence: number;
  };
}

export function usePerformance() {
  const { driver } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [trends, setTrends] = useState<PerformanceTrends | null>(null);
  const [insights, setInsights] = useState<PerformanceInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (period: 'day' | 'week' | 'month' = 'week') => {
    if (!driver?.id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/drivers/${driver.id}/performance/score`, {
        params: { period },
      });
      // Backend returns { score, maxScore, breakdown, period, grade, trend, lastUpdated }
      const data = response.data;
      setMetrics({
        overallScore: data.score || 0,
        deliveryScore: data.breakdown?.deliveries || 0,
        ratingScore: data.breakdown?.rating || 0,
        efficiencyScore: data.breakdown?.onTimeRate || 0,
        rank: undefined,
        percentile: undefined,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Laden der Performance-Metriken');
      logger.error('Performance Metrics Fetch Error', 'usePerformance', err);
    } finally {
      setLoading(false);
    }
  }, [driver?.id]);

  const fetchTrends = useCallback(async (period: 'week' | 'month' | 'year' = 'week') => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/performance/trends`, {
        params: { period },
      });
      setTrends(response.data);
    } catch (err: any) {
      logger.error('Performance Trends Fetch Error', 'usePerformance', err);
    }
  }, [driver?.id]);

  const fetchInsights = useCallback(async () => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/performance/ai-insights`);
      // Backend returns { insights, predictions, currentScore, trends, coaching, generatedAt, nextUpdate }
      const data = response.data;
      setInsights({
        insights: (data.insights || []).map((insight: any) => ({
          type: insight.type || 'improvement',
          message: insight.description || insight.title || '',
          confidence: insight.impact === 'high' ? 0.9 : insight.impact === 'medium' ? 0.7 : 0.5,
        })),
        predictions: {
          nextWeekScore: data.predictions?.nextWeekScore || 0,
          confidence: data.predictions?.confidence || 0.75,
        },
      });
    } catch (err: any) {
      logger.error('Performance Insights Fetch Error', 'usePerformance', err);
    }
  }, [driver?.id]);

  const fetchRank = useCallback(async (period: 'week' | 'month' | 'year' = 'month') => {
    if (!driver?.id) return null;

    try {
      const response = await api.get(`/drivers/${driver.id}/performance/rank`, {
        params: { period },
      });
      return response.data;
    } catch (err: any) {
      logger.error('Performance Rank Fetch Error', 'usePerformance', err);
      return null;
    }
  }, [driver?.id]);

  useEffect(() => {
    if (driver?.id) {
      fetchMetrics();
      fetchTrends();
      fetchInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]); // ✅ Nur driver?.id als Dependency - Callbacks sind stabil durch useCallback

  return {
    metrics,
    trends,
    insights,
    loading,
    error,
    refetch: fetchMetrics,
    fetchRank,
  };
}

