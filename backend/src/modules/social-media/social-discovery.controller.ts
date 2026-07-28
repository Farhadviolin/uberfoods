import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import {
  LiveOrderDto,
  SocialFeedPostDto,
  SocialDiscoveryQueryDto,
  TrendingDishDto,
} from "./dto/social-discovery.dto";
import { SocialDiscoveryService } from "./social-discovery.service";

@ApiTags("Social")
@ApiBearerAuth()
@Controller("social")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("CUSTOMER")
export class SocialDiscoveryController {
  constructor(
    private readonly socialDiscoveryService: SocialDiscoveryService,
  ) {}

  @Get("feed")
  @ApiOperation({ summary: "Get the authenticated customer's social feed" })
  @ApiOkResponse({ type: SocialFeedPostDto, isArray: true })
  getFeed(
    @GetUser("id") customerId: string,
    @Query() query: SocialDiscoveryQueryDto,
  ) {
    return this.socialDiscoveryService.getFeed(customerId, query.limit);
  }

  @Get("live-orders")
  @ApiOperation({ summary: "Get anonymized live order activity" })
  @ApiOkResponse({ type: LiveOrderDto, isArray: true })
  getLiveOrders(@Query() query: SocialDiscoveryQueryDto) {
    return this.socialDiscoveryService.getLiveOrders(query.limit);
  }

  @Get("trending")
  @ApiOperation({ summary: "Get trending dishes from recent orders" })
  @ApiOkResponse({ type: TrendingDishDto, isArray: true })
  getTrending(@Query() query: SocialDiscoveryQueryDto) {
    return this.socialDiscoveryService.getTrendingDishes(query.limit);
  }
}
