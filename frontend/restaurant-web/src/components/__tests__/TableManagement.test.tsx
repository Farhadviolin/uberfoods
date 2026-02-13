import { render, screen } from "@testing-library/react";
import { TableManagement } from "../TableManagement/TableManagement";

jest.mock("../TableManagement/TableManagement.css", () => ({}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ restaurantId: "rest-1" }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock("../../hooks/useTables", () => ({
  useTables: () => ({
    data: [
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
    ],
    isLoading: false,
  }),
  useReservations: () => ({
    data: [
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
    ],
    isLoading: false,
  }),
  useCreateTable: () => ({ mutateAsync: jest.fn() }),
  useCreateReservation: () => ({ mutateAsync: jest.fn() }),
  useUpdateTableStatus: () => ({ mutateAsync: jest.fn() }),
}));

describe("TableManagement component", () => {
  it("renders tables and reservations", () => {
    render(<TableManagement />);

    expect(screen.getByText("Tischverwaltung")).toBeInTheDocument();
    expect(screen.getByText(/Tisch 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Reservierungen/i)).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });
});
