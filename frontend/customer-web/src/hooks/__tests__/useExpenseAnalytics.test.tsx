import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { ReactNode } from 'react';
import {
  useExpenseAnalytics,
  useExpenseCategoryBreakdown,
  useExpenseTrends,
  useBudgetAnalysis,
  useSavingsOpportunities
} from '../useExpenseAnalytics';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('useExpenseAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useExpenseAnalytics', () => {
    it('should fetch expense analytics successfully', async () => {
      const mockExpenses = [
        {
          date: '2024-01-01',
          amount: 45.50,
          category: 'Food Delivery',
          restaurant: 'Italian Pizza',
          orderId: 'order-123',
        },
        {
          date: '2024-01-02',
          amount: 32.75,
          category: 'Food Delivery',
          restaurant: 'Burger Place',
          orderId: 'order-124',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockExpenses });

      const { result } = renderHook(() => useExpenseAnalytics('month'), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/expenses/month');
      expect(result.current.data).toEqual(mockExpenses);
    });

    it('should handle expense fetch errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Expense fetch failed'));

      const { result } = renderHook(() => useExpenseAnalytics('week'), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useExpenseCategoryBreakdown', () => {
    it('should fetch category breakdown successfully', async () => {
      const mockBreakdown = [
        {
          category: 'Food Delivery',
          amount: 892.50,
          percentage: 78.5,
          count: 23,
          trend: 'up',
          averageOrder: 38.80,
        },
        {
          category: 'Beverages',
          amount: 156.75,
          percentage: 13.8,
          count: 8,
          trend: 'stable',
          averageOrder: 19.60,
        },
        {
          category: 'Desserts',
          amount: 78.25,
          percentage: 6.9,
          count: 5,
          trend: 'down',
          averageOrder: 15.65,
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockBreakdown });

      const { result } = renderHook(() => useExpenseCategoryBreakdown('month'), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/category-breakdown?period=month');
      expect(result.current.data).toEqual(mockBreakdown);
    });
  });

  describe('useExpenseTrends', () => {
    it('should fetch expense trends successfully', async () => {
      const mockTrends = [
        {
          month: '2024-01',
          amount: 892.50,
          orderCount: 23,
          averageOrderValue: 38.80,
          vsPreviousMonth: 12.5,
          topCategory: 'Food Delivery',
        },
        {
          month: '2024-02',
          amount: 756.25,
          orderCount: 19,
          averageOrderValue: 39.80,
          vsPreviousMonth: -15.3,
          topCategory: 'Food Delivery',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockTrends });

      const { result } = renderHook(() => useExpenseTrends(6), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
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
      const mockAnalysis = {
        monthlyBudget: 500,
        currentSpending: 325.75,
        remainingBudget: 174.25,
        percentageUsed: 65.2,
        projectedSpending: 485.50,
        willExceedBudget: false,
        daysRemaining: 12,
        dailyBudgetRemaining: 14.52,
        recommendations: [
          'You are on track with your budget',
          'Consider ordering smaller portions for the rest of the month',
        ],
        categoryAnalysis: [
          {
            category: 'Food Delivery',
            budget: 400,
            spent: 280.75,
            remaining: 119.25,
            percentage: 70.2,
            status: 'on-track',
          },
        ],
      };

      mockApi.get.mockResolvedValueOnce({ data: mockAnalysis });

      const { result } = renderHook(() => useBudgetAnalysis(500), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/budget-analysis?monthlyBudget=500');
      expect(result.current.data).toEqual(mockAnalysis);
    });
  });

  describe('useSavingsOpportunities', () => {
    it('should fetch savings opportunities successfully', async () => {
      const mockOpportunities = [
        {
          type: 'frequent-restaurant',
          title: 'Loyalty Discount Available',
          description: 'You could save €12.50 with loyalty discounts at Italian Pizza',
          potentialSavings: 12.50,
          restaurant: 'Italian Pizza',
          action: 'Enable loyalty program',
          impact: 'high',
        },
        {
          type: 'bulk-ordering',
          title: 'Group Ordering Savings',
          description: 'Order with friends to save on delivery fees',
          potentialSavings: 8.50,
          action: 'Try group ordering next time',
          impact: 'medium',
        },
        {
          type: 'time-based',
          title: 'Order During Off-Peak Hours',
          description: 'Save €3.25 by ordering during lunch hours instead of dinner',
          potentialSavings: 3.25,
          action: 'Order between 11 AM - 2 PM',
          impact: 'low',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockOpportunities });

      const { result } = renderHook(() => useSavingsOpportunities(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/savings-opportunities');
      expect(result.current.data).toEqual(mockOpportunities);
    });
  });
});








