import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { DriverService } from "./driver.service";
import { SmartAcceptanceService } from "./smart-acceptance.service";
import { RouteOptimizationService } from "./route-optimization.service";
import { PerformanceTrackingService } from "./performance-tracking.service";
import { SubscriptionService } from "./subscription.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { SmartAcceptanceSettingsDto } from "./dto/smart-acceptance.dto";
import { RouteOptimizationRequestDto } from "./dto/route-optimization.dto";
import { PerformancePeriodQueryDto } from "./dto/performance-tracking.dto";
import { SubscriptionUpgradeDto } from "./dto/subscription.dto";

@ApiTags("Driver")
@Controller("drivers")
@UseGuards(JwtAuthGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get("test")
  test() {
    return { message: "Driver module loaded" };
  }

  // Smart Acceptance endpoints
  @Get("smart-acceptance")
  @ApiOperation({ summary: "Get smart acceptance settings" })
  @ApiResponse({
    status: 200,
    description: "Smart acceptance settings retrieved successfully",
  })
  async getSmartAcceptanceSettings(@GetUser("id") driverId: string) {
    return this.smartAcceptanceService.getSettings(driverId);
  }

  @Put("smart-acceptance")
  @ApiOperation({ summary: "Update smart acceptance settings" })
  @ApiResponse({
    status: 200,
    description: "Smart acceptance settings updated successfully",
  })
  async updateSmartAcceptanceSettings(
    @GetUser("id") driverId: string,
    @Body() settings: SmartAcceptanceSettingsDto,
  ) {
    await this.smartAcceptanceService.updateSettings(driverId, settings);
    return { message: "Smart acceptance settings updated successfully" };
  }

  @Post("smart-acceptance/evaluate/:orderId")
  @ApiOperation({ summary: "Evaluate order with smart acceptance" })
  @ApiResponse({ status: 200, description: "Order evaluated successfully" })
  async evaluateOrder(
    @GetUser("id") driverId: string,
    @Param("orderId") orderId: string,
  ) {
    return this.smartAcceptanceService.evaluateOrder(driverId, orderId);
  }

  // Route Optimization endpoints
  @Post("route-optimization")
  @ApiOperation({ summary: "Optimize route for multiple orders" })
  @ApiResponse({ status: 200, description: "Route optimized successfully" })
  async optimizeRoute(
    @GetUser("id") driverId: string,
    @Body() request: RouteOptimizationRequestDto,
  ) {
    return this.routeOptimizationService.optimizeRoute(driverId, request);
  }

  @Get("routes/active")
  @ApiOperation({ summary: "Get active routes for driver" })
  @ApiResponse({
    status: 200,
    description: "Active routes retrieved successfully",
  })
  async getActiveRoutes(@GetUser("id") driverId: string) {
    return this.routeOptimizationService.getActiveRoutes(driverId);
  }

  // Performance Tracking endpoints
  @Get("performance")
  @ApiOperation({ summary: "Get driver performance metrics" })
  @ApiResponse({
    status: 200,
    description: "Performance metrics retrieved successfully",
  })
  async getPerformance(
    @GetUser("id") driverId: string,
    @Query() query: PerformancePeriodQueryDto,
  ) {
    return this.performanceTrackingService.getPerformance(driverId, query);
  }

  // Subscription endpoints
  @Get("subscription")
  @ApiOperation({ summary: "Get driver subscription information" })
  @ApiResponse({
    status: 200,
    description: "Subscription information retrieved successfully",
  })
  async getSubscription(@GetUser("id") driverId: string) {
    return this.subscriptionService.getSubscription(driverId);
  }

  @Post("subscription/upgrade")
  @ApiOperation({ summary: "Upgrade driver subscription" })
  @ApiResponse({
    status: 200,
    description: "Subscription upgraded successfully",
  })
  async upgradeSubscription(
    @GetUser("id") driverId: string,
    @Body() upgradeRequest: SubscriptionUpgradeDto,
  ) {
    await this.subscriptionService.upgradeSubscription(
      driverId,
      upgradeRequest,
    );
    return { message: "Subscription upgraded successfully" };
  }

  @Post("subscription/cancel")
  @ApiOperation({ summary: "Cancel driver subscription" })
  @ApiResponse({
    status: 200,
    description: "Subscription cancellation scheduled",
  })
  async cancelSubscription(@GetUser("id") driverId: string) {
    await this.subscriptionService.cancelSubscription(driverId);
    return { message: "Subscription cancellation scheduled" };
  }

  // Legacy endpoints (keeping for backwards compatibility)
  @Get("profile")
  @ApiOperation({ summary: "Get driver profile" })
  async getProfile(@GetUser("id") driverId: string) {
    return this.driverService.findOne(driverId);
  }

  @Put("location")
  @ApiOperation({ summary: "Update driver location" })
  async updateLocation(
    @GetUser("id") driverId: string,
    @Body() location: { latitude: number; longitude: number },
  ) {
    return this.driverService.updateLocation(driverId, location);
  }

  @Get("orders/available")
  @ApiOperation({ summary: "Get available orders for driver" })
  // @UseGuards(JwtAuthGuard) // Temporarily removed for testing
  async getAvailableOrders(/* @GetUser("id") driverId: string */) {
    console.log("CONTROLLER METHOD CALLED - GUARD BYPASSED");
    // Test: Return 401 directly
    throw new Error("TEST 401: Authentication required");
  }

  @Post("orders/:orderId/accept")
  @ApiOperation({ summary: "Accept an order" })
  async acceptOrder(
    @GetUser("id") driverId: string,
    @Param("orderId") orderId: string,
  ) {
    return this.driverService.acceptOrder(driverId, orderId);
  }

  @Put("orders/:orderId/status")
  @ApiOperation({ summary: "Update delivery status for assigned order" })
  @ApiResponse({
    status: 200,
    description: "Order status updated successfully",
  })
  async updateOrderStatus(
    @GetUser("id") driverId: string,
    @Param("orderId") orderId: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.driverService.updateOrderStatus(
      driverId,
      orderId,
      body.status,
      body.notes,
    );
  }

  // Advanced Performance endpoint for admin panel
  @Get("advanced/performance")
  @ApiOperation({ summary: "Get advanced driver performance data" })
  @ApiResponse({
    status: 200,
    description: "Advanced performance data retrieved successfully",
  })
  async getAdvancedPerformance(@Query() query: PerformancePeriodQueryDto) {
    return this.performanceTrackingService.getAdvancedPerformance(query);
  }

  // Admin endpoints for bulk operations
  @Post("bulk-status-update")
  @ApiOperation({ summary: "Bulk update driver status" })
  @ApiResponse({
    status: 200,
    description: "Driver statuses updated successfully",
  })
  async bulkStatusUpdate(
    @Body() body: { driverIds: string[]; status: string },
  ) {
    return this.driverService.bulkStatusUpdate(body.driverIds, body.status);
  }

  @Post("bulk-email")
  @ApiOperation({ summary: "Send bulk email to drivers" })
  @ApiResponse({
    status: 200,
    description: "Emails sent successfully",
  })
  async bulkEmail(
    @Body() body: { driverIds: string[]; subject: string; message: string },
  ) {
    return this.driverService.bulkEmail(
      body.driverIds,
      body.subject,
      body.message,
    );
  }
}
