import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller("analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsPublicController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("delivery-patterns")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delivery patterns" })
  @ApiResponse({ status: 200, description: "Patterns retrieved" })
  getDeliveryPatterns() {
    return this.analyticsService.getDeliveryPatterns();
  }

  @Post("predict-delivery")
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Predict delivery time" })
  @ApiResponse({ status: 200, description: "Prediction retrieved" })
  predictDelivery(
    @Body()
    body: {
      restaurantId: string;
      customerLat: number;
      customerLng: number;
      preferredDeliveryTime?: string;
    },
  ) {
    return this.analyticsService.predictDelivery(body);
  }

  @Get("predictions")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Predictive ordering" })
  @ApiResponse({ status: 200, description: "Predictions retrieved" })
  getPredictions() {
    return this.analyticsService.getPredictions();
  }

  @Get("expenses/:period")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Expense analytics" })
  @ApiResponse({ status: 200, description: "Expenses retrieved" })
  getExpenseAnalytics(@Param("period") period: string) {
    return this.analyticsService.getRevenueAnalytics(period);
  }
}
