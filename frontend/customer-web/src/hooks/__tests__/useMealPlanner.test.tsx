import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useMealPlans,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
  useExecuteMealPlan,
  useWeeklyMealPlans,
  useShoppingList,
  type CreateMealPlanData,
  type MealPlan,
  type ShoppingList,
  type WeeklyMealPlan,
} from '../useMealPlanner';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

const createWrapper = (initialAuthState: {
  user: { id: string; email: string } | null;
  token: string | null;
}, exposeQueryClient?: (queryClient: QueryClient) => void) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
  exposeQueryClient?.(queryClient);

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialAuthState={initialAuthState}>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

const authenticatedState = {
  user: { id: '1', email: 'meal-planner@example.com' },
  token: 'token',
};

const createMockMealPlan = (overrides: Partial<MealPlan> = {}): MealPlan => ({
  id: 'meal-1',
  customerId: 'customer-1',
  date: '2024-01-15',
  restaurantId: 'rest-1',
  dishIds: ['dish-1'],
  isExecuted: false,
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-10T10:00:00Z',
  ...overrides,
});

describe('useMealPlanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.put.mockReset();
    mockApi.delete.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useMealPlans', () => {
    it('should fetch meal plans successfully', async () => {
      const mockMealPlans: MealPlan[] = [
        createMockMealPlan({
          dishIds: ['dish-1', 'dish-2'],
          dishes: [
            {
              id: 'dish-1',
              name: 'Margherita Pizza',
              price: 12.50,
              imageUrl: 'pizza.jpg',
            },
            {
              id: 'dish-2',
              name: 'Caesar Salad',
              price: 8.75,
              imageUrl: 'salad.jpg',
            },
          ],
          totalPrice: 21.25,
          notes: 'Family dinner',
          restaurant: {
            id: 'rest-1',
            name: 'Italian Pizza',
          },
        }),
        createMockMealPlan({
          id: 'meal-2',
          customerId: 'customer-1',
          date: '2024-01-16',
          restaurantId: 'rest-2',
          dishIds: ['dish-3'],
          isExecuted: true,
          executedAt: '2024-01-16T19:30:00Z',
          dishes: [
            {
              id: 'dish-3',
              name: 'Cheeseburger',
              price: 15.00,
              imageUrl: 'burger.jpg',
            },
          ],
          totalPrice: 15.00,
          createdAt: '2024-01-12T14:00:00Z',
          updatedAt: '2024-01-16T19:30:00Z',
          restaurant: {
            id: 'rest-2',
            name: 'Burger Place',
          },
        }),
      ];
      const originalMealPlans = JSON.parse(JSON.stringify(mockMealPlans)) as MealPlan[];
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      mockApi.get.mockResolvedValueOnce({ data: mockMealPlans });

      const { result } = renderHook(() => useMealPlans(), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/meal-planner/meals?');
      expect(result.current.data).toEqual(mockMealPlans);
      expect(mockMealPlans).toEqual(originalMealPlans);
      expect(queryClient?.getQueryState(['meal-planner', 'meals', undefined, undefined])).toBeDefined();
    });

    it('should return an empty meal plan list', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(() => useMealPlans(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should include date filters in the request and query key', async () => {
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.get.mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(
        () => useMealPlans('2024-01-15', '2024-01-21'),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        '/meal-planner/meals?startDate=2024-01-15&endDate=2024-01-21',
      );
      expect(queryClient?.getQueryState([
        'meal-planner',
        'meals',
        '2024-01-15',
        '2024-01-21',
      ])).toBeDefined();
    });

    it('should expose meal plan request errors', async () => {
      const error = new Error('Meal plans unavailable');
      mockApi.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useMealPlans(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });

    it('should return an empty list for authentication errors', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });

      const { result } = renderHook(() => useMealPlans(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useCreateMealPlan', () => {
    it('should create meal plan successfully', async () => {
      const mockMealPlan = createMockMealPlan({
        totalPrice: 12.50,
      });

      const createData: CreateMealPlanData = {
        date: '2024-01-15',
        restaurantId: 'rest-1',
        dishIds: ['dish-1'],
        notes: 'Test meal',
      };
      const originalCreateData = JSON.parse(JSON.stringify(createData)) as CreateMealPlanData;
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      mockApi.post.mockResolvedValueOnce({ data: mockMealPlan });

      const { result } = renderHook(() => useCreateMealPlan(), {
        wrapper,
      });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/meal-planner/meals', createData);
      expect(result.current.data).toEqual(mockMealPlan);
      expect(createData).toEqual(originalCreateData);
      expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['meal-planner', 'meals'] });
      expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['meal-planner', 'weekly'] });
    });

    it('should expose create meal plan errors without invalidating cache', async () => {
      const error = new Error('Meal plan creation failed');
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');
      mockApi.post.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCreateMealPlan(), { wrapper });

      result.current.mutate({
        date: '2024-01-15',
        restaurantId: 'rest-1',
        dishIds: ['dish-1'],
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateMealPlan', () => {
    it('should update meal plan successfully', async () => {
      const mockUpdatedMeal = createMockMealPlan({
        dishIds: ['dish-1', 'dish-2'],
        totalPrice: 21.25,
        notes: 'Updated notes',
        updatedAt: '2024-01-14T12:00:00Z',
      });

      const updateData: { mealPlanId: string; updates: Partial<CreateMealPlanData> } = {
        mealPlanId: 'meal-1',
        updates: {
          dishIds: ['dish-1', 'dish-2'],
          notes: 'Updated notes',
        },
      };
      const originalUpdateData = JSON.parse(JSON.stringify(updateData)) as typeof updateData;
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      mockApi.put.mockResolvedValueOnce({ data: mockUpdatedMeal });

      const { result } = renderHook(() => useUpdateMealPlan(), {
        wrapper,
      });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.put).toHaveBeenCalledWith('/meal-planner/meals/meal-1', updateData.updates);
      expect(result.current.data).toEqual(mockUpdatedMeal);
      expect(updateData).toEqual(originalUpdateData);
      expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['meal-planner', 'meals'] });
      expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['meal-planner', 'weekly'] });
    });
  });

  describe('useDeleteMealPlan', () => {
    it('should delete meal plan successfully', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: { success: true } });
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      const { result } = renderHook(() => useDeleteMealPlan(), {
        wrapper,
      });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate('meal-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.delete).toHaveBeenCalledWith('/meal-planner/meals/meal-1');
      expect(result.current.data).toBe('meal-1');
      expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['meal-planner', 'meals'] });
      expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['meal-planner', 'weekly'] });
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
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      mockApi.post.mockResolvedValueOnce({ data: mockOrder });

      const { result } = renderHook(() => useExecuteMealPlan(), {
        wrapper,
      });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate('meal-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/meal-planner/meals/meal-1/execute');
      expect(result.current.data).toEqual(mockOrder);
      expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['meal-planner', 'meals'] });
      expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['meal-planner', 'weekly'] });
      expect(invalidateQueries).toHaveBeenNthCalledWith(3, { queryKey: ['orders'] });
    });
  });

  describe('useWeeklyMealPlans', () => {
    it('should fetch weekly meal plans successfully', async () => {
      const mockWeeklyPlans: WeeklyMealPlan = {
        weekStart: '2024-01-15',
        days: [
          {
            date: '2024-01-15',
            dayName: 'Monday',
            mealPlan: createMockMealPlan({
              totalPrice: 21.25,
              restaurant: {
                id: 'rest-1',
                name: 'Italian Pizza',
              },
            }),
          },
          {
            date: '2024-01-16',
            dayName: 'Tuesday',
            mealPlan: null,
          },
        ],
      };
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      mockApi.get.mockResolvedValueOnce({ data: mockWeeklyPlans });

      const { result } = renderHook(() => useWeeklyMealPlans('2024-01-15'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/meal-planner/weekly?weekStart=2024-01-15');
      expect(result.current.data).toEqual(mockWeeklyPlans);
      expect(queryClient?.getQueryState(['meal-planner', 'weekly', '2024-01-15'])).toBeDefined();
    });

    it('should remain idle without a week start', () => {
      const { result } = renderHook(() => useWeeklyMealPlans(''), {
        wrapper: createWrapper(authenticatedState),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('useShoppingList', () => {
    it('should fetch shopping list successfully', async () => {
      const mockShoppingList: ShoppingList = {
        totalMeals: 3,
        totalCost: 33.75,
        restaurants: ['Italian Pizza'],
        items: [
          {
            dishId: 'dish-1',
            name: 'Margherita Pizza',
            restaurant: 'Italian Pizza',
            quantity: 2,
            unitPrice: 12.50,
            totalPrice: 25.00,
            imageUrl: 'pizza.jpg',
          },
          {
            dishId: 'dish-2',
            name: 'Caesar Salad',
            restaurant: 'Italian Pizza',
            quantity: 1,
            unitPrice: 8.75,
            totalPrice: 8.75,
          },
        ],
      };
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      mockApi.get.mockResolvedValueOnce({ data: mockShoppingList });

      const { result } = renderHook(() => useShoppingList('2024-01-15', '2024-01-21'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/meal-planner/shopping-list?startDate=2024-01-15&endDate=2024-01-21');
      expect(result.current.data).toEqual(mockShoppingList);
      expect(queryClient?.getQueryState([
        'meal-planner',
        'shopping-list',
        '2024-01-15',
        '2024-01-21',
      ])).toBeDefined();
    });

    it('should remain idle without both date parameters', () => {
      const { result } = renderHook(() => useShoppingList('2024-01-15', ''), {
        wrapper: createWrapper(authenticatedState),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });
});








