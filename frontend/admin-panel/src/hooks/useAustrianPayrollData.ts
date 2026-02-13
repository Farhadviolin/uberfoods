import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface PayrollOverview {
  totalGrossSalary: number;
  totalSocialInsurance: number;
  totalIncomeTax: number;
  totalNetSalary: number;
  driverCount: number;
  avgGrossSalary: number;
  avgNetSalary: number;
}

interface Payroll {
  id: string;
  driverName: string;
  month: string;
  grossSalary: number;
  socialInsurance: number;
  incomeTax: number;
  netSalary: number;
  status: string;
}

interface SocialInsurance {
  breakdown: {
    krankenversicherung: number;
    pensionsversicherung: number;
    arbeitslosenversicherung: number;
    unfallversicherung: number;
  };
  total: number;
}

interface ELDAMeldung {
  id: string;
  month: string;
  driverName: string;
  status: string;
  submittedAt: string | null;
  confirmationNumber: string | null;
}

interface PayrollReport {
  id: string;
  name: string;
  type: string;
  period: string;
  createdAt: string;
}

export function useAustrianPayrollData(month: string) {
  // Payroll Overview
  const overviewQuery = useQuery({
    queryKey: ['payroll', 'austrian', 'overview', month],
    queryFn: () =>
      api
        .get<PayrollOverview>(`/accounting/payroll/social-security?period=${month}`)
        .then((res) => res.data)
        .catch(() => ({
          totalGrossSalary: 0,
          totalSocialInsurance: 0,
          totalIncomeTax: 0,
          totalNetSalary: 0,
          driverCount: 0,
          avgGrossSalary: 0,
          avgNetSalary: 0,
        })),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Payrolls
  const payrollsQuery = useQuery({
    queryKey: ['payroll', 'austrian', 'payrolls', month],
    queryFn: () =>
      api
        .get<Payroll[]>(`/accounting/payroll/payslips?period=${month}`)
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // Social Insurance
  const socialInsuranceQuery = useQuery({
    queryKey: ['payroll', 'austrian', 'social-insurance', month],
    queryFn: () =>
      api
        .get<SocialInsurance>(`/accounting/payroll/social-security?period=${month}`)
        .then((res) => res.data)
        .catch(() => ({
          breakdown: {
            krankenversicherung: 0,
            pensionsversicherung: 0,
            arbeitslosenversicherung: 0,
            unfallversicherung: 0,
          },
          total: 0,
        })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // ELDA Meldungen
  const eldaQuery = useQuery({
    queryKey: ['payroll', 'austrian', 'elda', month],
    queryFn: () =>
      api
        .get<ELDAMeldung[]>(`/accounting/payroll/elda-export?period=${month}`)
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Payroll Reports
  const reportsQuery = useQuery({
    queryKey: ['payroll', 'austrian', 'reports'],
    queryFn: () =>
      api
        .get<PayrollReport[]>(`/payroll/austrian/reports`)
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    payrollsQuery.isLoading ||
    socialInsuranceQuery.isLoading ||
    eldaQuery.isLoading ||
    reportsQuery.isLoading;

  const error =
    overviewQuery.error ||
    payrollsQuery.error ||
    socialInsuranceQuery.error ||
    eldaQuery.error ||
    reportsQuery.error;

  return {
    payrollOverview: overviewQuery.data,
    payrolls: payrollsQuery.data || [],
    socialInsurance: socialInsuranceQuery.data,
    eldaMeldungen: eldaQuery.data || [],
    payrollReports: reportsQuery.data || [],
    isLoading,
    error,
    refetch: () => {
      overviewQuery.refetch();
      payrollsQuery.refetch();
      socialInsuranceQuery.refetch();
      eldaQuery.refetch();
      reportsQuery.refetch();
    },
  };
}

