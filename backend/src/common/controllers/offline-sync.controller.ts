import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from "@nestjs/common";
import {
  OfflineSyncService,
  SyncData,
  SyncResult,
} from "../services/offline-sync.service";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { DriverAuditService } from "../services/driver-audit.service";

@Controller("sync")
export class OfflineSyncController {
  constructor(
    private readonly syncService: OfflineSyncService,
    private readonly driverAuditService: DriverAuditService,
  ) {}

  private async logDriverAudit(
    req: any,
    action: "DEVICE_HANDSHAKE" | "OFFLINE_SYNC",
    deviceId: string,
    metadata?: any,
  ) {
    if (req?.user?.role?.toLowerCase?.() !== "driver") return;
    await this.driverAuditService.log({
      driverId: req.user.id,
      action,
      deviceId,
      isOfflineSync: true,
      metadata,
    });
  }

  @Post("initialize/:deviceId")
  @UseGuards(JwtAuthGuard)
  async initializeSync(
    @Request() req: any,
    @Param("deviceId") deviceId: string,
  ): Promise<SyncData> {
    const res = await this.syncService.initializeSync(req.user.id, deviceId);
    await this.logDriverAudit(req, "DEVICE_HANDSHAKE", deviceId, {
      phase: "initialize",
    });
    return res;
  }

  @Post("upload/:deviceId")
  @UseGuards(JwtAuthGuard)
  async syncFromDevice(
    @Request() req: any,
    @Param("deviceId") deviceId: string,
    @Body()
    body: {
      changes: any[];
      lastSyncTimestamp: string;
    },
  ): Promise<SyncResult> {
    const lastSync = new Date(body.lastSyncTimestamp);
    const result = await this.syncService.syncFromDevice(
      req.user.id,
      deviceId,
      body.changes,
      lastSync,
    );
    await this.logDriverAudit(req, "OFFLINE_SYNC", deviceId, {
      direction: "upload",
      changes: body.changes?.length || 0,
      conflicts: result?.conflicts,
      errors: result?.errors?.length || 0,
    });
    return result;
  }

  @Get("download/:deviceId")
  @UseGuards(JwtAuthGuard)
  async getSyncData(
    @Request() req: any,
    @Param("deviceId") deviceId: string,
    @Body()
    body?: {
      since?: string;
      tables?: string[];
    },
  ): Promise<SyncData> {
    const since = body?.since
      ? new Date(body.since)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tables = body?.tables || ["orders", "locations", "notifications"];

    const res = await this.syncService.getSyncData(
      req.user.id,
      deviceId,
      since,
      tables,
    );
    await this.logDriverAudit(req, "OFFLINE_SYNC", deviceId, {
      direction: "download",
      tables,
      since,
    });
    return res;
  }

  @Post("conflicts/resolve/:deviceId")
  @UseGuards(JwtAuthGuard)
  async resolveConflicts(
    @Request() req: any,
    @Param("deviceId") deviceId: string,
    @Body()
    body: {
      resolutions: Array<{
        conflictId: string;
        resolution: "local" | "server" | "merge";
      }>;
    },
  ) {
    return this.syncService.resolveConflicts(
      req.user.id,
      deviceId,
      body.resolutions,
    );
  }

  @Get("offline-data/:deviceId")
  @UseGuards(JwtAuthGuard)
  async getOfflineData(
    @Request() req: any,
    @Param("deviceId") deviceId: string,
  ) {
    return this.syncService.getOfflineData(req.user.id, deviceId);
  }

  @Post("queue-change/:deviceId")
  @UseGuards(JwtAuthGuard)
  async queueChange(
    @Request() req: any,
    @Param("deviceId") deviceId: string,
    @Body()
    body: {
      table: string;
      operation: "INSERT" | "UPDATE" | "DELETE";
      data: any;
    },
  ) {
    const change = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      table: body.table,
      operation: body.operation,
      data: body.data,
      timestamp: new Date(),
      version: 1,
    };

    await this.syncService.queueChange(change, req.user.id, deviceId);
    await this.logDriverAudit(req, "OFFLINE_SYNC", deviceId, {
      direction: "queue",
      table: body.table,
      operation: body.operation,
    });

    return {
      success: true,
      changeId: change.id,
      queued: true,
    };
  }

  @Post("full-sync/:deviceId")
  @UseGuards(JwtAuthGuard)
  async performFullSync(
    @Request() req: any,
    @Param("deviceId") deviceId: string,
    @Body()
    body?: {
      changes?: any[];
      lastSyncTimestamp?: string;
      tables?: string[];
    },
  ) {
    const userId = req.user.id;

    // Step 1: Upload device changes
    let uploadResult = null;
    if (body?.changes && body.changes.length > 0) {
      const lastSync = body.lastSyncTimestamp
        ? new Date(body.lastSyncTimestamp)
        : new Date();
      uploadResult = await this.syncService.syncFromDevice(
        userId,
        deviceId,
        body.changes,
        lastSync,
      );
    }

    // Step 2: Download server changes
    const since = body?.lastSyncTimestamp
      ? new Date(body.lastSyncTimestamp)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tables = body?.tables || ["orders", "locations", "notifications"];
    const downloadResult = await this.syncService.getSyncData(
      userId,
      deviceId,
      since,
      tables,
    );

    // Step 3: Get offline data
    const offlineData = await this.syncService.getOfflineData(userId, deviceId);

    await this.logDriverAudit(req, "OFFLINE_SYNC", deviceId, {
      direction: "full",
      uploadItems: body?.changes?.length || 0,
      conflicts: uploadResult?.conflicts,
      errors: uploadResult?.errors?.length || 0,
      tables,
    });

    return {
      upload: uploadResult,
      download: downloadResult,
      offlineData,
      fullSyncCompleted: true,
      timestamp: new Date(),
    };
  }

  @Get("health")
  async getSyncHealth() {
    return this.syncService.getSyncHealth();
  }

  // Admin endpoints
  @Post("process-queue")
  @UseGuards(JwtAuthGuard)
  async processQueuedChanges(@Request() req: any) {
    // Check admin permissions (case-insensitive)
    if (req.user.role?.toLowerCase() !== "admin") {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }

    return this.syncService.processQueuedChanges();
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard)
  async getSyncStats(@Request() req: any) {
    // Check admin permissions (case-insensitive)
    if (req.user.role?.toLowerCase() !== "admin") {
      throw new ForbiddenException("Unauthorized: Admin access required");
    }

    // This would return comprehensive sync statistics
    return {
      message: "Sync statistics endpoint - to be implemented",
    };
  }

  // WebSocket-like endpoint for real-time sync status
  @Get("status/:deviceId")
  @UseGuards(JwtAuthGuard)
  async getSyncStatus(
    @Request() req: any,
    @Param("deviceId") deviceId: string,
  ) {
    // Get current sync state
    const syncState = await this.syncService.initializeSync(
      req.user.id,
      deviceId,
    );

    return {
      deviceId,
      lastSyncTimestamp: syncState.lastSyncTimestamp,
      pendingChanges: syncState.pendingChanges.length,
      conflicts: syncState.conflicts.length,
      status: syncState.conflicts.length > 0 ? "conflicts_pending" : "synced",
      timestamp: new Date(),
    };
  }
}
