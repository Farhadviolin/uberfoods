import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export interface SocialPost {
  id: string;
  restaurantId: string;
  platform: string;
  content: string;
  mediaUrls: string[];
  scheduledAt?: string;
  postedAt?: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  engagement: number;
  postId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  restaurant: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateSocialPostData {
  restaurantId: string;
  platform: string;
  content: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
}

export interface UpdateSocialPostData {
  content?: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
  status?: string;
}

export interface SocialStats {
  total: number;
  byPlatform: Record<string, number>;
  byStatus: Record<string, number>;
  totalEngagement: number;
  recentPosts: number;
}

export function useSocialPosts(restaurantId?: string, platform?: string, status?: string) {
  return useQuery({
    queryKey: ['social-posts', { restaurantId, platform, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (restaurantId) params.append('restaurantId', restaurantId);
      if (platform) params.append('platform', platform);
      if (status) params.append('status', status);

      const response = await api.get<SocialPost[]>(`/social-media?${params}`);
      return response.data;
    },
  });
}

export function useSocialPost(id: string) {
  return useQuery({
    queryKey: ['social-post', id],
    queryFn: async () => {
      const response = await api.get<SocialPost>(`/social-media/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useSocialStats(restaurantId?: string) {
  return useQuery({
    queryKey: ['social-stats', restaurantId],
    queryFn: async () => {
      const params = restaurantId ? `?restaurantId=${restaurantId}` : '';
      const response = await api.get<SocialStats>(`/social-media/stats${params}`);
      return response.data;
    },
  });
}

export function useCreateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSocialPostData) => {
      const response = await api.post<SocialPost>('/social-media', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-stats'] });
    },
  });
}

export function useUpdateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSocialPostData }) => {
      const response = await api.put<SocialPost>(`/social-media/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-post'] });
      queryClient.invalidateQueries({ queryKey: ['social-stats'] });
    },
  });
}

export function useDeleteSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/social-media/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-stats'] });
    },
  });
}

export function usePublishSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<SocialPost>(`/social-media/${id}/publish`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-post'] });
      queryClient.invalidateQueries({ queryKey: ['social-stats'] });
    },
  });
}

export function useSyncSocialMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (restaurantId?: string) => {
      const params = restaurantId ? `?restaurantId=${restaurantId}` : '';
      const response = await api.post(`/social-media/sync${params}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-stats'] });
    },
  });
}