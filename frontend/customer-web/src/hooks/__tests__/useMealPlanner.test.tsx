import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { ReactNode } from 'react';
import {
  useMealPlans,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
  useExecuteMealPlan,
  useWeeklyMealPlans,
  useShoppingList
} from '../useMealPlanner';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('useMealPlanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useMealPlans', () => {
    it('should fetch meal plans successfully', async () => {
      const mockMealPlans = [
        {
          id: 'meal-1',
          date: '2024-01-15',
          restaurantId: 'rest-1',
          restaurantName: 'Italian Pizza',
          dishIds: ['dish-1', 'dish-2'],
          dishes: [
            {
              id: 'dish-1',
              name: 'Margherita Pizza',
              price: 12.50,
              image: 'pizza.jpg',
            },
            {
              id: 'dish-2',
              name: 'Caesar Salad',
              price: 8.75,
              image: 'salad.jpg',
            },
          ],
          totalPrice: 21.25,
          notes: 'Family dinner',
          status: 'planned',
          createdAt: '2024-01-10T10:00:00Z',
        },
        {
          id: 'meal-2',
          date: '2024-01-16',
          restaurantId: 'rest-2',
          restaurantName: 'Burger Place',
          dishIds: ['dish-3'],
          dishes: [
            {
              id: 'dish-3',
              name: 'Cheeseburger',
              price: 15.00,
              image: 'burger.jpg',
            },
          ],
          totalPrice: 15.00,
          status: 'executed',
          executedAt: '2024-01-16T19:30:00Z',
          createdAt: '2024-01-12T14:00:00Z',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockMealPlans });

      const { result } = renderHook(() => useMealPlans(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/meal-planner/meals?');
      expect(result.current.data).toEqual(mockMealPlans);
    });
  });

  describe('useCreateMealPlan', () => {
    it('should create meal plan successfully', async () => {
      const mockMealPlan = {
        id: 'meal-1',
        date: '2024-01-15',
        restaurantId: 'rest-1',
        dishIds: ['dish-1'],
        totalPrice: 12.50,
        status: 'planned',
        createdAt: '2024-01-10T10:00:00Z',
      };

      const createData = {
        date: '2024-01-15',
        restaurantId: 'rest-1',
        dishIds: ['dish-1'],
        notes: 'Test meal',
      };

      mockApi.post.mockResolvedValueOnce({ data: mockMealPlan });

      const { result } = renderHook(() => useCreateMealPlan(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/meal-planner/meals', createData);
      expect(result.current.data).toEqual(mockMealPlan);
    });
  });

  describe('useUpdateMealPlan', () => {
    it('should update meal plan successfully', async () => {
      const mockUpdatedMeal = {
        id: 'meal-1',
        date: '2024-01-15',
        restaurantId: 'rest-1',
        dishIds: ['dish-1', 'dish-2'],
        totalPrice: 21.25,
        notes: 'Updated notes',
        status: 'planned',
      };

      const updateData = {
        mealPlanId: 'meal-1',
        updates: {
          dishIds: ['dish-1', 'dish-2'],
          notes: 'Updated notes',
        },
      };

      mockApi.put.mockResolvedValueOnce({ data: mockUpdatedMeal });

      const { result } = renderHook(() => useUpdateMealPlan(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.put).toHaveBeenCalledWith('/meal-planner/meals/meal-1', updateData.updates);
      expect(result.current.data).toEqual(mockUpdatedMeal);
    });
  });

  describe('useDeleteMealPlan', () => {
    it('should delete meal plan successfully', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteMealPlan(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate('meal-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.delete).toHaveBeenCalledWith('/meal-planner/meals/meal-1');
    });
  });

  describe('useExecuteMealPlan', () => {
    it('should execute meal plan successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'confirmed',
        estimatedDeliveryTime: '2024-01-15T20:00:00Z',
        total: 21.25,
        mealPlanId: 'meal-1',
      };

      mockApi.post.mockResolvedValueOnce({ data: mockOrder });

      const { result } = renderHook(() => useExecuteMealPlan(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate('meal-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/meal-planner/meals/meal-1/execute');
      expect(result.current.data).toEqual(mockOrder);
    });
  });

  describe('useWeeklyMealPlans', () => {
    it('should fetch weekly meal plans successfully', async () => {
      const mockWeeklyPlans = {
        weekStart: '2024-01-15',
        weekEnd: '2024-01-21',
        mealPlans: [
          {
            date: '2024-01-15',
            meals: [
              {
                id: 'meal-1',
                restaurantName: 'Italian Pizza',
                totalPrice: 21.25,
                status: 'planned',
              },
            ],
          },
          {
            date: '2024-01-16',
            meals: [],
          },
        ],
        totalPlanned: 21.25,
        totalExecuted: 0,
        savingsFromPlanning: 3.50,
      };

      mockApi.get.mockResolvedValueOnce({ data: mockWeeklyPlans });

      const { result } = renderHook(() => useWeeklyMealPlans('2024-01-15'), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/meal-planner/weekly?weekStart=2024-01-15');
      expect(result.current.data).toEqual(mockWeeklyPlans);
    });
  });

  describe('useShoppingList', () => {
    it('should fetch shopping list successfully', async () => {
      const mockShoppingList = {
        startDate: '2024-01-15',
        endDate: '2024-01-21',
        items: [
          {
            dishName: 'Margherita Pizza',
            quantity: 2,
            totalPrice: 25.00,
            restaurantName: 'Italian Pizza',
            category: 'Main Course',
          },
          {
            dishName: 'Caesar Salad',
            quantity: 1,
            totalPrice: 8.75,
            restaurantName: 'Italian Pizza',
            category: 'Salad',
          },
        ],
        totalItems: 3,
        totalPrice: 33.75,
        estimatedDeliveryFees: 6.50,
        grandTotal: 40.25,
        groupedByRestaurant: {
          'Italian Pizza': [
            {
              dishName: 'Margherita Pizza',
              quantity: 2,
              totalPrice: 25.00,
            },
          ],
        },
      };

      mockApi.get.mockResolvedValueOnce({ data: mockShoppingList });

      const { result } = renderHook(() => useShoppingList('2024-01-15', '2024-01-21'), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/meal-planner/shopping-list?startDate=2024-01-15&endDate=2024-01-21');
      expect(result.current.data).toEqual(mockShoppingList);
    });
  });
});








