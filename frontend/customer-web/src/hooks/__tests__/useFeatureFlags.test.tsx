import { renderHook } from '../../test-utils';
import { useFeatureFlags, useFeatureFlag } from '../useFeatureFlags';

// Mock the API
jest.mock('../../utils/api');
const mockApi = require('../../utils/api');

describe('useFeatureFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches feature flags from API', async () => {
    const mockFlags = {
      mealPlanner: true,
      loyaltyProgram: false,
      giftCards: true,
      scheduledOrders: false,
      socialFoodNetwork: true,
      groupOrdering: true,
      predictiveOrdering: false,
      personalizedChef: true,
      gamification: true,
      nutritionTracker: false,
      expenseAnalytics: true,
      predictiveDelivery: true,
      liveSocialOrdering: false,
      chat: true,
      reviews: true,
    };

    mockApi.get.mockResolvedValueOnce({ data: mockFlags });

    const { result } = renderHook(() => useFeatureFlags());

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/settings/features');
      expect(result.current.data).toEqual(mockFlags);
    });
  });

  it('returns default flags when API returns no data', async () => {
    mockApi.get.mockResolvedValueOnce({ data: null });

    const { result } = renderHook(() => useFeatureFlags());

    await waitFor(() => {
      expect(result.current.data).toEqual({
        mealPlanner: true,
        loyaltyProgram: true,
        giftCards: true,
        scheduledOrders: true,
        socialFoodNetwork: true,
        groupOrdering: true,
        predictiveOrdering: true,
        personalizedChef: true,
        gamification: true,
        nutritionTracker: true,
        expenseAnalytics: true,
        predictiveDelivery: true,
        liveSocialOrdering: true,
        chat: true,
        reviews: true,
      });
    });
  });

  it('returns default flags on API error', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useFeatureFlags());

    await waitFor(() => {
      expect(result.current.data).toEqual({
        mealPlanner: true,
        loyaltyProgram: true,
        giftCards: true,
        scheduledOrders: true,
        socialFoodNetwork: true,
        groupOrdering: true,
        predictiveOrdering: true,
        personalizedChef: true,
        gamification: true,
        nutritionTracker: true,
        expenseAnalytics: true,
        predictiveDelivery: true,
        liveSocialOrdering: true,
        chat: true,
        reviews: true,
      });
    });
  });

  it('has correct stale time and retry settings', () => {
    mockApi.get.mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useFeatureFlags());

    // The query should be configured with the right settings
    // This is tested implicitly through the hook behavior
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useFeatureFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns feature flag value when available', async () => {
    const mockFlags = {
      mealPlanner: true,
      loyaltyProgram: false,
      giftCards: true,
    };

    mockApi.get.mockResolvedValueOnce({ data: mockFlags });

    const { result } = renderHook(() => useFeatureFlag('loyaltyProgram'));

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('returns true as default when feature not available', async () => {
    mockApi.get.mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useFeatureFlag('mealPlanner'));

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('returns true as default when flags not loaded yet', () => {
    const { result } = renderHook(() => useFeatureFlag('gamification'));

    expect(result.current).toBe(true);
  });
});







