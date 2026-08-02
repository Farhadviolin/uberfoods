import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { Header } from "../Header";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";

jest.mock("../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/api", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock("../../hooks/useRestaurantStatus", () => ({
  useRestaurantStatus: () => ({ data: { status: "OPEN" } }),
  useUpdateRestaurantStatus: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("../../hooks/useWebSocket", () => ({
  useWebSocket: () => ({ isConnected: true }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockApi = api as jest.Mocked<typeof api>;

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("Header logout", () => {
  function renderHeader(logout = jest.fn()) {
    mockUseAuth.mockReturnValue({
      user: {
        id: "restaurant-1",
        email: "restaurant@example.test",
        name: "Test Restaurant",
        role: "restaurant",
      },
      token: "valid-token",
      restaurantId: "restaurant-1",
      mustChangePassword: false,
      isAuthenticated: true,
      loading: false,
      logout,
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Header newOrdersCount={0} onNotificationClick={jest.fn()} />
        <LocationProbe />
      </MemoryRouter>,
    );

    return logout;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears the auth state and navigates to login", async () => {
    const logout = jest.fn();
    mockApi.post.mockResolvedValue({} as never);
    renderHeader(logout);

    fireEvent.click(screen.getByRole("button", { name: "Abmelden" }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/auth/logout"));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });

  it("navigates to login even when the server logout is unavailable", async () => {
    const logout = jest.fn();
    mockApi.post.mockRejectedValue(new Error("server unavailable"));
    renderHeader(logout);

    fireEvent.click(screen.getByRole("button", { name: "Abmelden" }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});
