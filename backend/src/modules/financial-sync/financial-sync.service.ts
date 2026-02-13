import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FinancialSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPaymentEvent(paymentId: string, orderId?: string) {
    return this.prisma.financialEvent.create({
      data: {
        type: "payment_completed",
        data: {
          paymentId,
          orderId,
        },
      },
    });
  }
}
