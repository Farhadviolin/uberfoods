import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import {
  useAddComment,
  useChallenges,
  useCreatePost,
  useFollowUser,
  useJoinChallenge,
  useLikePost,
  usePostComments,
  useSocialFeed,
  useSuggestedFoodies,
  type Challenge,
  type Comment,
  type CreatePostData,
  type Foodie,
  type FoodPost,
} from '../useSocialFoodNetwork';

jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;
const authenticatedState = {
  user: { id: 'customer-1', email: 'customer@example.com', name: 'Test Customer' },
  token: 'customer-token',
};

function createHarness(
  initialAuthState: {
    user: { id: string; email: string; name?: string } | null;
    token: string | null;
  } = { user: null, token: null },
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialAuthState={initialAuthState}>{children}</AuthProvider>
      </QueryClientProvider>
    );
  }

  return { queryClient, wrapper: Wrapper };
}

const foodie: Foodie = {
  id: 'foodie-1',
  name: 'Ada Foodie',
  avatar: '/ada.png',
  bio: 'Loves noodles',
  followers: 12,
  following: 4,
  posts: 8,
  isFollowing: false,
  recentOrder: {
    restaurant: 'Noodle House',
    dish: 'Ramen',
    image: '/ramen.png',
  },
};

const post: FoodPost = {
  id: 'post-1',
  author: foodie,
  content: 'Excellent ramen',
  images: ['/ramen.png'],
  restaurant: 'Noodle House',
  dish: 'Ramen',
  likes: 5,
  comments: 2,
  isLiked: false,
  createdAt: '2024-01-01T00:00:00Z',
};

const challenge: Challenge = {
  id: 'challenge-1',
  title: 'Try something new',
  description: 'Order a new dish',
  participants: 20,
  endDate: '2030-01-01T00:00:00Z',
  isJoined: false,
  icon: '🍜',
};

const comment: Comment = {
  id: 'comment-1',
  author: { id: 'foodie-2', name: 'Grace Foodie', avatar: '/grace.png' },
  content: 'Looks delicious',
  createdAt: '2024-01-01T01:00:00Z',
  likes: 1,
  isLiked: false,
};

function responseError(status: number) {
  return { response: { status, data: { message: `HTTP ${status}` } } };
}

