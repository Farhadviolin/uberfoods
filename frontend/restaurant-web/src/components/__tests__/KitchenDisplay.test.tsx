import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Order } from "../../hooks/useOrders";
import { KitchenDisplay } from "../Kitchen/KitchenDisplay";

const mockMutateAsync = jest.fn();
const mockShowToast = jest.fn();
let mockOrders: Order[] = [];
let mockOrdersError: Error | null = null;

jest.mock("../../hooks/useOrders", () => ({
  useKitchenOrders: () => ({
    data: mockOrders,
    isError: Boolean(mockOrdersError),
    error: mockOrdersError,
  }),
  useUpdateOrderStatus: () => ({ mutateAsync: mockMutateAsync }),
}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ restaurantId: "restaurant-1" }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const baseOrder: Order = {
  id: "order-kitchen-1",
  status: "CONFIRMED",
  totalAmount: 25,
  createdAt: "2026-07-26T10:00:00.000Z",
  updatedAt: "2026-07-26T10:05:00.000Z",
  address: "Testgasse 1",
  phone: "+43 1 234567",
  notes: "Ohne Zwiebeln",
  version: 7,
  customer: {
    id: "customer-1",
    name: "Kitchen Customer",
    email: "kitchen@example.com",
    phone: "+43 1 234567",
  },
  restaurant: {
    id: "restaurant-1",
    name: "Test Restaurant",
  },
  driver: {
    id: "driver-1",
    name: "Test Driver",
    phone: "+43 1 765432",
  },
  items: [
    {
      id: "item-1",
      quantity: 2,
      price: 12.5,
      dish: {
        id: "dish-1",
        name: "Test Pizza",
        category: "pizza",
      },
    },
  ],
};

describe("KitchenDisplay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrders = [baseOrder];
    mockOrdersError = null;
    mockMutateAsync.mockResolvedValue({
      ...baseOrder,
      status: "PREPARING",
      version: 8,
    });
  });

  it("renders kitchen display", () => {
    render(<KitchenDisplay />);
    expect(
      screen.getByRole("heading", { name: "Kitchen Display System (KDS)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Kitchen Customer")).toBeInTheDocument();
  });

  it("displays kitchen content", () => {
    render(<KitchenDisplay />);
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("Test Pizza")).toBeInTheDocument();
    expect(screen.getByText("Ohne Zwiebeln")).toBeInTheDocument();
  });

  it("shows a normal empty state for an empty successful list", () => {
    mockOrders = [];

    render(<KitchenDisplay />);

    expect(screen.getByText("Keine aktiven Bestellungen")).toBeInTheDocument();
  });

  it("uses the status DTO without the response-only order version", async () => {
    render(<KitchenDisplay />);

    fireEvent.click(screen.getByRole("button", { name: "Zubereiten starten" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: "order-kitchen-1",
        status: "PREPARING",
      }),
    );
    expect(mockShowToast).toHaveBeenCalledWith("Status geändert", "success");
    expect(baseOrder).toMatchObject({
      id: "order-kitchen-1",
      status: "CONFIRMED",
      version: 7,
      restaurant: { id: "restaurant-1" },
      driver: { id: "driver-1" },
    });
  });

  it("handles an order without a version without inventing one", async () => {
    const { version: _version, ...orderWithoutVersion } = baseOrder;
    mockOrders = [{ ...orderWithoutVersion, status: "PREPARING" }];

    render(<KitchenDisplay />);
    fireEvent.click(screen.getByRole("button", { name: "Fertig ✓" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: "order-kitchen-1",
        status: "READY_FOR_PICKUP",
      }),
    );
  });

  it("shows a KDS API error instead of an empty success state", () => {
    mockOrdersError = new Error("KDS API unavailable");

    render(<KitchenDisplay />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bestellungen konnten nicht geladen werden: KDS API unavailable",
    );
    expect(
      screen.queryByText("Keine aktiven Bestellungen"),
    ).not.toBeInTheDocument();
  });

  it("does not report a rejected update as successful", async () => {
    mockMutateAsync.mockRejectedValue(
      Object.assign(new Error("Status conflict"), { statusCode: 409 }),
    );

    render(<KitchenDisplay />);
    fireEvent.click(screen.getByRole("button", { name: "Zubereiten starten" }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith("Status conflict", "error"),
    );
    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.any(String),
      "success",
    );
  });
});
