import { SocialDiscoveryService } from "./social-discovery.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("SocialDiscoveryService", () => {
  const prisma = {
    order: {
      findMany: jest.fn(),
    },
  };
  const service = new SocialDiscoveryService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.clearAllMocks());

  it("maps live orders to an anonymized deterministic response", async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: "private-order-id",
        createdAt: new Date("2026-07-28T10:00:00.000Z"),
        restaurant: { name: "Safe Restaurant" },
        items: [{ dish: { name: "Safe Dish" } }],
      },
    ]);

    const result = await service.getLiveOrders(10);

    expect(result).toEqual([
      {
        id: expect.stringMatching(/^[a-f0-9]{20}$/),
        restaurant: "Safe Restaurant",
        dish: "Safe Dish",
        userName: "Anonymous",
        timestamp: "2026-07-28T10:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("private-order-id");
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 10,
      }),
    );
  });

  it("aggregates and deterministically sorts trending dishes", async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        items: [
          {
            quantity: 2,
            dish: {
              id: "dish-b",
              name: "Bowl",
              restaurant: { id: "restaurant-b", name: "Beta" },
            },
          },
        ],
      },
      {
        items: [
          {
            quantity: 3,
            dish: {
              id: "dish-a",
              name: "Pizza",
              restaurant: { id: "restaurant-a", name: "Alpha" },
            },
          },
        ],
      },
    ]);

    const result = await service.getTrendingDishes(1);

    expect(result).toEqual([
      {
        id: expect.stringMatching(/^[a-f0-9]{20}$/),
        dish: "Pizza",
        restaurantName: "Alpha",
        count: 3,
        trend: "up",
      },
    ]);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 500,
      }),
    );
  });

  it("returns valid empty arrays without synthetic data", async () => {
    prisma.order.findMany.mockResolvedValue([]);

    await expect(service.getLiveOrders(20)).resolves.toEqual([]);
    await expect(service.getTrendingDishes(10)).resolves.toEqual([]);
  });
});
