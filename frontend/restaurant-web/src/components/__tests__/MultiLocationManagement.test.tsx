import { render, screen, waitFor } from "@testing-library/react";
import { MultiLocationManagement } from "../MultiLocation/MultiLocationManagement";
import api from "../../utils/api";

jest.mock("../MultiLocation/MultiLocationManagement.css", () => ({}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ restaurantId: "restaurant-1" }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock("../../utils/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("MultiLocationManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("unwraps the standard API envelope before rendering locations", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "location-1",
            name: "Hauptstandort",
            isActive: true,
            totalOrders: 3,
            totalRevenue: 42.5,
          },
        ],
      },
    });

    render(<MultiLocationManagement />);

    expect(await screen.findByText("Hauptstandort")).toBeInTheDocument();
    expect(screen.getByText("€42.50")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      "/restaurants/restaurant-1/locations",
    );
  });

  it("renders locations returned as a raw array by the E2E API", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: [
        {
          id: "location-1",
          name: "Hauptstandort",
          isActive: true,
        },
      ],
    });

    render(<MultiLocationManagement />);

    expect(await screen.findByText("Hauptstandort")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders a controlled error for a malformed response", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: { locations: [] } },
    });

    render(<MultiLocationManagement />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Standorte nicht verfügbar",
      );
    });
  });
});
