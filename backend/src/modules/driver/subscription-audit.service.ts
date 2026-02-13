import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface AuditFilters {
  driverId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: unknown;
}

interface AuditWhereFilter {
  entity: string;
  entityId?: string;
  action?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  [key: string]: unknown;
}

interface AuditDetails {
  [key: string]: unknown;
}

@Injectable()
export class SubscriptionAuditService {
  private readonly logger = new Logger(SubscriptionAuditService.name);

  constructor(private prisma: PrismaService) {}

  async getFilteredAuditTrail(filters: AuditFilters = {}) {
    const where: AuditWhereFilter = {
      entity: "subscription", // Filter for subscription-related audit logs
    };

    if (filters.driverId) {
      where.entityId = filters.driverId; // Use entityId for driverId
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.dateFrom) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(filters.dateFrom),
      };
    }

    if (filters.dateTo) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(filters.dateTo),
      };
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to match expected format
    return auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      driverId: log.entityId,
      adminId: log.userId,
      details: log.changes || {},
      createdAt: log.createdAt,
    }));
  }

  async logSubscriptionAction(
    action: string,
    driverId: string,
    adminId: string,
    details: AuditDetails = {},
  ) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action,
        entity: "subscription",
        entityId: driverId,
        changes: details as any,
      },
    });

    return {
      id: auditLog.id,
      action: auditLog.action,
      driverId: auditLog.entityId,
      adminId: auditLog.userId,
      details: auditLog.changes || {},
      createdAt: auditLog.createdAt,
    };
  }
}
