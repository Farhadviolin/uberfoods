import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

interface AvailableOrder {
  id: string;
  restaurant: { name: string; address: string };
  customer: { address: string };
  totalAmount: number;
  distance: number;
  estimatedTime: number;
}

interface ActiveDelivery {
  id: string;
  status: string;
  customer: { name: string; phone: string; address: string };
  restaurant: { name: string };
}

interface Coordinate {
  lat: number;
  lng: number;
}

export function useOrders() {
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const available = await api.get<{ data: AvailableOrder[] }>('/drivers/me/orders/available');
        if (active) setAvailableOrders(available.data.data);
        const current = await api.get<ActiveDelivery | null>('/drivers/me/orders/active');
        if (active) setActiveDelivery(current.data);
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError : new Error('Failed to fetch orders'));
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const acceptOrder = useCallback((orderId: string) =>
    api.post(`/orders/${orderId}/accept`, { orderId }), []);

  const rejectOrder = useCallback((orderId: string, reason: string) =>
    api.post(`/orders/${orderId}/reject`, { orderId, reason }), []);

  const updateStatus = useCallback((orderId: string, status: string) =>
    api.patch(`/orders/${orderId}/status`, { status }), []);

  const calculateDistance = useCallback((from: Coordinate, to: Coordinate) => {
    const radians = (degrees: number) => degrees * Math.PI / 180;
    const latitudeDelta = radians(to.lat - from.lat);
    const longitudeDelta = radians(to.lng - from.lng);
    const a = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat))
      * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  return {
    availableOrders,
    activeDelivery,
    error,
    acceptOrder,
    rejectOrder,
    updateStatus,
    calculateDistance,
  };
}
