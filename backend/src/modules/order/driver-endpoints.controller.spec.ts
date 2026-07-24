import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { DriverController as LegacyDriverController } from "../../controllers/driver.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DriverEndpointsController } from "./driver-endpoints.controller";

describe("DriverEndpointsController security", () => {
  const orderFindMany = jest.fn();
  const orderFindUnique = jest.fn();
  const orderUpdate = jest.fn();
  const prisma = {
    order: {
      findMany: orderFindMany,
      findUnique: orderFindUnique,
      update: orderUpdate,
    },
  } as unknown as PrismaService;

  let controller: DriverEndpointsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DriverEndpointsController(prisma);
  });

  it("requires JWT authentication and the DRIVER role for every endpoint", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      DriverEndpointsController,
    );
    const roles = Reflect.getMetadata(ROLES_KEY, DriverEndpointsController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual(["DRIVER"]);
  });

  it("has no competing legacy handler for the canonical available-orders route", () => {
    expect(LegacyDriverController.prototype).not.toHaveProperty(
      "getAvailableOrders",
    );
  });

  it("keeps every remaining legacy driver endpoint behind the same guards", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, LegacyDriverController);
    const roles = Reflect.getMetadata(ROLES_KEY, LegacyDriverController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual(["DRIVER"]);
  });

  it("allows driver roles and rejects non-driver roles", () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const createContext = (role: string) =>
      ({
        getHandler: () => controller.getActiveOrders,
        getClass: () => DriverEndpointsController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: "user-1", role } }),
        }),
      }) as unknown as ExecutionContext;

    expect(guard.canActivate(createContext("driver"))).toBe(true);
    expect(() => guard.canActivate(createContext("customer"))).toThrow(
      ForbiddenException,
    );
  });

  it("limits active orders to the authenticated driver", async () => {
    orderFindMany.mockResolvedValue([]);

    await controller.getActiveOrders("driver-authenticated");

    expect(orderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          driverId: "driver-authenticated",
          status: { in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"] },
        },
      }),
    );
  });

  it("rejects reading another driver's active orders through the alias", async () => {
    await expect(
      controller.getActiveOrdersByDriverId(
        "driver-authenticated",
        "driver-other",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it("rejects reading available orders through another driver's alias", async () => {
    await expect(
      controller.getAvailableOrdersByDriverId(
        "driver-authenticated",
        "driver-other",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it("rejects accepting an order through another driver's alias", async () => {
    await expect(
      controller.acceptOrderWithDriverId(
        "driver-authenticated",
        "driver-other",
        "order-1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(orderFindUnique).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("rejects updating an order through another driver's alias", async () => {
    await expect(
      controller.updateOrderStatusWithDriverId(
        "driver-authenticated",
        "driver-other",
        "order-1",
        { status: "PICKED_UP" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(orderFindUnique).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("allows the authenticated driver to use an alias", async () => {
    orderFindMany.mockResolvedValue([]);

    await controller.getActiveOrdersByDriverId("driver-1", "driver-1");

    expect(orderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ driverId: "driver-1" }),
      }),
    );
  });
});
