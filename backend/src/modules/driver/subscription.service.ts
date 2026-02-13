import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  SubscriptionResponseDto,
  SubscriptionTierDto,
  SubscriptionUpgradeDto,
} from "./dto/subscription.dto";

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly availableTiers: SubscriptionTierDto[] = [
    {
      id: "free",
      name: "Free",
      price: 0,
      features: [
        "Basic navigation",
        "Standard support",
        "5% commission",
        "Community access",
      ],
      isActive: true,
      commission: 5,
      priority: 1,
    },
    {
      id: "premium",
      name: "Premium",
      price: 29.99,
      features: [
        "Advanced navigation",
        "Priority support",
        "3% commission",
        "Analytics dashboard",
      ],
      isActive: false,
      commission: 3,
      priority: 2,
    },
  ];

  async getAnalytics(driverId: string) {
    // Mock implementation
    return {
      totalEarnings: 0,
      totalDeliveries: 0,
      averageRating: 4.5,
      onTimeRate: 0.95,
    };
  }

  getAvailableTiers(): SubscriptionTierDto[] {
    return [
      {
        id: "free",
        name: "Free",
        price: 0,
        features: [
          "Basic navigation",
          "Standard support",
          "5% commission",
          "Community access",
        ],
        isActive: true,
        commission: 5,
        priority: 1,
      },
      {
        id: "premium",
        name: "Premium",
        price: 29.99,
        features: [
          "Advanced navigation",
          "Priority support",
          "3% commission",
          "Analytics dashboard",
        ],
        isActive: false,
        commission: 3,
        priority: 2,
      },
    ];
  }

  async getSubscription(driverId: string): Promise<SubscriptionResponseDto> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        subscription: { select: { tier: true, currentPeriodStart: true } },
      },
    });

    if (!driver) {
      throw new Error("Driver not found");
    }

    const currentTier =
      this.availableTiers.find(
        (tier) => tier.id === (driver.subscription?.tier || "BASIC"),
      ) || this.availableTiers[0];
    currentTier.isActive = true;

    const availableTiers = this.availableTiers.map((tier) => ({
      ...tier,
      isActive: tier.id === currentTier.id,
    }));

    const usage = await this.calculateUsage(driverId, currentTier);
    const benefits = this.calculateBenefits(currentTier);

    return {
      currentTier,
      availableTiers,
      usage,
      benefits,
    };
  }

  async upgradeSubscription(
    driverId: string,
    upgradeRequest: SubscriptionUpgradeDto,
  ): Promise<void> {
    const newTier = this.availableTiers.find(
      (tier) => tier.id === upgradeRequest.tierId,
    );

    if (!newTier) {
      throw new Error("Subscription tier not found");
    }

    if (newTier.price === 0) {
      throw new Error("Cannot upgrade to free tier");
    }

    // Mock payment processing - in real implementation, this would integrate with payment provider
    await this.processPayment(driverId, newTier.price);

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        subscription: {
          upsert: {
            create: {
              tier: newTier.id as any,
              status: "ACTIVE",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
            update: {
              tier: newTier.id as any,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    this.logger.log(
      `Driver ${driverId} upgraded to ${newTier.name} subscription`,
    );
  }

  async cancelSubscription(driverId: string): Promise<void> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { subscription: { select: { tier: true } } },
    });

    if (!driver?.subscription?.tier || driver.subscription.tier === "BASIC") {
      throw new Error("No active subscription to cancel");
    }

    // Schedule cancellation for end of billing period
    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        subscription: {
          update: {
            cancelAtPeriodEnd: true,
          },
        },
      },
    });

    this.logger.log(`Driver ${driverId} scheduled subscription cancellation`);
  }

  private async calculateUsage(driverId: string, tier: SubscriptionTierDto) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const ordersThisMonth = await this.prisma.order.count({
      where: {
        driverId: driverId,
        createdAt: { gte: monthStart },
      },
    });

    const earningsResult = await this.prisma.order.aggregate({
      where: {
        driverId: driverId,
        createdAt: { gte: monthStart },
        status: "DELIVERED",
      },
      _sum: {
        deliveryFee: true,
        tip: true,
      },
    });

    const earningsThisMonth =
      (earningsResult._sum.deliveryFee || 0) + (earningsResult._sum.tip || 0);
    const commissionPaid = earningsThisMonth * (tier.commission / 100);

    // Calculate savings compared to free tier
    const freeTierCommission =
      earningsThisMonth * (this.availableTiers[0].commission / 100);
    const savings = freeTierCommission - commissionPaid;

    return {
      ordersThisMonth,
      earningsThisMonth: Math.round(earningsThisMonth * 100) / 100,
      commissionPaid: Math.round(commissionPaid * 100) / 100,
      savings: Math.round(savings * 100) / 100,
    };
  }

  private calculateBenefits(tier: SubscriptionTierDto) {
    return {
      priorityOrders: tier.priority >= 2,
      reducedCommission: tier.commission < 5,
      advancedAnalytics: tier.priority >= 2,
      premiumSupport: tier.priority >= 2,
    };
  }

  private async processPayment(
    driverId: string,
    amount: number,
  ): Promise<void> {
    // Mock payment processing
    this.logger.log(`Processing payment of €${amount} for driver ${driverId}`);

    // Simulate payment success/failure
    if (Math.random() > 0.95) {
      throw new Error("Payment processing failed");
    }

    // In real implementation, this would integrate with Stripe, PayPal, etc.
  }
}
