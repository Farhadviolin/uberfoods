import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  createHmac,
} from "crypto";

@Injectable()
export class EncryptionUtil {
  private readonly logger = new Logger(EncryptionUtil.name);
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  constructor(private configService: ConfigService) {}

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  encrypt(text: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = randomBytes(this.ivLength);

      const cipher = createCipheriv(this.algorithm, key, iv);
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      const tag = cipher.getAuthTag();

      // Combine IV, encrypted data, and auth tag
      const result = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, "hex"),
      ]).toString("base64");

      return result;
    } catch (error) {
      this.logger.error("Encryption failed", error);
      throw new InternalServerErrorException("Encryption failed");
    }
  }

  /**
   * Decrypt data encrypted with encrypt()
   */
  decrypt(encryptedText: string): string {
    try {
      const key = this.getEncryptionKey();
      const data = Buffer.from(encryptedText, "base64");

      // Extract IV, auth tag, and encrypted data
      const iv = data.subarray(0, this.ivLength);
      const tag = data.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = data.subarray(this.ivLength + this.tagLength);

      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      this.logger.error("Decryption failed", error);
      throw new InternalServerErrorException("Decryption failed");
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): string {
    const saltValue = salt || this.generateSalt();
    const hash = createHmac("sha256", this.getHashKey())
      .update(data + saltValue)
      .digest("hex");

    return `${saltValue}:${hash}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    const [salt, hash] = hashedData.split(":");
    const computedHash = this.hash(data, salt).split(":")[1];
    return hash === computedHash;
  }

  /**
   * Generate a secure salt
   */
  generateSalt(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Encrypt PII (Personally Identifiable Information)
   */
  encryptPII(data: any): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const encrypted = { ...data };
    const piiFields = ["email", "phone", "ssn", "creditCard", "bankAccount"];

    for (const field of piiFields) {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt PII data
   */
  decryptPII(data: any): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const decrypted = { ...data };
    const piiFields = ["email", "phone", "ssn", "creditCard", "bankAccount"];

    for (const field of piiFields) {
      if (decrypted[field]) {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          // If decryption fails, keep the encrypted value
          this.logger.warn(`Failed to decrypt field ${field}`);
        }
      }
    }

    return decrypted;
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString("hex");
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data: any): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const masked = { ...data };
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "creditCard",
      "ssn",
      "bankAccount",
      "apiKey",
      "privateKey",
    ];

    for (const field of sensitiveFields) {
      if (masked[field]) {
        const value = String(masked[field]);
        if (value.length > 4) {
          masked[field] =
            value.substring(0, 2) +
            "*".repeat(value.length - 4) +
            value.substring(value.length - 2);
        } else {
          masked[field] = "*".repeat(value.length);
        }
      }
    }

    return masked;
  }

  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>("ENCRYPTION_KEY");
    if (!key) {
      throw new BadRequestException("ENCRYPTION_KEY not configured");
    }

    // Ensure key is the correct length
    if (key.length < this.keyLength) {
      // Pad or hash the key to reach required length
      return createHash("sha256")
        .update(key)
        .digest()
        .subarray(0, this.keyLength);
    }

    return Buffer.from(key.substring(0, this.keyLength), "utf8");
  }

  private getHashKey(): string {
    const key = this.configService.get<string>("HASH_KEY");
    if (!key) {
      throw new BadRequestException("HASH_KEY not configured");
    }
    return key;
  }
}
