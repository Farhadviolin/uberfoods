import { screen, waitFor } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';
import api from '../../utils/api';

// Mock API
jest.mock('../../utils/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock tokenStorage
jest.mock('../../utils/tokenStorage', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  getStoredUser: jest.fn(),
  setAuthData: jest.fn(),
  clearAuthData: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestComponent = () => {
  const { user, isAuthenticated, login, logout, loading } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.name : 'no-user'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {component}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('should show loading initially', () => {
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();

    mockApi.post.mockResolvedValueOnce({
      data: {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh-token',
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      },
    });

    renderWithProviders(<TestComponent />);

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('Test User');
  });

  it('should handle login error', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockApi.post.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderWithProviders(<TestComponent />);

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle logout', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh-token',
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<TestComponent />);

    // Login first
    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    // Then logout
    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('should handle token refresh on mount', async () => {
    const { getAccessToken, getRefreshToken, getStoredUser } = jest.requireMock('../../utils/tokenStorage');

    getRefreshToken.mockReturnValue('fake-refresh-token');
    getStoredUser.mockReturnValue({ id: '1', name: 'Test User', email: 'test@example.com', role: 'admin' });

    mockApi.post.mockResolvedValueOnce({
      data: {
        access_token: 'new-fake-token',
        refresh_token: 'new-fake-refresh-token',
      },
    });

    renderWithProviders(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', {
      refresh_token: 'fake-refresh-token',
    });
  });
});



