import { useState, useCallback, useMemo } from 'react';
import { Order, Driver, AcceptanceScore } from '../types';
import { smartAcceptanceEngine } from '../services/smartAcceptanceEngine';
import { logger } from '../utils/logger';

interface UseSmartAcceptanceOptions {
  enabled?: boolean;
  autoAcceptThreshold?: number;
  updateInterval?: number; // in Minuten
}

interface SmartAcceptanceState {
  isAnalyzing: boolean;
  scores: Map<string, AcceptanceScore>;
  lastAnalysis: Map<string, Date>;
  autoAcceptedOrders: string[];
}

export function useSmartAcceptance(
  driver: Driver | null,
  orders: Order[],
  options: UseSmartAcceptanceOptions = {},
  driverLocation?: { lat: number; lng: number }
) {
  const {
    enabled = true,
    autoAcceptThreshold = 85,
    updateInterval = 5 // 5 Minuten
  } = options;

  const [state, setState] = useState<SmartAcceptanceState>({
    isAnalyzing: false,
    scores: new Map(),
    lastAnalysis: new Map(),
    autoAcceptedOrders: []
  });

  // Aktive Bestellungen filtern (ACCEPTED aber nicht zugewiesen)
  const pendingOrders = useMemo(() =>
    orders.filter(order =>
      order.status === 'ACCEPTED' &&
      !order.driverId &&
      enabled
    ), [orders, enabled]
  );

  // Scores für aktive Bestellungen abrufen
  const getScore = useCallback((orderId: string): AcceptanceScore | null => {
    return state.scores.get(orderId) || null;
  }, [state.scores]);

  // Alle Scores abrufen
  const getAllScores = useCallback((): AcceptanceScore[] => {
    return Array.from(state.scores.values());
  }, [state.scores]);

  // Bestellung analysieren
  const analyzeOrder = useCallback(async (order: Order): Promise<AcceptanceScore | null> => {
    if (!driver || !enabled) return null;

    try {
      setState(prev => ({ ...prev, isAnalyzing: true }));

      const score = await smartAcceptanceEngine.analyzeOrder(
        order,
        driver,
        orders.filter(o => o.driverId === driver.id),
        driverLocation
      );

      setState(prev => ({
        ...prev,
        scores: new Map(prev.scores.set(order.id, score)),
        lastAnalysis: new Map(prev.lastAnalysis.set(order.id, new Date())),
        isAnalyzing: false
      }));

      // Auto-Accept wenn Score hoch genug
      if (score.recommendation === 'auto_accept' && score.overall >= autoAcceptThreshold) {
        setState(prev => ({
          ...prev,
          autoAcceptedOrders: [...prev.autoAcceptedOrders, order.id]
        }));

        logger.info('🤖 Auto-Accept ausgelöst', 'useSmartAcceptance', {
          orderId: order.id,
          score: score.overall
        });

        return score;
      }

      return score;

    } catch (error) {
      logger.error('Fehler bei Bestellungsanalyse', 'useSmartAcceptance', error);
      setState(prev => ({ ...prev, isAnalyzing: false }));
      return null;
    }
  }, [driver?.id, enabled, orders.length, autoAcceptThreshold, driverLocation?.lat, driverLocation?.lng]);

  // Mehrere Bestellungen analysieren
  const analyzeOrders = useCallback(async (orderList: Order[] = pendingOrders) => {
    if (!driver || !enabled) return;

    const promises = orderList.map(order => analyzeOrder(order));
    await Promise.all(promises);
  }, [driver?.id, enabled, pendingOrders.length, analyzeOrder]);

  // Beste verfügbare Bestellung finden
  const findBestOrder = useCallback((): Order | null => {
    let bestOrder: Order | null = null;
    let bestScore = -1;

    for (const order of pendingOrders) {
      const score = getScore(order.id);
      if (score && score.overall > bestScore) {
        bestScore = score.overall;
        bestOrder = order;
      }
    }

    return bestOrder;
  }, [pendingOrders, getScore]);

  // Empfehlung für Bestellung abrufen
  const getRecommendation = useCallback((orderId: string): AcceptanceScore['recommendation'] | null => {
    const score = getScore(orderId);
    return score?.recommendation || null;
  }, [getScore]);

  // Analyse aktualisieren (für regelmäßige Updates)
  const refreshAnalysis = useCallback(async () => {
    if (!enabled) return;

    const now = new Date();
    const ordersToRefresh = pendingOrders.filter(order => {
      const lastAnalysis = state.lastAnalysis.get(order.id);
      if (!lastAnalysis) return true;

      const minutesSinceLastAnalysis = (now.getTime() - lastAnalysis.getTime()) / (1000 * 60);
      return minutesSinceLastAnalysis >= updateInterval;
    });

    if (ordersToRefresh.length > 0) {
      logger.info(`🔄 Aktualisiere ${ordersToRefresh.length} Bestellungsanalysen`, 'useSmartAcceptance');
      await analyzeOrders(ordersToRefresh);
    }
  }, [enabled, pendingOrders, state.lastAnalysis, updateInterval, analyzeOrders]);

  // Statistiken für Dashboard
  const stats = useMemo(() => {
    const scores = getAllScores();

    if (scores.length === 0) {
      return {
        averageScore: 0,
        highPriorityOrders: 0,
        autoAcceptedCount: state.autoAcceptedOrders.length,
        recommendations: {
          accept: 0,
          decline: 0,
          wait: 0,
          auto_accept: 0
        }
      };
    }

    const recommendations = scores.reduce((acc, score) => {
      acc[score.recommendation] = (acc[score.recommendation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      averageScore: Math.round(scores.reduce((sum, score) => sum + score.overall, 0) / scores.length),
      highPriorityOrders: scores.filter(score => score.overall >= 80).length,
      autoAcceptedCount: state.autoAcceptedOrders.length,
      recommendations: {
        accept: recommendations.accept || 0,
        decline: recommendations.decline || 0,
        wait: recommendations.wait || 0,
        auto_accept: recommendations.auto_accept || 0
      }
    };
  }, [getAllScores, state.autoAcceptedOrders]);

  return {
    // State
    isAnalyzing: state.isAnalyzing,
    pendingOrders,

    // Funktionen
    analyzeOrder,
    analyzeOrders,
    getScore,
    getAllScores,
    findBestOrder,
    getRecommendation,
    refreshAnalysis,

    // Statistiken
    stats,

    // Konfiguration
    enabled,
    autoAcceptThreshold,
    updateInterval
  };
}
