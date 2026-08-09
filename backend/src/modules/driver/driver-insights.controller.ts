import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { DriverService } from "./driver.service.minimal";

@ApiTags("Driver")
@Controller("drivers/insights")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("DRIVER")
export class DriverInsightsController {
  constructor(private readonly driverService: DriverService) {}

  @Get("roi")
  @ApiOperation({ summary: "Get ROI insights for the authenticated driver" })
  @ApiResponse({ status: 200, description: "Driver ROI insights retrieved" })
  async getROI(@GetUser("id") driverId: string) {
    return this.driverService.getROIInsights(driverId);
  }

  @Get("recommendations")
  @ApiOperation({ summary: "Get recommendations for the authenticated driver" })
  @ApiResponse({ status: 200, description: "Driver recommendations retrieved" })
  async getRecommendations(@GetUser("id") driverId: string) {
    return this.driverService.getRecommendations(driverId);
  }
}
