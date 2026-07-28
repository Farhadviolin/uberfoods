import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SubscriptionTierConfigService } from "./subscription-tier-config.service";
import { PublicSubscriptionTiersResponseDto } from "./dto/public-subscription-tier.dto";

@ApiTags("Driver")
@Controller("drivers/subscription")
@UseGuards(JwtAuthGuard)
export class DriverSubscriptionTiersController {
  constructor(
    private readonly tierConfigService: SubscriptionTierConfigService,
  ) {}

  @Get("tiers")
  @ApiOperation({ summary: "Get active driver subscription tiers" })
  @ApiOkResponse({ type: PublicSubscriptionTiersResponseDto })
  async getTiers(): Promise<PublicSubscriptionTiersResponseDto> {
    return { tiers: await this.tierConfigService.getActivePublicTierConfigs() };
  }
}
