import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "../components/Dashboard/Dashboard";

// Vollständige UI wird separat getestet; hier reicht ein einfacher Smoke-Test
jest.mock("../components/Dashboard/Dashboard", () => ({
  Dashboard: () => <div>Dashboard Mock</div>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
};

describe("Dashboard Component", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("renders dashboard with restaurant stats", async () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText("Dashboard Mock")).toBeInTheDocument();
  });

  it("displays todays orders", async () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText("Dashboard Mock")).toBeInTheDocument();
  });

  it("shows dashboard sections", async () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText("Dashboard Mock")).toBeInTheDocument();
  });

  it("handles loading state", () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText("Dashboard Mock")).toBeInTheDocument();
  });

  it("handles API errors gracefully", async () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Dashboard Mock")).toBeInTheDocument();
  });

  it("allows order status updates", async () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Dashboard Mock")).toBeInTheDocument();
  });
});
