import { RbacService } from "./rbac.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("RbacService", () => {
  const prisma = {
    admin: {
      findUnique: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
  };
  let service: RbacService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RbacService(prisma as unknown as PrismaService);
  });

  it("returns the persisted ADMIN permissions including order:read", async () => {
    prisma.admin.findUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: true,
    });
    prisma.role.findUnique.mockResolvedValue({
      permissions: ["order:read", "order:update"],
    });

    await expect(
      service.getUserPermissions("admin-id", "ADMIN"),
    ).resolves.toEqual(["order:read", "order:update"]);
    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { name: "ADMIN" },
      select: { permissions: true },
    });
  });

  it("deduplicates persisted permissions", async () => {
    prisma.admin.findUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: true,
    });
    prisma.role.findUnique.mockResolvedValue({
      permissions: ["order:read", "order:read", "driver:read"],
    });

    await expect(
      service.getUserPermissions("admin-id", "ADMIN"),
    ).resolves.toEqual(["order:read", "driver:read"]);
  });

  it("returns no permissions for an unknown admin", async () => {
    prisma.admin.findUnique.mockResolvedValue(null);

    await expect(
      service.getUserPermissions("missing-admin", "ADMIN"),
    ).resolves.toEqual([]);
    expect(prisma.role.findUnique).not.toHaveBeenCalled();
  });

  it("returns no permissions for an inactive admin", async () => {
    prisma.admin.findUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: false,
    });

    await expect(
      service.getUserPermissions("inactive-admin", "ADMIN"),
    ).resolves.toEqual([]);
    expect(prisma.role.findUnique).not.toHaveBeenCalled();
  });

  it("returns no permissions for an unknown persisted role", async () => {
    prisma.admin.findUnique.mockResolvedValue({
      role: "FUTURE_ROLE",
      isActive: true,
    });
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(
      service.getUserPermissions("future-admin", "FUTURE_ROLE"),
    ).resolves.toEqual([]);
  });

  it("returns no permissions when the persisted Role row is missing", async () => {
    prisma.admin.findUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: true,
    });
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(
      service.getUserPermissions("admin-id", "ADMIN"),
    ).resolves.toEqual([]);
  });

  it("ignores request role data and resolves the persisted role", async () => {
    prisma.admin.findUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: true,
    });
    prisma.role.findUnique.mockResolvedValue({
      permissions: ["order:read"],
    });

    await expect(
      service.getUserPermissions("admin-id", "SUPER_ADMIN"),
    ).resolves.toEqual(["order:read"]);
    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { name: "ADMIN" },
      select: { permissions: true },
    });
  });

  it("fails closed when persistence throws", async () => {
    prisma.admin.findUnique.mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(
      service.getUserPermissions("admin-id", "ADMIN"),
    ).resolves.toEqual([]);
    expect(prisma.role.findUnique).not.toHaveBeenCalled();
  });
});
