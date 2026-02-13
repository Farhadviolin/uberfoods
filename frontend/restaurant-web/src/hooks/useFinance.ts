import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";
import { logError, handleApiError } from "../utils/errorUtils";

export interface FinanceOverview {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalExpenses: number;
  netProfit: number;
  period: string;
}

export interface Transaction {
  id: string;
  type: "REVENUE" | "EXPENSE" | "PAYOUT";
  amount: number;
  description: string;
  date: string;
  orderId?: string;
}

export function useRestaurantFinance(
  restaurantId: string | null,
  period: string = "30d",
) {
  return useQuery({
    queryKey: ["finance", restaurantId, period],
    queryFn: async () => {
      if (!restaurantId) return null;
      try {
        const response = await api.get<FinanceOverview>(
          `/accounting/restaurant/overview?restaurantId=${restaurantId}&period=${period}`,
        );
        return response.data;
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useRestaurantFinance");
        return null;
      }
    },
    enabled: !!restaurantId,
    retry: false,
  });
}

export function useRestaurantTransactions(
  restaurantId: string | null,
  period: string = "30d",
) {
  return useQuery({
    queryKey: ["transactions", restaurantId, period],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const response = await api.get<Transaction[]>(
          `/accounting/restaurant/reports?restaurantId=${restaurantId}&period=${period}`,
        );
        return response.data || [];
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useRestaurantTransactions");
        return [];
      }
    },
    enabled: !!restaurantId,
    placeholderData: [],
    retry: false,
  });
}
