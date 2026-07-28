import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { InventoryService } from "./inventory.service";

@ApiTags("Inventory")
@ApiBearerAuth()
@Controller("inventory/restaurant/:restaurantId")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("RESTAURANT")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("overview")
  @ApiOperation({
    summary: "Get the authenticated restaurant inventory overview",
  })
  @ApiOkResponse({ description: "Inventory overview" })
  getOverview(
    @Param("restaurantId") restaurantId: string,
    @GetUser("id") authenticatedRestaurantId: string,
  ) {
    this.assertOwnership(restaurantId, authenticatedRestaurantId);
    return this.inventoryService.getOverview(restaurantId);
  }

  @Get("stock")
  @ApiOperation({ summary: "Get the authenticated restaurant stock items" })
  @ApiOkResponse({ description: "Stock items", isArray: true })
  getStock(
    @Param("restaurantId") restaurantId: string,
    @GetUser("id") authenticatedRestaurantId: string,
  ) {
    this.assertOwnership(restaurantId, authenticatedRestaurantId);
    return this.inventoryService.getStock(restaurantId);
  }

  private assertOwnership(
    restaurantId: string,
    authenticatedRestaurantId: string,
  ) {
    if (
      !authenticatedRestaurantId ||
      restaurantId !== authenticatedRestaurantId
    ) {
      throw new ForbiddenException("Restaurant ownership required");
    }
  }
}
