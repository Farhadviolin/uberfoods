import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export type DriverAuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "SHIFT_START"
  | "SHIFT_END"
  | "BREAK_START"
  | "BREAK_END"
  | "STATUS_UPDATE"
  | "ORDER_ACCEPT"
  | "ORDER_REJECT"
  | "ORDER_STATUS"
  | "POD_OTP"
  | "POD_PHOTO"
  | "LOCATION_CHECKPOINT"
  | "GEOFENCE_EVENT"
  | "EMERGENCY_SOS"
  | "DEVICE_HANDSHAKE"
  | "OFFLINE_SYNC"
  | "SETTINGS_CHANGE"
  | "OTHER";

export interface DriverAuditPayload {
  driverId: string;
  action: DriverAuditAction;
  orderId?: string;
  location?: { lat: number; lng: number };
  deviceId?: string;
  appVersion?: string;
  networkType?: string;
  battery?: number;
  region?: string;
  isOfflineSync?: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export interface DriverAuditQuery {
  driverId: string;
  action?: DriverAuditAction;
  orderId?: string;
  from?: Date;
  to?: Date;
  deviceId?: string;
  offlineOnly?: boolean;
  limit?: number;
}

@Injectable()
export class DriverAuditService {
  private readonly logger = new Logger(DriverAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(payload: DriverAuditPayload) {
    try {
      const client = (this.prisma as any).driverAuditEvent;
      if (!client) {
        this.logger.warn(
          "driverAuditEvent client not available on PrismaService",
        );
        return null;
      }
      return await client.create({
        data: {
          driverId: payload.driverId,
          action: payload.action,
          orderId: payload.orderId,
          location: payload.location
            ? { lat: payload.location.lat, lng: payload.location.lng }
            : undefined,
          deviceId: payload.deviceId,
          appVersion: payload.appVersion,
          networkType: payload.networkType,
          battery: payload.battery,
          region: payload.region,
          isOfflineSync: payload.isOfflineSync ?? false,
          metadata: payload.metadata,
          createdAt: payload.createdAt ?? undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Audit log failed for driver ${payload.driverId}: ${payload.action}`,
        error as Error,
      );
      // Do not throw to avoid breaking main flows
      return null;
    }
  }

  async list(query: DriverAuditQuery) {
    const where: any = { driverId: query.driverId };
    if (query.action) where.action = query.action;
    if (query.orderId) where.orderId = query.orderId;
    if (query.deviceId) where.deviceId = query.deviceId;
    if (query.offlineOnly) where.isOfflineSync = true;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = query.from;
      if (query.to) where.createdAt.lte = query.to;
    }

    const limit = Math.min(query.limit ?? 200, 1000);
    const client = (this.prisma as any).driverAuditEvent;
    if (!client) {
      this.logger.warn(
        "driverAuditEvent client not available on PrismaService",
      );
      return [];
    }

    return client.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }
}
