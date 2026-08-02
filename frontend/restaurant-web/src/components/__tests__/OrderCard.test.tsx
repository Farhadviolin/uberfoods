import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Order } from "../../hooks/useOrders";
import { OrderCard } from "../Orders/OrderCard";

const mockMutateAsync = jest.fn();
const mockShowToast = jest.fn();

jest.mock("../../hooks/useOrders", () => ({
  useUpdateOrderStatus: () => ({ mutateAsync: mockMutateAsync }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock("../Orders/OrderDetails", () => ({
  OrderDetails: () => <div>Order details</div>,
}));

const baseOrder: Order = {
  id: "order-card-1",
  status: "CONFIRMED",
  totalAmount: 18.5,
  createdAt: "2026-07-26T11:00:00.000Z",
  updatedAt: "2026-07-26T11:05:00.000Z",
  address: "Kartengasse 2",
  phone: "+43 1 111222",
  version: 12,
  customer: {
    id: "customer-2",
    name: "Card Customer",
    email: "card@example.com",
    phone: "+43 1 111222",
  },
  restaurant: {
    id: "restaurant-1",
    name: "Test Restaurant",
  },
  driver: {
    id: "driver-2",
    name: "Card Driver",
    phone: "+43 1 333444",
  },
  items: [
    {
      id: "item-2",
      quantity: 1,
      price: 18.5,
      dish: {
        id: "dish-2",
        name: "Test Burger",
        category: "burger",
      },
    },
  ],
};

describe("OrderCard status updates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockMutateAsync.mockResolvedValue({
      ...baseOrder,
      status: "PREPARING",
      version: 13,
    });
  });

  it("uses the status DTO without the response-only order version", async () => {
    render(<OrderCard order={baseOrder} />);

    expect(screen.getByText("Card Customer")).toBeInTheDocument();
    expect(screen.getByText("Card Driver")).toBeInTheDocument();
    expect(
      screen.getByTestId("restaurant-order-card-order-card-1"),
    ).toHaveAttribute("data-order-id", "order-card-1");
    expect(screen.queryByRole("button", { name: "Fertig" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bereit" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Zubereiten" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        orderId: "order-card-1",
        status: "PREPARING",
      }),
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      "Status auf In Zubereitung geändert",
      "success",
    );
    expect(baseOrder).toMatchObject({
      id: "order-card-1",
      status: "CONFIRMED",
      version: 12,
      restaurant: { id: "restaurant-1" },
      driver: { id: "driver-2" },
    });
  });

  it("moves a pending order through the real restaurant lifecycle", async () => {
    const pendingOrder = { ...baseOrder, status: "PENDING" };
    render(<OrderCard order={pendingOrder} />);

    fireEvent.click(screen.getByRole("button", { name: "Annehmen" }));
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        orderId: "order-card-1",
        status: "CONFIRMED",
      }),
    );
  });

  it("sets READY_FOR_PICKUP after preparation instead of skipping the state machine", async () => {
    const preparingOrder = { ...baseOrder, status: "PREPARING" };
    render(<OrderCard order={preparingOrder} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Bereit zur Abholung" }),
    );
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        orderId: "order-card-1",
        status: "READY_FOR_PICKUP",
      }),
    );
  });

  it("handles an order without a version without inventing one", async () => {
    const { version: _version, ...orderWithoutVersion } = baseOrder;
    render(<OrderCard order={orderWithoutVersion} />);

    fireEvent.click(screen.getByRole("button", { name: "Zubereiten" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        orderId: "order-card-1",
        status: "PREPARING",
      }),
    );
  });

  it("restores the server status and shows only an error when rejected", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Status conflict"));
    render(<OrderCard order={baseOrder} />);

    fireEvent.click(screen.getByRole("button", { name: "Zubereiten" }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith("Status conflict", "error"),
    );
    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.any(String),
      "success",
    );
    expect(
      screen.getByTestId("restaurant-order-status-order-card-1"),
    ).toHaveTextContent("Bestätigt (CONFIRMED)");
    expect(localStorage.getItem("restaurant_order_status_order-card-1")).toBe(
      "CONFIRMED",
    );
  });
});
