import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { Users, Gift, Copy, Check, Share2, TrendingUp } from 'lucide-react';
import { AxiosErrorWithResponse } from '../types';
import './ReferralProgram.css';

interface ReferralStats {
  code: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  rewards: Array<{
    id: string;
    name: string;
    description: string;
    points: number;
  }>;
}

interface ReferralCodeResponse {
  code: string;
}

interface ReferralStatsResponse {
  totalReferrals: number;
  completedReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  referrals: Array<{
    id: string;
    referredUserId: string;
    status: string;
    createdAt: string;
  }>;
}

export function ReferralProgram() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  const [copied, setCopied] = useState(false);

  // Backend-Integration: Lade Referral Code
  const { data: referralCodeData, isLoading: codeLoading } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!isAuthenticated || !user?.id) {
        return null;
      }
      try {
        const response = await api.get<ReferralCodeResponse>('/customers/me/loyalty/referral');
        return response.data;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        // Fallback: Generiere Code aus User-ID
        return {
          code: `REF-${user.id.slice(0, 8).toUpperCase()}`,
        };
      }
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 Minuten
  });

  // Backend-Integration: Lade Referral Stats
  const { data: referralStatsData, isLoading: statsLoading } = useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!isAuthenticated || !user?.id) {
        return null;
      }
      try {
        const response = await api.get<ReferralStatsResponse>('/customers/me/loyalty/referral/stats');
        return response.data;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        // Fallback: Leere Stats
        return {
          totalReferrals: 0,
          completedReferrals: 0,
          activeReferrals: 0,
          totalEarnings: 0,
          pendingRewards: 0,
          referrals: [],
        };
      }
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });

  const referralCode = referralCodeData?.code || (user?.id ? `REF-${user.id.slice(0, 8).toUpperCase()}` : '');
  const stats: ReferralStats = {
    code: referralCode,
    totalReferrals: referralStatsData?.totalReferrals || 0,
    activeReferrals: referralStatsData?.activeReferrals || referralStatsData?.completedReferrals || 0,
    totalEarnings: referralStatsData?.totalEarnings || 0,
    pendingEarnings: referralStatsData?.pendingRewards || 0,
    rewards: [], // Rewards kommen aus Loyalty-System
  };

  const loading = codeLoading || statsLoading;

  const handleCopyCode = async () => {
    if (!referralCode) return;

    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      showToast(t('referral.codeCopied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast(t('referral.copyError'), 'error');
    }
  };

  const handleShare = async () => {
    const shareText = t('referral.shareText', { code: referralCode });
    const shareUrl = `${window.location.origin}/register?ref=${referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('referral.shareTitle'),
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        showToast(t('referral.linkCopied'), 'success');
      } catch (err) {
        showToast(t('referral.copyError'), 'error');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (!user) {
    return (
      <div className="referral-container">
        <Card>
          <div className="referral-empty">
            <Users size={48} />
            <h2>{t('referral.title')}</h2>
            <p>{t('referral.pleaseLogin')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="referral-container">
      <div className="referral-header">
        <div>
          <h1>{t('referral.title')}</h1>
          <p>{t('referral.subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="referral-skeleton">
          <Skeleton variant="rectangular" width="100%" height="200px" />
          <Skeleton variant="rectangular" width="100%" height="150px" />
        </div>
      ) : (
        <>
          <Card className="referral-code-card">
            <div className="referral-code-header">
              <div>
                <h2>{t('referral.yourCode')}</h2>
                <p>{t('referral.codeDescription')}</p>
              </div>
              <Gift size={32} className="referral-icon" />
            </div>
            <div className="referral-code-display">
              <code className="referral-code">{referralCode}</code>
              <div className="referral-code-actions">
                <Button
                  onClick={handleCopyCode}
                  variant={copied ? 'success' : 'outline'}
                  size="small"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t('referral.copied') : t('referral.copy')}
                </Button>
                <Button onClick={handleShare} variant="primary" size="small">
                  <Share2 size={16} />
                  {t('referral.share')}
                </Button>
              </div>
            </div>
          </Card>

          <div className="referral-stats-grid">
            <Card className="referral-stat-card">
              <div className="referral-stat-header">
                <Users size={24} />
                <h3>{t('referral.totalReferrals')}</h3>
              </div>
              <div className="referral-stat-value">{stats?.totalReferrals || 0}</div>
              <p className="referral-stat-label">{t('referral.totalReferralsDesc')}</p>
            </Card>

            <Card className="referral-stat-card">
              <div className="referral-stat-header">
                <TrendingUp size={24} />
                <h3>{t('referral.activeReferrals')}</h3>
              </div>
              <div className="referral-stat-value">{stats?.activeReferrals || 0}</div>
              <p className="referral-stat-label">{t('referral.activeReferralsDesc')}</p>
            </Card>

            <Card className="referral-stat-card">
              <div className="referral-stat-header">
                <Gift size={24} />
                <h3>{t('referral.totalEarnings')}</h3>
              </div>
              <div className="referral-stat-value">{formatCurrency(stats?.totalEarnings || 0)}</div>
              <p className="referral-stat-label">{t('referral.totalEarningsDesc')}</p>
            </Card>

            <Card className="referral-stat-card">
              <div className="referral-stat-header">
                <Gift size={24} />
                <h3>{t('referral.pendingEarnings')}</h3>
              </div>
              <div className="referral-stat-value">{formatCurrency(stats?.pendingEarnings || 0)}</div>
              <p className="referral-stat-label">{t('referral.pendingEarningsDesc')}</p>
            </Card>
          </div>

          <Card className="referral-how-it-works">
            <h2>{t('referral.howItWorks')}</h2>
            <div className="referral-steps">
              <div className="referral-step">
                <div className="referral-step-number">1</div>
                <div>
                  <h3>{t('referral.step1.title')}</h3>
                  <p>{t('referral.step1.description')}</p>
                </div>
              </div>
              <div className="referral-step">
                <div className="referral-step-number">2</div>
                <div>
                  <h3>{t('referral.step2.title')}</h3>
                  <p>{t('referral.step2.description')}</p>
                </div>
              </div>
              <div className="referral-step">
                <div className="referral-step-number">3</div>
                <div>
                  <h3>{t('referral.step3.title')}</h3>
                  <p>{t('referral.step3.description')}</p>
                </div>
              </div>
            </div>
          </Card>

          {stats && stats.rewards.length > 0 && (
            <Card className="referral-rewards">
              <h2>{t('referral.availableRewards')}</h2>
              <div className="referral-rewards-list">
                {stats.rewards.map((reward) => (
                  <div key={reward.id} className="referral-reward-item">
                    <Gift size={20} />
                    <div>
                      <h4>{reward.name}</h4>
                      <p>{reward.description}</p>
                    </div>
                    <Badge variant="primary" size="small">
                      {reward.points} {t('referral.points')}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

