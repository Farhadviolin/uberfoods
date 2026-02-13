import { Driver, PerformanceMetrics, AICoachingTip, PerformanceTrend, GoalProgress } from '../types';
import { logger } from '../utils/logger';
import api from '../utils/api';
import { getEnvBool } from '../utils/env';

const allowSimulation = getEnvBool('VITE_ALLOW_SIMULATION');

export class PerformanceAnalyticsService {
  private static instance: PerformanceAnalyticsService;
  private coachingTips: AICoachingTip[] = [];
  private goals: GoalProgress[] = [];

  public static getInstance(): PerformanceAnalyticsService {
    if (!PerformanceAnalyticsService.instance) {
      PerformanceAnalyticsService.instance = new PerformanceAnalyticsService();
    }
    return PerformanceAnalyticsService.instance;
  }

  /**
   * Lädt umfassende Performance-Metriken für einen Fahrer
   */
  async getPerformanceMetrics(driverId: string): Promise<PerformanceMetrics> {
    try {
      // Echter API-Call zum Backend
      const response = await api.get(`/drivers/${driverId}/performance/metrics`);
      return response.data;
    } catch (error) {
      logger.error('Fehler beim Laden der Performance-Metriken', 'PerformanceAnalyticsService', error);
      // Keine Fallback-Daten mehr - Error weiterwerfen
      throw error;
    }
  }

  /**
   * Lädt tägliche Performance-Metriken vom Backend
   */
  private async generateDailyMetrics(driverId: string) {
    try {
      const response = await api.get(`/drivers/${driverId}/performance/metrics?period=day`);
      return response.data.daily;
    } catch (error) {
      logger.error('Fehler beim Laden täglicher Performance-Metriken', 'PerformanceAnalyticsService', error);
      // Keine Fallback-Daten mehr - Error weiterwerfen
      throw error;
    }
  }

  /**
   * Generiert wöchentliche Performance-Metriken
   */
  private async generateWeeklyMetrics(driverId: string) {
    if (!allowSimulation) {
      throw new Error('Weekly metrics Simulation ist deaktiviert (VITE_ALLOW_SIMULATION=false)');
    }
    const daily = await this.generateDailyMetrics(driverId);

    return {
      deliveries: daily.deliveries * 7 + Math.floor(Math.random() * 20),
      earnings: daily.earnings * 7 + Math.floor(Math.random() * 500),
      hoursWorked: daily.hoursWorked * 5 + Math.random() * 10, // 5 Tage Arbeit
      rating: 4.3 + Math.random() * 0.7,
      acceptanceRate: 82 + Math.random() * 18,
      onTimeRate: 87 + Math.random() * 13,
      customerSatisfaction: 4.4 + Math.random() * 0.6,
      trend: this.getRandomTrend()
    };
  }

  /**
   * Generiert monatliche Performance-Metriken
   */
  private async generateMonthlyMetrics(driverId: string) {
    if (!allowSimulation) {
      throw new Error('Monthly metrics Simulation ist deaktiviert (VITE_ALLOW_SIMULATION=false)');
    }
    const weekly = await this.generateWeeklyMetrics(driverId);

    return {
      deliveries: weekly.deliveries * 4 + Math.floor(Math.random() * 50),
      earnings: weekly.earnings * 4 + Math.floor(Math.random() * 1000),
      hoursWorked: weekly.hoursWorked * 4 + Math.random() * 20,
      rating: 4.4 + Math.random() * 0.6,
      acceptanceRate: 80 + Math.random() * 20,
      onTimeRate: 85 + Math.random() * 15,
      customerSatisfaction: 4.3 + Math.random() * 0.7,
      trend: this.getRandomTrend()
    };
  }

  /**
   * Berechnet aktuelle Streaks
   */
  private async calculateStreaks(driverId: string) {
    if (!allowSimulation) {
      throw new Error('Streak Simulation ist deaktiviert (VITE_ALLOW_SIMULATION=false)');
    }
    return {
      perfectDeliveries: Math.floor(Math.random() * 25) + 1,
      onTimeStreak: Math.floor(Math.random() * 50) + 5,
      highRatingStreak: Math.floor(Math.random() * 30) + 3
    };
  }

  /**
   * Berechnet Effizienz-Metriken
   */
  private async calculateEfficiencyMetrics(driverId: string) {
    if (!allowSimulation) {
      throw new Error('Effizienz-Simulation ist deaktiviert (VITE_ALLOW_SIMULATION=false)');
    }
    return {
      avgDeliveryTime: 15 + Math.random() * 20, // 15-35 Minuten
      avgEarningsPerHour: 20 + Math.random() * 15, // 20-35 €/Stunde
      fuelEfficiency: 12 + Math.random() * 8, // 12-20 km/l
      routeOptimization: 75 + Math.random() * 25 // 75-100%
    };
  }

