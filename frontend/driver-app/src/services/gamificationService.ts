import { Driver, Achievement, GamificationStats, DailyChallenge, WeeklyQuest, PerformanceMetrics } from '../types';
import { logger } from '../utils/logger';
import api from '../utils/api';

export class GamificationService {
  private static instance: GamificationService;
  private achievements: Achievement[] = [];
  private dailyChallenges: DailyChallenge[] = [];
  private weeklyQuests: WeeklyQuest[] = [];

  public static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  constructor() {
    this.initializeAchievements();
    this.initializeDailyChallenges();
    this.initializeWeeklyQuests();
  }

  /**
   * Holt die vollständigen Gamification-Stats für einen Fahrer
   */
  async getGamificationStats(driverId: string): Promise<GamificationStats> {
    try {
      // Echter API-Call zum Backend
      const response = await api.get(`/drivers/${driverId}/gamification/stats`);
      return response.data;
    } catch (error) {
      logger.error('Fehler beim Laden der Gamification-Stats', 'GamificationService', error);
      // Keine Fallback-Daten mehr - Error weiterwerfen
      throw error;
    }
  }

  /**
   * Berechnet das Level basierend auf XP
   */
  private async calculateLevel(driverId: string): Promise<any> {
    // Simulierte XP-Berechnung basierend auf Performance
    const baseXP = Math.floor(Math.random() * 5000) + 1000;
    const level = Math.floor(baseXP / 1000) + 1;
    const xpInLevel = baseXP % 1000;
    const xpToNext = 1000 - xpInLevel;

    const titles = [
      'Neuling', 'Fahrer', 'Profi', 'Experte', 'Meister', 'Legende', 'Champion'
    ];

    const perks = [
      'Basis-Belohnungen',
      level >= 2 ? '5% mehr Verdienst' : null,
      level >= 3 ? 'Premium-Support' : null,
      level >= 4 ? 'Auto-Accept Priority' : null,
      level >= 5 ? 'VIP-Status' : null,
      level >= 6 ? 'Exklusive Belohnungen' : null,
      level >= 7 ? 'Ultimate Driver' : null
    ].filter(Boolean) as string[];

    return {
      level: Math.min(level, 7),
      xp: baseXP,
      xpToNext,
      title: titles[Math.min(level - 1, titles.length - 1)],
      perks,
      progress: (xpInLevel / 1000) * 100
    };
  }

  /**
   * Holt alle Achievements mit Fortschritt
   */
  private async getAchievements(driverId: string): Promise<Achievement[]> {
    // Simuliere verschiedene Achievement-Fortschritte
    return this.achievements.map(achievement => ({
      ...achievement,
      progress: Math.floor(Math.random() * 101),
      isCompleted: Math.random() > 0.7,
      unlockedAt: Math.random() > 0.7 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
      requirements: achievement.requirements.map(req => ({
        ...req,
        current: Math.floor(Math.random() * req.target * 1.2)
      }))
    }));
  }

  /**
   * Berechnet aktuelle Streaks
   */
  private async calculateStreaks(driverId: string): Promise<any> {
    return {
      currentDeliveryStreak: Math.floor(Math.random() * 15) + 1,
      longestDeliveryStreak: Math.floor(Math.random() * 50) + 10,
      currentRatingStreak: Math.floor(Math.random() * 20) + 1,
      longestRatingStreak: Math.floor(Math.random() * 100) + 20,
      perfectWeekStreak: Math.floor(Math.random() * 10) + 1
    };
  }

  /**
   * Holt verfügbare Badges
   */
  private async getBadges(driverId: string): Promise<string[]> {
    const allBadges = [
      'Erste Lieferung', '5-Sterne Fahrer', 'Schnellster Fahrer',
      'Sicherheits-Champion', 'Kundenliebling', 'Meister des Multitasking',
      'Überstunden-Held', 'Perfekte Woche', 'Rekordhalter'
    ];

    // Simuliere, dass einige Badges freigeschaltet sind
    return allBadges.filter(() => Math.random() > 0.4);
  }

