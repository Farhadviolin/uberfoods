const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({ log: ['error', 'warn'] });

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const restaurantName = requireEnv('RESTAURANT_TEST_NAME', 'CI Test Restaurant');
  const restaurantEmail = requireEnv('RESTAURANT_TEST_EMAIL', 'ci-restaurant@example.test').toLowerCase().trim();
  const restaurantPassword = requireEnv('RESTAURANT_TEST_PASSWORD', 'ci-restaurant-password-placeholder');
  const restaurantAddress = requireEnv('RESTAURANT_TEST_ADDRESS', 'CI Test Street 1');
  const dishName = requireEnv('DISH_TEST_NAME', 'CI Test Dish');
  const dishPriceRaw = requireEnv('DISH_TEST_PRICE', '1290');

  const dishPrice = Number(dishPriceRaw) / 100;
  if (!Number.isFinite(dishPrice) || dishPrice <= 0) {
    throw new Error('DISH_TEST_PRICE must be a positive numeric value in cents');
  }

  await prisma.$connect();

  const hashedPassword = await bcrypt.hash(restaurantPassword, 10);

  const restaurant = await prisma.restaurant.upsert({
    where: { email: restaurantEmail },
    update: {
      name: restaurantName,
      address: restaurantAddress,
      password: hashedPassword,
      status: 'OPEN',
      isActive: true,
      mustChangePassword: false,
      welcomeEmailSent: false,
    },
    create: {
      name: restaurantName,
      description: 'CI placeholder restaurant for verification scripts',
      address: restaurantAddress,
      phone: '+43123456789',
      email: restaurantEmail,
      password: hashedPassword,
      mustChangePassword: false,
      welcomeEmailSent: false,
      isActive: true,
      status: 'OPEN',
      deliveryFee: 2.5,
      minOrderAmount: 0,
      cuisines: ['Test'],
      tags: ['ci', 'test'],
    },
  });

  await prisma.dish.upsert({
    where: { id: `ci-test-dish-${restaurant.id}` },
    update: {
      name: dishName,
      price: dishPrice,
      category: 'Test',
      isAvailable: true,
      isActive: true,
      restaurantId: restaurant.id,
    },
    create: {
      id: `ci-test-dish-${restaurant.id}`,
      restaurantId: restaurant.id,
      name: dishName,
      description: 'CI placeholder dish for verification scripts',
      price: dishPrice,
      category: 'Test',
      isAvailable: true,
      isActive: true,
      tags: ['ci', 'test'],
    },
  });

  console.log(`Test restaurant ready: ${restaurant.email}`);
  console.log(`Test restaurant id: ${restaurant.id}`);
}

main()
  .catch((error) => {
    console.error('Failed to create test restaurant:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
