import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(restaurantId: string) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const items = await this.prisma.stockItem.findMany({
      where: { restaurantId },
      select: {
        currentStock: true,
        minStock: true,
        maxStock: true,
        unitPrice: true,
        wasteRecords: {
          where: { recordedAt: { gte: monthStart } },
          select: { cost: true },
        },
      },
      orderBy: { id: "asc" },
      take: 1000,
    });

    return {
      totalValue: Number(
        items
          .reduce((sum, item) => sum + item.currentStock * item.unitPrice, 0)
          .toFixed(2),
      ),
      stockLevels: {
        low: items.filter((item) => item.currentStock <= item.minStock).length,
        normal: items.filter(
          (item) =>
            item.currentStock > item.minStock &&
            (item.maxStock === null || item.currentStock < item.maxStock),
        ).length,
        high: items.filter(
          (item) =>
            item.maxStock !== null && item.currentStock >= item.maxStock,
        ).length,
      },
      totalItems: items.length,
      monthlyWaste: Number(
        items
          .flatMap((item) => item.wasteRecords)
          .reduce((sum, record) => sum + record.cost, 0)
          .toFixed(2),
      ),
    };
  }

  getStock(restaurantId: string) {
    return this.prisma.stockItem.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        category: true,
        unit: true,
        currentStock: true,
        minStock: true,
        maxStock: true,
        unitPrice: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 1000,
    });
  }
}
