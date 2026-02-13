import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useSuppliers,
  useSupplierOrders,
  useCreateSupplier,
} from "../useSuppliers";
import { AuthProvider } from "../../contexts/AuthContext";
import { ToastProvider } from "../../contexts/ToastContext";

jest.mock("../../utils/api");
import api from "../../utils/api";

const mockApi = api as jest.Mocked<typeof api>;

const createWrapper = (initialAuthState: any = { user: null, token: null }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialAuthState={initialAuthState}>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe("useSuppliers hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches suppliers for a restaurant", async () => {
    const mockSuppliers = [
      {
        id: "sup-1",
        restaurantId: "rest-1",
        name: "Acme Foods",
        contactPerson: "Anna",
        email: "anna@acme.com",
        phone: "+431234567",
        address: "Main Street 1",
        paymentTerms: "NET_30",
        rating: 4.5,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      },
    ];

    mockApi.get.mockResolvedValueOnce({ data: mockSuppliers });

    const { result } = renderHook(() => useSuppliers(), {
      wrapper: createWrapper({
        user: { id: "restaurant-1", restaurantId: "rest-1" },
        token: "token",
      }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.get).toHaveBeenCalledWith("/suppliers?restaurantId=rest-1");
    expect(result.current.data).toEqual(mockSuppliers);
  });

  it("fetches supplier orders for a restaurant", async () => {
    const mockOrders = [
      {
        id: "order-1",
        supplierId: "sup-1",
        restaurantId: "rest-1",
        orderDate: "2024-01-10",
        status: "PENDING",
        totalAmount: 123.45,
        items: [{ name: "Tomatoes", quantity: 10, unitPrice: 2.5 }],
      },
    ];

    mockApi.get.mockResolvedValueOnce({ data: mockOrders });

    const { result } = renderHook(() => useSupplierOrders(), {
      wrapper: createWrapper({
        user: { id: "restaurant-1", restaurantId: "rest-1" },
        token: "token",
      }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.get).toHaveBeenCalledWith(
      "/supplier-orders?restaurantId=rest-1",
    );
    expect(result.current.data).toEqual(mockOrders);
  });

  it("creates a supplier", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: "sup-1" } });

    const { result } = renderHook(() => useCreateSupplier(), {
      wrapper: createWrapper({
        user: { id: "restaurant-1", restaurantId: "rest-1" },
        token: "token",
      }),
    });

    await result.current.mutateAsync({
      restaurantId: "rest-1",
      name: "New Supplier",
      contactPerson: "Max",
      email: "max@example.com",
      phone: "+43123456",
      address: "Street 5",
      paymentTerms: "NET_30",
      rating: 4.2,
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      "/suppliers",
      expect.objectContaining({
        restaurantId: "rest-1",
        name: "New Supplier",
      }),
    );
  });
});
