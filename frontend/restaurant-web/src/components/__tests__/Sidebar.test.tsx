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
});
