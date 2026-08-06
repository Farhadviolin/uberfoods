import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import api from "../../utils/api";

jest.mock("../../utils/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

function SessionProbe() {
  const { isAuthenticated, loading, restaurantId, user } = useAuth();

  return (
    <>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="restaurant-id">{restaurantId ?? ""}</div>
      {isAuthenticated && <div data-testid="protected-shell">Dashboard</div>}
      <div data-testid="user-email">{user?.email ?? ""}</div>
    </>
  );
}

describe("AuthContext stored session contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("restores a valid stored session through Auth-Me exactly once", async () => {
    localStorage.setItem("restaurant_token", "stored-valid-token");
    localStorage.setItem(
      "restaurant_user",
      JSON.stringify({
        id: "restaurant-session-test",
        email: "restaurant-session@example.test",
        role: "restaurant",
        name: "Stored Restaurant",
      }),
    );
    localStorage.setItem("restaurant_id", "restaurant-session-test");
    mockApi.get.mockResolvedValueOnce({
      data: {
        id: "restaurant-session-test",
        email: "restaurant-session@example.test",
        role: "RESTAURANT",
        name: "Validated Restaurant",
      },
    } as never);

    render(
      <StrictMode>
        <AuthProvider>
          <SessionProbe />
        </AuthProvider>
      </StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenCalledWith("/auth/me");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("protected-shell")).toBeInTheDocument();
    expect(screen.getByTestId("restaurant-id")).toHaveTextContent(
      "restaurant-session-test",
    );
    expect(screen.getByTestId("user-email")).toHaveTextContent(
      "restaurant-session@example.test",
    );
    expect(localStorage.getItem("restaurant_token")).toBe("stored-valid-token");
  });

  it("removes an invalid stored session and never exposes the protected shell", async () => {
    localStorage.setItem("restaurant_token", "stored-invalid-token");
    localStorage.setItem(
      "restaurant_user",
      JSON.stringify({
        id: "restaurant-invalid-session-test",
        email: "invalid-session@example.test",
        role: "restaurant",
      }),
    );
    localStorage.setItem("restaurant_id", "restaurant-invalid-session-test");
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });

    render(
      <StrictMode>
        <AuthProvider>
          <SessionProbe />
        </AuthProvider>
      </StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.queryByTestId("protected-shell")).not.toBeInTheDocument();
    expect(localStorage.getItem("restaurant_token")).toBeNull();
    expect(localStorage.getItem("restaurant_user")).toBeNull();
    expect(localStorage.getItem("restaurant_id")).toBeNull();
  });
});