  /**
   * Generiert AI-Coaching-Tipps basierend auf Performance
   */
  async generateAICoachingTips(driver: Driver, metrics: PerformanceMetrics): Promise<AICoachingTip[]> {
    const tips: AICoachingTip[] = [];

    // Zeitbasierte Tipps
    if (metrics.daily.onTimeRate < 90) {
      tips.push({
        id: `timing_${Date.now()}`,
        type: 'improvement',
        category: 'timing',
        title: 'Pünktlichkeit verbessern',
        description: 'Ihre Lieferzeiten könnten optimiert werden. Versuchen Sie, 5 Minuten früher loszufahren.',
        impact: 'high',
        actionable: true,
        timestamp: new Date(),
        data: { currentRate: metrics.daily.onTimeRate, targetRate: 95 }
      });
    } else if (metrics.daily.onTimeRate > 98) {
      tips.push({
        id: `celebration_timing_${Date.now()}`,
        type: 'celebration',
        category: 'timing',
        title: 'Perfekte Pünktlichkeit! 🎉',
        description: 'Ausgezeichnete Lieferzeiten! Ihre Kunden schätzen Ihre Zuverlässigkeit.',
        impact: 'high',
        actionable: false,
        timestamp: new Date(),
        data: { currentRate: metrics.daily.onTimeRate }
      });
    }

    // Kommunikations-Tipps
    if (metrics.daily.customerSatisfaction < 4.5) {
      tips.push({
        id: `communication_${Date.now()}`,
        type: 'tip',
        category: 'communication',
        title: 'Kundenkommunikation optimieren',
        description: 'Versuchen Sie, Kunden 2-3 Minuten vor Ankunft zu informieren.',
        impact: 'medium',
        actionable: true,
        timestamp: new Date(),
        data: { currentSatisfaction: metrics.daily.customerSatisfaction }
      });
    }

    // Effizienz-Tipps
    if (metrics.efficiency.routeOptimization < 80) {
      tips.push({
        id: `efficiency_${Date.now()}`,
        type: 'improvement',
        category: 'efficiency',
        title: 'Route-Optimierung nutzen',
        description: 'Die KI-Route ist 20% effizienter. Aktivieren Sie Multi-Order-Modus.',
        impact: 'high',
        actionable: true,
        timestamp: new Date(),
        data: { currentEfficiency: metrics.efficiency.routeOptimization }
      });
    }

    // Sicherheits-Tipps
    if (metrics.weekly.hoursWorked > 50) {
      tips.push({
        id: `safety_${Date.now()}`,
        type: 'warning',
        category: 'safety',
        title: 'Arbeitszeit-Management',
        description: 'Sie haben diese Woche über 50 Stunden gearbeitet. Denken Sie an Pausen!',
        impact: 'high',
        actionable: true,
        timestamp: new Date(),
        data: { hoursWorked: metrics.weekly.hoursWorked }
      });
    }

    // Erfolgs-Tipps
    if (metrics.streaks.onTimeStreak > 20) {
      tips.push({
        id: `success_${Date.now()}`,
        type: 'celebration',
        category: 'timing',
        title: 'Pünktlichkeits-Rekord! 🏆',
        description: `${metrics.streaks.onTimeStreak} Lieferungen in Folge pünktlich!`,
        impact: 'medium',
        actionable: false,
        timestamp: new Date(),
        data: { streak: metrics.streaks.onTimeStreak }
      });
    }

    this.coachingTips = tips;
    return tips;
  }

  /**
   * Analysiert Performance-Trends
   */
  async getPerformanceTrends(driverId: string, days: number = 30): Promise<PerformanceTrend[]> {
    try {
      // Echter API-Call zum Backend
      const response = await api.get(`/drivers/${driverId}/performance/trends`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      logger.error('Fehler beim Laden der Performance-Trends', 'PerformanceAnalyticsService', error);
      if (allowSimulation) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Verwaltet persönliche Ziele
   */
  async getGoals(driverId: string): Promise<GoalProgress[]> {
    try {
      // Echter API-Call zum Backend
      const response = await api.get(`/drivers/${driverId}/performance/goals`);
      this.goals = response.data;
      return response.data;
    } catch (error) {
      logger.error('Fehler beim Laden der Ziele', 'PerformanceAnalyticsService', error);
      if (allowSimulation) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Holt AI-Coaching-Tipps vom Backend
   */
  async getAICoachingTips(driverId: string): Promise<AICoachingTip[]> {
    try {
      // Echter API-Call zum Backend
      const response = await api.get(`/drivers/${driverId}/performance/coaching`);
      this.coachingTips = response.data;
      return response.data;
    } catch (error) {
      logger.error('Fehler beim Laden der Coaching-Tipps', 'PerformanceAnalyticsService', error);
      if (allowSimulation) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Erstellt personalisierte Ziele basierend auf Performance
   */
  async createPersonalizedGoals(driver: Driver, metrics: PerformanceMetrics): Promise<GoalProgress[]> {
    const goals: GoalProgress[] = [];

    // Verdienst-Ziel
    if (metrics.weekly.earnings < 800) {
      goals.push({
        id: 'earnings_goal',
        type: 'earnings',
        target: 900,
        current: metrics.weekly.earnings,
        progress: (metrics.weekly.earnings / 900) * 100,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: metrics.weekly.earnings > 800 ? 'on_track' : 'behind',
        reward: 'Leistungsbonus: 50€'
      });
    }

    // Bewertungs-Ziel
    if (metrics.monthly.rating < 4.7) {
      goals.push({
        id: 'rating_goal',
        type: 'rating',
        target: 4.8,
        current: metrics.monthly.rating,
        progress: (metrics.monthly.rating / 4.8) * 100,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: metrics.monthly.rating > 4.6 ? 'on_track' : 'behind',
        reward: 'Premium-Fahrer Status'
      });
    }

    return goals;
  }

  /**
   * Hilfsfunktionen
   */
  private getRandomTrend(): 'up' | 'down' | 'stable' {
    if (!allowSimulation) {
      throw new Error('Trend-Simulation ist deaktiviert (VITE_ALLOW_SIMULATION=false)');
    }
    const rand = Math.random();
    if (rand < 0.4) return 'up';
    if (rand < 0.8) return 'stable';
    return 'down';
  }

}

// Export Singleton-Instanz
export const performanceAnalyticsService = PerformanceAnalyticsService.getInstance();
