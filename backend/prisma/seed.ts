import { PrismaClient } from '@prisma/client';
import { seedTierConfigs } from './seed-tier-configs';
import * as bcrypt from 'bcrypt';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set!');
}

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});
// Seeded account passwords from environment variables
const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
const restaurantPassword = process.env.SEED_RESTAURANT_PASSWORD;
const driverPassword = process.env.SEED_DRIVER_PASSWORD;

if (!customerPassword || !restaurantPassword || !driverPassword) {
  throw new Error('Required seed passwords not set. Please set SEED_CUSTOMER_PASSWORD, SEED_RESTAURANT_PASSWORD, and SEED_DRIVER_PASSWORD environment variables.');
}

async function main() {
  console.log('🌱 Starte Seed-Prozess...');

  // Erstelle Restaurants
  const hashedRestaurantPassword = await bcrypt.hash(restaurantPassword, 10);
  const restaurant1 = await prisma.restaurant.upsert({
    where: { email: 'restaurant@uberfoods.local' },
    update: {},
    create: {
      name: 'Pizza Palace',
      description: 'Die beste Pizza der Stadt! Frische Zutaten und traditionelle Rezepte.',
      address: 'Hauptstraße 123, 10115 Berlin',
      phone: '+49 30 12345678',
      email: 'restaurant@uberfoods.local',
      password: hashedRestaurantPassword,
      mustChangePassword: false,
      isActive: true,
      status: 'OPEN', // Explicitly set status for /restaurants/public endpoint
    },
  });

  const restaurant2 = await prisma.restaurant.upsert({
    where: { email: 'burger-kingdom@example.com' },
    update: {},
    create: {
      name: 'Burger Kingdom',
      description: 'Saftige Burger und frische Pommes. Perfekt für den großen Hunger!',
      address: 'Friedrichstraße 45, 10117 Berlin',
      phone: '+49 30 87654321',
      email: 'burger-kingdom@example.com',
      imageUrl: null,
      isActive: true,
      status: 'OPEN', // Explicitly set status for /restaurants/public endpoint
    },
  });

  const restaurant3 = await prisma.restaurant.upsert({
    where: { email: 'sushi-master@example.com' },
    update: {},
    create: {
      name: 'Sushi Master',
      description: 'Frisches Sushi und japanische Küche. Authentisch und lecker!',
      address: 'Kurfürstendamm 78, 10707 Berlin',
      phone: '+49 30 11223344',
      email: 'sushi-master@example.com',
      imageUrl: null,
      isActive: true,
      status: 'OPEN', // Explicitly set status for /restaurants/public endpoint
    },
  });

  console.log('✅ Restaurants erstellt');

  // Erstelle Gerichte für Restaurant 1
  await prisma.dish.upsert({
    where: { id: 'dish-pizza-margherita' },
    update: {},
    create: {
      id: 'dish-pizza-margherita',
      restaurantId: restaurant1.id,
      name: 'Pizza Margherita',
      description: 'Klassische Pizza mit Tomaten, Mozzarella und Basilikum',
      price: 8.50,
      category: 'Pizza',
      isAvailable: true,
    },
  });

  await prisma.dish.upsert({
    where: { id: 'dish-pizza-pepperoni' },
    update: {},
    create: {
      id: 'dish-pizza-pepperoni',
      restaurantId: restaurant1.id,
      name: 'Pizza Pepperoni',
      description: 'Scharfe Salami, Käse und Tomatensauce',
      price: 10.50,
      category: 'Pizza',
      isAvailable: true,
    },
  });

  await prisma.dish.upsert({
    where: { id: 'dish-pizza-hawaii' },
    update: {},
    create: {
      id: 'dish-pizza-hawaii',
      restaurantId: restaurant1.id,
      name: 'Pizza Hawaii',
      description: 'Schinken, Ananas und Käse',
      price: 11.00,
      category: 'Pizza',
      isAvailable: true,
    },
  });

  await prisma.dish.upsert({
    where: { id: 'dish-cola' },
    update: {},
    create: {
      id: 'dish-cola',
      restaurantId: restaurant1.id,
      name: 'Cola',
      description: 'Erfrischendes Getränk',
      price: 2.50,
      category: 'Getränke',
      isAvailable: true,
    },
  });

  // Erstelle Gerichte für Restaurant 2
  await prisma.dish.upsert({
    where: { id: 'dish-cheeseburger' },
    update: {},
    create: {
      id: 'dish-cheeseburger',
      restaurantId: restaurant2.id,
      name: 'Cheeseburger',
      description: 'Saftiger Burger mit Käse, Salat, Tomate und Zwiebeln',
      price: 7.50,
      category: 'Burger',
      isAvailable: true,
    },
  });

  await prisma.dish.upsert({
    where: { id: 'dish-bacon-burger' },
    update: {},
    create: {
      id: 'dish-bacon-burger',
      restaurantId: restaurant2.id,
      name: 'Bacon Burger',
      description: 'Burger mit knusprigem Bacon und Cheddar',
      price: 9.50,
      category: 'Burger',
      isAvailable: true,
    },
  });

  await prisma.dish.upsert({
    where: { id: 'dish-pommes' },
    update: {},
    create: {
      id: 'dish-pommes',
      restaurantId: restaurant2.id,
      name: 'Pommes Frites',
      description: 'Knusprige Pommes mit Ketchup',
      price: 3.50,
      category: 'Beilagen',
      isAvailable: true,
    },
  });

  // Erstelle Gerichte für Restaurant 3
  await prisma.dish.upsert({
    where: { id: 'dish-sushi-set' },
    update: {},
    create: {
      id: 'dish-sushi-set',
      restaurantId: restaurant3.id,
      name: 'Sushi Set (8 Stück)',
      description: 'Auswahl aus 8 verschiedenen Sushi',
      price: 15.00,
      category: 'Sushi',
      isAvailable: true,
    },
  });

  await prisma.dish.upsert({
    where: { id: 'dish-sashimi' },
    update: {},
    create: {
      id: 'dish-sashimi',
      restaurantId: restaurant3.id,
      name: 'Sashimi Mix',
      description: 'Frischer Fisch ohne Reis',
      price: 18.00,
      category: 'Sushi',
      isAvailable: true,
    },
  });

  await prisma.dish.upsert({
    where: { id: 'dish-miso-soup' },
    update: {},
    create: {
      id: 'dish-miso-soup',
      restaurantId: restaurant3.id,
      name: 'Miso Suppe',
      description: 'Traditionelle japanische Suppe',
      price: 4.50,
      category: 'Suppen',
      isAvailable: true,
    },
  });

  console.log('✅ Gerichte erstellt');

  // Erstelle Beispiel-Kunden
  const hashedCustomerPassword = await bcrypt.hash(customerPassword, 10);
  const customer1 = await prisma.customer.upsert({
    where: { email: 'customer@uberfoods.local' },
    update: {},
    create: {
      email: 'customer@uberfoods.local',
      password: hashedCustomerPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+49 151 12345678',
    },
  });

  // Erstelle Beispiel-Fahrer
  const hashedDriverPassword = await bcrypt.hash(driverPassword, 10);
  console.log('Creating driver with password hash length:', hashedDriverPassword.length);

  const driver1 = await prisma.driver.upsert({
    where: { email: 'driver@uberfoods.local' },
    update: {
      password: hashedDriverPassword,
      mustChangePassword: false,
      isActive: true,
    },
    create: {
      name: 'John Driver',
      email: 'driver@uberfoods.local',
      password: hashedDriverPassword,
      phone: '+49 151 87654321',
      mustChangePassword: false,
      isActive: true,
    },
  });

  console.log('Driver created/updated:', driver1.email);

  await prisma.address.upsert({
    where: { id: 'address-max-musterstrasse' },
    update: {},
    create: {
      id: 'address-max-musterstrasse',
      customerId: customer1.id,
      label: 'Zuhause',
      street: 'Musterstraße 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      isDefault: true,
    },
  });

  console.log('✅ Kunden inkl. Adressen erstellt');

  // Erstelle Admin-Benutzer für E2E Tests
  const adminPassword = 'admin123';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@uberfoods.com' },
    update: {},
    create: {
      email: 'admin@uberfoods.com',
      password: hashedAdminPassword,
      name: 'Admin',
      isActive: true,
    },
  });

  console.log('✅ Admin user created for E2E tests');

  // Seed Tier Configs
  await seedTierConfigs();

  console.log('🎉 Seed-Prozess abgeschlossen!');
  console.log('\n📊 Erstellt:');
  console.log(`   - ${await prisma.restaurant.count()} Restaurants`);
  console.log(`   - ${await prisma.dish.count()} Gerichte`);
  console.log(`   - ${await prisma.customer.count()} Kunden`);
  console.log(`   - ${await prisma.driver.count()} Fahrer`);
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

