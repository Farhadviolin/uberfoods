import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AxiosErrorWithResponse } from '../types';

export interface ExpenseSummary {
  period: {
    type: 'week' | 'month' | 'year';
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSpent: number;
    totalOrders: number;
    averageOrderValue: number;
    spendingChangePercent: number;
    orderChangePercent: number;
  };
  expensesByDate: Array<{
    date: string;
    amount: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  expensesByRestaurant: Array<{
    restaurantId: string;
    restaurantName: string;
    amount: number;
    orders: number;
    averageOrderValue: number;
    percentage: number;
  }>;
  orderStats: {
    mostExpensiveOrder?: {
      id: string;
      amount: number;
      restaurant: string;
      date: string;
    };
    cheapestOrder?: {
      id: string;
      amount: number;
      restaurant: string;
      date: string;
    };
  };
  recentOrders: Array<{
    id: string;
    amount: number;
    restaurant: string;
    date: string;
    itemCount: number;
  }>;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface SpendingTrends {
  month: string;
  orders: number;
  amount: number;
  averageOrderValue: number;
}

export interface BudgetAnalysis {
  monthlyBudget: number;
  currentSpent: number;
  remainingBudget: number;
  budgetUsedPercent: number;
  daysRemaining: number;
  dailyAverage: number;
  projectedSpending: number;
  projectedOverspend: number;
  status: 'on_track' | 'warning' | 'over_budget';
}

export interface SavingsOpportunity {
  type: string;
  title: string;
  description: string;
  potentialSavings: number;
  impact: 'high' | 'medium' | 'low';
}

// Expense Analytics laden
export function useExpenseAnalytics(period: 'week' | 'month' | 'year' = 'month') {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['analytics', 'expenses', period],
    queryFn: async () => {
      if (!isAuthenticated) {
        return null;
      }
      try {
        const response = await api.get(`/analytics/expenses/${period}`);
        return response.data as ExpenseSummary;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}

// Category Breakdown laden
export function useExpenseCategoryBreakdown(period: 'week' | 'month' | 'year' = 'month') {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['analytics', 'category-breakdown', period],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }
      try {
        const response = await api.get(`/analytics/category-breakdown?period=${period}`);
        return (response.data || []) as CategoryBreakdown[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}

// Spending Trends laden
export function useExpenseTrends(months: number = 6) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['analytics', 'spending-trends', months],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }
      try {
        const response = await api.get(`/analytics/spending-trends?months=${months}`);
        return (Array.isArray(response.data) ? response.data : []) as SpendingTrends[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}

// Budget Analysis laden
export function useBudgetAnalysis(monthlyBudget: number) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['analytics', 'budget-analysis', monthlyBudget],
    queryFn: async () => {
      if (!isAuthenticated) {
        return null;
      }
      try {
        const response = await api.get(`/analytics/budget-analysis?monthlyBudget=${monthlyBudget}`);
        return response.data as BudgetAnalysis;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: isAuthenticated && monthlyBudget > 0,
    retry: false,
  });
}

// Savings Opportunities laden
export function useSavingsOpportunities() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['analytics', 'savings-opportunities'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }
      try {
        const response = await api.get('/analytics/savings-opportunities');
        return (Array.isArray(response.data) ? response.data : []) as SavingsOpportunity[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}