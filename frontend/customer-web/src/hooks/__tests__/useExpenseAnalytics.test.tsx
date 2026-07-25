import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useExpenseAnalytics,
  useExpenseCategoryBreakdown,
  useExpenseTrends,
  useBudgetAnalysis,
  useSavingsOpportunities,
  type BudgetAnalysis,
  type CategoryBreakdown,
  type ExpenseSummary,
  type SavingsOpportunity,
  type SpendingTrends,
} from '../useExpenseAnalytics';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

const createWrapper = (initialAuthState: {
  user: { id: string; email: string } | null;
  token: string | null;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialAuthState={initialAuthState}>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('useExpenseAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useExpenseAnalytics', () => {
    it('should fetch expense analytics successfully', async () => {
      const mockExpenses: ExpenseSummary = {
        period: {
          type: 'month',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
        summary: {
          totalSpent: 78.25,
          totalOrders: 2,
          averageOrderValue: 39.125,
          spendingChangePercent: 5.2,
          orderChangePercent: 0,
        },
        expensesByDate: [
          { date: '2024-01-01', amount: 45.50 },
          { date: '2024-01-02', amount: 32.75 },
        ],
        expensesByCategory: [
          { category: 'Food Delivery', amount: 78.25, percentage: 100 },
        ],
        expensesByRestaurant: [
          {
            restaurantId: 'restaurant-1',
            restaurantName: 'Italian Pizza',
            amount: 45.50,
            orders: 1,
            averageOrderValue: 45.50,
            percentage: 58.15,
          },
        ],
        orderStats: {
          mostExpensiveOrder: {
            id: 'order-123',
            amount: 45.50,
            restaurant: 'Italian Pizza',
            date: '2024-01-01',
          },
        },
        recentOrders: [
          {
            id: 'order-124',
            amount: 32.75,
            restaurant: 'Burger Place',
            date: '2024-01-02',
            itemCount: 2,
          },
        ],
      };
      const originalExpenses = JSON.parse(JSON.stringify(mockExpenses)) as ExpenseSummary;

      mockApi.get.mockResolvedValueOnce({ data: mockExpenses });

      const { result } = renderHook(() => useExpenseAnalytics('month'), {
        wrapper: createWrapper({ user: { id: '1', email: 'expense@example.com' }, token: 'token' }),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/expenses/month');
      expect(result.current.data).toEqual(mockExpenses);
      expect(mockExpenses).toEqual(originalExpenses);
    });

    it('should handle expense fetch errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Expense fetch failed'));

      const { result } = renderHook(() => useExpenseAnalytics('week'), {
        wrapper: createWrapper({ user: { id: '1', email: 'expense@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should remain idle without authentication', () => {
      const { result } = renderHook(() => useExpenseAnalytics('year'), {
        wrapper: createWrapper({ user: null, token: null }),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('should return null for authentication errors', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });

      const { result } = renderHook(() => useExpenseAnalytics('month'), {
        wrapper: createWrapper({ user: { id: '1', email: 'expense@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useExpenseCategoryBreakdown', () => {
    it('should fetch category breakdown successfully', async () => {
      const mockBreakdown: CategoryBreakdown[] = [
        {
          category: 'Food Delivery',
          amount: 892.50,
          percentage: 78.5,
        },
        {
          category: 'Beverages',
          amount: 156.75,
          percentage: 13.8,
        },
        {
          category: 'Desserts',
          amount: 78.25,
          percentage: 6.9,
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockBreakdown });

      const { result } = renderHook(() => useExpenseCategoryBreakdown('month'), {
        wrapper: createWrapper({ user: { id: '1', email: 'expense@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/category-breakdown?period=month');
      expect(result.current.data).toEqual(mockBreakdown);
    });

    it('should return an empty category breakdown', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(() => useExpenseCategoryBreakdown('week'), {
        wrapper: createWrapper({ user: { id: '1', email: 'expense@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useExpenseTrends', () => {
    it('should fetch expense trends successfully', async () => {
      const mockTrends: SpendingTrends[] = [
        {
          month: '2024-01',
          amount: 892.50,
          orders: 23,
          averageOrderValue: 38.80,
        },
        {
          month: '2024-02',
          amount: 756.25,
          orders: 19,
          averageOrderValue: 39.80,
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockTrends });

      const { result } = renderHook(() => useExpenseTrends(6), {
        wrapper: createWrapper({ user: { id: '1', email: 'expense@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/spending-trends?months=6');
      expect(result.current.data).toEqual(mockTrends);
    });
  });

  describe('useBudgetAnalysis', () => {
    it('should perform budget analysis successfully', async () => {
      const mockAnalysis: BudgetAnalysis = {
        monthlyBudget: 500,
        currentSpent: 325.75,
        remainingBudget: 174.25,
        budgetUsedPercent: 65.2,
        projectedSpending: 485.50,
        projectedOverspend: 0,
        daysRemaining: 12,
        dailyAverage: 10.86,
        status: 'on_track',
      };

      mockApi.get.mockResolvedValueOnce({ data: mockAnalysis });

      const { result } = renderHook(() => useBudgetAnalysis(500), {
        wrapper: createWrapper({ user: { id: '1', email: 'expense@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/budget-analysis?monthlyBudget=500');
      expect(result.current.data).toEqual(mockAnalysis);
    });

    it('should not request budget analysis for a non-positive budget', () => {
      const { result } = renderHook(() => useBudgetAnalysis(0), {
        wrapper: createWrapper({ user: { id: '1', email: 'expense@example.com' }, token: 'token' }),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('useSavingsOpportunities', () => {
    it('should fetch savings opportunities successfully', async () => {
      const mockOpportunities: SavingsOpportunity[] = [
        {
          type: 'frequent-restaurant',
          title: 'Loyalty Discount Available',
          description: 'You could save €12.50 with loyalty discounts at Italian Pizza',
          potentialSavings: 12.50,
          impact: 'high',
        },
        {
          type: 'bulk-ordering',
          title: 'Group Ordering Savings',
          description: 'Order with friends to save on delivery fees',
          potentialSavings: 8.50,
          impact: 'medium',
        },
        {
          type: 'time-based',
          title: 'Order During Off-Peak Hours',
          description: 'Save €3.25 by ordering during lunch hours instead of dinner',
          potentialSavings: 3.25,
          impact: 'low',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockOpportunities });

      const { result } = renderHook(() => useSavingsOpportunities(), {
        wrapper: createWrapper({ user: { id: '1', email: 'expense@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/savings-opportunities');
      expect(result.current.data).toEqual(mockOpportunities);
    });
  });
});