  /**
   * Holt verfügbare Titel
   */
  private async getTitles(driverId: string): Promise<string[]> {
    const allTitles = [
      'Neuling', 'Fahrer', 'Profi', 'Experte', 'Meister',
      'Legende', 'Champion', 'VIP-Fahrer', 'Elite-Fahrer'
    ];

    return allTitles.filter(() => Math.random() > 0.3);
  }

  /**
   * Holt wöchentlichen Fortschritt
   */
  private async getWeeklyProgress(driverId: string): Promise<any> {
    return {
      deliveries: Math.floor(Math.random() * 50) + 10,
      earnings: Math.floor(Math.random() * 500) + 200,
      rating: 4.2 + Math.random() * 0.8,
      xpGained: Math.floor(Math.random() * 500) + 100
    };
  }

  /**
   * Holt Leaderboard-Position
   */
  private async getLeaderboardPosition(driverId: string): Promise<any> {
    try {
      // Echter API-Call zum Backend
      const response = await api.get(`/drivers/leaderboard`, {
        params: { period: 'month' }
      });
      
      // Finde Position des aktuellen Drivers
      const leaderboard = response.data;
      const driverPosition = leaderboard.findIndex((entry: any) => entry.driverId === driverId);
      
      if (driverPosition >= 0) {
        const position = driverPosition + 1;
        const totalDrivers = leaderboard.length;
        const percentile = ((totalDrivers - position) / totalDrivers) * 100;
        
        return {
          position,
          totalDrivers,
          percentile: Math.round(percentile)
        };
      }
      
      // Fallback wenn Driver nicht in Top-Liste
      return {
        position: leaderboard.length + 1,
        totalDrivers: leaderboard.length + 100,
        percentile: 0
      };
    } catch (error) {
      logger.warn('Backend Leaderboard API nicht verfügbar, verwende Fallback', 'GamificationService', error);
      // Fallback auf lokale Berechnung
    const position = Math.floor(Math.random() * 1000) + 1;
    const totalDrivers = 1500;
    const percentile = ((totalDrivers - position) / totalDrivers) * 100;

    return {
      position,
      totalDrivers,
      percentile: Math.round(percentile)
    };
    }
  }

  /**
   * Holt vollständiges Leaderboard vom Backend
   */
  async getLeaderboard(period: 'day' | 'week' | 'month' = 'month'): Promise<any[]> {
    try {
      const response = await api.get(`/drivers/leaderboard`, {
        params: { period }
      });
      return response.data;
    } catch (error) {
      logger.error('Fehler beim Laden des Leaderboards', 'GamificationService', error);
      return [];
    }
  }

  /**
   * Holt tägliche Challenges
   */
  async getDailyChallenges(driverId: string): Promise<DailyChallenge[]> {
    try {
      // Echter API-Call zum Backend
      const response = await api.get(`/drivers/${driverId}/gamification/challenges/daily`);
      return response.data;
    } catch (error) {
      logger.error('Fehler beim Laden der Daily Challenges', 'GamificationService', error);
      // Keine Fallback-Daten mehr - Error weiterwerfen
      throw error;
    }
  }

  /**
   * Holt wöchentliche Quests
   */
  async getWeeklyQuests(driverId: string): Promise<WeeklyQuest[]> {
    try {
      // Echter API-Call zum Backend
      const response = await api.get(`/drivers/${driverId}/gamification/quests/weekly`);
      return response.data;
    } catch (error) {
      logger.error('Fehler beim Laden der Weekly Quests', 'GamificationService', error);
      // Keine Fallback-Daten mehr - Error weiterwerfen
      throw error;
    }
  }

