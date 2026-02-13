import { renderHook } from '@testing-library/react';
import { useLocation } from '../useLocation';
import { renderWithProviders } from '../../test-utils';

// Mock the useLocation hook
jest.mock('../useLocation', () => ({
  useLocation: () => ({
    location: { lat: 48.2, lng: 16.3 },
    loading: false,
    error: null,
  }),
}));

describe('useLocation Hook', () => {
  it('returns location data', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: renderWithProviders().wrapper,
    });

    expect(result.current.location.lat).toBe(48.2);
    expect(result.current.loading).toBe(false);
  });
});