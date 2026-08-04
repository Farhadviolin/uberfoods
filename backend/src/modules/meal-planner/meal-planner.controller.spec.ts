import { BadRequestException } from "@nestjs/common";
import { MealPlannerController } from "./meal-planner.controller";

describe("MealPlannerController restaurant contract", () => {
  const service = {
    assertRestaurantAccess: jest.fn(),
    getWeekly: jest.fn(),
    getShoppingList: jest.fn(),
  } as any;
  let controller: MealPlannerController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MealPlannerController(service);
    service.assertRestaurantAccess.mockResolvedValue("restaurant-1");
  });

  it("passes the authenticated restaurant and validated week range to the service", async () => {
    service.getWeekly.mockResolvedValue([]);

    await expect(
      controller.getWeekly(
        { id: "restaurant-1", role: "RESTAURANT" },
        { weekStart: "2025-01-06" },
      ),
    ).resolves.toEqual([]);
    expect(service.getWeekly).toHaveBeenCalledWith(
      "restaurant-1",
      new Date("2025-01-06T00:00:00.000Z"),
    );
  });

  it("rejects malformed and reversed date ranges as controlled 400 errors", async () => {
    await expect(
      controller.getWeekly(undefined, { weekStart: "2025-02-30" }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.getShoppingList(undefined, {
        startDate: "2025-01-12",
        endDate: "2025-01-06",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getShoppingList).not.toHaveBeenCalled();
  });

  it("returns the empty shopping-list contract for a valid range", async () => {
    service.getShoppingList.mockResolvedValue({
      totalMeals: 0,
      totalCost: 0,
      restaurants: [],
      items: [],
    });

    await expect(
      controller.getShoppingList(
        { id: "restaurant-1", role: "RESTAURANT" },
        { startDate: "2025-01-06", endDate: "2025-01-12" },
      ),
    ).resolves.toEqual({
      totalMeals: 0,
      totalCost: 0,
      restaurants: [],
      items: [],
    });
  });
});
