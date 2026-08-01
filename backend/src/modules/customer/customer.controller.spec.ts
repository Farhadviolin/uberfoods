import { UnauthorizedException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";

describe("CustomerController profile", () => {
  const prisma = {
    customer: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;
  let controller: CustomerController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CustomerController(
      prisma,
      {} as CustomerService,
    );
  });

  it("requires the JWT and customer-role guards", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CustomerController.prototype.getProfile,
    );

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(
      Reflect.getMetadata("roles", CustomerController.prototype.getProfile),
    ).toEqual(["CUSTOMER"]);
  });

  it("loads only the authenticated customer and a safe profile projection", async () => {
    const customer = {
      id: "customer-1",
      email: "customer-1@example.test",
      name: "Customer One",
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
      emailVerified: true,
    };
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue(customer);

    await expect(
      controller.getProfile({
        user: {
          id: "customer-1",
          sub: "customer-1",
          role: "customer",
        },
      }),
    ).resolves.toEqual(customer);

    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        emailVerified: true,
      },
    });
  });

  it("fails closed when the principal or database customer is missing", async () => {
    await expect(controller.getProfile({})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      controller.getProfile({
        user: { id: "missing-customer", sub: "missing-customer", role: "customer" },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("fails closed for an inactive customer", async () => {
    (prisma.customer.findUnique as jest.Mock).mockResolvedValue({
      id: "inactive-customer",
      isActive: false,
    });

    await expect(
      controller.getProfile({
        user: {
          id: "inactive-customer",
          sub: "inactive-customer",
          role: "customer",
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
