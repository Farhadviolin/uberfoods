import { ForbiddenException } from "@nestjs/common";
import { RestaurantController } from "./restaurant.controller";

describe("RestaurantController reports ownership", () => {
  const report = { revenue: { daily: [] } };
  const service = {
    getReports: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    getLocations: jest.fn(),
    createLocation: jest.fn(),
    toggleLocationStatus: jest.fn(),
    deleteLocation: jest.fn(),
    getEstimatedDeliveryTime: jest.fn(),
  };
  const prisma = {
    dish: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const controller = new RestaurantController(service as any, prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
    service.getReports.mockResolvedValue(report);
    service.findOne.mockResolvedValue({
      id: "restaurant-1",
      deliveryFee: 4.5,
      minOrderAmount: 15,
      freeDeliveryThreshold: 30,
    });
    service.update.mockResolvedValue({ id: "restaurant-1" });
    service.getEstimatedDeliveryTime.mockResolvedValue({
      estimatedTime: 30,
      unit: "minutes",
    });
  });

  it("serves the customer POST estimated-delivery-time contract", async () => {
    await expect(
      controller.postEstimatedDeliveryTime("restaurant-1", {
        customerLocation: { lat: 48.2082, lng: 16.3738 },
      }),
    ).resolves.toEqual({ estimatedDeliveryTime: 30, unit: "minutes" });

    expect(service.getEstimatedDeliveryTime).toHaveBeenCalledWith(
      "restaurant-1",
      { lat: 48.2082, lng: 16.3738 },
    );
  });

  it("serves reports for the authenticated restaurant", async () => {
    await expect(
      controller.getReports(
        "restaurant-1",
        { range: "30days", type: "overview" },
        { id: "restaurant-1", role: "RESTAURANT" },
      ),
    ).resolves.toBe(report);

    expect(service.getReports).toHaveBeenCalledWith(
      "restaurant-1",
      "30days",
      "overview",
    );
  });

  it.each([
    ["a different restaurant", { id: "restaurant-2", role: "RESTAURANT" }],
    ["a missing actor", undefined],
  ])("rejects reports for %s", async (_description, actor) => {
    await expect(
      controller.getReports("restaurant-1", {}, actor as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getReports).not.toHaveBeenCalled();
  });

  it("reads the persisted menu for the authenticated restaurant", async () => {
    const dishes = [{ id: "dish-1", restaurantId: "restaurant-1" }];
    prisma.dish.findMany.mockResolvedValue(dishes);

    await expect(
      controller.getRestaurantMenu("restaurant-1", {
        id: "restaurant-1",
        role: "RESTAURANT",
      }),
    ).resolves.toBe(dishes);

    expect(prisma.dish.findMany).toHaveBeenCalledWith({
      where: { restaurantId: "restaurant-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("reads one persisted menu item only within the restaurant ownership boundary", async () => {
    const dish = { id: "dish-1", restaurantId: "restaurant-1" };
    prisma.dish.findFirst.mockResolvedValue(dish);

    await expect(
      controller.getRestaurantMenuItem("restaurant-1", "dish-1", {
        id: "restaurant-1",
        role: "RESTAURANT",
      }),
    ).resolves.toBe(dish);

    expect(prisma.dish.findFirst).toHaveBeenCalledWith({
      where: { id: "dish-1", restaurantId: "restaurant-1" },
    });

    await expect(
      controller.getRestaurantMenuItem("restaurant-1", "dish-1", {
        id: "restaurant-2",
        role: "RESTAURANT",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("reads and updates persisted delivery-fee settings for the owner", async () => {
    await expect(
      controller.getDeliveryFees("restaurant-1", {
        id: "restaurant-1",
        role: "RESTAURANT",
      }),
    ).resolves.toEqual({
      baseFee: 4.5,
      perKmFee: 0,
      minOrderAmount: 15,
      freeDeliveryThreshold: 30,
    });

    await controller.updateDeliveryFees(
      "restaurant-1",
      { baseFee: 5, minOrderAmount: 20 },
      { id: "restaurant-1", role: "RESTAURANT" },
    );
    expect(service.update).toHaveBeenCalledWith("restaurant-1", {
      deliveryFee: 5,
      minOrderAmount: 20,
    });

    await expect(
      controller.getDeliveryFees("restaurant-1", {
        id: "restaurant-2",
        role: "RESTAURANT",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires restaurant ownership for multi-location reads and writes", async () => {
    service.getLocations.mockResolvedValue([]);
    service.createLocation.mockResolvedValue({ id: "location-1" });
    service.toggleLocationStatus.mockResolvedValue({ id: "location-1" });
    service.deleteLocation.mockResolvedValue({ id: "location-1" });
    const owner = { id: "restaurant-1", role: "RESTAURANT" };

    await expect(controller.getLocations("restaurant-1", owner)).resolves.toEqual([]);
    await expect(
      controller.createLocation("restaurant-1", { name: "Main" } as any, owner),
    ).resolves.toEqual({ id: "location-1" });
    await expect(
      controller.toggleLocationStatus("restaurant-1", "location-1", owner),
    ).resolves.toEqual({ id: "location-1" });
    await expect(
      controller.deleteLocation("restaurant-1", "location-1", owner),
    ).resolves.toEqual({ id: "location-1" });

    const foreign = { id: "restaurant-2", role: "RESTAURANT" };
    await expect(controller.getLocations("restaurant-1", foreign)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      controller.createLocation("restaurant-1", { name: "Main" } as any, foreign),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.toggleLocationStatus("restaurant-1", "location-1", foreign),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.deleteLocation("restaurant-1", "location-1", foreign),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
