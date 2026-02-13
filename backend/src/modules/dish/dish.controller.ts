import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DishService } from "./dish.service";

@ApiTags("dishes")
@Controller("dishes")
export class DishController {
  constructor(private readonly dishService: DishService) {}

  @Get("restaurant/:id")
  @ApiOperation({ summary: "Get dishes by restaurant" })
  @ApiResponse({ status: 200, description: "Dishes retrieved" })
  async getRestaurantDishes(@Param("id") restaurantId: string) {
    return this.dishService.getRestaurantDishes(restaurantId);
  }

  @Get(":id/nutrition")
  @ApiOperation({ summary: "Get dish nutrition" })
  @ApiResponse({ status: 200, description: "Nutrition retrieved" })
  async getDishNutrition(@Param("id") dishId: string) {
    return this.dishService.getDishNutrition(dishId);
  }
}
