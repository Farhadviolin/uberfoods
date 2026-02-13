import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32; // 256 bits
  private encryptionEnabled = false;
  private encryptionKey: Buffer | null = null;

  constructor() {
    const keyHex = process.env.ARCHIVE_ENC_KEY;
    if (keyHex) {
      try {
        this.encryptionKey = Buffer.from(keyHex, "hex");
        if (this.encryptionKey.length !== this.keyLength) {
          throw new Error(
            `Key must be ${this.keyLength} bytes (${this.keyLength * 2} hex chars)`,
          );
        }
        this.encryptionEnabled = true;
        this.logger.log("Archive encryption enabled");
      } catch (error) {
        this.logger.error(
          "Invalid encryption key format, encryption disabled",
          error.message,
        );
      }
    } else {
      this.logger.log("Archive encryption disabled (no ARCHIVE_ENC_KEY)");
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string): string {
    if (!this.encryptionEnabled || !this.encryptionKey) {
      return data; // Return plaintext if encryption disabled
    }

    try {
      const crypto = require("crypto");
      const iv = crypto.randomBytes(16); // 128-bit IV
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);

      let encrypted = cipher.update(data, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      // Format: version:iv:authTag:encryptedData
      return `v1:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    } catch (error) {
      this.logger.error("Encryption failed, returning plaintext", error);
      return data; // Fail-safe: return plaintext
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: string): string {
    if (!this.encryptionEnabled || !this.encryptionKey) {
      return encryptedData; // Return as-is if encryption disabled
    }

    try {
      const parts = encryptedData.split(":");
      if (parts.length !== 4 || parts[0] !== "v1") {
        // Not encrypted or wrong format, return as-is
        return encryptedData;
      }

      const crypto = require("crypto");
      const iv = Buffer.from(parts[1], "hex");
      const authTag = Buffer.from(parts[2], "hex");
      const encrypted = parts[3];

      const decipher = crypto.createDecipher(
        this.algorithm,
        this.encryptionKey,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      this.logger.error("Decryption failed, returning encrypted data", error);
      return encryptedData; // Fail-safe: return encrypted data
    }
  }

  /**
   * Check if encryption is enabled
   */
  isEncryptionEnabled(): boolean {
    return this.encryptionEnabled;
  }

  /**
   * Generate a new encryption key (for setup)
   */
  static generateKey(): string {
    const crypto = require("crypto");
    return crypto.randomBytes(32).toString("hex");
  }
}
