import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionUtil } from "../utils/encryption.util";
import { CacheService } from "../cache/cache.service";

export interface SyncData {
  userId: string;
  deviceId: string;
  lastSyncTimestamp: Date;
  pendingChanges: PendingChange[];
  conflicts: SyncConflict[];
}

export interface PendingChange {
  id: string;
  table: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  data: any;
  timestamp: Date;
  version: number;
}

export interface SyncConflict {
  id: string;
  table: string;
  localData: any;
  serverData: any;
  conflictType: "version" | "data" | "deletion";
  resolution?: "local" | "server" | "merge";
  timestamp: Date;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  conflicts: number;
  errors: string[];
  lastSyncTimestamp: Date;
}

@Injectable()
export class OfflineSyncService {
  private readonly logger = new Logger(OfflineSyncService.name);
  private readonly maxSyncItems = 1000;
  private readonly syncTimeout = 30000; // 30 seconds

  constructor(
    private prisma: PrismaService,
    private encryptionUtil: EncryptionUtil,
    private cacheService?: CacheService,
  ) {}

  /**
   * Initialize offline sync for a user device
   */
  async initializeSync(userId: string, deviceId: string): Promise<SyncData> {
    try {
      // Get or create sync state
      const syncState = await this.prisma.syncState.upsert({
        where: {
          userId_deviceId: {
            userId,
            deviceId,
          },
        },
        create: {
          userId,
          deviceId,
          lastSyncTimestamp: new Date(),
          syncVersion: 1,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      // Get pending changes from queue
      const pendingQueueItems = await this.prisma.syncQueue.findMany({
        where: {
          userId,
          deviceId,
          status: "pending",
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      const pendingChanges: PendingChange[] = pendingQueueItems.map((item) => ({
        id: item.id,
        table: item.table,
        operation: item.operation as "INSERT" | "UPDATE" | "DELETE",
        data: item.data as any,
        timestamp: item.createdAt,
        version: item.version,
      }));

      // Get pending conflicts
      const conflicts = await this.getPendingConflicts(
        this.prisma,
        userId,
        deviceId,
      );

      const syncData: SyncData = {
        userId,
        deviceId,
        lastSyncTimestamp: syncState.lastSyncTimestamp,
        pendingChanges,
        conflicts,
      };

      return syncData;
    } catch (error) {
      this.logger.error(
        `Failed to initialize sync for ${userId}:${deviceId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sync data from device to server
   */
  async syncFromDevice(
    userId: string,
    deviceId: string,
    changes: PendingChange[],
    clientLastSync: Date,
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Validate input
      if (changes.length > this.maxSyncItems) {
        throw new BadRequestException(
          `Too many changes: ${changes.length}. Maximum allowed: ${this.maxSyncItems}`,
        );
      }

      // Process changes in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        let processedItems = 0;
        let conflicts = 0;

        for (const change of changes) {
          try {
            await this.processChange(tx, change, userId);
            processedItems++;
          } catch (error) {
            if (error.message.includes("conflict")) {
              conflicts++;
              await this.recordConflict(
                tx,
                change,
                userId,
                deviceId,
                error.message,
              );
            } else {
              errors.push(
                `Failed to process change ${change.id}: ${error.message}`,
              );
            }
          }
        }

        // Update sync timestamp
        const lastSyncTimestamp = new Date();

        // Update sync state
        await tx.syncState.upsert({
          where: {
            userId_deviceId: {
              userId,
              deviceId,
            },
          },
          create: {
            userId,
            deviceId,
            lastSyncTimestamp,
            syncVersion: 1,
          },
          update: {
            lastSyncTimestamp,
            syncVersion: { increment: 1 },
            updatedAt: lastSyncTimestamp,
          },
        });

        return {
          success: errors.length === 0,
          syncedItems: processedItems,
          conflicts,
          errors,
          lastSyncTimestamp,
        };
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Sync completed for ${userId}:${deviceId} in ${duration}ms - ${result.syncedItems} items, ${result.conflicts} conflicts`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Sync failed for ${userId}:${deviceId}`, error);
      return {
        success: false,
        syncedItems: 0,
        conflicts: 0,
        errors: [error.message],
        lastSyncTimestamp: new Date(),
      };
    }
  }

  /**
   * Get data changes for device sync
   */
  async getSyncData(
    userId: string,
    deviceId: string,
    since: Date,
    tables: string[] = ["orders", "locations", "notifications"],
  ): Promise<any> {
    try {
      const changes: any = {};

      // Get changes for each requested table
      for (const table of tables) {
        changes[table] = await this.getTableChanges(userId, table, since);
      }

      // Include any pending conflicts
      const conflicts = await this.getPendingConflicts(
        this.prisma,
        userId,
        deviceId,
      );
      changes.conflicts = conflicts;

      return {
        changes,
        timestamp: new Date(),
        deviceId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get sync data for ${userId}:${deviceId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Resolve sync conflicts
   */
  async resolveConflicts(
    userId: string,
    deviceId: string,
    resolutions: Array<{
      conflictId: string;
      resolution: "local" | "server" | "merge";
    }>,
  ): Promise<{ resolved: number; failed: number }> {
    let resolved = 0;
    let failed = 0;

    try {
      for (const res of resolutions) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Get conflict from SyncConflict model
            const conflict = await tx.syncConflict.findUnique({
              where: { id: res.conflictId },
            });

            if (!conflict) {
              // Fallback: Try AuditLog
              const conflictLog = await tx.auditLog.findUnique({
                where: { id: res.conflictId },
              });

              if (!conflictLog || conflictLog.entity !== "sync_conflict") {
                throw new NotFoundException("Conflict not found");
              }

              // Use AuditLog fallback logic
              const changes = conflictLog.changes as any;
              const conflictUserId = conflictLog.userId;
              const conflictDeviceId = conflictLog.ipAddress;

              if (conflictUserId && conflictUserId !== userId) {
                throw new ForbiddenException("Conflict access denied");
              }
              if (conflictDeviceId && conflictDeviceId !== deviceId) {
                throw new ForbiddenException("Conflict device mismatch");
              }

              // Extract conflict data
              const conflict = {
                id: res.conflictId,
                table: changes.table,
                localData: changes.localData
                  ? this.encryptionUtil.decryptPII(changes.localData)
                  : null,
                serverData: changes.serverData
                  ? this.encryptionUtil.decryptPII(changes.serverData)
                  : null,
                conflictType: changes.conflictType || "version",
                userId: conflictUserId || userId,
              };

              // Apply resolution
              if (res.resolution === "local") {
                await this.applyLocalResolution(tx, conflict);
              } else if (res.resolution === "server") {
                // Server version already exists, just mark as resolved
                this.logger.log(
                  `Using server version for conflict ${res.conflictId}`,
                );
              } else if (res.resolution === "merge") {
                await this.applyMergeResolution(tx, conflict);
              }

              // Mark conflict as resolved in AuditLog
              await tx.auditLog.create({
                data: {
                  entity: "sync_conflict",
                  entityId: res.conflictId,
                  action: "CONFLICT_RESOLVED",
                  changes: {
                    conflictId: res.conflictId,
                    resolution: res.resolution,
                    resolvedAt: new Date().toISOString(),
                    originalConflict: {
                      table: conflict.table,
                      conflictType: conflict.conflictType,
                    },
                  } as any,
                  userId: userId || null,
                  ipAddress: deviceId,
                  userAgent: "offline-sync",
                },
              });
            }
          });

          resolved++;
        } catch (error) {
          this.logger.error(
            `Failed to resolve conflict ${res.conflictId}`,
            error,
          );
          failed++;
        }
      }

      return { resolved, failed };
    } catch (error) {
      this.logger.error("Failed to resolve conflicts", error);
      throw error;
    }
  }

  /**
   * Get offline-compatible data for initial app load
   */
  async getOfflineData(userId: string, deviceId: string): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `offline_data_${userId}_${deviceId}`;
      if (this.cacheService) {
        const cached = this.cacheService.get(cacheKey);
        if (cached) {
          this.logger.debug(
            `Cache hit for offline data: ${userId}:${deviceId}`,
          );
          return cached;
        }
      }

      const [
        userProfile,
        recentOrders,
        favoriteRestaurants,
        savedAddresses,
        appSettings,
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.getRecentOrders(userId),
        this.getFavoriteRestaurants(userId),
        this.getSavedAddresses(userId),
        this.getAppSettings(userId),
      ]);

      const offlineData = {
        userProfile,
        recentOrders,
        favoriteRestaurants,
        savedAddresses,
        appSettings,
        lastUpdated: new Date(),
        version: "1.0",
      };

      // Cache the result (1 hour TTL)
      if (this.cacheService) {
        this.cacheService.set(cacheKey, offlineData, 3600000);
        this.logger.debug(`Cached offline data: ${userId}:${deviceId}`);
      }

      return offlineData;
    } catch (error) {
      this.logger.error(`Failed to get offline data for ${userId}`, error);
      throw error;
    }
  }

  /**
   * Queue change for background sync
   */
  async queueChange(
    change: PendingChange,
    userId: string,
    deviceId: string,
  ): Promise<void> {
    try {
      await this.prisma.syncQueue.create({
        data: {
          userId,
          deviceId,
          table: change.table,
          operation: change.operation,
          data: change.data,
          version: change.version,
          status: "pending",
          maxRetries: 3,
        },
      });
      this.logger.log(
        `Change queued for sync: ${change.id} (table: ${change.table}, operation: ${change.operation})`,
      );
    } catch (error) {
      this.logger.error("Failed to queue change", error);
      throw error;
    }
  }

  /**
   * Process queued changes (background job)
   */
  async processQueuedChanges(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      // Get pending changes (wait 5 seconds before processing to batch changes)
      const queuedChanges = await this.prisma.syncQueue.findMany({
        where: {
          status: "pending",
          createdAt: { lt: new Date(Date.now() - 5000) },
          retryCount: { lt: this.prisma.syncQueue.fields.maxRetries },
        },
        orderBy: { createdAt: "asc" },
        take: 100, // Process in batches
      });

      for (const queuedChange of queuedChanges) {
        try {
          const change: PendingChange = {
            id: queuedChange.id,
            table: queuedChange.table,
            operation: queuedChange.operation as "INSERT" | "UPDATE" | "DELETE",
            data: queuedChange.data as any,
            timestamp: queuedChange.createdAt,
            version: queuedChange.version,
          };

          await this.prisma.$transaction(async (tx) => {
            await this.processChange(tx, change, queuedChange.userId);

            await tx.syncQueue.update({
              where: { id: queuedChange.id },
              data: {
                status: "completed",
                processedAt: new Date(),
                updatedAt: new Date(),
              },
            });
          });

          processed++;
        } catch (error: any) {
          this.logger.error(
            `Failed to process queued change ${queuedChange.id}`,
            error,
          );

          // Update retry count or mark as failed
          const retryCount = queuedChange.retryCount + 1;
          const maxRetries = queuedChange.maxRetries;

          await this.prisma.syncQueue.update({
            where: { id: queuedChange.id },
            data: {
              status: retryCount >= maxRetries ? "failed" : "pending",
              error: error.message,
              retryCount,
              updatedAt: new Date(),
            },
          });

          failed++;
        }
      }

      return { processed, failed };
    } catch (error) {
      this.logger.error("Failed to process queued changes", error);
      return { processed, failed: failed + 1 };
    }
  }

  private async processChange(
    tx: any,
    change: PendingChange,
    userId: string,
  ): Promise<void> {
    const { table, operation, data } = change;

    switch (table) {
      case "orders":
        await this.processOrderChange(tx, operation, data, userId);
        break;
      case "locations":
        await this.processLocationChange(tx, operation, data, userId);
        break;
      case "user_profile":
        await this.processUserProfileChange(tx, operation, data, userId);
        break;
      default:
        throw new BadRequestException(`Unsupported table: ${table}`);
    }
  }

  private async processOrderChange(
    tx: any,
    operation: string,
    data: any,
    userId: string,
  ): Promise<void> {
    switch (operation) {
      case "INSERT":
        await tx.order.create({ data: { ...data, customerId: userId } });
        break;
      case "UPDATE":
        await tx.order.update({
          where: { id: data.id, customerId: userId },
          data,
        });
        break;
      case "DELETE":
        await tx.order.update({
          where: { id: data.id, customerId: userId },
          data: { status: "CANCELLED" }, // Soft delete
        });
        break;
    }
  }

  private async processLocationChange(
    tx: any,
    operation: string,
    data: any,
    userId: string,
  ): Promise<void> {
    switch (operation) {
      case "UPDATE":
        await tx.user.update({
          where: { id: userId },
          data: {
            lastKnownLatitude: data.latitude,
            lastKnownLongitude: data.longitude,
            locationUpdatedAt: new Date(),
          },
        });
        break;
    }
  }

  private async processUserProfileChange(
    tx: any,
    operation: string,
    data: any,
    userId: string,
  ): Promise<void> {
    switch (operation) {
      case "UPDATE":
        await tx.user.update({
          where: { id: userId },
          data,
        });
        break;
    }
  }

  private async recordConflict(
    tx: any,
    change: PendingChange,
    userId: string,
    deviceId: string,
    errorMessage: string,
  ): Promise<void> {
    // Get current server data
    let serverData = null;
    try {
      switch (change.table) {
        case "orders":
          serverData = await tx.order.findUnique({
            where: { id: change.data.id },
          });
          break;
        case "customers":
          serverData = await tx.customer.findUnique({
            where: { id: change.data.id },
          });
          break;
        case "drivers":
          serverData = await tx.driver.findUnique({
            where: { id: change.data.id },
          });
          break;
        case "restaurants":
          serverData = await tx.restaurant.findUnique({
            where: { id: change.data.id },
          });
          break;
      }
    } catch (error) {
      this.logger.warn("Failed to fetch server data for conflict", error);
    }

    try {
      // Use AuditLog to track conflicts (since SyncConflict model doesn't exist)
      await tx.auditLog.create({
        data: {
          entity: "sync_conflict",
          entityId: change.data.id || "unknown",
          action: "CONFLICT_DETECTED",
          changes: {
            table: change.table,
            operation: change.operation,
            localData: this.encryptionUtil.encryptPII(change.data),
            serverData: serverData
              ? this.encryptionUtil.encryptPII(serverData)
              : null,
            conflictType: "version",
            deviceId,
            errorMessage,
            timestamp: new Date().toISOString(),
          } as any,
          userId: userId || null,
          ipAddress: deviceId,
          userAgent: "offline-sync",
        },
      });

      this.logger.warn(
        `Sync conflict recorded for ${change.table}:${change.data.id}`,
        {
          userId,
          deviceId,
          errorMessage,
        },
      );
    } catch (error) {
      this.logger.error("Failed to record sync conflict", error);
    }
  }

  private async getPendingConflicts(
    tx: any,
    userId: string,
    deviceId: string,
  ): Promise<SyncConflict[]> {
    try {
      // Use AuditLog to fetch conflicts (since SyncConflict model doesn't exist)
      const conflictLogs = await tx.auditLog.findMany({
        where: {
          entity: "sync_conflict",
          action: "CONFLICT_DETECTED",
          OR: [{ userId: userId }, { ipAddress: deviceId }],
          // Check if conflict is not resolved (no resolution action)
          NOT: {
            action: "CONFLICT_RESOLVED",
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100, // Limit conflicts
      });

      // Transform audit logs to SyncConflict format
      return conflictLogs.map((log: any) => {
        const changes = log.changes as any;
        return {
          id: log.id,
          table: changes.table || "unknown",
          localData: changes.localData
            ? this.encryptionUtil.decryptPII(changes.localData)
            : null,
          serverData: changes.serverData
            ? this.encryptionUtil.decryptPII(changes.serverData)
            : null,
          conflictType: (changes.conflictType || "version") as
            | "version"
            | "data"
            | "deletion",
          timestamp: new Date(log.createdAt),
        };
      });
    } catch (error) {
      this.logger.error("Failed to get pending conflicts", error);
      return [];
    }
  }

  private async getTableChanges(
    userId: string,
    table: string,
    since: Date,
  ): Promise<any[]> {
    switch (table) {
      case "orders":
        return this.prisma.order.findMany({
          where: {
            customerId: userId,
            updatedAt: { gte: since },
          },
          include: {
            restaurant: { select: { id: true, name: true } },
            driver: { select: { id: true, name: true } },
          },
        });

      case "locations":
        // Try to get locations based on user type
        // Check if user is a driver first
        const driver = await this.prisma.driver.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (driver) {
          // Driver locations - get from driver location history or current location
          const driverData = await this.prisma.driver.findUnique({
            where: { id: userId },
            select: { location: true },
          });
          return driverData?.location ? [driverData.location] : [];
        } else {
          // Customer locations - get from addresses
          const addresses = await this.prisma.address.findMany({
            where: {
              customerId: userId,
              updatedAt: { gte: since },
            },
            select: {
              latitude: true,
              longitude: true,
              updatedAt: true,
            },
          });
          return addresses.map((addr) => ({
            lat: addr.latitude,
            lng: addr.longitude,
            timestamp: addr.updatedAt,
          }));
        }

      case "notifications":
        return this.prisma.notification.findMany({
          where: {
            userId,
            createdAt: { gte: since },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        });

      default:
        return [];
    }
  }

  private async applyLocalResolution(tx: any, conflict: any): Promise<void> {
    if (!conflict.localData) {
      throw new BadRequestException("Local data not available for resolution");
    }

    const localData = conflict.localData;
    const entityId = localData.id || conflict.id;

    await this.processChange(
      tx,
      {
        id: entityId,
        table: conflict.table,
        operation: "UPDATE",
        data: localData,
        timestamp: new Date(),
        version: 1,
      },
      conflict.userId,
    );
  }

  private async applyMergeResolution(tx: any, conflict: any): Promise<void> {
    if (!conflict.localData) {
      throw new BadRequestException("Local data not available for merge");
    }

    const localData = conflict.localData;
    const serverData = conflict.serverData || {};
    const entityId = localData.id || serverData.id || conflict.id;

    // Smart merge strategy:
    // - Server wins for critical fields (id, timestamps, status)
    // - Local wins for user-editable fields (name, description, preferences)
    // - Combine arrays and objects where appropriate
    const criticalFields = [
      "id",
      "createdAt",
      "updatedAt",
      "status",
      "version",
    ];
    const mergedData: any = { ...serverData };

    // Apply local changes to non-critical fields
    for (const key in localData) {
      if (!criticalFields.includes(key)) {
        if (Array.isArray(localData[key]) && Array.isArray(serverData[key])) {
          // Merge arrays (remove duplicates)
          mergedData[key] = [
            ...new Set([...serverData[key], ...localData[key]]),
          ];
        } else if (
          typeof localData[key] === "object" &&
          localData[key] !== null &&
          !Array.isArray(localData[key])
        ) {
          // Merge objects
          mergedData[key] = { ...(serverData[key] || {}), ...localData[key] };
        } else {
          // Local wins for simple fields
          mergedData[key] = localData[key];
        }
      }
    }

    // Ensure critical fields from server are preserved
    for (const field of criticalFields) {
      if (serverData[field] !== undefined) {
        mergedData[field] = serverData[field];
      }
    }

    await this.processChange(
      tx,
      {
        id: entityId,
        table: conflict.table,
        operation: "UPDATE",
        data: mergedData,
        timestamp: new Date(),
        version: (serverData.version || 0) + 1,
      },
      conflict.userId,
    );
  }

  private getChangePriority(change: PendingChange): number {
    // Higher priority for critical operations
    const priorities = {
      orders: 10,
      locations: 5,
      notifications: 1,
    };

    return priorities[change.table as keyof typeof priorities] || 1;
  }

  private async getUserProfile(userId: string): Promise<any> {
    // Try to get customer profile first
    const customer = await this.prisma.customer.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        metadata: true,
      },
    });

    if (customer) {
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        preferences: customer.metadata || {},
        type: "customer",
      };
    }

    // Try to get driver profile
    const driver = await this.prisma.driver.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        location: true,
      },
    });

    if (driver) {
      return {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        avatarUrl: driver.avatarUrl,
        location: driver.location,
        type: "driver",
      };
    }

    return null;
  }

  private async getRecentOrders(userId: string): Promise<any[]> {
    return this.prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        restaurant: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  private async getFavoriteRestaurants(userId: string): Promise<any[]> {
    return this.prisma.customerFavorite.findMany({
      where: { customerId: userId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            rating: true,
            cuisines: true,
          },
        },
      },
    });
  }

  private async getSavedAddresses(userId: string): Promise<any[]> {
    return this.prisma.address.findMany({
      where: { customerId: userId },
      select: {
        id: true,
        street: true,
        city: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        isDefault: true,
      },
    });
  }

  private async getAppSettings(userId: string): Promise<any> {
    // Get user preferences from metadata
    const customer = await this.prisma.customer.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    const driver = customer
      ? null
      : await this.prisma.driver.findUnique({
          where: { id: userId },
        });

    // Get metadata from customer or driver (metadata might not exist on all models)
    const userMetadata =
      (customer as any)?.metadata || (driver as any)?.metadata || {};

    return {
      notifications: {
        orderUpdates: userMetadata.notifications?.orderUpdates ?? true,
        promotions: userMetadata.notifications?.promotions ?? true,
        driverMessages: userMetadata.notifications?.driverMessages ?? true,
      },
      language: userMetadata.language || "de",
      theme: userMetadata.theme || "light",
      userPreferences: userMetadata.preferences || {},
    };
  }

  /**
   * Health check for offline sync system
   */
  async getSyncHealth(): Promise<any> {
    try {
      const [pendingQueue, activeConflicts, recentSyncs, failedQueue] =
        await Promise.all([
          this.prisma.syncQueue.count({ where: { status: "pending" } }),
          this.prisma.syncConflict.count({ where: { resolvedAt: null } }),
          this.prisma.syncState.count({}),
          this.prisma.syncQueue.count({ where: { status: "failed" } }),
        ]);

      return {
        status: "healthy",
        pendingQueueItems: pendingQueue,
        activeConflicts,
        recentSyncs,
        failedQueueItems: failedQueue,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
