import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: string;
  status: string;
  userCount: number;
  createdAt: string;
}

interface WhitelabelConfig {
  id: string;
  tenantName: string;
  companyName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
}

interface BillingInfo {
  activeTenants: number;
  monthlyRevenue: number;
  avgPlanValue: number;
  churnRate: number;
}

export function useMultiTenancyData() {
  // Tenants
  const tenantsQuery = useQuery({
    queryKey: ['multi-tenancy', 'tenants'],
    queryFn: () =>
      api
        .get<Tenant[]>('/multi-tenancy/tenants')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Whitelabel Configs
  const whitelabelQuery = useQuery({
    queryKey: ['multi-tenancy', 'whitelabel'],
    queryFn: () =>
      api
        .get<WhitelabelConfig[]>('/multi-tenancy/whitelabel')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Billing Info
  const billingQuery = useQuery({
    queryKey: ['multi-tenancy', 'billing'],
    queryFn: () =>
      api
        .get<BillingInfo>('/multi-tenancy/billing')
        .then((res) => res.data)
        .catch(() => ({
          activeTenants: 0,
          monthlyRevenue: 0,
          avgPlanValue: 0,
          churnRate: 0,
        })),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isLoading =
    tenantsQuery.isLoading ||
    whitelabelQuery.isLoading ||
    billingQuery.isLoading;

  const error =
    tenantsQuery.error ||
    whitelabelQuery.error ||
    billingQuery.error;

  return {
    tenants: tenantsQuery.data || [],
    whitelabelConfigs: whitelabelQuery.data || [],
    billingInfo: billingQuery.data,
    isLoading,
    error,
    refetch: () => {
      tenantsQuery.refetch();
      whitelabelQuery.refetch();
      billingQuery.refetch();
    },
  };
}

