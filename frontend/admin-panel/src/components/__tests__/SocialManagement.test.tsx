import { screen, waitFor, fireEvent, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocialManagement } from '../SocialManagement';

// Mock the hooks
jest.mock('../../hooks/useSocialMedia', () => ({
  useSocialPosts: jest.fn(),
  useSocialStats: jest.fn(),
  useSyncSocialMedia: jest.fn(),
}));

// Mock api to avoid import issues
jest.mock('../../utils/api', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock config to avoid import.meta issues
jest.mock('../../config', () => ({
  config: {
    apiUrl: 'http://localhost:3000',
  },
}));

const mockUseSocialPosts = require('../../hooks/useSocialMedia').useSocialPosts as jest.MockedFunction<any>;
const mockUseSocialStats = require('../../hooks/useSocialMedia').useSocialStats as jest.MockedFunction<any>;
const mockUseSyncSocialMedia = require('../../hooks/useSocialMedia').useSyncSocialMedia as jest.MockedFunction<any>;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const mockPosts = [
  {
    id: 'post-1',
    restaurantId: 'rest-1',
    platform: 'Facebook',
    content: 'Neue Restaurant-Partner in Wien!',
    mediaUrls: [],
    status: 'posted' as const,
    engagement: 245,
    postedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    restaurant: { id: 'rest-1', name: 'Test Restaurant', email: 'test@example.com' }
  },
  {
    id: 'post-2',
    restaurantId: 'rest-1',
    platform: 'Instagram',
    content: '🍕 Frische Pizza aus unserem neuen Restaurant!',
    mediaUrls: ['image.jpg'],
    status: 'draft' as const,
    engagement: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    restaurant: { id: 'rest-1', name: 'Test Restaurant', email: 'test@example.com' }
  }
];

const mockStats = {
  total: 2,
  byPlatform: { Facebook: 1, Instagram: 1 },
  byStatus: { posted: 1, draft: 1 },
  totalEngagement: 245,
  recentPosts: 1
};

describe('SocialManagement', () => {
  beforeEach(() => {
    queryClient.clear();
    mockUseSocialPosts.mockReturnValue({
      data: mockPosts,
      isLoading: false,
      error: null
    } as any);
    mockUseSocialStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null
    } as any);
    mockUseSyncSocialMedia.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false
    } as any);
  });

  it('should render Social Management', async () => {
    render(<SocialManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Social Media Verwaltung')).toBeInTheDocument();
    });
  });

  it('should display social posts', async () => {
    render(<SocialManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Social Media Verwaltung')).toBeInTheDocument();
      expect(screen.getByText('Neuer Post')).toBeInTheDocument();
      expect(screen.getByText('Neue Restaurant-Partner in Wien!')).toBeInTheDocument();
    });
  });

  it('should filter posts by platform', async () => {
    render(<SocialManagement />, { wrapper });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Facebook' } });

    await waitFor(() => {
      expect(screen.getByText('Social Media Verwaltung')).toBeInTheDocument();
      expect(screen.getByText('Neue Restaurant-Partner in Wien!')).toBeInTheDocument();
      expect(screen.queryByText('🍕 Frische Pizza aus unserem neuen Restaurant!')).not.toBeInTheDocument();
    });
  });

  it('should show action buttons', async () => {
    render(<SocialManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Neuer Post')).toBeInTheDocument();
      expect(screen.getByText('Alle synchronisieren')).toBeInTheDocument();
    });
  });

  it('should show post count and stats', async () => {
    render(<SocialManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Posts angezeigt/)).toBeInTheDocument();
      expect(screen.getByText('2 Posts • 245 Engagement • 1 aktuelle')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    mockUseSocialPosts.mockReturnValue({
      data: [],
      isLoading: true,
      error: null
    } as any);

    render(<SocialManagement />, { wrapper });

    expect(screen.getByText('Social Media Verwaltung')).toBeInTheDocument();
    // Loading spinner would be shown
  });

  it('should show empty state', async () => {
    mockUseSocialPosts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    } as any);

    render(<SocialManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Noch keine Social Media Posts vorhanden.')).toBeInTheDocument();
    });
  });

  it('should handle sync action', async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({});
    mockUseSyncSocialMedia.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false
    } as any);

    // Mock alert
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<SocialManagement />, { wrapper });

    const syncButton = screen.getByText('Alle synchronisieren');
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalledWith('Social Media Synchronisation erfolgreich abgeschlossen');
    });

    alertMock.mockRestore();
  });

  it('should show platform badges correctly', async () => {
    render(<SocialManagement />, { wrapper });

    await waitFor(() => {
      // Check for platform badges (not dropdown options)
      const facebookBadges = screen.getAllByText('Facebook');
      const instagramBadges = screen.getAllByText('Instagram');
      expect(facebookBadges.length).toBeGreaterThan(0);
      expect(instagramBadges.length).toBeGreaterThan(0);
    });
  });

  it('should show restaurant name', async () => {
    render(<SocialManagement />, { wrapper });

    await waitFor(() => {
      // Look for the restaurant name in the badge spans
      const restaurantBadges = screen.getAllByText('Test Restaurant');
      expect(restaurantBadges.length).toBeGreaterThan(0);
    });
  });

  it('should show engagement metrics', async () => {
    render(<SocialManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('❤️ 245 Engagement')).toBeInTheDocument();
      expect(screen.getByText('❤️ 0 Engagement')).toBeInTheDocument();
    });
  });
});