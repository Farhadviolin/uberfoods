import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";
import { logError, handleApiError } from "../utils/errorUtils";

export interface EARechnung {
  restaurantId: string;
  period: string;
  revenue: number;
  otherRevenue: number;
  totalRevenue: number;
  costOfGoods: number;
  personnel: number;
  rent: number;
  utilities: number;
  otherExpenses: number;
  totalExpenses: number;
  profit: number;
  pdfUrl?: string;
}

export interface Expense {
  id: string;
  restaurantId: string;
  category: "WARE" | "PERSONAL" | "MIETE" | "BETRIEB" | "SONSTIGES";
  description: string;
  amount: number;
  date: string;
  receiptUrl?: string;
  taxDeductible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Revenue {
  id: string;
  restaurantId: string;
  source: "ORDER" | "SONSTIGES";
  description: string;
  amount: number;
  date: string;
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExpenseDto {
  restaurantId: string;
  category: "WARE" | "PERSONAL" | "MIETE" | "BETRIEB" | "SONSTIGES";
  description: string;
  amount: number;
  date: string;
  receiptUrl?: string;
  taxDeductible: boolean;
}

export interface CreateRevenueDto {
  restaurantId: string;
  source: "ORDER" | "SONSTIGES";
  description: string;
  amount: number;
  date: string;
  orderId?: string;
}

export function useEARechnung(
  restaurantId: string | null,
  period: string = "current-month",
) {
  return useQuery({
    queryKey: ["ea-rechnung", restaurantId, period],
    queryFn: async () => {
      if (!restaurantId) return null;
      try {
        const response = await api.get<EARechnung>(
          `/restaurant-accounting/ea-rechnung?restaurantId=${restaurantId}&period=${period}`,
        );
        return response.data;
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useEARechnung");
        return null;
      }
    },
    enabled: !!restaurantId,
    retry: false,
  });
}

export function useGenerateEARechnung() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      period,
    }: {
      restaurantId: string;
      period: string;
    }) => {
      const response = await api.post<EARechnung>(
        "/accounting/ea-rechnung/generate",
        {
          restaurantId,
          period,
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ea-rechnung", variables.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["expenses", variables.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["revenues", variables.restaurantId],
      });
    },
  });
}

export function useExpenses(
  restaurantId: string | null,
  period: string = "current-month",
) {
  return useQuery({
    queryKey: ["expenses", restaurantId, period],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const response = await api.get<Expense[]>(
          `/accounting/expenses?restaurantId=${restaurantId}&period=${period}`,
        );
        return response.data || [];
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useExpenses");
        return [];
      }
    },
    enabled: !!restaurantId,
    placeholderData: [],
    retry: false,
  });
}

export function useRevenues(
  restaurantId: string | null,
  period: string = "current-month",
) {
  return useQuery({
    queryKey: ["revenues", restaurantId, period],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const response = await api.get<Revenue[]>(
          `/accounting/revenues?restaurantId=${restaurantId}&period=${period}`,
        );
        return response.data || [];
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useRevenues");
        return [];
      }
    },
    enabled: !!restaurantId,
    placeholderData: [],
    retry: false,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseDto) => {
      const response = await api.post<Expense>("/accounting/expenses", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["expenses", variables.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ea-rechnung", variables.restaurantId],
      });
    },
  });
}

export function useCreateRevenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRevenueDto) => {
      const response = await api.post<Revenue>("/accounting/revenues", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["revenues", variables.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ea-rechnung", variables.restaurantId],
      });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Expense>;
    }) => {
      const response = await api.patch<Expense>(
        `/accounting/expenses/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["expenses", data.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ea-rechnung", data.restaurantId],
      });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      restaurantId,
    }: {
      id: string;
      restaurantId: string;
    }) => {
      await api.delete(`/accounting/expenses/${id}`);
      return { id, restaurantId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["expenses", variables.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ea-rechnung", variables.restaurantId],
      });
    },
  });
}

export function useDeleteRevenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      restaurantId,
    }: {
      id: string;
      restaurantId: string;
    }) => {
      await api.delete(`/accounting/revenues/${id}`);
      return { id, restaurantId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["revenues", variables.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ea-rechnung", variables.restaurantId],
      });
    },
  });
}
