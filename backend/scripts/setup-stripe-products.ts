import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY nicht gefunden!');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
});

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
}

const tiers: SubscriptionTier[] = [
  {
    id: 'basic',
    name: 'FairShare Basic',
    price: 29,
    description: '25% Provision vom Restaurant - Tägliche Auszahlungen ab 50€',
    features: [
      '25% Provision vom Restaurant',
      'Tägliche Auszahlungen ab 50€',
      'Standard Support',
      'Bis zu 50 Lieferungen/Monat',
    ],
  },
  {
    id: 'pro',
    name: 'FairShare Pro',
    price: 49,
    description: '30% Provision (100%) - Sofortige Auszahlungen ab 20€',
    features: [
      '30% Provision (VOLLSTÄNDIG)',
      'Sofortige Auszahlungen ab 20€',
      'Priority Support',
      'Unbegrenzte Lieferungen',
      'Exklusive Features',
    ],
  },
  {
    id: 'fulltime',
    name: 'FairShare Vollzeit',
    price: 99,
    description: '30% + Bonus bei >100 Lieferungen - Dedicated Support',
    features: [
      '30% Provision + Bonus',
      'High-Value Orders (>50€)',
      'Dedicated Support',
      '2% Bonus bei >100 Lieferungen/Monat',
    ],
  },
  {
    id: 'enterprise',
    name: 'FairShare Enterprise',
    price: 0, // Custom pricing
    description: 'Individuelle Verträge - API-Zugang & White-Label',
    features: [
      'Custom Commission Rate',
      'Dedicated Account Manager',
      'API-Zugang',
      'White-Label Optionen',
    ],
  },
];

async function createStripeProducts() {
  console.log('🚀 Erstelle Stripe Produkte für FairShare Subscription Tiers...\n');

  const priceIds: Record<string, string> = {};

  for (const tier of tiers) {
    try {
      console.log(`📦 Erstelle Produkt: ${tier.name}`);

      // Erstelle Produkt
      const product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        metadata: {
          tier_id: tier.id,
          features: JSON.stringify(tier.features),
        },
      });

      console.log(`✅ Produkt erstellt: ${product.id}`);

      // Erstelle Preis (außer für Enterprise mit Custom Pricing)
      if (tier.id !== 'enterprise') {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: tier.price * 100, // Stripe verwendet Cent
          currency: 'eur',
          recurring: {
            interval: 'month',
          },
          metadata: {
            tier_id: tier.id,
          },
        });

        priceIds[tier.id.toUpperCase()] = price.id;
        console.log(`💰 Preis erstellt: ${price.id} (${tier.price}€/Monat)`);
      } else {
        // Für Enterprise erstelle einen Platzhalter-Preis
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: 10000, // 100€
          currency: 'eur',
          recurring: {
            interval: 'month',
          },
          metadata: {
            tier_id: tier.id,
            custom_pricing: 'true',
          },
        });

        priceIds[tier.id.toUpperCase()] = price.id;
        console.log(`💰 Enterprise Preis erstellt: ${price.id} (Custom Pricing)`);
      }

      console.log(''); // Leerzeile

    } catch (error: any) {
      console.error(`❌ Fehler beim Erstellen von ${tier.name}:`, error.message);
      continue;
    }
  }

  // Erstelle .env Update
  const envUpdate = `
# Stripe Price IDs (automatisch generiert)
STRIPE_PRICE_BASIC=${priceIds.BASIC}
STRIPE_PRICE_PRO=${priceIds.PRO}
STRIPE_PRICE_FULLTIME=${priceIds.FULLTIME}
STRIPE_PRICE_ENTERPRISE=${priceIds.ENTERPRISE}
`;

  console.log('📝 Aktualisiere .env Dateien...');
  console.log(envUpdate);

  // Aktualisiere development.env
  const devEnvPath = path.join(__dirname, '../development.env');
  if (fs.existsSync(devEnvPath)) {
    let devEnv = fs.readFileSync(devEnvPath, 'utf8');
    devEnv = devEnv.replace(
      /# Stripe Price IDs.*$/gm,
      envUpdate.trim()
    );
    fs.writeFileSync(devEnvPath, devEnv);
    console.log('✅ development.env aktualisiert');
  }

  // Aktualisiere production.env
  const prodEnvPath = path.join(__dirname, '../production.env');
  if (fs.existsSync(prodEnvPath)) {
    let prodEnv = fs.readFileSync(prodEnvPath, 'utf8');
    prodEnv = prodEnv.replace(
      /STRIPE_PRICE_BASIC=.*/,
      `STRIPE_PRICE_BASIC=${priceIds.BASIC}`
    );
    prodEnv = prodEnv.replace(
      /STRIPE_PRICE_PRO=.*/,
      `STRIPE_PRICE_PRO=${priceIds.PRO}`
    );
    prodEnv = prodEnv.replace(
      /STRIPE_PRICE_FULLTIME=.*/,
      `STRIPE_PRICE_FULLTIME=${priceIds.FULLTIME}`
    );
    prodEnv = prodEnv.replace(
      /STRIPE_PRICE_ENTERPRISE=.*/,
      `STRIPE_PRICE_ENTERPRISE=${priceIds.ENTERPRISE}`
    );
    fs.writeFileSync(prodEnvPath, prodEnv);
    console.log('✅ production.env aktualisiert');
  }

  // Price IDs in Environment-Dateien aktualisieren
  console.log('\n📝 Aktualisiere Environment-Dateien...');

  const envFiles = [
    { path: path.join(__dirname, '../development.env'), name: 'development.env' },
    { path: path.join(__dirname, '../production.env'), name: 'production.env' }
  ];

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile.path)) {
      let envContent = fs.readFileSync(envFile.path, 'utf8');

      // Stripe Price IDs ersetzen
      envContent = envContent.replace(
        /STRIPE_PRICE_BASIC=.*/,
        `STRIPE_PRICE_BASIC=${priceIds.BASIC}`
      );
      envContent = envContent.replace(
        /STRIPE_PRICE_PRO=.*/,
        `STRIPE_PRICE_PRO=${priceIds.PRO}`
      );
      envContent = envContent.replace(
        /STRIPE_PRICE_FULLTIME=.*/,
        `STRIPE_PRICE_FULLTIME=${priceIds.FULLTIME}`
      );
      envContent = envContent.replace(
        /STRIPE_PRICE_ENTERPRISE=.*/,
        `STRIPE_PRICE_ENTERPRISE=${priceIds.ENTERPRISE}`
      );

      fs.writeFileSync(envFile.path, envContent);
      console.log(`✅ ${envFile.name} aktualisiert`);
    }
  }

  console.log('\n🎉 Stripe Setup abgeschlossen!');
  console.log('Price IDs:', priceIds);
  console.log('\n📋 Nächste Schritte:');
  console.log('1. Überprüfe die Price IDs in deinem Stripe Dashboard');
  console.log('2. Konfiguriere die Webhook-URL in Stripe');
  console.log('3. Teste die Subscription-Flows');
}

createStripeProducts().catch(console.error);