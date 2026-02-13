import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface KeyVersion {
  id: string;
  key: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
}

@Injectable()
export class KeyRotationService {
  private readonly logger = new Logger(KeyRotationService.name);
  private keyVersions: Map<string, KeyVersion> = new Map();
  private currentKeyId: string;

  constructor(private configService: ConfigService) {
    this.initializeKeys();
  }

  /**
   * Initialize encryption keys from configuration
   */
  private initializeKeys() {
    // Primary key (current)
    const primaryKeyHex = this.configService.get<string>("ARCHIVE_ENC_KEY");
    if (primaryKeyHex) {
      const primaryKey = Buffer.from(primaryKeyHex, "hex");
      const primaryKeyId = `key_${Date.now()}`;

      this.keyVersions.set(primaryKeyId, {
        id: primaryKeyId,
        key: primaryKey,
        createdAt: new Date(),
        active: true,
      });

      this.currentKeyId = primaryKeyId;
      this.logger.log(`Initialized primary encryption key: ${primaryKeyId}`);
    }

    // Previous keys for decryption (if configured)
    const previousKeysHex = this.configService.get<string>(
      "ARCHIVE_PREVIOUS_KEYS",
    );
    if (previousKeysHex) {
      const keys = previousKeysHex.split(",");
      keys.forEach((keyHex, index) => {
        try {
          const key = Buffer.from(keyHex.trim(), "hex");
          const keyId = `prev_key_${index}`;

          this.keyVersions.set(keyId, {
            id: keyId,
            key: key,
            createdAt: new Date(Date.now() - (index + 1) * 86400000), // Days ago
            active: false,
          });
        } catch (error) {
          this.logger.warn(
            `Failed to load previous key ${index}:`,
            error.message,
          );
        }
      });
    }
  }

  /**
   * Get the current active key for encryption
   */
  getCurrentKey(): KeyVersion {
    const currentKey = this.keyVersions.get(this.currentKeyId);
    if (!currentKey) {
      throw new Error("No active encryption key available");
    }
    return currentKey;
  }

  /**
   * Get a key by ID (for decryption of older data)
   */
  getKeyById(keyId: string): KeyVersion | undefined {
    return this.keyVersions.get(keyId);
  }

  /**
   * Get all available keys (for decryption)
   */
  getAllKeys(): KeyVersion[] {
    return Array.from(this.keyVersions.values());
  }

  /**
   * Rotate to a new key (dry run - doesn't change current key)
   */
  async rotateKeyDryRun(): Promise<{
    newKeyId: string;
    newKeyHex: string;
    impact: {
      currentEncrypts: number;
      oldDecrypts: number;
    };
  }> {
    const crypto = require("crypto");
    const newKey = crypto.randomBytes(32);
    const newKeyId = `key_${Date.now()}`;
    const newKeyHex = newKey.toString("hex");

    // Simulate impact analysis
    const impact = {
      currentEncrypts: 1, // New data would use new key
      oldDecrypts: this.keyVersions.size, // All existing keys still needed for decryption
    };

    this.logger.log(`Key rotation dry run: ${newKeyId}`);

    return {
      newKeyId,
      newKeyHex,
      impact,
    };
  }

  /**
   * Apply key rotation (makes new key active)
   */
  async rotateKeyApply(newKeyHex: string): Promise<{
    success: boolean;
    newKeyId: string;
    previousKeyId: string;
  }> {
    try {
      const crypto = require("crypto");
      const newKey = Buffer.from(newKeyHex, "hex");

      if (newKey.length !== 32) {
        throw new Error("Invalid key length - must be 256 bits (64 hex chars)");
      }

      const newKeyId = `key_${Date.now()}`;

      // Add new key as active
      this.keyVersions.set(newKeyId, {
        id: newKeyId,
        key: newKey,
        createdAt: new Date(),
        active: true,
      });

      // Deactivate old key
      const oldKey = this.keyVersions.get(this.currentKeyId);
      if (oldKey) {
        oldKey.active = false;
        oldKey.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year retention
      }

      // Update current key
      const previousKeyId = this.currentKeyId;
      this.currentKeyId = newKeyId;

      // Update environment (would need restart to take effect)
      this.logger.warn(
        "Key rotation applied - restart required for full effect",
      );
      this.logger.log(
        `New active key: ${newKeyId}, previous: ${previousKeyId}`,
      );

      return {
        success: true,
        newKeyId,
        previousKeyId,
      };
    } catch (error) {
      this.logger.error("Key rotation failed:", error.message);
      return {
        success: false,
        newKeyId: "",
        previousKeyId: this.currentKeyId,
      };
    }
  }

  /**
   * Generate a new encryption key
   */
  static generateNewKey(): string {
    const crypto = require("crypto");
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Get key rotation status
   */
  getRotationStatus(): {
    currentKeyId: string;
    totalKeys: number;
    activeKeys: number;
    lastRotation?: Date;
  } {
    const activeKeys = Array.from(this.keyVersions.values()).filter(
      (k) => k.active,
    ).length;
    const currentKey = this.getCurrentKey();

    return {
      currentKeyId: this.currentKeyId,
      totalKeys: this.keyVersions.size,
      activeKeys,
      lastRotation: currentKey.createdAt,
    };
  }
}
