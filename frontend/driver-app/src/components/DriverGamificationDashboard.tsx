import { useState, useEffect } from 'react';
import { Driver, Achievement, GamificationStats, DailyChallenge, WeeklyQuest } from '../types';
import { gamificationService } from '../services/gamificationService';
import { TrophyIcon, FlameIcon, AwardIcon, CalendarIcon, TrendingUpIcon, CrownIcon, CheckCircleIcon } from './Icons';
import { logger } from '../utils/logger';
import api from '../utils/api';
import './DriverGamificationDashboard.css';

interface DriverGamificationDashboardProps {
  driver: Driver;
}

export function DriverGamificationDashboard({ driver }: DriverGamificationDashboardProps) {
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuest[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'challenges' | 'leaderboard'>('overview');

  useEffect(() => {
    loadGamificationData();
  }, [driver]);

  const loadGamificationData = async () => {
    try {
      setLoading(true);

      const [stats, challenges, quests] = await Promise.all([
        gamificationService.getGamificationStats(driver.id),
        gamificationService.getDailyChallenges(driver.id),
        gamificationService.getWeeklyQuests(driver.id)
      ]);

      setGamificationStats(stats);
      setDailyChallenges(challenges);
      setWeeklyQuests(quests);

      // Lade Leaderboard separat, wenn Leaderboard-Tab aktiv ist
      if (activeTab === 'leaderboard') {
        await loadLeaderboard();
      }

    } catch (error) {
      logger.error('Fehler beim Laden der Gamification-Daten', 'DriverGamificationDashboard', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await api.get(`/drivers/leaderboard`, {
        params: { period: 'month' }
      });
      
      // Konvertiere Backend-Format zu Frontend-Format
      const leaderboardData = response.data.map((entry: any, index: number) => ({
        rank: index + 1,
        name: entry.driver?.name || entry.name || `Fahrer ${entry.driverId?.slice(-6) || 'Unknown'}`,
        level: entry.level || Math.floor((entry.xp || entry.totalXP || 0) / 1000) + 1,
        xp: entry.xp || entry.totalXP || 0,
        driverId: entry.driverId,
        isCurrentUser: entry.driverId === driver.id
      }));
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      logger.error('Fehler beim Laden des Leaderboards', 'DriverGamificationDashboard', error);
      // Fallback auf leere Liste bei Fehler (keine Mock-Daten mehr)
      logger.warn('Leaderboard API nicht verfügbar', 'DriverGamificationDashboard');
      setLeaderboard([]);
    }
  };

  // Lade Leaderboard wenn Tab gewechselt wird
  useEffect(() => {
    if (activeTab === 'leaderboard' && driver && leaderboard.length === 0) {
      loadLeaderboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, driver]);

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return '#6b7280';
      case 'rare': return '#3b82f6';
      case 'epic': return '#a855f7';
      case 'legendary': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: Achievement['category']) => {
    switch (category) {
      case 'delivery': return '🚚';
      case 'performance': return '⚡';
      case 'safety': return '🛡️';
      case 'social': return '👥';
      case 'special': return '⭐';
      default: return '🏆';
    }
  };

  if (loading) {
    return (
      <div className="gamification-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Lade Gamification-Daten...</p>
      </div>
    );
  }

  return (
    <div className="gamification-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <TrophyIcon size={32} className="gamification-icon" />
          <div>
            <h1>Gamification Center</h1>
            <p className="driver-level">
              Level {gamificationStats?.level.level} • {gamificationStats?.level.title}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Übersicht
        </button>
        <button
          className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏆 Errungenschaften
        </button>
        <button
          className={`tab-btn ${activeTab === 'challenges' ? 'active' : ''}`}
          onClick={() => setActiveTab('challenges')}
        >
          🎯 Herausforderungen
        </button>
        <button
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏅 Rangliste
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && gamificationStats && (
          <div className="overview-tab">
              {/* Level & XP Progress */}
              <div className="level-section">
                <div className="level-card">
                  <div className="level-display">
                    <CrownIcon size={48} className="level-crown" />
                    <div className="level-info">
                      <div className="level-number">Level {gamificationStats.level.level}</div>
                      <div className="level-title">{gamificationStats.level.title}</div>
                    </div>
                  </div>
                  <div className="xp-progress">
                    <div className="xp-bar">
                      <div
                        className="xp-fill"
                        style={{ width: `${gamificationStats.level.progress}%` }}
                      ></div>
                    </div>
                    <div className="xp-text">
                      {gamificationStats.level.xp} / {gamificationStats.level.xp + gamificationStats.level.xpToNext} XP
                    </div>
                  </div>
                  <div className="level-perks">
                    <h4>Level-Perks:</h4>
                    <ul>
                      {gamificationStats.level.perks.map((perk, index) => (
                        <li key={index}>{perk}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Streaks & Stats */}
              <div className="stats-grid">
                <div className="stat-card streak">
                  <div className="stat-icon">
                    <FlameIcon size={24} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{gamificationStats.streaks.currentDeliveryStreak}</div>
                    <div className="stat-label">Aktuelle Serie</div>
                    <div className="stat-subtext">Rekord: {gamificationStats.streaks.longestDeliveryStreak}</div>
                  </div>
                </div>

                <div className="stat-card achievements">
                  <div className="stat-icon">
                    <AwardIcon size={24} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {gamificationStats.achievements.filter(a => a.isCompleted).length}
                    </div>
                    <div className="stat-label">Errungenschaften</div>
                    <div className="stat-subtext">von {gamificationStats.achievements.length}</div>
                  </div>
                </div>

                <div className="stat-card weekly">
                  <div className="stat-icon">
                    <CalendarIcon size={24} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{gamificationStats.weeklyProgress.xpGained}</div>
                    <div className="stat-label">XP diese Woche</div>
                    <div className="stat-subtext">+{gamificationStats.weeklyProgress.deliveries} Lieferungen</div>
                  </div>
                </div>

                <div className="stat-card rank">
                  <div className="stat-icon">
                    <TrendingUpIcon size={24} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">#{gamificationStats.leaderboards.position}</div>
                    <div className="stat-label">Rangliste</div>
                    <div className="stat-subtext">Top {gamificationStats.leaderboards.percentile}%</div>
                  </div>
                </div>
              </div>

              {/* Recent Achievements */}
              <div className="recent-achievements">
                <h3>🏆 Neueste Errungenschaften</h3>
                <div className="achievements-list">
                  {gamificationStats.achievements
                    .filter(a => a.isCompleted)
                    .slice(0, 3)
                    .map((achievement) => (
                      <div key={achievement.id} className="achievement-item completed">
                        <div className="achievement-icon">{achievement.icon}</div>
                        <div className="achievement-content">
                          <div className="achievement-name">{achievement.name}</div>
                          <div className="achievement-description">{achievement.description}</div>
                          <div className="achievement-rarity" style={{ color: getRarityColor(achievement.rarity) }}>
                            {achievement.rarity.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
          </div>
        )}

        {activeTab === 'achievements' && gamificationStats && (
          <div className="achievements-tab">
              <h3>🏆 Alle Errungenschaften</h3>

              <div className="achievements-filters">
                <button className="filter-btn active">Alle</button>
                <button className="filter-btn">Lieferungen</button>
                <button className="filter-btn">Performance</button>
                <button className="filter-btn">Sicherheit</button>
                <button className="filter-btn">Sozial</button>
                <button className="filter-btn">Speziell</button>
              </div>

              <div className="achievements-grid">
                {gamificationStats.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`achievement-card ${achievement.isCompleted ? 'completed' : 'locked'} ${achievement.rarity}`}
                  >
                    <div className="achievement-header">
                      <div className="achievement-icon-large">{achievement.icon}</div>
                      <div className="achievement-category">
                        {getCategoryIcon(achievement.category)}
                      </div>
                    </div>

                    <div className="achievement-content">
                      <h4>{achievement.name}</h4>
                      <p>{achievement.description}</p>

                      <div className="achievement-rarity-badge" style={{ backgroundColor: getRarityColor(achievement.rarity) }}>
                        {achievement.rarity.toUpperCase()}
                      </div>

                      {!achievement.isCompleted && (
                        <div className="achievement-progress">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${achievement.progress}%` }}
                            ></div>
                          </div>
                          <div className="progress-text">
                            {Math.round(achievement.progress)}% abgeschlossen
                          </div>
                        </div>
                      )}

                      {achievement.isCompleted && achievement.rewards.length > 0 && (
                        <div className="achievement-rewards">
                          <h5>Belohnungen:</h5>
                          <ul>
                            {achievement.rewards.map((reward, index) => (
                              <li key={index}>
                                {reward.type === 'xp' && `⭐ ${reward.value} XP`}
                                {reward.type === 'badge' && `🏷️ Badge: ${reward.description}`}
                                {reward.type === 'bonus' && `💰 Bonus: ${reward.value}€`}
                                {reward.type === 'title' && `👑 Titel: ${reward.value}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {achievement.isCompleted && (
                      <div className="achievement-completed-badge">
                        <CheckCircleIcon size={20} />
                        Abgeschlossen
                      </div>
                    )}
                  </div>
                ))}
              </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="challenges-tab">
              {/* Daily Challenges */}
              <div className="challenges-section">
                <h3>📅 Tägliche Herausforderungen</h3>
                <div className="challenges-list">
                  {dailyChallenges.map((challenge) => (
                    <div key={challenge.id} className={`challenge-item ${challenge.completed ? 'completed' : ''}`}>
                      <div className="challenge-header">
                        <div className="challenge-title">{challenge.title}</div>
                        <div className="challenge-reward">
                          +{challenge.reward.value} {challenge.reward.type === 'xp' ? 'XP' : '€'}
                        </div>
                      </div>

                      <div className="challenge-description">{challenge.description}</div>

                      <div className="challenge-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${challenge.progress}%` }}
                          ></div>
                        </div>
                        <div className="progress-text">
                          {challenge.current} / {challenge.target}
                        </div>
                      </div>

                      {challenge.completed && (
                        <div className="challenge-completed">
                          <TrophyIcon size={16} />
                          Abgeschlossen!
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Quests */}
              <div className="challenges-section">
                <h3>📆 Wöchentliche Quests</h3>
                <div className="quests-list">
                  {weeklyQuests.map((quest) => (
                    <div key={quest.id} className={`quest-item ${quest.completed ? 'completed' : ''}`}>
                      <div className="quest-header">
                        <div className="quest-title">{quest.title}</div>
                        <div className="quest-progress-circle">
                          {Math.round(quest.progress)}%
                        </div>
                      </div>

                      <div className="quest-description">{quest.description}</div>

                      <div className="quest-objectives">
                        {quest.objectives.map((objective) => (
                          <div key={objective.id} className={`objective-item ${objective.completed ? 'completed' : ''}`}>
                            <div className="objective-text">{objective.description}</div>
                            <div className="objective-progress">
                              {objective.current} / {objective.target}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="quest-rewards">
                        <h5>Belohnungen:</h5>
                        <div className="rewards-list">
                          {quest.rewards.map((reward, index) => (
                            <span key={index} className="reward-item">
                              {reward.type === 'xp' && `⭐ ${reward.value} XP`}
                              {reward.type === 'bonus' && `💰 ${reward.value}€`}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </div>
        )}

        {activeTab === 'leaderboard' && gamificationStats && (
          <div className="leaderboard-tab">
              <h3>🏅 Fahrer-Rangliste</h3>

              <div className="leaderboard-stats">
                <div className="leaderboard-position">
                  <div className="position-number">#{gamificationStats.leaderboards.position}</div>
                  <div className="position-label">Deine Position</div>
                  <div className="position-percentile">
                    Top {gamificationStats.leaderboards.percentile}% der Fahrer
                  </div>
                </div>

                <div className="leaderboard-badges">
                  <h4>Deine Badges</h4>
                  <div className="badges-list">
                    {gamificationStats.badges.map((badge, index) => (
                      <div key={index} className="badge-item">
                        <AwardIcon size={16} />
                        {badge}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Echte Leaderboard-Daten vom Backend */}
              <div className="leaderboard-list">
                <h4>Top {leaderboard.length > 0 ? leaderboard.length : 10} Fahrer</h4>
                {leaderboard.length === 0 ? (
                  <div className="empty-state">Lade Leaderboard...</div>
                ) : (
                  leaderboard.map((driverEntry) => (
                    <div key={driverEntry.rank} className={`leaderboard-entry ${driverEntry.isCurrentUser ? 'current-user' : ''}`}>
                      <div className="rank">#{driverEntry.rank}</div>
                      <div className="driver-info">
                        <div className="driver-name">{driverEntry.name}</div>
                        <div className="driver-level">Level {driverEntry.level}</div>
                      </div>
                      <div className="driver-xp">{driverEntry.xp} XP</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
