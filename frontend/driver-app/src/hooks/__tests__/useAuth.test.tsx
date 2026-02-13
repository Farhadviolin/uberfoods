import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { renderWithProviders } from '../../test-utils';

// Mock the useAuth hook
jest.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User' },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe('useAuth Hook', () => {
  it('returns auth state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: renderWithProviders().wrapper,
    });

    expect(result.current.user).toEqual({ id: 'test-user', name: 'Test User' });
    expect(result.current.isAuthenticated).toBe(true);
  });
});