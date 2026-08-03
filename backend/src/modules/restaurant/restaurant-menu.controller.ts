import {
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Put,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UpdateRestaurantDishDto } from "./dto/update-restaurant-dish.dto";

interface RestaurantActor {
  id?: string;
  sub?: string;
}

@ApiTags("Restaurant menu")
@ApiBearerAuth()
@Controller("restaurants/:restaurantId/menu")
export class RestaurantMenuController {
  constructor(private readonly prisma: PrismaService) {}

  @Put(":dishId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("RESTAURANT")
  @ApiOperation({ summary: "Update an owned restaurant menu item" })
  async updateMenuItem(
    @Param("restaurantId") restaurantId: string,
    @Param("dishId") dishId: string,
    @Body() body: UpdateRestaurantDishDto,
    @GetUser() actor?: RestaurantActor,
  ) {
    const actorId = actor?.id || actor?.sub;
    if (!actorId || actorId !== restaurantId) {
      throw new ForbiddenException("Restaurant ownership required");
    }

    const dish = await this.prisma.dish.findFirst({
      where: { id: dishId, restaurantId },
    });
    if (!dish) {
      throw new NotFoundException("Dish not found");
    }

    return this.prisma.dish.update({
      where: { id: dishId },
      data: body as Prisma.DishUpdateInput,
    });
  }
}
