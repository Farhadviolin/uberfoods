import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { ReactNode } from 'react';
import { useSocialFeed, useCreatePost, useLikePost } from '../useSocialFoodNetwork';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

// Test wrapper
const createWrapper = (initialAuthState = { user: null, token: null }) => {
  return ({ children }: { children: ReactNode }) => children;
};

describe('useSocialFoodNetwork', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSocialFeed', () => {
    it('should return empty array when not authenticated', async () => {
      const { result } = renderHook(() => useSocialFeed());

      // Hook returns empty array immediately when not authenticated
      expect(result.current.data).toEqual([]);
      expect(result.current.isSuccess).toBe(true);
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('should fetch feed when authenticated', async () => {
      const mockFeed = [
        {
          id: '1',
          content: 'Test post',
          author: { id: '1', name: 'Test User', avatar: null },
          likes: 5,
          comments: 2,
          isLiked: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockFeed });

      const { result } = renderHook(() => useSocialFeed(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/social/feed');
      expect(result.current.data).toEqual(mockFeed);
    });

    it('should handle API errors gracefully by returning empty array', async () => {
      // Mock a 500 error which should return empty array
      const error = {
        response: { status: 500, data: { message: 'Server Error' } },
      };
      mockApi.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSocialFeed(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle auth errors gracefully by returning empty array', async () => {
      // Mock a 401 error which should return empty array
      const error = {
        response: { status: 401, data: { message: 'Unauthorized' } },
      };
      mockApi.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSocialFeed(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useCreatePost', () => {
    it('should create post successfully', async () => {
      const mockPost = { id: '1', content: 'New post' };
      const createData = { content: 'New post' };

      mockApi.post.mockResolvedValueOnce({ data: mockPost });

      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/social/posts', createData);
    });

    it('should handle creation errors', async () => {
      const createData = { content: 'New post' };
      mockApi.post.mockRejectedValueOnce(new Error('Creation failed'));

      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useLikePost', () => {
    it('should toggle like successfully', async () => {
      const mockResponse = { liked: true, likesCount: 6 };

      mockApi.post.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useLikePost(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate('post-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/social/posts/post-1/like');
    });

    it('should handle like errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Like failed'));

      const { result } = renderHook(() => useLikePost(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate('post-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});








