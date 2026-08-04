import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { MealPlannerService } from "./meal-planner.service";

interface RestaurantActor {
  id?: string;
  sub?: string;
  role?: string;
}

function parseDateOnly(value: string | undefined, field: string): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${field} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${field} must be a valid calendar date`);
  }

  return parsed;
}

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

  @Get("weekly")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("RESTAURANT")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the authenticated restaurant's weekly meal plans",
  })
  @ApiResponse({ status: 200, description: "Weekly meal plans retrieved" })
  @ApiResponse({ status: 400, description: "Invalid weekStart" })
  @ApiResponse({
    status: 401,
    description: "Restaurant authentication required",
  })
  @ApiResponse({ status: 403, description: "Restaurant ownership required" })
  async getWeekly(
    @GetUser() actor: RestaurantActor | undefined,
    @Query() query: { weekStart?: string },
  ) {
    const restaurantId =
      await this.mealPlannerService.assertRestaurantAccess(actor);
    const weekStart = parseDateOnly(query?.weekStart, "weekStart");
    return this.mealPlannerService.getWeekly(restaurantId, weekStart);
  }

  @Get("shopping-list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("RESTAURANT")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated restaurant's shopping list" })
  @ApiResponse({ status: 200, description: "Shopping list retrieved" })
  @ApiResponse({ status: 400, description: "Invalid shopping-list date range" })
  @ApiResponse({
    status: 401,
    description: "Restaurant authentication required",
  })
  @ApiResponse({ status: 403, description: "Restaurant ownership required" })
  async getShoppingList(
    @GetUser() actor: RestaurantActor | undefined,
    @Query() query: { startDate?: string; endDate?: string },
  ) {
    const restaurantId =
      await this.mealPlannerService.assertRestaurantAccess(actor);
    const startDate = parseDateOnly(query?.startDate, "startDate");
    const endDate = parseDateOnly(query?.endDate, "endDate");
    if (startDate > endDate) {
      throw new BadRequestException("startDate must not be after endDate");
    }
    return this.mealPlannerService.getShoppingList(
      restaurantId,
      startDate,
      endDate,
    );
  }
}
