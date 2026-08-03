import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { RestaurantMenuController } from "./restaurant-menu.controller";

describe("RestaurantMenuController", () => {
  const prisma = {
    dish: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const controller = new RestaurantMenuController(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates an owned menu item with the canonical PUT contract", async () => {
    const dish = { id: "dish-cola", restaurantId: "restaurant-1" };
    const body = { isAvailable: false };
    prisma.dish.findFirst.mockResolvedValue(dish);
    prisma.dish.update.mockResolvedValue({ ...dish, ...body });

    await expect(
      controller.updateMenuItem("restaurant-1", "dish-cola", body, {
        id: "restaurant-1",
      }),
    ).resolves.toEqual({ ...dish, ...body });

    expect(prisma.dish.findFirst).toHaveBeenCalledWith({
      where: { id: "dish-cola", restaurantId: "restaurant-1" },
    });
    expect(prisma.dish.update).toHaveBeenCalledWith({
      where: { id: "dish-cola" },
      data: body,
    });
  });

  it("rejects a restaurant that does not own the route parameter", async () => {
    await expect(
      controller.updateMenuItem("restaurant-1", "dish-cola", { isAvailable: false }, {
        id: "restaurant-2",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.dish.findFirst).not.toHaveBeenCalled();
    expect(prisma.dish.update).not.toHaveBeenCalled();
  });

  it("returns not found for a dish outside the restaurant boundary", async () => {
    prisma.dish.findFirst.mockResolvedValue(null);

    await expect(
      controller.updateMenuItem("restaurant-1", "dish-pizza-hawaii", { isAvailable: false }, {
        id: "restaurant-1",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.dish.update).not.toHaveBeenCalled();
  });
});
