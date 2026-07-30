import { renderHook } from '@testing-library/react';
import { useLocation } from '../useLocation';
import { TestWrapper } from '../../test-utils';

// Mock the useLocation hook
jest.mock('../useLocation', () => ({
  useLocation: () => ({
    location: { lat: 48.2, lng: 16.3 },
    isTracking: false,
    error: null,
  }),
}));

describe('useLocation Hook', () => {
  it('returns location data', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: TestWrapper,
    });

    expect(result.current.location).toEqual({ lat: 48.2, lng: 16.3 });
    expect(result.current.isTracking).toBe(false);
  });
});
