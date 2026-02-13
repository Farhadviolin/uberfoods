import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DishService {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurantDishes(restaurantId: string) {
    return this.prisma.dish.findMany({
      where: { restaurantId, isAvailable: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getDishNutrition(dishId: string) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      include: { nutritionFacts: true },
    });

    if (!dish) {
      throw new NotFoundException("Dish not found");
    }

    const nutritionFacts = dish.nutritionFacts;

    return {
      calories: nutritionFacts?.calories ?? dish.calories ?? 0,
      protein: nutritionFacts?.protein ?? null,
      carbs: nutritionFacts?.carbs ?? null,
      fat: nutritionFacts?.fat ?? null,
      fiber: nutritionFacts?.fiber ?? null,
      sugar: nutritionFacts?.sugar ?? null,
      allergens: nutritionFacts?.allergens ?? [],
      vitamins: nutritionFacts?.vitamins ?? dish.nutrition ?? null,
    };
  }
}
