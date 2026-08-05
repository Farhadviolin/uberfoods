import "reflect-metadata";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuditService } from "./audit.service";
import { DriverAuditService } from "../../common/services/driver-audit.service";
import { AdminRole } from "../../common/enums/admin-role.enum";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";

describe("AdminController statistics contracts", () => {
  let controller: AdminController;
  const adminService = {
    getCustomerGrowth: jest.fn(),
    getOrderStatusDistribution: jest.fn(),
  };

  beforeEach(async () => {
    controller = new AdminController(
      adminService as unknown as AdminService,
      {} as AuditService,
      {} as DriverAuditService,
    );
    jest.clearAllMocks();
  });

  it("delegates customer growth with the canonical period", async () => {
    const response = [{ date: "2026-08-05", count: 2 }];
    adminService.getCustomerGrowth.mockResolvedValue(response);

    await expect(controller.getCustomerGrowth("7d")).resolves.toEqual(response);
    expect(adminService.getCustomerGrowth).toHaveBeenCalledWith("7d");
  });

  it("delegates order status distribution with the canonical period", async () => {
    const response = { distribution: { delivered: 2 } };
    adminService.getOrderStatusDistribution.mockResolvedValue(response);

    await expect(controller.getOrderStatusDistribution("7d")).resolves.toEqual(response);
    expect(adminService.getOrderStatusDistribution).toHaveBeenCalledWith("7d");
  });

  it.each([
    AdminRole.SUPER_ADMIN,
    AdminRole.ADMIN,
    AdminRole.MODERATOR,
  ])("restricts customer growth to %s roles", (role) => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AdminController.prototype.getCustomerGrowth,
    );
    expect(roles).toContain(role);
  });

  it("does not grant customer, restaurant, or driver roles", () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AdminController.prototype.getOrderStatusDistribution,
    );
    expect(roles).not.toEqual(
      expect.arrayContaining(["CUSTOMER", "RESTAURANT", "DRIVER"]),
    );
  });
});