describe('useSocialFoodNetwork', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useSocialFeed', () => {
    it('returns a successful empty feed without making a request when unauthenticated', () => {
      const { wrapper } = createHarness();
      const { result } = renderHook(() => useSocialFeed(), { wrapper });

      expect(result.current.data).toEqual([]);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('fetches and preserves the authenticated feed response', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [post] });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useSocialFeed(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(mockApi.get).toHaveBeenCalledWith('/social/feed');
      expect(result.current.data).toEqual([post]);
      expect(queryClient.getQueryData(['social', 'feed'])).toEqual([post]);
    });

    it('preserves an empty authenticated feed response', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useSocialFeed(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it.each([401, 403, 500, 502, 503])(
      'converts a handled HTTP %s feed failure to an empty successful result',
      async (status) => {
        mockApi.get.mockRejectedValueOnce(responseError(status));
        const { wrapper } = createHarness(authenticatedState);
        const { result } = renderHook(() => useSocialFeed(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      },
    );

    it('exposes an unsupported feed failure', async () => {
      const error = responseError(418);
      mockApi.get.mockRejectedValueOnce(error);
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useSocialFeed(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('authenticated supporting queries', () => {
    it('fetches suggested foodies using the documented route and query key', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [foodie] });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useSuggestedFoodies(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.get).toHaveBeenCalledWith('/social/suggested-foodies');
      expect(result.current.data).toEqual([foodie]);
      expect(queryClient.getQueryData(['social', 'suggested-foodies'])).toEqual([foodie]);
    });

    it('keeps suggested foodies idle when unauthenticated', () => {
      const { wrapper } = createHarness();
      const { result } = renderHook(() => useSuggestedFoodies(), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('converts a handled suggested-foodies failure to an empty result', async () => {
      mockApi.get.mockRejectedValueOnce(responseError(403));
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useSuggestedFoodies(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('fetches challenges using the documented route and query key', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [challenge] });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useChallenges(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.get).toHaveBeenCalledWith('/social/challenges');
      expect(result.current.data).toEqual([challenge]);
      expect(queryClient.getQueryData(['social', 'challenges'])).toEqual([challenge]);
    });

    it('keeps challenges idle when unauthenticated', () => {
      const { wrapper } = createHarness();
      const { result } = renderHook(() => useChallenges(), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('converts a handled challenges failure to an empty result', async () => {
      mockApi.get.mockRejectedValueOnce(responseError(500));
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useChallenges(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('fetches post comments using the post-specific route and query key', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [comment] });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => usePostComments('post-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.get).toHaveBeenCalledWith('/social/posts/post-1/comments');
      expect(result.current.data).toEqual([comment]);
      expect(queryClient.getQueryData(['social', 'post', 'post-1', 'comments'])).toEqual([comment]);
    });

    it('keeps comments idle for an empty post id', () => {
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => usePostComments(''), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('keeps comments idle when unauthenticated', () => {
      const { wrapper } = createHarness();
      const { result } = renderHook(() => usePostComments('post-1'), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('converts a handled comments failure to an empty result', async () => {
      mockApi.get.mockRejectedValueOnce(responseError(401));
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => usePostComments('post-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('mutations', () => {
    it('creates a post without changing its input and invalidates the feed', async () => {
      const createData: CreatePostData = {
        content: 'Excellent ramen',
        restaurantId: 'restaurant-1',
        dishId: 'dish-1',
        restaurant: 'Noodle House',
        dish: 'Ramen',
        images: ['/ramen.png'],
      };
      const originalInput: CreatePostData = {
        ...createData,
        images: createData.images ? [...createData.images] : undefined,
      };
      mockApi.post.mockResolvedValueOnce({ data: post });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreatePost(), { wrapper });

      result.current.mutate(createData);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/social/posts', createData);
      expect(result.current.data).toEqual(post);
      expect(createData).toEqual(originalInput);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['social', 'feed'] });
    });

    it('exposes a create failure and does not invalidate the feed', async () => {
      const error = new Error('Creation failed');
      mockApi.post.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreatePost(), { wrapper });

      result.current.mutate({ content: 'New post' });
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });

    it('likes a post and invalidates the feed', async () => {
      const response = { liked: true, likesCount: 6 };
      mockApi.post.mockResolvedValueOnce({ data: response });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useLikePost(), { wrapper });

      result.current.mutate('post-1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/social/posts/post-1/like');
      expect(result.current.data).toEqual(response);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['social', 'feed'] });
    });

    it('exposes a like failure and does not invalidate the feed', async () => {
      const error = new Error('Like failed');
      mockApi.post.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useLikePost(), { wrapper });

      result.current.mutate('post-1');
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });

    it('adds a comment with the API payload and invalidates feed and post comments', async () => {
      const input = { postId: 'post-1', content: 'Looks delicious' };
      const originalInput = { ...input };
      mockApi.post.mockResolvedValueOnce({ data: comment });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useAddComment(), { wrapper });

      result.current.mutate(input);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/social/posts/post-1/comments', {
        content: 'Looks delicious',
      });
      expect(result.current.data).toEqual(comment);
      expect(input).toEqual(originalInput);
      expect(invalidate.mock.calls).toEqual([
        [{ queryKey: ['social', 'feed'] }],
        [{ queryKey: ['social', 'post', 'post-1', 'comments'] }],
      ]);
    });

    it('follows a user and invalidates suggestions before the feed', async () => {
      const response = { following: true };
      mockApi.post.mockResolvedValueOnce({ data: response });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useFollowUser(), { wrapper });

      result.current.mutate('foodie-1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/social/users/foodie-1/follow');
      expect(result.current.data).toEqual(response);
      expect(invalidate.mock.calls).toEqual([
        [{ queryKey: ['social', 'suggested-foodies'] }],
        [{ queryKey: ['social', 'feed'] }],
      ]);
    });

    it('joins a challenge and invalidates challenges', async () => {
      const response = { joined: true };
      mockApi.post.mockResolvedValueOnce({ data: response });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useJoinChallenge(), { wrapper });

      result.current.mutate('challenge-1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/social/challenges/challenge-1/join');
      expect(result.current.data).toEqual(response);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['social', 'challenges'] });
    });
  });
});
