import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { CreateGroupOrderDto } from "./dto/create-group-order.dto";
import { GroupOrderService } from "./group-order.service";

@ApiTags("group-orders")
@Controller("group-orders")
export class GroupOrderController {
  constructor(private readonly groupOrderService: GroupOrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create group order" })
  @ApiResponse({ status: 201, description: "Group order created" })
  async createGroupOrder(
    @GetUser("id") customerId: string,
    @Body() dto: CreateGroupOrderDto,
  ) {
    return this.groupOrderService.createGroupOrder(
      customerId,
      dto.restaurantId,
      dto.expiresAt,
    );
  }
}
