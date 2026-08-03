import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUseRestaurantAnalytics = jest.fn();

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ restaurantId: "restaurant-test" }),
}));

jest.mock("../../hooks/useWebSocket", () => ({
  useWebSocket: () => ({ isConnected: true, connectionError: null }),
}));

jest.mock("../../hooks/useOrders", () => ({
  useRestaurantOrders: () => ({ data: [], isLoading: false }),
}));

jest.mock("../../hooks/useRestaurant", () => {
  const actual = jest.requireActual<typeof import("../../hooks/useRestaurant")>(
    "../../hooks/useRestaurant",
  );

  return {
    ...actual,
    useRestaurantStats: () => ({ data: null, isLoading: false }),
    useRestaurantRevenue: () => ({ data: [], isLoading: false }),
    useRestaurantAnalytics: mockUseRestaurantAnalytics,
    useRestaurantPerformance: () => ({ data: null, isLoading: false }),
    useRestaurantRatingsSummary: () => ({ data: null }),
  };
});

jest.mock("../Dashboard/StatsCards", () => ({
  StatsCards: () => <div data-testid="stats-cards" />,
}));

jest.mock("../Dashboard/RevenueChart", () => ({
  RevenueChart: () => <div data-testid="revenue-chart" />,
}));

jest.mock("../Dashboard/TopDishes", () => ({
  TopDishes: () => <div data-testid="top-dishes" />,
}));

jest.mock("../common/Skeleton", () => ({
  SkeletonStats: () => <div />,
  SkeletonChart: () => <div />,
  SkeletonCard: () => <div />,
}));

import { Dashboard } from "../Dashboard/Dashboard";
import { normalizeRestaurantAnalytics } from "../../hooks/useRestaurant";

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>,
  );
}

describe("Dashboard analytics contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRestaurantAnalytics.mockReturnValue({
      data: {
        period: "7d",
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        ordersByStatus: {},
        topDishes: [],
      },
      isLoading: false,
      isError: false,
    });
  });

  it("renders the canonical flat analytics response without legacy field access", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Analysen" }));

    expect(screen.getByText("Umsatz-Analysen")).toBeInTheDocument();
    expect(screen.getAllByText(/0,00/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/undefined|NaN/)).not.toBeInTheDocument();
  });

  it("normalizes missing values without fabricating metrics", () => {
    expect(
      normalizeRestaurantAnalytics({
        period: "7d",
        ordersByStatus: {},
        topDishes: [],
      }),
    ).toEqual({
      period: "7d",
      totalRevenue: null,
      totalOrders: null,
      avgOrderValue: null,
      ordersByStatus: {},
      topDishes: [],
    });
  });
});
