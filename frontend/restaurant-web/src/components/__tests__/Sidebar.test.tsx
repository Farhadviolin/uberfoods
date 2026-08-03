import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../Sidebar";

jest.mock("../Sidebar.css", () => ({}));

describe("Sidebar", () => {
  it("renders all menu items", () => {
    const mockHandler = jest.fn();
    render(<Sidebar activeTab="dashboard" onTabChange={mockHandler} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Bestellungen")).toBeInTheDocument();
    expect(screen.getByText("Küche (KDS)")).toBeInTheDocument();
  });

  it("calls onTabChange when item is clicked", () => {
    const mockHandler = jest.fn();
    render(<Sidebar activeTab="dashboard" onTabChange={mockHandler} />);

    const ordersButton = screen.getByRole("button", { name: /Bestellungen/i });
    fireEvent.click(ordersButton);

    expect(mockHandler).toHaveBeenCalledWith("orders");
  });

  it("marks auxiliary features without backend contracts as unavailable", () => {
    render(<Sidebar activeTab="dashboard" onTabChange={jest.fn()} />);

    expect(screen.getByRole("button", { name: /Bewertungen/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Aktionen/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Support/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Lieferanten/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Finanzen/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Buchhaltung \(E\/A\)/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /Monitoring/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Inventar/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Mitarbeiter/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Schichtplanung/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /Marketing/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Tische/i })).toBeDisabled();
  });
});
