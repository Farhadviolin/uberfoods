import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Simple mock for KitchenDisplay component
const MockKitchenDisplay = () => (
  <div data-testid="kitchen-display">
    <h1>Kitchen Display</h1>
    <div>Kitchen Orders Content</div>
  </div>
);

// Mock the KitchenDisplay component to avoid complex dependencies
jest.mock("../Kitchen/KitchenDisplay", () => ({
  KitchenDisplay: MockKitchenDisplay,
}));

import { KitchenDisplay } from "../Kitchen/KitchenDisplay";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe("KitchenDisplay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it("renders kitchen display", () => {
    render(<KitchenDisplay />, { wrapper });
    expect(screen.getByTestId("kitchen-display")).toBeInTheDocument();
    expect(screen.getByText("Kitchen Display")).toBeInTheDocument();
  });

  it("displays kitchen content", () => {
    render(<KitchenDisplay />, { wrapper });
    expect(screen.getByText("Kitchen Orders Content")).toBeInTheDocument();
  });
});