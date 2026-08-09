import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { SubscriptionService } from "./subscription.service";
import { DriverSubscriptionResponseDto } from "./dto/subscription.dto";

@ApiTags("Driver")
@Controller("drivers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("DRIVER")
export class DriverSubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get("subscription")
  @ApiOperation({ summary: "Get the authenticated driver's subscription" })
  @ApiOkResponse({ type: DriverSubscriptionResponseDto })
  async getSubscription(
    @GetUser("id") driverId: string,
  ): Promise<DriverSubscriptionResponseDto> {
    return this.subscriptionService.getDriverSubscription(driverId);
  }
}
