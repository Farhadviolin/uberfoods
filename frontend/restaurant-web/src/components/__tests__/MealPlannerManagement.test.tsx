import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MealPlannerManagement } from "../MealPlannerManagement";

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

describe("MealPlannerManagement empty state", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders and activates the empty-state action without an ErrorBoundary", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);
    const scrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    render(<MealPlannerManagement />);
    fireEvent.change(screen.getByLabelText("Wochenstart für Meal-Plan"), {
      target: { value: "2025-01-06" },
    });

    const action = await screen.findByRole("button", {
      name: "Meal-Plan erstellen",
    });
    expect(action).toBeInTheDocument();

    fireEvent.click(action);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("keeps the empty state stable when the weekly plan is empty", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    render(<MealPlannerManagement />);
    fireEvent.change(screen.getByLabelText("Wochenstart für Meal-Plan"), {
      target: { value: "2025-01-06" },
    });

    await waitFor(() => {
      expect(screen.getByText(/Keine Pläne für diese Woche gefunden/)).toBeInTheDocument();
    });
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });
});
