import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import api from "../../utils/api";

jest.mock("../../utils/api", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

function Probe() {
  const { isAuthenticated, login } = useAuth();

  return (
    <>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <button
        type="button"
        onClick={() =>
          void login("customer@example.test", "password").catch(() => undefined)
        }
      >
        Login
      </button>
    </>
  );
}

describe("restaurant role boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("rejects a non-restaurant role before a session can reach onboarding", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        access_token: "customer-token",
        user: {
          id: "customer-1",
          email: "customer@example.test",
          role: "customer",
        },
      },
    } as never);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith("/auth/restaurant/login", {
        email: "customer@example.test",
        password: "password",
      }),
    );
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(localStorage.getItem("restaurant_token")).toBeNull();
    expect(localStorage.getItem("restaurant_user")).toBeNull();
    expect(localStorage.getItem("restaurant_id")).toBeNull();
  });
});