  /**
   * Aktualisiert Achievements basierend auf neuen Daten
   */
  async updateAchievements(driverId: string, metrics: PerformanceMetrics): Promise<Achievement[]> {
    const updatedAchievements: Achievement[] = [];

    for (const achievement of this.achievements) {
      const wasCompleted = achievement.isCompleted;
      let newProgress = 0;
      let allRequirementsMet = true;

      // Prüfe alle Requirements
      for (const req of achievement.requirements) {
        let current = 0;

        switch (req.type) {
          case 'deliveries':
            current = metrics.daily.deliveries + metrics.weekly.deliveries + metrics.monthly.deliveries;
            break;
          case 'rating':
            current = metrics.daily.rating * 20; // Skaliere auf 0-100
            break;
          case 'streak':
            current = metrics.streaks.perfectDeliveries;
            break;
          case 'earnings':
            current = metrics.daily.earnings + metrics.weekly.earnings + metrics.monthly.earnings;
            break;
          case 'hours':
            current = metrics.daily.hoursWorked + metrics.weekly.hoursWorked + metrics.monthly.hoursWorked;
            break;
        }

        req.current = Math.min(current, req.target);
        newProgress += (req.current / req.target) * 100;

        if (req.current < req.target) {
          allRequirementsMet = false;
        }
      }

      const progress = Math.min(100, newProgress / achievement.requirements.length);
      const isCompleted = allRequirementsMet && progress >= 100;

      const updatedAchievement = {
        ...achievement,
        progress,
        isCompleted,
        isNew: isCompleted && !wasCompleted,
        unlockedAt: isCompleted && !wasCompleted ? new Date() : achievement.unlockedAt
      };

      updatedAchievements.push(updatedAchievement);

      // Log neue Achievements
      if (isCompleted && !wasCompleted) {
        logger.info('🎉 New achievement unlocked!', 'GamificationService', {
          achievement: achievement.name,
          driverId
        });
      }
    }

    return updatedAchievements;
  }

  /**
   * Verleiht XP für verschiedene Aktionen
   */
  async grantXP(driverId: string, action: string, multiplier: number = 1): Promise<number> {
    const xpRewards = {
      'delivery_completed': 10,
      'perfect_delivery': 25,
      'high_rating': 15,
      'fast_delivery': 20,
      'multi_order': 30,
      'daily_challenge': 50,
      'weekly_quest': 100,
      'streak_bonus': 40
    };

    const baseXP = xpRewards[action as keyof typeof xpRewards] || 5;
    const xpGained = Math.floor(baseXP * multiplier);

    logger.info('⭐ XP granted', 'GamificationService', {
      action,
      xpGained,
      driverId
    });

    return xpGained;
  }

