import { StrictMode, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AdvancedReporting } from "../Reporting/AdvancedReporting";

const mockExecute = jest.fn();

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ restaurantId: "restaurant-1" }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock("../../hooks/useRetry", () => ({
  useRetry: () => ({ execute: mockExecute }),
}));

jest.mock("../../utils/api", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock("../common/Skeleton", () => ({
  Skeleton: () => <div />,
  SkeletonChart: () => <div />,
  SkeletonCard: () => <div />,
}));

jest.mock("recharts", () => {
  const Chart = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  );

  return {
    LineChart: Chart,
    Line: Chart,
    BarChart: Chart,
    Bar: Chart,
    PieChart: Chart,
    Pie: Chart,
    Cell: Chart,
    XAxis: Chart,
    YAxis: Chart,
    CartesianGrid: Chart,
    Tooltip: Chart,
    Legend: Chart,
    ResponsiveContainer: Chart,
  };
});

const validReport = {
  revenue: { daily: [], weekly: [], monthly: [] },
  orders: { byStatus: [], byTime: [] },
  dishes: { topSelling: [], categoryBreakdown: [] },
  customers: { newVsReturning: { new: 0, returning: 0 }, topCustomers: [] },
  locations: [],
};

describe("AdvancedReporting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute.mockResolvedValue({
      success: true,
      data: validReport,
    });
  });

  it("unwraps the API envelope without rendering an error boundary", async () => {
    render(
      <StrictMode>
        <AdvancedReporting />
      </StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByText("Umsatzentwicklung")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an explicit error for an incomplete response", async () => {
    mockExecute.mockResolvedValue({ success: true, data: {} });
    render(<AdvancedReporting />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ungültiges Berichtsdatenformat.",
    );
    expect(screen.getByRole("button", { name: "Erneut versuchen" })).toBeInTheDocument();
  });

  it("shows an explicit error for a failed report request", async () => {
    mockExecute.mockRejectedValue(new Error("Berichte nicht verfügbar"));
    render(<AdvancedReporting />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Berichte nicht verfügbar",
    );
  });

  it("renders a legitimate empty report without crashing", async () => {
    render(<AdvancedReporting />);

    await waitFor(() =>
      expect(screen.getByText("Umsatzentwicklung")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
