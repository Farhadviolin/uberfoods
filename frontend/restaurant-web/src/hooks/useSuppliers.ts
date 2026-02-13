import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

export interface Supplier {
  id: string;
  restaurantId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: "NET_30" | "NET_60" | "IMMEDIATE";
  rating?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  restaurantId: string;
  orderDate: string;
  deliveryDate?: string | null;
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  totalAmount: number;
  items: SupplierOrderItem[];
  supplier?: Pick<Supplier, "id" | "name" | "isActive">;
}

function resolveRestaurantId(contextId?: string | null) {
  return contextId || localStorage.getItem("restaurant_id");
}

export function useSuppliers(restaurantId?: string | null) {
  const { restaurantId: ctxRestaurantId } = useAuth();
  const rid = restaurantId || resolveRestaurantId(ctxRestaurantId);

  return useQuery({
    queryKey: ["suppliers", rid],
    queryFn: async () => {
      if (!rid) return [];
      const res = await api.get<Supplier[]>(`/suppliers?restaurantId=${rid}`);
      return res.data || [];
    },
    enabled: !!rid,
    staleTime: 30_000,
  });
}

export function useSupplierOrders(restaurantId?: string | null) {
  const { restaurantId: ctxRestaurantId } = useAuth();
  const rid = restaurantId || resolveRestaurantId(ctxRestaurantId);

  return useQuery({
    queryKey: ["supplier-orders", rid],
    queryFn: async () => {
      if (!rid) return [];
      const res = await api.get<SupplierOrder[]>(
        `/supplier-orders?restaurantId=${rid}`,
      );
      return res.data || [];
    },
    enabled: !!rid,
    staleTime: 30_000,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<Supplier, "id" | "createdAt" | "updatedAt" | "isActive">,
    ) => api.post("/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useToggleSupplierStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch(`/suppliers/${id}/toggle-status`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useCreateSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      supplierId: string;
      restaurantId: string;
      items: SupplierOrderItem[];
      deliveryDate?: string;
    }) => api.post("/supplier-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
    },
  });
}
