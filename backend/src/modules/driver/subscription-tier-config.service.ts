import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SubscriptionTier } from "@prisma/client";

interface TierConfigUpdateData {
  name?: string;
  price?: number;
  description?: string;
  features?: string[];
  [key: string]: unknown;
}

interface TierConfigCreateData {
  tier: SubscriptionTier;
  name: string;
  price: number;
  description?: string;
  features?: string[];
  [key: string]: unknown;
}

@Injectable()
export class SubscriptionTierConfigService {
  private readonly logger = new Logger(SubscriptionTierConfigService.name);

  // Fallback Tier Configs (für Development ohne Datenbank)
  private readonly fallbackTierConfigs = [
    {
      id: "basic_fallback",
      tier: "BASIC" as const,
      name: "Basic",
      price: 29,
      commissionRate: 0.25,
      displayCommission: "25%",
      features: [
        "25% Provision vom Restaurant",
        "Tägliche Auszahlungen ab 50€",
        "Standard Support",
        "Bis zu 50 Lieferungen/Monat",
      ],
      isPopular: false,
      deliveryLimit: 50,
      payoutThreshold: 50,
      payoutDelay: 1,
      isActive: true,
    },
    {
      id: "pro_fallback",
      tier: "PRO" as const,
      name: "Pro",
      price: 49,
      commissionRate: 0.3,
      displayCommission: "30% (100%)",
      features: [
        "30% Provision (VOLLSTÄNDIG)",
        "Sofortige Auszahlungen ab 20€",
        "Priority Support",
        "Unbegrenzte Lieferungen",
        "Exklusive Features",
      ],
      isPopular: true,
      deliveryLimit: null,
      payoutThreshold: 20,
      payoutDelay: 0,
      isActive: true,
    },
    {
      id: "fulltime_fallback",
      tier: "FULLTIME" as const,
      name: "Vollzeit",
      price: 99,
      commissionRate: 0.3,
      displayCommission: "30% + Bonus",
      features: [
        "30% Provision + Bonus",
        "High-Value Orders (>50€)",
        "Dedicated Support",
        "2% Bonus bei >100 Lieferungen/Monat",
      ],
      isPopular: false,
      deliveryLimit: null,
      payoutThreshold: 20,
      payoutDelay: 0,
      bonusThreshold: 100,
      bonusRate: 0.02,
      isActive: true,
    },
    {
      id: "enterprise_fallback",
      tier: "ENTERPRISE" as const,
      name: "Enterprise",
      price: 0, // Custom pricing
      commissionRate: 0.32,
      displayCommission: "Custom",
      features: [
        "Custom Commission Rate",
        "Dedicated Account Manager",
        "API-Zugang",
        "White-Label Optionen",
      ],
      isPopular: false,
      deliveryLimit: null,
      payoutThreshold: 20,
      payoutDelay: 0,
      isActive: true,
    },
  ];

  constructor(private prisma: PrismaService) {}

  async getAllTierConfigs() {
    try {
      const configs = await this.prisma.subscriptionTierConfig.findMany({
        orderBy: { price: "asc" },
      });

      // Wenn keine Daten in der DB gefunden wurden, verwende Fallback
      if (!configs || configs.length === 0) {
        this.logger.warn(
          "Keine Tier-Konfigurationen in Datenbank gefunden, verwende Fallback-Daten",
        );
        return this.fallbackTierConfigs;
      }

      return configs;
    } catch (error) {
      this.logger.error("Fehler beim Laden der Tier-Konfigurationen:", error);
      this.logger.warn("Verwende Fallback-Daten");
      return this.fallbackTierConfigs;
    }
  }

  async updateTierConfig(tierName: string, updates: TierConfigUpdateData) {
    const tier = await this.prisma.subscriptionTierConfig.findFirst({
      where: { tier: tierName as SubscriptionTier },
    });

    if (!tier) {
      throw new NotFoundException(`Tier ${tierName} not found`);
    }

    // Remove tier from updates if present (tier is unique and shouldn't be changed)
    const { tier: _, ...updateData } = updates;

    return this.prisma.subscriptionTierConfig.update({
      where: { id: tier.id },
      data: updateData,
    });
  }

  async createTierConfig(tierData: TierConfigCreateData) {
    return this.prisma.subscriptionTierConfig.create({
      data: tierData as any,
    });
  }

  async getTierConfig(tierName: string) {
    const tier = await this.prisma.subscriptionTierConfig.findFirst({
      where: { tier: tierName as SubscriptionTier },
    });

    if (!tier) {
      throw new NotFoundException(`Tier ${tierName} not found`);
    }

    return tier;
  }
}
