import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface AuditEntry {
  id: string;
  createdAt: Date;
  actorType: "user" | "system" | "api";
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: any;
  prevHash: string;
  hash: string;
}

@Injectable()
export class AuditLedgerService {
  private readonly logger = new Logger(AuditLedgerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Append an entry to the audit ledger with hash chaining
   */
  async appendEntry(
    actorType: "user" | "system" | "api",
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    payload: any,
  ): Promise<string> {
    const entryId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get the previous hash
    const prevEntry = await this.getLatestEntry();
    const prevHash = prevEntry?.hash || "genesis";

    // Create canonical payload (remove sensitive data, sort keys)
    const canonicalPayload = this.canonicalizePayload(payload);

    // Calculate hash
    const hash = this.calculateHash(prevHash, canonicalPayload, {
      actorType,
      actorId,
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
    });

    // Store in database
    await this.prisma.$executeRaw`
      INSERT INTO audit_ledger (
        id, created_at, actor_type, actor_id, action,
        entity_type, entity_id, payload, prev_hash, hash
      ) VALUES (
        ${entryId}, NOW(), ${actorType}, ${actorId}, ${action},
        ${entityType}, ${entityId}, ${JSON.stringify(canonicalPayload)}, ${prevHash}, ${hash}
      )
    `;

    this.logger.log(`Audit entry appended: ${entryId} (${action})`);
    return entryId;
  }

  /**
   * Get the latest audit entry for hash chaining
   */
  private async getLatestEntry(): Promise<AuditEntry | null> {
    const prismaClient = this.prisma;
    const results = await prismaClient.$queryRaw<AuditEntry[]>`
      SELECT id, created_at, actor_type, actor_id, action,
             entity_type, entity_id, payload, prev_hash, hash
      FROM audit_ledger
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return results[0] || null;
  }

  /**
   * Verify the integrity of the audit chain
   */
  async verifyChain(): Promise<{
    valid: boolean;
    totalEntries: number;
    corruptedEntries: number[];
    lastVerifiedEntry?: string;
  }> {
    const prismaClient = this.prisma;
    const entries = await prismaClient.$queryRaw<AuditEntry[]>`
      SELECT id, created_at, actor_type, actor_id, action,
             entity_type, entity_id, payload, prev_hash, hash
      FROM audit_ledger
      ORDER BY created_at ASC
    `;

    let prevHash = "genesis";
    const corruptedEntries: number[] = [];
    let lastVerifiedEntry: string | undefined;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedHash = this.calculateHash(prevHash, entry.payload, {
        actorType: entry.actorType,
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        timestamp: entry.createdAt.toISOString(),
      });

      if (expectedHash !== entry.hash) {
        corruptedEntries.push(i);
        this.logger.error(`Corrupted audit entry at index ${i}: ${entry.id}`);
      } else {
        lastVerifiedEntry = entry.id;
        prevHash = entry.hash;
      }
    }

    return {
      valid: corruptedEntries.length === 0,
      totalEntries: entries.length,
      corruptedEntries,
      lastVerifiedEntry,
    };
  }

  /**
   * Canonicalize payload for consistent hashing
   * Removes sensitive data and sorts keys
   */
  private canonicalizePayload(payload: any): any {
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    // Deep clone and sort keys
    const canonicalized = JSON.parse(JSON.stringify(payload));

    // Remove sensitive fields (GDPR minimization)
    this.removeSensitiveFields(canonicalized);

    return this.sortObjectKeys(canonicalized);
  }

  /**
   * Remove sensitive fields from payload (GDPR compliance)
   */
  private removeSensitiveFields(obj: any): void {
    const sensitiveFields = [
      "password",
      "ssn",
      "creditCard",
      "email",
      "phone",
      "address.street",
      "address.city",
      "firstName",
      "lastName",
    ];

    function removeFields(target: any, path = "") {
      if (typeof target !== "object" || target === null) return;

      for (const key in target) {
        const currentPath = path ? `${path}.${key}` : key;

        if (
          sensitiveFields.includes(currentPath) ||
          sensitiveFields.includes(key)
        ) {
          target[key] = "[REDACTED]";
        } else if (typeof target[key] === "object") {
          removeFields(target[key], currentPath);
        }
      }
    }

    removeFields(obj);
  }

  /**
   * Sort object keys recursively for consistent hashing
   */
  private sortObjectKeys(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    }

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });

    return sorted;
  }

  /**
   * Calculate hash for audit entry
   */
  private calculateHash(
    prevHash: string,
    canonicalPayload: any,
    metadata: any,
  ): string {
    const crypto = require("crypto");
    const data = JSON.stringify({
      prevHash,
      payload: canonicalPayload,
      metadata,
    });

    return crypto.createHash("sha256").update(data).digest("hex");
  }
}