  /**
   * Initialisiert alle verfügbaren Achievements
   */
  private initializeAchievements(): void {
    this.achievements = [
      // Delivery Achievements
      {
        id: 'first_delivery',
        name: 'Erste Schritte',
        description: 'Schließe deine erste Lieferung ab',
        icon: '🚚',
        category: 'delivery',
        rarity: 'common',
        requirements: [{
          type: 'deliveries',
          target: 1,
          current: 0,
          description: '1 Lieferung abschließen'
        }],
        rewards: [{
          type: 'xp',
          value: 50,
          description: '50 XP'
        }, {
          type: 'badge',
          value: 'first_delivery',
          description: 'Badge: Erste Lieferung'
        }],
        progress: 0,
        isCompleted: false
      },

      {
        id: 'delivery_master',
        name: 'Liefermeister',
        description: 'Schließe 1000 Lieferungen ab',
        icon: '👑',
        category: 'delivery',
        rarity: 'legendary',
        requirements: [{
          type: 'deliveries',
          target: 1000,
          current: 0,
          description: '1000 Lieferungen abschließen'
        }],
        rewards: [{
          type: 'xp',
          value: 5000,
          description: '5000 XP'
        }, {
          type: 'title',
          value: 'Liefermeister',
          description: 'Titel: Liefermeister'
        }],
        progress: 0,
        isCompleted: false
      },

      // Performance Achievements
      {
        id: 'speed_demon',
        name: 'Geschwindigkeitsdämon',
        description: 'Erreiche eine durchschnittliche Lieferzeit unter 20 Minuten',
        icon: '⚡',
        category: 'performance',
        rarity: 'epic',
        requirements: [{
          type: 'efficiency',
          target: 80,
          current: 0,
          description: 'Ø Lieferzeit < 20 Minuten'
        }],
        rewards: [{
          type: 'xp',
          value: 200,
          description: '200 XP'
        }, {
          type: 'bonus',
          value: 10,
          description: '10% Geschwindigkeitsbonus'
        }],
        progress: 0,
        isCompleted: false
      },

      // Safety Achievements
      {
        id: 'safety_first',
        name: 'Sicherheit zuerst',
        description: 'Fahre 100 Stunden ohne Vorfälle',
        icon: '🛡️',
        category: 'safety',
        rarity: 'rare',
        requirements: [{
          type: 'hours',
          target: 100,
          current: 0,
          description: '100 unfallfreie Stunden'
        }],
        rewards: [{
          type: 'xp',
          value: 300,
          description: '300 XP'
        }, {
          type: 'badge',
          value: 'safety_champion',
          description: 'Badge: Sicherheits-Champion'
        }],
        progress: 0,
        isCompleted: false
      },

      // Social Achievements
      {
        id: 'five_star_driver',
        name: '5-Sterne Fahrer',
        description: 'Erhalte eine durchschnittliche Bewertung von 4.8 oder höher',
        icon: '⭐',
        category: 'social',
        rarity: 'epic',
        requirements: [{
          type: 'rating',
          target: 96,
          current: 0,
          description: 'Ø Bewertung ≥ 4.8'
        }],
        rewards: [{
          type: 'xp',
          value: 400,
          description: '400 XP'
        }, {
          type: 'title',
          value: '5-Sterne Fahrer',
          description: 'Titel: 5-Sterne Fahrer'
        }],
        progress: 0,
        isCompleted: false
      },

      // Special Achievements
      {
        id: 'marathon_driver',
        name: 'Marathon-Fahrer',
        description: 'Fahre 24 Stunden am Stück',
        icon: '🏃',
        category: 'special',
        rarity: 'legendary',
        requirements: [{
          type: 'hours',
          target: 24,
          current: 0,
          description: '24 Stunden durchgehend fahren'
        }],
        rewards: [{
          type: 'xp',
          value: 1000,
          description: '1000 XP'
        }, {
          type: 'badge',
          value: 'marathon_driver',
          description: 'Exklusives Marathon-Badge'
        }],
        progress: 0,
        isCompleted: false
      }
    ];
  }

  /**
   * Initialisiert tägliche Challenges
   */
  private initializeDailyChallenges(): void {
    this.dailyChallenges = [
      {
        id: 'daily_deliveries',
        title: 'Tägliche Lieferungen',
        description: 'Schließe 8 Lieferungen ab',
        type: 'deliveries',
        target: 8,
        current: 0,
        reward: {
          type: 'xp',
          value: 50,
          description: '50 XP'
        },
        expiresAt: new Date(),
        completed: false,
        progress: 0
      },

      {
        id: 'daily_rating',
        title: 'Perfekte Bewertungen',
        description: 'Erhalte 5 Lieferungen mit 5-Sternen',
        type: 'rating',
        target: 5,
        current: 0,
        reward: {
          type: 'xp',
          value: 75,
          description: '75 XP'
        },
        expiresAt: new Date(),
        completed: false,
        progress: 0
      }
    ];
  }

  /**
   * Initialisiert wöchentliche Quests
   */
  private initializeWeeklyQuests(): void {
    this.weeklyQuests = [
      {
        id: 'weekly_master',
        title: 'Wochen-Meister',
        description: 'Erfülle alle wöchentlichen Ziele',
        objectives: [
          {
            id: 'weekly_deliveries',
            description: '50 Lieferungen abschließen',
            target: 50,
            current: 0,
            completed: false
          },
          {
            id: 'weekly_rating',
            description: 'Ø Bewertung von 4.5+',
            target: 90,
            current: 0,
            completed: false
          },
          {
            id: 'weekly_earnings',
            description: '1000€ verdienen',
            target: 1000,
            current: 0,
            completed: false
          }
        ],
        rewards: [
          {
            type: 'xp',
            value: 500,
            description: '500 XP'
          },
          {
            type: 'bonus',
            value: 50,
            description: '50€ Bonus'
          }
        ],
        expiresAt: new Date(),
        completed: false,
        progress: 0
      }
    ];
  }
}

// Export Singleton-Instanz
export const gamificationService = GamificationService.getInstance();
