import { PrismaClient, SubscriptionTier } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set!');
}

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export async function seedTierConfigs() {
  console.log('🌱 Seeding Subscription Tier Configs...');

  const tierConfigs = [
    {
      tier: SubscriptionTier.BASIC,
      name: 'Basic',
      price: 29,
      commissionRate: 0.25,
      displayCommission: '25%',
      features: [
        '25% Provision vom Restaurant',
        'Tägliche Auszahlungen ab 50€',
        'Standard Support',
        'Bis zu 50 Lieferungen/Monat',
      ],
      isPopular: false,
      deliveryLimit: 50,
      payoutThreshold: 50,
      payoutDelay: 1,
      isActive: true,
    },
    {
      tier: SubscriptionTier.PRO,
      name: 'Pro',
      price: 49,
      commissionRate: 0.30,
      displayCommission: '30% (100%)',
      features: [
        '30% Provision (VOLLSTÄNDIG)',
        'Sofortige Auszahlungen ab 20€',
        'Priority Support',
        'Unbegrenzte Lieferungen',
        'Exklusive Features',
      ],
      isPopular: true,
      payoutThreshold: 20,
      payoutDelay: 0,
      isActive: true,
    },
    {
      tier: SubscriptionTier.FULLTIME,
      name: 'Vollzeit',
      price: 99,
      commissionRate: 0.30,
      displayCommission: '30% + Bonus',
      features: [
        '30% Provision',
        '2% Bonus bei >100 Lieferungen/Monat',
        'Exklusive High-Value Orders',
        'Dedicated Support',
        'Alle Pro-Features',
      ],
      isPopular: false,
      bonusThreshold: 100,
      bonusRate: 0.02,
      payoutThreshold: 20,
      payoutDelay: 0,
      isActive: true,
    },
    {
      tier: SubscriptionTier.ENTERPRISE,
      name: 'Enterprise',
      price: 0, // Custom Pricing
      commissionRate: 0.32,
      displayCommission: '32% (Custom)',
      features: [
        'Custom Commission Rate',
        'Unbegrenzte Lieferungen',
        'Dedicated Account Manager',
        'Custom Features',
      ],
      isPopular: false,
      isActive: true,
    },
  ];

  for (const config of tierConfigs) {
    await prisma.subscriptionTierConfig.upsert({
      where: { tier: config.tier },
      create: config,
      update: config,
    });
    console.log(`✅ Tier Config ${config.tier} seeded`);
  }

  console.log('✅ Subscription Tier Configs seeding completed');
}

if (require.main === module) {
  seedTierConfigs()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

