import { render, screen } from "@testing-library/react";
import { SupplierManagement } from "../Supplier/SupplierManagement";

jest.mock("../Supplier/SupplierManagement.css", () => ({}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ restaurantId: "rest-1" }),
}));

jest.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock("../../hooks/useSuppliers", () => ({
  useSuppliers: () => ({
    data: [
      {
        id: "sup-1",
        restaurantId: "rest-1",
        name: "Acme Foods",
        contactPerson: "Anna",
        email: "anna@acme.com",
        phone: "+431234567",
        address: "Main Street 1",
        paymentTerms: "NET_30",
        rating: 4.5,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      },
    ],
    isLoading: false,
  }),
  useSupplierOrders: () => ({
    data: [
      {
        id: "order-1",
        supplierId: "sup-1",
        restaurantId: "rest-1",
        orderDate: "2024-01-10",
        status: "PENDING",
        totalAmount: 123.45,
        items: [{ name: "Tomatoes", quantity: 10, unitPrice: 2.5 }],
      },
    ],
    isLoading: false,
  }),
  useCreateSupplier: () => ({ mutateAsync: jest.fn() }),
  useCreateSupplierOrder: () => ({ mutateAsync: jest.fn() }),
  useToggleSupplierStatus: () => ({ mutateAsync: jest.fn() }),
}));

describe("SupplierManagement component", () => {
  it("renders suppliers and orders", () => {
    render(<SupplierManagement />);

    expect(screen.getByText("Lieferanten-Verwaltung")).toBeInTheDocument();
    expect(screen.getByText("Acme Foods")).toBeInTheDocument();
    expect(screen.getByText(/Bestellung #/i)).toBeInTheDocument();
  });
});
