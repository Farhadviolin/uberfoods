import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MealPlannerService } from "./meal-planner.service";

describe("MealPlannerService restaurant contract", () => {
  const prisma = {
    restaurant: { findFirst: jest.fn() },
    mealPlan: { findMany: jest.fn() },
    dish: { findMany: jest.fn() },
  } as any;
  let service: MealPlannerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MealPlannerService(prisma);
  });

  it("requires an authenticated restaurant with active ownership", async () => {
    await expect(service.assertRestaurantAccess()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    await expect(
      service.assertRestaurantAccess({ id: "restaurant-1", role: "CUSTOMER" }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.restaurant.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.assertRestaurantAccess({
        id: "restaurant-1",
        role: "RESTAURANT",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns only the authenticated restaurant's empty weekly contract", async () => {
    prisma.restaurant.findFirst.mockResolvedValue({ id: "restaurant-1" });
    prisma.mealPlan.findMany.mockResolvedValue([]);

    await expect(
      service.assertRestaurantAccess({
        id: "restaurant-1",
        role: "RESTAURANT",
      }),
    ).resolves.toBe("restaurant-1");
    await expect(
      service.getWeekly("restaurant-1", new Date("2025-01-06T00:00:00.000Z")),
    ).resolves.toEqual([]);

    expect(prisma.mealPlan.findMany).toHaveBeenCalledWith({
      where: {
        restaurantId: "restaurant-1",
        isActive: true,
        date: {
          gte: new Date("2025-01-06T00:00:00.000Z"),
          lt: new Date("2025-01-13T00:00:00.000Z"),
        },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
  });

  it("returns the canonical empty shopping-list response without querying dishes", async () => {
    prisma.mealPlan.findMany.mockResolvedValue([]);

    await expect(
      service.getShoppingList(
        "restaurant-1",
        new Date("2025-01-06T00:00:00.000Z"),
        new Date("2025-01-12T00:00:00.000Z"),
      ),
    ).resolves.toEqual({
      totalMeals: 0,
      totalCost: 0,
      restaurants: [],
      items: [],
    });
    expect(prisma.dish.findMany).not.toHaveBeenCalled();
  });

  it("aggregates only dishes owned by the authenticated restaurant", async () => {
    prisma.mealPlan.findMany.mockResolvedValue([
      {
        dishIds: ["dish-1", "dish-1", "dish-2"],
        restaurant: { name: "Test Restaurant" },
      },
    ]);
    prisma.dish.findMany.mockResolvedValue([
      { id: "dish-1", name: "Soup", price: 4, imageUrl: null },
    ]);

    await expect(
      service.getShoppingList(
        "restaurant-1",
        new Date("2025-01-06T00:00:00.000Z"),
        new Date("2025-01-12T00:00:00.000Z"),
      ),
    ).resolves.toEqual({
      totalMeals: 1,
      totalCost: 8,
      restaurants: ["Test Restaurant"],
      items: [
        {
          dishId: "dish-1",
          name: "Soup",
          restaurant: "Test Restaurant",
          quantity: 2,
          unitPrice: 4,
          totalPrice: 8,
        },
      ],
    });
    expect(prisma.dish.findMany).toHaveBeenCalledWith({
      where: {
        restaurantId: "restaurant-1",
        id: { in: ["dish-1", "dish-2"] },
        isActive: true,
      },
      select: { id: true, name: true, price: true, imageUrl: true },
    });
  });
});
