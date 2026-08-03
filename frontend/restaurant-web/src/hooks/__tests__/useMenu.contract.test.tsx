import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import api from "../../utils/api";
import { useMenu } from "../useMenu";

jest.mock("../../utils/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ restaurantId: "restaurant-1" }),
}));

const mockedApi = api as unknown as { get: jest.Mock };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useMenu owner contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the authenticated restaurant menu, including unavailable dishes", async () => {
    const dish = {
      id: "dish-local13-menu-fixture",
      name: "LOCAL-13 Abnahmegericht",
      isAvailable: false,
    };
    mockedApi.get.mockResolvedValue({ data: [dish] });

    const { result } = renderHook(() => useMenu(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual([dish]));

    expect(mockedApi.get).toHaveBeenCalledWith(
      "/restaurants/restaurant-1/menu",
    );
  });
});
