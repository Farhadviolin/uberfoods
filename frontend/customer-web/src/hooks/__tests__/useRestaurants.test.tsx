import { waitFor } from '@testing-library/react';
import { renderHook } from '../../test-utils';
import { useRestaurants } from '../useRestaurants';

// Mock the API
jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
  api: {
    get: jest.fn(),
  },
}));
const { api: mockApi } = jest.requireMock<typeof import('../../utils/api')>('../../utils/api');

describe('useRestaurants Hook', () => {
  const mockRestaurants = [
    {
      id: '1',
      name: 'Test Restaurant',
      description: 'A great place to eat',
      rating: 4.5,
      cuisines: ['Italian', 'Pizza'],
      deliveryFee: 2.5,
      minOrderAmount: 15,
      estimatedDeliveryTime: 30,
      isOpen: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: mockRestaurants });
  });

  it('should be defined', () => {
    const { result } = renderHook(() => useRestaurants());
    expect(result.current).toBeDefined();
  });

  it('should have loading state initially', () => {
    const { result } = renderHook(() => useRestaurants());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should accept options', () => {
    const options = { searchTerm: 'pizza', sortBy: 'name' as const };
    const { result } = renderHook(() => useRestaurants(options));
    expect(result.current).toBeDefined();
  });

  it('should call API with correct URL', async () => {
    renderHook(() => useRestaurants());
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/restaurants/public?sortBy=rating&sortOrder=desc');
    });
  });

  it('should call API with search parameters', async () => {
    const options = { searchTerm: 'pizza' };
    renderHook(() => useRestaurants(options));
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/restaurants/public?search=pizza&sortBy=rating&sortOrder=desc');
    });
  });
});




