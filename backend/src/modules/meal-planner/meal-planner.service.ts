import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MealPlannerService {
  constructor(private readonly prisma: PrismaService) {}

  async getMeals(customerId: string) {
    return this.prisma.mealPlan.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
  }
}
