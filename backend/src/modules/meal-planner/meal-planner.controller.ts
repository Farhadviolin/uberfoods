import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { MealPlannerService } from "./meal-planner.service";

@ApiTags("meal-planner")
@Controller("meal-planner")
export class MealPlannerController {
  constructor(private readonly mealPlannerService: MealPlannerService) {}

  @Get("meals")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get meal plans" })
  @ApiResponse({ status: 200, description: "Meal plans retrieved" })
  async getMeals(@GetUser("id") customerId: string) {
    return this.mealPlannerService.getMeals(customerId);
  }
}
