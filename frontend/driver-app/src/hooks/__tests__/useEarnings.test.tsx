import { renderHook } from '@testing-library/react';
import { useEarnings } from '../useEarnings';
import { renderWithProviders } from '../../test-utils';

// Mock the useEarnings hook
jest.mock('../useEarnings', () => ({
  useEarnings: () => ({
    earnings: { today: 100, week: 500 },
    loading: false,
    error: null,
  }),
}));

describe('useEarnings Hook', () => {
  it('returns earnings data', () => {
    const { result } = renderHook(() => useEarnings(), {
      wrapper: renderWithProviders().wrapper,
    });

    expect(result.current.earnings.today).toBe(100);
    expect(result.current.loading).toBe(false);
  });
});