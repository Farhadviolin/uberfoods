import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as speakeasy from "speakeasy";
import * as qrcode from "qrcode";

@Injectable()
export class MfaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generiere MFA Secret für Driver
   */
  async generateMfaSecret(driverId: string) {
    const secret = speakeasy.generateSecret({
      name: `UberFoods Driver (${driverId})`,
      issuer: "UberFoods",
    });

    // Speichere oder aktualisiere das Secret in der TwoFactorAuth-Tabelle
    await this.prisma.twoFactorAuth.upsert({
      where: { userId: driverId },
      create: {
        userId: driverId,
        secret: secret.base32,
        enabled: false,
        backupCodes: [],
      },
      update: {
        secret: secret.base32,
        enabled: false,
      },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Verifiziere MFA Token
   */
  async verifyMfaToken(driverId: string, token: string): Promise<boolean> {
    const record = await this.prisma.twoFactorAuth.findUnique({
      where: { userId: driverId },
    });

    if (!record?.secret || !record.enabled) {
      throw new BadRequestException("MFA not enabled for this user");
    }

    const isValid = speakeasy.totp.verify({
      secret: record.secret,
      encoding: "base32",
      token,
      window: 2, // Allow 2 time steps before/after
    });

    return isValid;
  }

  /**
   * Aktiviere MFA für Driver
   */
  async enableMfa(driverId: string, token: string) {
    const record = await this.prisma.twoFactorAuth.findUnique({
      where: { userId: driverId },
    });

    if (!record?.secret) {
      throw new BadRequestException("MFA not initialized for this user");
    }

    const isValid = speakeasy.totp.verify({
      secret: record.secret,
      encoding: "base32",
      token,
      window: 2,
    });
    if (!isValid) {
      throw new UnauthorizedException("Invalid MFA token");
    }

    await this.prisma.twoFactorAuth.update({
      where: { userId: driverId },
      data: { enabled: true },
    });

    return {
      success: true,
      message: "MFA enabled successfully",
    };
  }

  /**
   * Deaktiviere MFA für Driver
   */
  async disableMfa(driverId: string, password: string) {
    await this.prisma.twoFactorAuth.updateMany({
      where: { userId: driverId },
      data: { enabled: false, secret: "", backupCodes: [] },
    });

    return {
      success: true,
      message: "MFA disabled successfully",
    };
  }

  /**
   * Generiere Backup Codes
   */
  async generateBackupCodes(driverId: string) {
    const codes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase(),
    );

    await this.prisma.twoFactorAuth.update({
      where: { userId: driverId },
      data: { backupCodes: codes },
    });

    return {
      codes,
      message: "Save these codes securely. Each code can only be used once.",
    };
  }

  /**
   * Verifiziere Backup Code
   */
  async verifyBackupCode(driverId: string, code: string): Promise<boolean> {
    // In production, verifiziere gegen hashed codes in database
    const record = await this.prisma.twoFactorAuth.findUnique({
      where: { userId: driverId },
    });

    if (!record || !record.backupCodes || record.backupCodes.length === 0) {
      return false;
    }

    const normalizedCode = code.trim().toUpperCase();
    const remainingCodes = record.backupCodes.filter(
      (c) => c !== normalizedCode,
    );
    const used = remainingCodes.length !== record.backupCodes.length;

    if (used) {
      await this.prisma.twoFactorAuth.update({
        where: { userId: driverId },
        data: { backupCodes: remainingCodes },
      });
    }

    return used;
  }
}
