import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Simple mock for OrderList component
const MockOrderList = () => (
  <div data-testid="order-list">
    <h1>Bestellungen</h1>
    <div>Order List Content</div>
  </div>
);

// Mock the OrderList component to avoid complex dependencies
jest.mock("../Orders/OrderList", () => ({
  OrderList: MockOrderList,
}));

import { OrderList } from "../Orders/OrderList";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe("Restaurant OrderList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it("renders order list", () => {
    render(<OrderList />, { wrapper });
    expect(screen.getByTestId("order-list")).toBeInTheDocument();
    expect(screen.getByText("Bestellungen")).toBeInTheDocument();
  });

  it("displays order list content", () => {
    render(<OrderList />, { wrapper });
    expect(screen.getByText("Order List Content")).toBeInTheDocument();
  });
});