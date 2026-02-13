import { jest } from "@jest/globals";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { OrderService } from "./order.service";
import { createPrismaMock, PrismaMock } from "../../common/testing/prisma-mock";

describe("OrderService", () => {
  let prisma: PrismaMock;
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
    deletePattern: jest.Mock;
  };
  let metricsService: {
    incrementCounter: jest.Mock;
    recordHistogram: jest.Mock;
    incrementOrderTotal: jest.Mock;
  };
  let webhookService: { sendWebhook: jest.Mock };
  let moduleRef: { get: jest.Mock };
  let service: OrderService;

  beforeEach(() => {
    prisma = createPrismaMock();
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn(),
    };
    metricsService = {
      incrementCounter: jest.fn(),
      recordHistogram: jest.fn(),
      incrementOrderTotal: jest.fn(),
    };
    webhookService = { sendWebhook: jest.fn() };
    moduleRef = { get: jest.fn() };

    service = new OrderService(
      prisma as any,
      cacheService as any,
      metricsService as any,
      webhookService as any,
      moduleRef as any,
    );
  });

  describe("findOne", () => {
    it("findet Order per ID", async () => {
      const mockOrder = {
        id: "o1",
        status: "PENDING",
        totalAmount: 25.99,
        customerId: "c1",
        restaurantId: "r1",
      };
      (prisma.order.findUnique as any).mockResolvedValueOnce(mockOrder);

      const result = await service.findOne("o1");

      expect(result).toEqual(mockOrder);
      expect(prisma.order.findUnique).toHaveBeenCalled();
    });

    it("wirft NotFoundException wenn Order nicht existiert", async () => {
      (prisma.order.findUnique as any).mockResolvedValueOnce(null);

      await expect(service.findOne("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateStatus", () => {
    it("aktualisiert Order-Status erfolgreich", async () => {
      const mockOrder = {
        id: "o1",
        status: "PENDING",
        totalAmount: 25.99,
        customerId: "c1",
        restaurantId: "r1",
        customer: null,
        driver: null,
        items: [],
        payments: [],
        promotion: null,
        restaurant: null,
      };
      // findOne wird intern aufgerufen
      (prisma.order.findUnique as any).mockResolvedValueOnce(mockOrder);
      (prisma.order.update as any).mockResolvedValueOnce({
        ...mockOrder,
        status: "CONFIRMED",
      });

      const result = await service.updateStatus("o1", "CONFIRMED");

      expect(result.status).toBe("CONFIRMED");
      expect(prisma.order.update).toHaveBeenCalled();
    });

    it("wirft Fehler wenn Order nicht existiert", async () => {
      (prisma.order.findUnique as any).mockResolvedValueOnce(null);

      await expect(
        service.updateStatus("invalid", "CONFIRMED"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
