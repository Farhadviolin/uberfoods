import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

export interface E2EFixtures {
  adminId: string;
  adminEmail: string;
  customerId: string;
  customerEmail: string;
  restaurantId: string;
  dishId: string;
  driverId: string;
}

const DEFAULT_PASSWORD = "TestPassword123!";

export async function createE2EFixtures(prisma: PrismaClient): Promise<E2EFixtures> {
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const admin = await prisma.admin.upsert({
    where: { email: "e2e-admin@uberfoods.local" },
    update: {},
    create: {
      email: "e2e-admin@uberfoods.local",
      password: hashed,
      name: "E2E Admin",
      isActive: true,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { email: "e2e-customer@uberfoods.local" },
    update: {},
    create: {
      email: "e2e-customer@uberfoods.local",
      password: hashed,
      name: "E2E Customer",
      isActive: true,
    },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: { email: "e2e-restaurant@uberfoods.local" },
    update: {},
    create: {
      email: "e2e-restaurant@uberfoods.local",
      name: "E2E Test Restaurant",
      address: "Teststraße 1",
      isActive: true,
      status: "OPEN",
    },
  });

  const dish = await prisma.dish.upsert({
    where: { id: "e2e-dish-1" },
    update: {},
    create: {
      id: "e2e-dish-1",
      name: "E2E Test Dish",
      price: 9.99,
      category: "Test",
      restaurantId: restaurant.id,
      isAvailable: true,
    },
  });

  const driver = await prisma.driver.upsert({
    where: { email: "e2e-driver@uberfoods.local" },
    update: {},
    create: {
      email: "e2e-driver@uberfoods.local",
      name: "E2E Driver",
      password: hashed,
      mustChangePassword: false,
      isActive: true,
    },
  });

  return {
    adminId: admin.id,
    adminEmail: admin.email,
    customerId: customer.id,
    customerEmail: customer.email,
    restaurantId: restaurant.id,
    dishId: dish.id,
    driverId: driver.id,
  };
}
