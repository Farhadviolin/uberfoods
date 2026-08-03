import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useCreateDeliveryZone, useOperatingHours } from "../useRestaurant";
import api from "../../utils/api";

jest.mock("../../utils/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCreateDeliveryZone", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds a zone through the supported read-then-replace contract", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: "existing-zone",
            restaurantId: "restaurant-1",
            name: "Existing",
            coordinates: [{ lat: 48.2, lng: 16.3 }],
            deliveryFee: 2.5,
          },
        ],
      },
    });
    mockApi.put.mockResolvedValueOnce({ data: { id: "restaurant-1" } });

    const { result } = renderHook(() => useCreateDeliveryZone(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      restaurantId: "restaurant-1",
      zone: {
        name: "New",
        coordinates: [{ lat: 48.21, lng: 16.37 }],
        fee: 0,
      },
    });

    expect(mockApi.get).toHaveBeenCalledWith(
      "/restaurants/restaurant-1/delivery-zones",
    );
    expect(mockApi.put).toHaveBeenCalledWith(
      "/restaurants/restaurant-1/delivery-zones",
      {
        zones: [
          {
            name: "Existing",
            coordinates: [{ lat: 48.2, lng: 16.3 }],
            deliveryFee: 2.5,
            isActive: true,
          },
          {
            name: "New",
            coordinates: [{ lat: 48.21, lng: 16.37 }],
            deliveryFee: 0,
            isActive: true,
          },
        ],
      },
    );
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('rejects an unsuccessful GET envelope without calling PUT', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { success: false, data: [] },
    });

    const { result } = renderHook(() => useCreateDeliveryZone(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({
      restaurantId: "restaurant-1",
      zone: {
        name: "New",
        coordinates: [{ lat: 48.21, lng: 16.37 }],
        fee: 0,
      },
    })).rejects.toThrow('Ungültige Lieferzonen-Antwort.');
    expect(mockApi.put).not.toHaveBeenCalled();
    expect(mockApi.post).not.toHaveBeenCalled();
  });
});

describe("standard API envelopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("unwraps operating-hours data before onboarding consumes it", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          monday: { open: "09:00", close: "22:00", isClosed: false },
          tuesday: { open: "09:00", close: "22:00", isClosed: false },
          wednesday: { open: "09:00", close: "22:00", isClosed: false },
          thursday: { open: "09:00", close: "22:00", isClosed: false },
          friday: { open: "09:00", close: "23:00", isClosed: false },
          saturday: { open: "10:00", close: "23:00", isClosed: false },
          sunday: { open: "10:00", close: "22:00", isClosed: false },
        },
      },
    });

    const { result } = renderHook(() => useOperatingHours("restaurant-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.monday.isClosed).toBe(false);
    expect(mockApi.get).toHaveBeenCalledWith(
      "/restaurants/restaurant-1/operating-hours",
    );
  });
});
