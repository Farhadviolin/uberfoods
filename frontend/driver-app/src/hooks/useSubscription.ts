import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from './useWebSocket';
import { logger } from '../utils/logger';
import {
  DriverSubscription,
  DriverSubscriptionResponse,
  mapDriverSubscriptionResponse,
} from '../types';

interface SubscriptionInsights {
  roi: number;
  netProfit: number;
  totalSubscriptionCost: number;
  totalEarnings: number;
  monthsActive: number;
  avgEarningsPerMonth: number;
  recommendations: Array<{
    tier: string;
    reason: string;
    potentialEarnings: number;
    netBenefit: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

function unwrapApiData<T>(response: T | ApiEnvelope<T>): T {
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    response.success === true &&
    'data' in response
  ) {
    return response.data as T;
  }

  return response as T;
}

function normalizeRecommendations(
  recommendations: unknown[],
): SubscriptionInsights['recommendations'] {
  return recommendations.reduce<SubscriptionInsights['recommendations']>((result, value) => {
    if (!value || typeof value !== 'object') return result;

    const recommendation = value as Record<string, unknown>;
    const confidence = String(recommendation.confidence || '').toUpperCase();
    const potentialEarnings = Number(recommendation.potentialEarnings);
    const netBenefit = Number(recommendation.netBenefit);

    if (
      typeof recommendation.tier !== 'string' ||
      typeof recommendation.reason !== 'string' ||
      !['HIGH', 'MEDIUM', 'LOW'].includes(confidence) ||
      !Number.isFinite(potentialEarnings) ||
      !Number.isFinite(netBenefit)
    ) {
      return result;
    }

    result.push({
      tier: recommendation.tier,
      reason: recommendation.reason,
      potentialEarnings,
      netBenefit,
      confidence: confidence as 'HIGH' | 'MEDIUM' | 'LOW',
    });
    return result;
  }, []);
}

export function useSubscription() {
  const { driver } = useAuth();
  // ✅ WICHTIG: Stabilisiere driverId mit useMemo - verhindert unnötige Re-Renders
  const driverId = useMemo(() => driver?.id || null, [driver?.id]);
  const [subscription, setSubscription] = useState<DriverSubscription | null>(null);
  const [insights, setInsights] = useState<SubscriptionInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ✅ WICHTIG: Verwende stabilisierten driverId - verhindert doppelte WebSocket-Verbindungen
  // Wenn driverId null ist, wird keine Verbindung erstellt
  const { socket } = useWebSocket(driverId, {});

  const fetchSubscription = useCallback(async () => {
    if (!driver?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/drivers/subscription');
      const subscriptionData = unwrapApiData<DriverSubscriptionResponse>(response.data);
      setSubscription(mapDriverSubscriptionResponse(subscriptionData));
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        // Authentifizierungsfehler
        setSubscription(null);
        setError('Authentifizierung fehlgeschlagen');
        logger.error('Subscription Fetch Error - Auth', 'useSubscription', err);
      } else {
        setError(err.response?.data?.message || 'Fehler beim Laden der Subscription');
        logger.error('Subscription Fetch Error', 'useSubscription', err);
        setSubscription(null);
      }
    } finally {
      setLoading(false);
    }
  }, [driver?.id]);

  const fetchInsights = useCallback(async () => {
    if (!driver?.id) return;

    try {
      const response = await api.get('/drivers/insights/roi');
      const recommendationsResponse = await api.get('/drivers/insights/recommendations');
      const roiData = unwrapApiData<{
        roi?: number;
        netProfit?: number;
        totalSubscriptionCost?: number;
        totalEarnings?: number;
        monthsActive?: number;
        earningsPerMonth?: number;
      }>(response.data);
      const recommendationData = unwrapApiData<{ recommendations?: unknown[] }>(
        recommendationsResponse.data,
      );

      setInsights({
        roi: roiData.roi ?? 0,
        netProfit: roiData.netProfit ?? 0,
        totalSubscriptionCost: roiData.totalSubscriptionCost ?? 0,
        totalEarnings: roiData.totalEarnings ?? 0,
        monthsActive: roiData.monthsActive ?? 0,
        avgEarningsPerMonth: roiData.earningsPerMonth ?? 0,
        recommendations: normalizeRecommendations(recommendationData.recommendations || []),
      });
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        // Keine Insights verfügbar - setze null
        setInsights(null);
        logger.warn('Insights nicht verfügbar', 'useSubscription', err);
      } else {
        logger.error('Insights Fetch Error', 'useSubscription', err);
        setInsights(null);
      }
    }
  }, [driver?.id]);

  const upgradeSubscription = useCallback(async (tier: string) => {
    if (!driver?.id) return;

    try {
      await api.post(`/drivers/${driver.id}/subscription/upgrade`, { tier });
      await fetchSubscription();
      await fetchInsights();
      return { success: true };
    } catch (err: any) {
      logger.error('Upgrade Error', 'useSubscription', err);
      return { 
        success: false, 
        error: err.response?.data?.message || 'Fehler beim Upgrade' 
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]); // ✅ Nur driver?.id - fetchSubscription/fetchInsights sind stabil durch useCallback

  const cancelSubscription = useCallback(async (cancelAtPeriodEnd: boolean = true) => {
    if (!driver?.id) return;

    try {
      await api.post(`/drivers/${driver.id}/subscription/cancel`, { cancelAtPeriodEnd });
      await fetchSubscription();
      return { success: true };
    } catch (err: any) {
      logger.error('Cancel Error', 'useSubscription', err);
      return { 
        success: false, 
        error: err.response?.data?.message || 'Fehler beim Kündigen' 
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]); // ✅ Nur driver?.id - fetchSubscription ist stabil durch useCallback

  // WebSocket Listener für Subscription Updates
  useEffect(() => {
    if (!socket || !driver?.id) return;

    const handleSubscriptionUpdate = (data: any) => {
      if (data.driverId === driver.id) {
        fetchSubscription();
        fetchInsights();
      }
    };

    socket.on('subscription-updated', handleSubscriptionUpdate);
    socket.on('subscription-payment-success', handleSubscriptionUpdate);
    socket.on('subscription-payment-failed', handleSubscriptionUpdate);
    socket.on('trial-ending-soon', handleSubscriptionUpdate);

    return () => {
      socket.off('subscription-updated', handleSubscriptionUpdate);
      socket.off('subscription-payment-success', handleSubscriptionUpdate);
      socket.off('subscription-payment-failed', handleSubscriptionUpdate);
      socket.off('trial-ending-soon', handleSubscriptionUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, driver?.id]); // ✅ Nur socket und driver?.id - Callbacks sind stabil durch useCallback

  // Initial Fetch - nur einmal beim Mount
  useEffect(() => {
    fetchSubscription();
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]); // Nur driver?.id als Dependency

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSubscription();
      fetchInsights();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]); // Nur driver?.id als Dependency

  // Trial End Check
  const trialDaysRemaining = subscription?.trialEndsAt
    ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isTrialEndingSoon = trialDaysRemaining !== null && trialDaysRemaining <= 3 && trialDaysRemaining > 0;
  const isTrialExpired = trialDaysRemaining !== null && trialDaysRemaining <= 0;

  return {
    subscription,
    insights,
    loading,
    error,
    trialDaysRemaining,
    isTrialEndingSoon,
    isTrialExpired,
    upgradeSubscription,
    cancelSubscription,
    refetch: fetchSubscription,
    refetchInsights: fetchInsights,
  };
}

