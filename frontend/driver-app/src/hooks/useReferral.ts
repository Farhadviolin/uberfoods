import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { isAuthError, isAxiosErrorResponse } from '../utils/errorHandler';

interface Referral {
  id: string;
  code: string;
  referredDriver: {
    id: string;
    name: string;
    email: string;
    joinedAt: string;
  } | null;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  rewardAmount: number;
  earnedAt: string | null;
  createdAt: string;
}

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalRewards: number;
  pendingRewards: number;
  activeReferrals: number;
}

interface ReferralCode {
  code: string;
  referralId: string;
  status: string;
  createdAt: string;
}

export function useReferral() {
  const { driver } = useAuth();
  const queryClient = useQueryClient();

  // Get referral code
  const referralCodeQuery = useQuery({
    queryKey: ['referral-code', driver?.id],
    queryFn: async () => {
      if (!driver?.id) return null;
      try {
        const response = await api.get<ReferralCode>(`/drivers/${driver.id}/referral/code`);
        return response.data;
      } catch (error: unknown) {
        if (isAxiosErrorResponse(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!driver?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  // Get referrals
  const referralsQuery = useQuery({
    queryKey: ['referrals', driver?.id],
    queryFn: async () => {
      if (!driver?.id) return [];
      try {
        const response = await api.get<Referral[]>(`/drivers/${driver.id}/referrals`);
        return response.data;
      } catch (error: unknown) {
        if (isAuthError(error)) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!driver?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Get referral stats
  const statsQuery = useQuery({
    queryKey: ['referral-stats', driver?.id],
    queryFn: async () => {
      if (!driver?.id) return null;
      try {
        const response = await api.get<ReferralStats>(`/drivers/${driver.id}/referrals/stats`);
        return response.data;
      } catch (error: unknown) {
        if (isAxiosErrorResponse(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!driver?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Apply referral code mutation
  const applyReferralCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!driver?.id) throw new Error('Driver not authenticated');
      const response = await api.post(`/drivers/${driver.id}/referrals/apply`, { code });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals', driver?.id] });
      queryClient.invalidateQueries({ queryKey: ['referral-stats', driver?.id] });
    },
  });

  // Claim reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async (referralId: string) => {
      if (!driver?.id) throw new Error('Driver not authenticated');
      const response = await api.post(`/drivers/${driver.id}/referrals/${referralId}/claim`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals', driver?.id] });
      queryClient.invalidateQueries({ queryKey: ['referral-stats', driver?.id] });
    },
  });

  return {
    referralCode: referralCodeQuery.data,
    referrals: referralsQuery.data || [],
    stats: statsQuery.data,
    isLoading: referralCodeQuery.isLoading || referralsQuery.isLoading || statsQuery.isLoading,
    error: referralCodeQuery.error || referralsQuery.error || statsQuery.error,
    refetch: () => {
      referralCodeQuery.refetch();
      referralsQuery.refetch();
      statsQuery.refetch();
    },
    applyReferralCode: applyReferralCodeMutation.mutateAsync,
    claimReward: claimRewardMutation.mutateAsync,
    isApplying: applyReferralCodeMutation.isPending,
    isClaiming: claimRewardMutation.isPending,
  };
}

