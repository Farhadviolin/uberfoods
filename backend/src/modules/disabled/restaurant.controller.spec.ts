import { Test, TestingModule } from "@nestjs/testing";
import { RestaurantController } from "./restaurant.controller";
import { RestaurantService } from "./restaurant.service";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { getTestEmail } from "../../test/utils/test-credentials";

describe("RestaurantController", () => {
  let controller: RestaurantController;
  let service: RestaurantService;
  let prisma: PrismaService;

  const mockRestaurantService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    restaurant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestaurantController],
      providers: [
        { provide: RestaurantService, useValue: mockRestaurantService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<RestaurantController>(RestaurantController);
    service = module.get<RestaurantService>(RestaurantService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("sollte alle Restaurants zurückgeben", async () => {
      const mockRestaurants = {
        data: [{ id: "r1", name: "Restaurant 1" }],
        pagination: { page: 1, limit: 20, total: 1 },
      };
      mockRestaurantService.findAll.mockResolvedValue(mockRestaurants);

      const result = await controller.findAll({});

      expect(result).toEqual(mockRestaurants);
      expect(mockRestaurantService.findAll).toHaveBeenCalled();
    });

    it("sollte Filter anwenden", async () => {
      const mockRestaurants = { data: [], pagination: { page: 1, limit: 20, total: 0 } };
      mockRestaurantService.findAll.mockResolvedValue(mockRestaurants);

      await controller.findAll({ status: "ACTIVE", isActive: "true" });

      expect(mockRestaurantService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ACTIVE", isActive: true }),
        expect.any(Object)
      );
    });
  });

  describe("findOne", () => {
    it("sollte einzelnes Restaurant zurückgeben", async () => {
      const mockRestaurant = { id: "r1", name: "Restaurant 1" };
      mockRestaurantService.findOne.mockResolvedValue(mockRestaurant);

      const result = await controller.findOne("r1");

      expect(result).toEqual(mockRestaurant);
      expect(mockRestaurantService.findOne).toHaveBeenCalledWith("r1");
    });
  });

  describe("create", () => {
    it("sollte neues Restaurant erstellen", async () => {
      const createDto = {
        name: "New Restaurant",
        address: "123 Main St",
        email: getTestEmail("RESTAURANT_LOGIN"),
      };
      const mockRestaurant = { id: "r1", ...createDto };
      mockRestaurantService.create.mockResolvedValue(mockRestaurant);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockRestaurant);
      expect(mockRestaurantService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe("update", () => {
    it("sollte Restaurant aktualisieren", async () => {
      const updateDto = { name: "Updated Restaurant" };
      const mockRestaurant = { id: "r1", ...updateDto };
      mockRestaurantService.update.mockResolvedValue(mockRestaurant);

      const result = await controller.update("r1", updateDto);

      expect(result).toEqual(mockRestaurant);
      expect(mockRestaurantService.update).toHaveBeenCalledWith("r1", updateDto);
    });
  });

  describe("delete", () => {
    it("sollte Restaurant löschen", async () => {
      mockRestaurantService.delete.mockResolvedValue({ id: "r1" });

      await controller.delete("r1");

      expect(mockRestaurantService.delete).toHaveBeenCalledWith("r1");
    });
  });
});
