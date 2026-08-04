import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface RestaurantActor {
  id?: string;
  sub?: string;
  role?: string;
}

const addUtcDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

@Injectable()
export class MealPlannerService {
  constructor(private readonly prisma: PrismaService) {}

  async getMeals(customerId: string) {
    return this.prisma.mealPlan.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async assertRestaurantAccess(actor?: RestaurantActor): Promise<string> {
    const actorId = actor?.id || actor?.sub;
    if (!actorId) {
      throw new UnauthorizedException("Restaurant authentication required");
    }
    if (actor?.role?.toUpperCase() !== "RESTAURANT") {
      throw new ForbiddenException("Restaurant role required");
    }

    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: actorId, isActive: true },
      select: { id: true },
    });
    if (!restaurant) {
      throw new ForbiddenException("Active restaurant ownership required");
    }
    return restaurant.id;
  }

  async getWeekly(restaurantId: string, weekStart: Date) {
    const plans = await this.prisma.mealPlan.findMany({
      where: {
        restaurantId,
        isActive: true,
        date: { gte: weekStart, lt: addUtcDays(weekStart, 7) },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    return plans.map((plan) => ({
      ...plan,
      title: plan.name,
      date: plan.date?.toISOString() ?? null,
    }));
  }

  async getShoppingList(restaurantId: string, startDate: Date, endDate: Date) {
    const plans = await this.prisma.mealPlan.findMany({
      where: {
        restaurantId,
        isActive: true,
        date: { gte: startDate, lt: addUtcDays(endDate, 1) },
      },
      orderBy: { date: "asc" },
      include: { restaurant: { select: { name: true } } },
    });

    if (plans.length === 0) {
      return { totalMeals: 0, totalCost: 0, restaurants: [], items: [] };
    }

    const quantities = new Map<string, number>();
    for (const plan of plans) {
      for (const dishId of plan.dishIds) {
        quantities.set(dishId, (quantities.get(dishId) || 0) + 1);
      }
    }

    const dishes = await this.prisma.dish.findMany({
      where: {
        restaurantId,
        id: { in: [...quantities.keys()] },
        isActive: true,
      },
      select: { id: true, name: true, price: true, imageUrl: true },
    });
    const restaurantNames = [
      ...new Set(plans.map((plan) => plan.restaurant?.name).filter(Boolean)),
    ];
    const items = dishes.map((dish) => {
      const quantity = quantities.get(dish.id) || 0;
      return {
        dishId: dish.id,
        name: dish.name,
        restaurant: restaurantNames[0] || restaurantId,
        quantity,
        unitPrice: dish.price,
        totalPrice: dish.price * quantity,
        ...(dish.imageUrl ? { imageUrl: dish.imageUrl } : {}),
      };
    });

    return {
      totalMeals: plans.length,
      totalCost: items.reduce((total, item) => total + item.totalPrice, 0),
      restaurants: restaurantNames,
      items,
    };
  }
}
