import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UnifiedNotificationsService } from "./unified-notifications.service";

@ApiTags("notifications")
@Controller("notifications/unified")
@UseGuards(JwtAuthGuard)
export class UnifiedNotificationsController {
  constructor(
    private readonly unifiedNotificationsService: UnifiedNotificationsService,
  ) {}

  @Post("order/:orderId")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send unified order notification" })
  @ApiResponse({ status: 200, description: "Notification sent" })
  async sendOrderNotification(
    @Param("orderId") orderId: string,
    @Body() body: { event: string; data?: any },
  ) {
    await this.unifiedNotificationsService.sendOrderNotification(
      orderId,
      body.event ?? "updated",
      body.data ?? {},
    );
    return { success: true };
  }
}
