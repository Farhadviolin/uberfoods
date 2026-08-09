const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient({ log: ["error", "warn"] });

const acceptanceOperatingHours = {
  monday: { open: "09:00", close: "22:00", isClosed: false },
  tuesday: { open: "09:00", close: "22:00", isClosed: false },
  wednesday: { open: "09:00", close: "22:00", isClosed: false },
  thursday: { open: "09:00", close: "22:00", isClosed: false },
  friday: { open: "09:00", close: "23:00", isClosed: false },
  saturday: { open: "10:00", close: "23:00", isClosed: false },
  sunday: { open: "10:00", close: "22:00", isClosed: false },
};

const acceptanceDeliveryZones = [
  {
    name: "Local Acceptance Zone",
    coordinates: [
      { lat: 48.2082, lng: 16.3738 },
      { lat: 48.2182, lng: 16.3838 },
      { lat: 48.2122, lng: 16.3988 },
      { lat: 48.2022, lng: 16.3888 },
    ],
    deliveryFee: 0,
    isActive: true,
  },
];

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function assertCredentialContract() {
  const specialCharacterPassword = 'contract-$pecial-"-\\-value';
  if (
    requireEnv("RESTAURANT_TEST_PASSWORD", specialCharacterPassword) !==
    specialCharacterPassword
  ) {
    throw new Error(
      "RESTAURANT_TEST_PASSWORD contract altered a special-character value",
    );
  }
  for (const invalidValue of [undefined, "", " \t "]) {
    try {
      requireEnv("RESTAURANT_TEST_PASSWORD", invalidValue);
      throw new Error(
        "RESTAURANT_TEST_PASSWORD contract accepted an invalid value",
      );
    } catch (error) {
      if (!String(error?.message).includes("RESTAURANT_TEST_PASSWORD"))
        throw error;
    }
  }
  console.log("Restaurant fixture credential contract self-test passed: 4/4");
}

if (process.argv.includes("--credential-contract-self-test")) {
  assertCredentialContract();
  process.exit(0);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const restaurantName = requireEnv(
    "RESTAURANT_TEST_NAME",
    "CI Test Restaurant",
  );
  const restaurantEmail = requireEnv(
    "RESTAURANT_TEST_EMAIL",
    "ci-restaurant@example.test",
  )
    .toLowerCase()
    .trim();
  const restaurantPassword = requireEnv("RESTAURANT_TEST_PASSWORD");
  const restaurantAddress = requireEnv(
    "RESTAURANT_TEST_ADDRESS",
    "CI Test Street 1",
  );
  const dishName = requireEnv("DISH_TEST_NAME", "CI Test Dish");
  const dishPriceRaw = requireEnv("DISH_TEST_PRICE", "1290");

  const dishPrice = Number(dishPriceRaw) / 100;
  if (!Number.isFinite(dishPrice) || dishPrice <= 0) {
    throw new Error(
      "DISH_TEST_PRICE must be a positive numeric value in cents",
    );
  }

  await prisma.$connect();

  const hashedPassword = await bcrypt.hash(restaurantPassword, 10);

  const restaurant = await prisma.restaurant.upsert({
    where: { email: restaurantEmail },
    update: {
      name: restaurantName,
      address: restaurantAddress,
      password: hashedPassword,
      status: "OPEN",
      isActive: true,
      mustChangePassword: false,
      welcomeEmailSent: false,
      operatingHours: acceptanceOperatingHours,
      deliveryZones: acceptanceDeliveryZones,
    },
    create: {
      name: restaurantName,
      description: "CI placeholder restaurant for verification scripts",
      address: restaurantAddress,
      phone: "+43123456789",
      email: restaurantEmail,
      password: hashedPassword,
      mustChangePassword: false,
      welcomeEmailSent: false,
      isActive: true,
      status: "OPEN",
      deliveryFee: 2.5,
      minOrderAmount: 0,
      cuisines: ["Test"],
      tags: ["ci", "test"],
      operatingHours: acceptanceOperatingHours,
      deliveryZones: acceptanceDeliveryZones,
    },
  });

  await prisma.dish.upsert({
    where: { id: `ci-test-dish-${restaurant.id}` },
    update: {
      name: dishName,
      price: dishPrice,
      category: "Test",
      isAvailable: true,
      isActive: true,
      restaurantId: restaurant.id,
    },
    create: {
      id: `ci-test-dish-${restaurant.id}`,
      restaurantId: restaurant.id,
      name: dishName,
      description: "CI placeholder dish for verification scripts",
      price: dishPrice,
      category: "Test",
      isAvailable: true,
      isActive: true,
      tags: ["ci", "test"],
    },
  });

  console.log(`Test restaurant ready: ${restaurant.email}`);
  console.log(`Test restaurant id: ${restaurant.id}`);
}

main()
  .catch((error) => {
    console.error("Failed to create test restaurant:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
