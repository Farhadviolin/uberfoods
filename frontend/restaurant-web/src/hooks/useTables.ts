import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING";
export type TableShape = "SQUARE" | "ROUND" | "RECTANGLE";
export type ReservationStatus =
  | "CONFIRMED"
  | "SEATED"
  | "COMPLETED"
  | "CANCELLED";

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  number: number;
  capacity: number;
  status: TableStatus;
  shape: TableShape;
  location?: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  tableId?: string | null;
  customerName: string;
  customerPhone: string;
  partySize: number;
  reservationTime: string;
  status: ReservationStatus;
  table?: Pick<RestaurantTable, "id" | "number" | "capacity" | "status"> | null;
}

function resolveRestaurantId(contextId?: string | null) {
  return contextId || localStorage.getItem("restaurant_id");
}

export function useTables(restaurantId?: string | null) {
  const { restaurantId: ctxRestaurantId } = useAuth();
  const rid = restaurantId || resolveRestaurantId(ctxRestaurantId);

  return useQuery({
    queryKey: ["tables", rid],
    queryFn: async () => {
      if (!rid) return [];
      const res = await api.get<RestaurantTable[]>(
        `/tables?restaurantId=${rid}`,
      );
      return res.data || [];
    },
    enabled: !!rid,
    staleTime: 30_000,
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      restaurantId: string;
      number: number;
      capacity: number;
      shape?: TableShape;
      location?: { x: number; y: number };
    }) => api.post("/tables", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useUpdateTableStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; status: TableStatus }) =>
      api.patch(`/tables/${data.id}/status`, { status: data.status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["table", variables.id] });
      }
    },
  });
}

export function useReservations(restaurantId?: string | null) {
  const { restaurantId: ctxRestaurantId } = useAuth();
  const rid = restaurantId || resolveRestaurantId(ctxRestaurantId);

  return useQuery({
    queryKey: ["reservations", rid],
    queryFn: async () => {
      if (!rid) return [];
      const res = await api.get<Reservation[]>(
        `/reservations?restaurantId=${rid}`,
      );
      return res.data || [];
    },
    enabled: !!rid,
    staleTime: 30_000,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      restaurantId: string;
      tableId?: string;
      customerName: string;
      customerPhone: string;
      partySize: number;
      reservationTime: string;
      status?: ReservationStatus;
    }) => api.post("/reservations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}
