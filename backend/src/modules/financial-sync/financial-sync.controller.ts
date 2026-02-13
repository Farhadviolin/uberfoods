import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FinancialSyncService } from "./financial-sync.service";

@ApiTags("financial")
@Controller("financial/sync")
@UseGuards(JwtAuthGuard)
export class FinancialSyncController {
  constructor(private readonly financialSyncService: FinancialSyncService) {}

  @Post("payment/:paymentId")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sync payment event" })
  @ApiResponse({ status: 200, description: "Payment synced" })
  async syncPayment(
    @Param("paymentId") paymentId: string,
    @Body() body: { orderId?: string },
  ) {
    await this.financialSyncService.recordPaymentEvent(paymentId, body.orderId);
    return { success: true };
  }
}
