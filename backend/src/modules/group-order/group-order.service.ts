import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class GroupOrderService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  async createGroupOrder(
    hostId: string,
    restaurantId: string,
    expiresAt?: string,
  ) {
    const code = this.generateCode();
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

    const groupOrder = await this.prisma.groupOrder.create({
      data: {
        hostId,
        restaurantId,
        expiresAt: expiresAtDate,
        metadata: { code },
      },
    });

    await this.prisma.groupOrderMember.create({
      data: {
        groupOrderId: groupOrder.id,
        customerId: hostId,
        status: "JOINED",
      },
    });

    return { id: groupOrder.id, code };
  }
}
