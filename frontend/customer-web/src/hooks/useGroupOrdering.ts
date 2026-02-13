import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from './useWebSocket';

export interface GroupMember {
  id: string;
  name: string;
  avatar?: string;
  items: CartItem[];
  total: number;
  isReady: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurant: string;
}

export interface GroupOrder {
  id: string;
  code: string;
  host: string;
  members: GroupMember[];
  restaurant?: string;
  status: 'active' | 'ordering' | 'ready' | 'completed';
  createdAt: string;
  total: number;
}

export interface CreateGroupOrderData {
  restaurantId?: string;
}

export interface JoinGroupOrderData {
  code: string;
}

export interface AddItemToGroupOrderData {
  groupOrderId: string;
  dishId: string;
  quantity: number;
  modifications?: {
    extras?: string[];
    removals?: string[];
    notes?: string;
  };
}

// Gruppenbestellung erstellen
export function useCreateGroupOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGroupOrderData) => {
      const response = await api.post('/group-orders', data);
      return response.data as GroupOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-orders'] });
    },
  });
}

// Gruppenbestellung beitreten
export function useJoinGroupOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: JoinGroupOrderData) => {
      const response = await api.post(`/group-orders/${data.code}/join`);
      return response.data as GroupOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-orders'] });
    },
  });
}

// Gruppenbestellung laden
export function useGroupOrder(groupOrderId: string) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['group-orders', groupOrderId],
    queryFn: async () => {
      if (!isAuthenticated) {
        return null;
      }
      try {
        const response = await api.get(`/group-orders/${groupOrderId}`);
        return response.data as GroupOrder;
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !!groupOrderId,
    retry: (failureCount, error) => {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 500 || 
          axiosError.response?.status === 502 || 
          axiosError.response?.status === 503 ||
          !axiosError.response) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Item zu Gruppenbestellung hinzufügen
export function useAddItemToGroupOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddItemToGroupOrderData) => {
      const response = await api.post(`/group-orders/${data.groupOrderId}/items`, {
        groupOrderId: data.groupOrderId,
        dishId: data.dishId,
        quantity: data.quantity,
        modifications: data.modifications,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-orders', variables.groupOrderId] });
    },
  });
}

// Gruppenbestellung Checkout
export function useCheckoutGroupOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupOrderId: string) => {
      const response = await api.post(`/group-orders/${groupOrderId}/checkout`);
      return response.data;
    },
    onSuccess: (_, groupOrderId) => {
      queryClient.invalidateQueries({ queryKey: ['group-orders', groupOrderId] });
    },
  });
}

// WebSocket Hook für Real-time Updates
export function useGroupOrderWebSocket(
  groupOrderId: string | null,
  onUpdate?: (order: GroupOrder) => void
) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const { socket, isConnected } = useWebSocket(userId);

  useEffect(() => {
    if (!socket || !isConnected || !groupOrderId) return;

    // Verwende speziellen Handler für Group Orders
    socket.emit('join-group-order', groupOrderId);

    // Event Handler
    const handleGroupOrderUpdate = (update: GroupOrder) => {
      if (onUpdate) {
        onUpdate(update);
      }
    };

    const handleMemberJoined = (_member: any) => {
      // Trigger refetch oder Update
      if (onUpdate) {
        // Optionale: Refetch der Group Order
      }
    };

    const handleItemAdded = (_item: any) => {
      // Trigger refetch oder Update
      if (onUpdate) {
        // Optionale: Refetch der Group Order
      }
    };

    socket.on('group-order-update', handleGroupOrderUpdate);
    socket.on('member-joined', handleMemberJoined);
    socket.on('item-added', handleItemAdded);

    return () => {
      socket.emit('leave-group-order', groupOrderId);
      socket.off('group-order-update', handleGroupOrderUpdate);
      socket.off('member-joined', handleMemberJoined);
      socket.off('item-added', handleItemAdded);
    };
  }, [socket, isConnected, groupOrderId, onUpdate]);
}

