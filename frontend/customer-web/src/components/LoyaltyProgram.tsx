import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLoyaltyPoints, useLoyaltyHistory, useRewards, useRedeemReward, useReferralCode, useReferralStats, useApplyReferralCode } from '../hooks/useLoyalty';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { AnimatedNumber } from './AnimatedNumber';
import { Copy, Gift, TrendingUp, Award, Users, Star } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { AxiosErrorWithResponse } from '../types';
import './LoyaltyProgram.css';

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
};

export function LoyaltyProgram() {
  const { t, i18n } = useTranslation();
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const { showToast } = useToast();

  const getTierName = (tier: string) => {
    return t(`loyalty.${tier.toLowerCase()}`) || tier;
  };

  const { data: points, isLoading: pointsLoading } = useLoyaltyPoints();
  const { data: history, isLoading: historyLoading } = useLoyaltyHistory();
  const { data: rewards, isLoading: rewardsLoading } = useRewards();
  const { data: referralCode } = useReferralCode();
  const { data: referralStats } = useReferralStats();
  const redeemMutation = useRedeemReward();
  const applyReferralMutation = useApplyReferralCode();

  const handleCopyReferralCode = async () => {
    if (!referralCode?.code) return;
    try {
      await navigator.clipboard.writeText(referralCode.code);
      showToast(t('loyalty.referralCopied'), 'success');
    } catch {
      showToast(t('loyalty.referralCopyError'), 'error');
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    try {
      const result = await redeemMutation.mutateAsync(rewardId);
      showToast(t('loyalty.rewardRedeemed', { name: result.reward.name }), 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('loyalty.redeemError'), 'error');
    }
  };

  const handleApplyReferralCode = async () => {
    if (!referralCodeInput.trim()) {
      showToast(t('loyalty.enterReferralCodeError'), 'error');
      return;
    }

    try {
      const result = await applyReferralMutation.mutateAsync(referralCodeInput);
      showToast(t('loyalty.referralCodeApplied', { points: result.points }), 'success');
      setReferralCodeInput('');
      setShowReferralModal(false);
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('loyalty.applyReferralError'), 'error');
    }
  };

  if (pointsLoading) {
    return (
      <div className="loyalty-program">
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="rectangular" width="100%" height="200px" />
      </div>
    );
  }

  if (!points) {
    return (
      <Card variant="elevated" className="loyalty-program-empty">
        <p>{t('loyalty.pleaseLogin')}</p>
      </Card>
    );
  }

  const tierColor = TIER_COLORS[points.tier] || TIER_COLORS.BRONZE;
  const tierName = getTierName(points.tier);
  const progressPercentage = points.nextTier
    ? Math.min(100, ((points.totalSpent / (points.totalSpent + points.pointsToNextTier)) * 100))
    : 100;

  return (
    <div className="loyalty-program">
      <div className="loyalty-header">
        <h2>{t('loyalty.title')}</h2>
        <div className="loyalty-tier-badge" style={{ borderColor: tierColor }}>
          <Award size={24} style={{ color: tierColor }} />
          <span style={{ color: tierColor }}>{tierName}</span>
        </div>
      </div>

      <div className="loyalty-stats-grid">
        <Card variant="elevated" className="loyalty-stat-card">
          <div className="stat-icon" style={{ backgroundColor: `${tierColor}20` }}>
            <Star size={24} style={{ color: tierColor }} />
          </div>
          <div className="stat-content">
            <h3>{t('loyalty.points')}</h3>
            <div className="stat-value">
              <AnimatedNumber value={points.points} decimals={0} />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="loyalty-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#1877F220' }}>
            <TrendingUp size={24} color="#1877F2" />
          </div>
          <div className="stat-content">
            <h3>{t('loyalty.totalSpent')}</h3>
            <div className="stat-value">
              <AnimatedNumber value={points.totalSpent} decimals={2} prefix="€" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="loyalty-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#10B98120' }}>
            <Gift size={24} color="#10B981" />
          </div>
          <div className="stat-content">
            <h3>{t('loyalty.orders')}</h3>
            <div className="stat-value">
              <AnimatedNumber value={points.totalOrders} decimals={0} />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="loyalty-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#F59E0B20' }}>
            <Award size={24} color="#F59E0B" />
          </div>
          <div className="stat-content">
            <h3>{t('loyalty.streak')}</h3>
            <div className="stat-value">
              <AnimatedNumber value={points.streakDays} decimals={0} suffix={` ${t('loyalty.days')}`} />
            </div>
          </div>
        </Card>
      </div>

      {points.nextTier && (
        <Card variant="elevated" className="tier-progress-card">
          <div className="tier-progress-header">
            <h3>{t('loyalty.nextLevel', { tier: getTierName(points.nextTier) })}</h3>
            <span className="tier-progress-text">
              {t('loyalty.pointsToNextLevel', { amount: points.pointsToNextTier.toFixed(2) })}
            </span>
          </div>
          <div className="tier-progress-bar">
            <div
              className="tier-progress-fill"
              style={{
                width: `${progressPercentage}%`,
                backgroundColor: TIER_COLORS[points.nextTier] || tierColor,
              }}
            />
          </div>
        </Card>
      )}

      <div className="loyalty-sections">
        <Card variant="elevated" className="loyalty-section">
          <div className="section-header">
            <h3>{t('loyalty.availableRewards')}</h3>
          </div>
          {rewardsLoading ? (
            <div className="rewards-loading">
              <Skeleton variant="rectangular" width="100%" height="100px" />
              <Skeleton variant="rectangular" width="100%" height="100px" />
            </div>
          ) : rewards && rewards.length > 0 ? (
            <div className="rewards-grid">
              {rewards.map((reward) => (
                <Card
                  key={reward.id}
                  variant="outlined"
                  className={`reward-card ${reward.canRedeem ? 'can-redeem' : 'cannot-redeem'}`}
                >
                  <div className="reward-header">
                    <h4>{reward.name}</h4>
                    <div className="reward-cost">
                      <Star size={16} />
                      {t('loyalty.pointsCost', { points: reward.pointsCost })}
                    </div>
                  </div>
                  {reward.description && <p className="reward-description">{reward.description}</p>}
                  {reward.discount && (
                    <div className="reward-discount">
                      {reward.discountType === 'PERCENTAGE' ? t('loyalty.discount', { amount: reward.discount }) : t('loyalty.discountFixed', { amount: reward.discount })}
                    </div>
                  )}
                  <Button
                    variant={reward.canRedeem ? 'primary' : 'secondary'}
                    size="sm"
                    fullWidth
                    onClick={() => handleRedeemReward(reward.id)}
                    disabled={!reward.canRedeem || redeemMutation.isPending}
                  >
                    {redeemMutation.isPending ? t('loyalty.redeeming') : t('loyalty.redeem')}
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>{t('loyalty.noRewards')}</p>
            </div>
          )}
        </Card>

        <Card variant="elevated" className="loyalty-section">
          <div className="section-header">
            <h3>{t('loyalty.pointsHistory')}</h3>
          </div>
          {historyLoading ? (
            <div className="history-loading">
              <Skeleton variant="text" width="100%" height="40px" />
              <Skeleton variant="text" width="100%" height="40px" />
            </div>
          ) : history && history.length > 0 ? (
            <div className="points-history">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-item-main">
                    <div className="history-type">
                      {item.type === 'EARNED' && <TrendingUp size={16} color="#10B981" />}
                      {item.type === 'REDEEMED' && <Gift size={16} color="#EF4444" />}
                      {item.type === 'REFERRAL' && <Users size={16} color="#3B82F6" />}
                      <span className="history-type-label">{item.type}</span>
                    </div>
                    <div className={`history-points ${item.points > 0 ? 'positive' : 'negative'}`}>
                      {item.points > 0 ? '+' : ''}
                      {item.points.toFixed(0)}
                    </div>
                  </div>
                  {item.description && (
                    <div className="history-description">{item.description}</div>
                  )}
                  <div className="history-date">
                    {new Date(item.createdAt).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>{t('loyalty.noHistory')}</p>
            </div>
          )}
        </Card>

        <Card variant="elevated" className="loyalty-section">
          <div className="section-header">
            <h3>{t('loyalty.referFriends')}</h3>
          </div>
          {referralCode ? (
            <div className="referral-section">
              <div className="referral-code-display">
                <div className="referral-code">
                  <code>{referralCode.code}</code>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Copy size={16} />}
                    iconPosition="left"
                    onClick={handleCopyReferralCode}
                    className="copy-btn"
                  >
                    {t('loyalty.copy')}
                  </Button>
                </div>
                <p className="referral-description">
                  {t('loyalty.referralDescription')}
                </p>
              </div>
              {referralStats && (
                <div className="referral-stats">
                  <div className="referral-stat">
                    <span className="stat-label">{t('loyalty.referredFriends')}</span>
                    <span className="stat-value">{referralStats.completedReferrals || 0}</span>
                  </div>
                  <div className="referral-stat">
                    <span className="stat-label">{t('loyalty.pointsEarned')}</span>
                    <span className="stat-value">{referralStats.totalPointsEarned || 0}</span>
                  </div>
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowReferralModal(true)}
                className="apply-referral-btn"
              >
                {t('loyalty.applyReferralCode')}
              </Button>
            </div>
          ) : (
            <div className="empty-state">
              <p>{t('loyalty.referralCodeLoading')}</p>
            </div>
          )}
        </Card>
      </div>

      {showReferralModal && (
        <div className="modal-overlay" onClick={() => setShowReferralModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('loyalty.applyReferralTitle')}</h3>
            <input
              type="text"
              value={referralCodeInput}
              onChange={(e) => setReferralCodeInput(e.target.value)}
              placeholder={t('loyalty.enterReferralCode')}
              className="referral-input"
            />
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setShowReferralModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleApplyReferralCode}
                disabled={applyReferralMutation.isPending}
              >
                {applyReferralMutation.isPending ? t('loyalty.applying') : t('common.apply')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

