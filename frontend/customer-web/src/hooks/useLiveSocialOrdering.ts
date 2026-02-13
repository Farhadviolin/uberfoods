import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '../utils/api';
import { SocialLiveOrderUpdate, useWebSocket } from './useWebSocket';
import { useAuth } from '../contexts/AuthContext';
import { logWarning } from '../utils/errorReporting';
import { Order, WebSocketTrendingData } from '../types';

export interface LiveOrder {
  id: string;
  restaurantName: string;
  restaurant?: string; // Alternative property name
  customerLocation: {
    lat: number;
    lng: number;
  };
  estimatedDeliveryTime: number;
  totalAmount: number;
  createdAt: string;
  timestamp?: string; // Alternative to createdAt
  userName?: string; // Customer name
  dish?: string; // Main dish name
}

export interface TrendingDish {
  id: string;
  name?: string;
  dish?: string; // Alternative property name
  restaurant?: {
    id: string;
    name: string;
  };
  restaurantName?: string; // Alternative property name
  imageUrl?: string;
  category?: string;
  popularity?: number; // Based on recent orders
  count?: number; // Number of orders
  trend?: 'up' | 'down' | 'stable'; // Trend direction
}

export type TrendingOrder = TrendingDish;

// Live Orders laden
export function useLiveOrders(limit: number = 20) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  
  return useQuery({
    queryKey: ['social', 'live-orders', limit],
    queryFn: async () => {
      try {
        const response = await api.get(`/social/live-orders?limit=${limit}`);
        // Sicherstellen, dass immer ein Array zurückgegeben wird
        return (Array.isArray(response.data) ? response.data : []) as LiveOrder[];
      } catch (error) {
        // Fallback bei Fehler
        logWarning('Fehler beim Laden der Live Orders', { component: 'useLiveSocialOrdering', action: 'fetchLiveOrders', metadata: { limit, error } });
        return [];
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: (failureCount, error) => {
      // Retry bei temporären Fehlern
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

// Trending Orders laden
export function useTrendingOrders(limit: number = 10) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  
  return useQuery({
    queryKey: ['social', 'trending', limit],
    queryFn: async () => {
      try {
        const response = await api.get(`/social/trending?limit=${limit}`);
        // Sicherstellen, dass immer ein Array zurückgegeben wird
        return (Array.isArray(response.data) ? response.data : []) as TrendingDish[];
      } catch (error) {
        // Fallback bei Fehler
        logWarning('Fehler beim Laden der Trending Orders', { component: 'useLiveSocialOrdering', action: 'fetchTrendingOrders', metadata: { limit, error } });
        return [];
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refetch every minute
    retry: (failureCount, error) => {
      // Retry bei temporären Fehlern
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

// WebSocket Hook für Live Orders
export function useLiveOrdersWebSocket(
  onNewOrder?: (order: LiveOrder) => void,
  onTrendingUpdate?: (trending: TrendingOrder[]) => void,
  onLiveOrderUpdate?: (update: SocialLiveOrderUpdate) => void,
  orderIdToSubscribe?: string
) {
  const { user } = useAuth();
  const { socket, isConnected } = useWebSocket(
    user?.id || null,
    undefined, // onOrderUpdate
    (newOrder: Order) => {
      // Konvertiere Order zu LiveOrder Format
      if (onNewOrder && (newOrder as Order & { restaurant?: { name?: string }; customerLocation?: { lat: number; lng: number }; estimatedDeliveryTime?: number }).restaurant) {
        const orderWithExtras = newOrder as Order & { restaurant?: { name?: string }; customerLocation?: { lat: number; lng: number }; estimatedDeliveryTime?: number };
        onNewOrder({
          id: newOrder.id,
          restaurantName: orderWithExtras.restaurant?.name || 'Unbekannt',
          customerLocation: orderWithExtras.customerLocation || { lat: 0, lng: 0 },
          estimatedDeliveryTime: orderWithExtras.estimatedDeliveryTime || 0,
          totalAmount: newOrder.totalAmount || 0,
          createdAt: newOrder.createdAt || new Date().toISOString(),
        });
      }
    },
    undefined, // onSocialPost
    undefined, // onGroupOrderUpdate
    undefined, // onAchievementUnlocked
    undefined, // onUnifiedNotification
    undefined, // onFinancialEvent
    undefined, // onMLPrediction
    undefined, // onSystemHealth
    undefined, // room
    onLiveOrderUpdate // social live order updates
  );

  useEffect(() => {
    if (!socket || !isConnected) return;

    if (orderIdToSubscribe) {
      socket.emit('social:live-order:subscribe', { orderId: orderIdToSubscribe });
    }

    // Beitrete dem live-orders Room
    socket.emit('join-live-orders');

    // Live Order Updates
    const handleNewOrder = (order: Order) => {
      if (onNewOrder) {
        const orderWithExtras = order as Order & { restaurant?: { name?: string }; customerLocation?: { lat: number; lng: number }; estimatedDeliveryTime?: number };
        onNewOrder({
          id: order.id,
          restaurantName: orderWithExtras.restaurant?.name || 'Unbekannt',
          customerLocation: orderWithExtras.customerLocation || { lat: 0, lng: 0 },
          estimatedDeliveryTime: orderWithExtras.estimatedDeliveryTime || 0,
          totalAmount: order.totalAmount || 0,
          createdAt: order.createdAt || new Date().toISOString(),
        });
      }
    };

    // Trending Updates
    const handleTrendingUpdate = (trendingData: WebSocketTrendingData) => {
      if (onTrendingUpdate && trendingData.dishes) {
        // Konvertiere WebSocketTrendingData zu TrendingOrder[]
        const trendingOrders: TrendingOrder[] = trendingData.dishes.map((dish) => ({
          id: dish.id,
          dishName: dish.name,
          restaurantName: dish.restaurant.name,
          orderCount: dish.popularity,
        }));
        onTrendingUpdate(trendingOrders);
      }
    };

    socket.on('new-order', handleNewOrder);
    socket.on('trending-update', handleTrendingUpdate);
    if (onLiveOrderUpdate) {
      socket.on('social:live-order:update', onLiveOrderUpdate);
    }

    return () => {
      socket.emit('leave-live-orders');
      socket.off('new-order', handleNewOrder);
      socket.off('trending-update', handleTrendingUpdate);
      if (onLiveOrderUpdate) {
        socket.off('social:live-order:update', onLiveOrderUpdate);
      }
    };
  }, [socket, isConnected, onNewOrder, onTrendingUpdate, onLiveOrderUpdate, orderIdToSubscribe]);
}