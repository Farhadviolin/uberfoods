import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("ai-ml")
@Controller("ai-ml/sync")
@UseGuards(JwtAuthGuard)
export class AiMlSyncController {
  @Post("eta/:orderId")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sync ETA prediction" })
  @ApiResponse({ status: 200, description: "ETA synced" })
  syncEta(@Param("orderId") orderId: string, @Body() body: any) {
    return { success: true, orderId, payload: body };
  }

  @Post("demand/:restaurantId")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sync demand prediction" })
  @ApiResponse({ status: 200, description: "Demand synced" })
  syncDemand(@Param("restaurantId") restaurantId: string, @Body() body: any) {
    return { success: true, restaurantId, payload: body };
  }

  @Post("fraud/:orderId")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Sync fraud detection" })
  @ApiResponse({ status: 200, description: "Fraud synced" })
  syncFraud(@Param("orderId") orderId: string, @Body() body: any) {
    return { success: true, orderId, payload: body };
  }
}
