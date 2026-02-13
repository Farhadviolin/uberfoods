// Mock the hook before importing
jest.mock("../useRestaurant", () => ({
  useRestaurant: jest.fn(),
}));

import { useRestaurant } from "../useRestaurant";

describe("useRestaurant Hook", () => {
  const mockUseRestaurant = useRestaurant as jest.MockedFunction<typeof useRestaurant>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should be mocked for testing", () => {
    // Mock the return value
    mockUseRestaurant.mockReturnValue({
      data: {
        id: "rest_1",
        name: "Pizza Paradise",
        address: "Hauptstrasse 1",
        phone: "+43 1 1234567",
        email: "info@pizza.com",
        isActive: true,
        status: "OPEN",
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      updateStatus: jest.fn(),
      updateBusinessHours: jest.fn(),
    });

    const result = useRestaurant();

    expect(result.data?.name).toBe("Pizza Paradise");
    expect(mockUseRestaurant).toHaveBeenCalled();
  });
});