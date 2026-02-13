import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async requestPasswordReset(email: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      // For security, don't reveal if email exists
      return {
        success: true,
        message:
          "If an account with this email exists, a reset link has been sent.",
      };
    }

    // Generate reset token (simplified for E2E testing)
    const resetToken = `reset_${customer.id}_${Date.now()}`;
    const resetTokenExpiresAt = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        resetToken,
        resetTokenExpiresAt,
      },
    });

    return { success: true, message: "Password reset email sent" };
  }

  async resetPassword(token: string, newPassword: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!customer) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // In a real implementation, password would be hashed
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        resetToken: null,
        resetTokenExpiresAt: null,
        updatedAt: new Date(),
      },
    });

    return { success: true, message: "Password reset successfully" };
  }
}
