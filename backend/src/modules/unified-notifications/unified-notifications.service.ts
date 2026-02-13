import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UnifiedNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async sendOrderNotification(orderId: string, event: string, data: any) {
    return this.prisma.unifiedNotification.create({
      data: {
        type: "order",
        priority: "medium",
        title: `Order ${event}`,
        message: `Order ${orderId} ${event}`,
        data,
        recipients: [],
        channels: ["websocket"],
        metadata: { orderId },
      },
    });
  }
}
