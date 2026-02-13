import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useTables,
  useReservations,
  useCreateTable,
  useCreateReservation,
  useUpdateTableStatus,
} from "../useTables";
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

describe("useTables hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches tables for a restaurant", async () => {
    const mockTables = [
      {
        id: "table-1",
        restaurantId: "rest-1",
        number: 1,
        capacity: 4,
        status: "AVAILABLE",
        shape: "SQUARE",
        location: { x: 0, y: 0 },
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      },
    ];

    mockApi.get.mockResolvedValueOnce({ data: mockTables });

    const { result } = renderHook(() => useTables(), {
      wrapper: createWrapper({
        user: { id: "restaurant-1", restaurantId: "rest-1" },
        token: "token",
      }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.get).toHaveBeenCalledWith("/tables?restaurantId=rest-1");
    expect(result.current.data).toEqual(mockTables);
  });

  it("fetches reservations for a restaurant", async () => {
    const mockReservations = [
      {
        id: "res-1",
        restaurantId: "rest-1",
        tableId: "table-1",
        customerName: "Jane",
        customerPhone: "+43111222",
        partySize: 2,
        reservationTime: "2024-02-01T18:00:00Z",
        status: "CONFIRMED",
      },
    ];

    mockApi.get.mockResolvedValueOnce({ data: mockReservations });

    const { result } = renderHook(() => useReservations(), {
      wrapper: createWrapper({
        user: { id: "restaurant-1", restaurantId: "rest-1" },
        token: "token",
      }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.get).toHaveBeenCalledWith(
      "/reservations?restaurantId=rest-1",
    );
    expect(result.current.data).toEqual(mockReservations);
  });

  it("creates a table and updates status", async () => {
    mockApi.post.mockResolvedValue({ data: { id: "table-1" } });
    mockApi.patch.mockResolvedValue({
      data: { id: "table-1", status: "RESERVED" },
    });

    const wrapper = createWrapper({
      user: { id: "restaurant-1", restaurantId: "rest-1" },
      token: "token",
    });

    const createTableHook = renderHook(() => useCreateTable(), {
      wrapper,
    });
    await createTableHook.result.current.mutateAsync({
      restaurantId: "rest-1",
      number: 10,
      capacity: 6,
      shape: "ROUND",
    });
    expect(mockApi.post).toHaveBeenCalledWith(
      "/tables",
      expect.objectContaining({ restaurantId: "rest-1", number: 10 }),
    );

    const updateStatusHook = renderHook(() => useUpdateTableStatus(), {
      wrapper,
    });
    await updateStatusHook.result.current.mutateAsync({
      id: "table-1",
      status: "RESERVED",
    });
    expect(mockApi.patch).toHaveBeenCalledWith("/tables/table-1/status", {
      status: "RESERVED",
    });
  });

  it("creates a reservation", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: "res-1" } });

    const { result } = renderHook(() => useCreateReservation(), {
      wrapper: createWrapper({
        user: { id: "restaurant-1", restaurantId: "rest-1" },
        token: "token",
      }),
    });

    await result.current.mutateAsync({
      restaurantId: "rest-1",
      tableId: "table-1",
      customerName: "John Doe",
      customerPhone: "+431234567",
      partySize: 4,
      reservationTime: "2024-02-01T19:00:00Z",
      status: "CONFIRMED",
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      "/reservations",
      expect.objectContaining({
        restaurantId: "rest-1",
        tableId: "table-1",
        customerName: "John Doe",
      }),
    );
  });
});
