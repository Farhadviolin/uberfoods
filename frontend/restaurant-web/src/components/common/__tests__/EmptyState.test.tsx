import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "../Skeleton";

describe("EmptyState action contract", () => {
  it("renders an accessible button and calls the action exactly once", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <EmptyState
        title="Keine Pläne"
        description="Noch keine Pläne vorhanden."
        action={{ label: "Plan erstellen", onClick }}
      />,
    );

    const button = screen.getByRole("button", { name: "Plan erstellen" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeEnabled();
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard activation and disabled actions", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    const { rerender } = render(
      <EmptyState
        title="Keine Pläne"
        action={{ label: "Plan erstellen", onClick }}
      />,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <EmptyState
        title="Keine Pläne"
        action={{ label: "Plan erstellen", onClick, disabled: true }}
      />,
    );

    expect(screen.getByRole("button", { name: "Plan erstellen" })).toBeDisabled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a stable empty state without an action", () => {
    render(<EmptyState title="Keine Pläne" />);

    expect(screen.getByRole("heading", { name: "Keine Pläne" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
