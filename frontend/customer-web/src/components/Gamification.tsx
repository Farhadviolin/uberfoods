import { useState } from 'react';
import { Trophy, Award, Flame, Target, TrendingUp, Star } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { useToast } from '../contexts/ToastContext';
import {
  useUserStats,
  useAchievements,
  useLeaderboard,
  useClaimAchievementReward,
} from '../hooks/useGamification';
import { AxiosErrorWithResponse } from '../types';
import './Gamification.css';

export function Gamification() {
  const { showToast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'achievements' | 'leaderboard' | 'challenges'>('achievements');

  // API Hooks
  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const { data: achievements = [], isLoading: achievementsLoading } = useAchievements();
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useLeaderboard('level', 100);
  const claimRewardMutation = useClaimAchievementReward();
  
  // Fallback: Wenn keine Leaderboard-Daten vorhanden, zeige leere Liste
  const displayLeaderboard = leaderboard && leaderboard.length > 0 ? leaderboard : [];
  const achievementList = achievements.length > 0 ? achievements : userStats?.achievements || [];

  const handleClaimReward = async (rewardId: string) => {
    try {
      await claimRewardMutation.mutateAsync(rewardId);
      showToast('Belohnung eingelöst!', 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || 'Fehler beim Einlösen', 'error');
    }
  };

  const getRarityColor = (rarity: string): string => {
    const colors: Record<string, string> = {
      'common': '#65676B',
      'rare': '#1877F2',
      'epic': '#9C27B0',
      'legendary': '#1877F2'
    };
    return colors[rarity] || colors.common;
  };

  if (statsLoading || achievementsLoading) {
    return (
      <Card variant="elevated" className="gamification-card">
        <div className="gamification-header">
          <Skeleton variant="text" width="180px" height="32px" />
        </div>
        <div className="gamification-stats">
          {[1, 2, 3].map((item) => (
            <div className="stat-item" key={item}>
              <Skeleton variant="text" width="60px" />
              <Skeleton variant="text" width="40px" />
            </div>
          ))}
        </div>
        <Skeleton variant="rectangular" width="100%" height="160px" />
      </Card>
    );
  }

  if (!userStats) {
    return null;
  }

  return (
    <Card variant="elevated" className="gamification-card">
      <div className="gamification-header">
        <div className="gamification-title">
          <Trophy className="gamification-icon" />
          <h3>Gamification</h3>
        </div>
        <div className="user-level">
          <div className="level-badge">Level {userStats.level}</div>
        </div>
      </div>

      <div className="gamification-stats">
        <div className="stat-item">
          <div className="stat-icon-wrapper">
            <Flame className="stat-icon" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{userStats.streak}</span>
            <span className="stat-label">Tage Streak</span>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon-wrapper">
            <Star className="stat-icon" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{userStats.points}</span>
            <span className="stat-label">Punkte</span>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon-wrapper">
            <TrendingUp className="stat-icon" />
          </div>
          <div className="stat-content">
            <span className="stat-value">#{userStats.rank}</span>
            <span className="stat-label">Rang</span>
          </div>
        </div>
      </div>

      <div className="xp-progress">
        <div className="xp-progress-header">
          <span>XP Fortschritt</span>
          <span className="xp-amount">{userStats.xp}/{userStats.xpToNextLevel + userStats.xp} XP</span>
        </div>
        <div className="xp-progress-bar">
          <div
            className="xp-progress-fill"
            style={{ width: `${(userStats.xp / (userStats.xpToNextLevel + userStats.xp)) * 100}%` }}
          />
        </div>
        <div className="xp-next-level">
          Level {userStats.level + 1} in {userStats.xpToNextLevel} XP
        </div>
      </div>

      <div className="gamification-tabs">
        <button
          className={`gamification-tab ${selectedTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setSelectedTab('achievements')}
        >
          <Award className="tab-icon" />
          Achievements
        </button>
        <button
          className={`gamification-tab ${selectedTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setSelectedTab('leaderboard')}
        >
          <TrendingUp className="tab-icon" />
          Leaderboard
        </button>
        <button
          className={`gamification-tab ${selectedTab === 'challenges' ? 'active' : ''}`}
          onClick={() => setSelectedTab('challenges')}
        >
          <Target className="tab-icon" />
          Challenges
        </button>
      </div>

      <div className="gamification-content">
        {selectedTab === 'achievements' && (
          <div className="achievements-list">
            {achievementList.map((achievement) => (
              <div
                key={achievement.id}
                className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                style={{ borderColor: getRarityColor(achievement.rarity || 'common') }}
              >
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-info">
                  <div className="achievement-header">
                    <h4>{achievement.title}</h4>
                    <span className={`achievement-rarity rarity-${achievement.rarity || 'common'}`}>
                      {achievement.rarity || 'common'}
                    </span>
                  </div>
                  <p>{achievement.description}</p>
                  <div className="achievement-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((achievement.progress || 0) / (achievement.maxProgress || 100)) * 100}%`,
                  background: getRarityColor(achievement.rarity || 'common')
                        }}
                      />
                    </div>
            <span className="progress-text">
              {(achievement.progress || 0)}/{(achievement.maxProgress || 100)}
                    </span>
                  </div>
                  {achievement.unlocked && (
                    <div className="achievement-reward">
                      <Trophy className="reward-icon" />
                      <span>{achievement.reward?.description || 'XP Bonus'}</span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleClaimReward(achievement.id)}
                        disabled={claimRewardMutation.isPending}
                      >
                        Einlösen
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'leaderboard' && (
          <div className="leaderboard">
            <div className="leaderboard-header">
              <h4>Top Foodies</h4>
              {userStats && (
                <span className="your-rank">Dein Rang: #{userStats.level || 'N/A'}</span>
              )}
            </div>
            {leaderboardLoading ? (
              <div style={{ padding: '2rem' }}>
                <Skeleton variant="rectangular" width="100%" height="60px" />
                <Skeleton variant="rectangular" width="100%" height="60px" />
                <Skeleton variant="rectangular" width="100%" height="60px" />
              </div>
            ) : displayLeaderboard.length === 0 ? (
              <div className="empty-state">
                <p>Noch keine Leaderboard-Daten verfügbar</p>
              </div>
            ) : (
              <div className="leaderboard-list">
                {displayLeaderboard.map((entry) => (
                  <div key={entry.user.id} className="leaderboard-item">
                    <div className="leaderboard-position">
                      {entry.rank === 1 && '🥇'}
                      {entry.rank === 2 && '🥈'}
                      {entry.rank === 3 && '🥉'}
                      {entry.rank > 3 && `#${entry.rank}`}
                    </div>
                    <div className="leaderboard-user">
                      <div className="user-avatar">
                        {entry.user.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="user-info">
                        <span className="user-name">{entry.user.name}</span>
                        <span className="user-stats">
                          {entry.stats.totalXP || entry.stats.xp || 0} XP
                        </span>
                      </div>
                    </div>
                    <div className="leaderboard-level">Level {entry.stats.level || 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'challenges' && (
          <div className="challenges">
            <div className="challenge-item">
              <Target className="challenge-icon" />
              <div className="challenge-info">
                <h4>Neue Restaurants entdecken</h4>
                <p>Probiere 5 neue Restaurants diese Woche</p>
                <div className="challenge-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '40%' }} />
                  </div>
                  <span>2/5 abgeschlossen</span>
                </div>
                <Button variant="secondary" size="sm">
                  Challenge starten
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

