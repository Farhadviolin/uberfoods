import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  reach: number;
  conversions: number;
}

interface EmailStats {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface PushStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

interface LoyaltyProgram {
  activeMembers: number;
  totalPoints: number;
  redeemedPoints: number;
  totalValue: number;
  pointsPerEuro: number;
  minOrderValue: number;
  pointsForRedemption: number;
  discountPer100Points: number;
}

interface MarketingAnalytics {
  roi: number;
  totalSpent: number;
  totalRevenue: number;
  avgConversionRate: number;
  campaignPerformance: Array<{
    name: string;
    conversionRate: number;
  }>;
}

export function useMarketingData() {
  // Campaigns
  const campaignsQuery = useQuery({
    queryKey: ['marketing', 'campaigns'],
    queryFn: () =>
      api
        .get<Campaign[]>('/marketing/campaigns')
        .then((res) => extractData<Campaign[] | { data: Campaign[] }>(res.data) || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Email Stats
  const emailQuery = useQuery({
    queryKey: ['marketing', 'email'],
    queryFn: () =>
      api
        .get<EmailStats>('/marketing/email/stats')
        .then((res) => extractData<EmailStats>(res.data))
        .catch(() => ({
          sent: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
        })),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // Push Stats
  const pushQuery = useQuery({
    queryKey: ['marketing', 'push'],
    queryFn: () =>
      api
        .get<PushStats>('/marketing/push/stats')
        .then((res) => extractData<PushStats>(res.data))
        .catch(() => ({
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
        })),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // Loyalty Program
  const loyaltyQuery = useQuery({
    queryKey: ['marketing', 'loyalty'],
    queryFn: () =>
      api
        .get<LoyaltyProgram>('/marketing/loyalty')
        .then((res) => extractData<LoyaltyProgram>(res.data))
        .catch(() => ({
          activeMembers: 0,
          totalPoints: 0,
          redeemedPoints: 0,
          totalValue: 0,
          pointsPerEuro: 0,
          minOrderValue: 0,
          pointsForRedemption: 0,
          discountPer100Points: 0,
        })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Marketing Analytics
  const analyticsQuery = useQuery({
    queryKey: ['marketing', 'analytics'],
    queryFn: () =>
      api
        .get<MarketingAnalytics>('/marketing/analytics')
        .then((res) => extractData<MarketingAnalytics>(res.data))
        .catch(() => ({
          roi: 0,
          totalSpent: 0,
          totalRevenue: 0,
          avgConversionRate: 0,
          campaignPerformance: [],
        })),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isLoading =
    campaignsQuery.isLoading ||
    emailQuery.isLoading ||
    pushQuery.isLoading ||
    loyaltyQuery.isLoading ||
    analyticsQuery.isLoading;

  const error =
    campaignsQuery.error ||
    emailQuery.error ||
    pushQuery.error ||
    loyaltyQuery.error ||
    analyticsQuery.error;

  return {
    campaigns: campaignsQuery.data || [],
    emailStats: emailQuery.data,
    pushStats: pushQuery.data,
    loyaltyProgram: loyaltyQuery.data,
    marketingAnalytics: analyticsQuery.data,
    isLoading,
    error,
    refetch: () => {
      campaignsQuery.refetch();
      emailQuery.refetch();
      pushQuery.refetch();
      loyaltyQuery.refetch();
      analyticsQuery.refetch();
    },
  };
}

