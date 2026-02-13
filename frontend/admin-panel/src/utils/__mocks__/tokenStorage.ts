// Mock for tokenStorage in tests
export const getAccessToken = jest.fn(() => 'mock-access-token');
export const getRefreshToken = jest.fn(() => 'mock-refresh-token');
export const getStoredUser = jest.fn(() => ({
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
}));
export const setAuthData = jest.fn();
export const clearAuthData = jest.fn();
export const isAuthenticated = jest.fn(() => true);
