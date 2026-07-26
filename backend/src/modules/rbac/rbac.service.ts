import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserPermissions(
    userId: string,
    _userRole?: string,
  ): Promise<string[]> {
    if (!userId) {
      return [];
    }

    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
        select: {
          role: true,
          isActive: true,
        },
      });

      if (!admin?.isActive) {
        return [];
      }

      const role = await this.prisma.role.findUnique({
        where: { name: String(admin.role).toUpperCase() },
        select: { permissions: true },
      });

      if (!role) {
        return [];
      }

      return [
        ...new Set(
          role.permissions.filter(
            (permission): permission is string =>
              typeof permission === "string" && permission.length > 0,
          ),
        ),
      ];
    } catch (error) {
      this.logger.error(
        `Failed to resolve persisted permissions for admin ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
  }

  async incrementPermissionDenial(
    _userId: string,
    _permission: string,
  ): Promise<void> {
    // Placeholder implementation
  }
}
