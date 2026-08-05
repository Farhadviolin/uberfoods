import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

try {
  const [restaurants, dishes, customers, drivers, admins, addresses, permissions, roles, tiers, orders] = await Promise.all([
    prisma.restaurant.findMany({ select: { email: true }, orderBy: { email: "asc" } }),
    prisma.dish.findMany({ select: { name: true, restaurant: { select: { email: true } } }, orderBy: [{ name: "asc" }] }),
    prisma.customer.findMany({ select: { email: true }, orderBy: { email: "asc" } }),
    prisma.driver.findMany({ select: { email: true }, orderBy: { email: "asc" } }),
    prisma.admin.findMany({ select: { email: true }, orderBy: { email: "asc" } }),
    prisma.address.findMany({ select: { customer: { select: { email: true } }, street: true, city: true, postalCode: true }, orderBy: [{ street: "asc" }, { city: "asc" }] }),
    prisma.permission.findMany({ select: { resource: true, action: true }, orderBy: [{ resource: "asc" }, { action: "asc" }] }),
    prisma.role.findMany({ select: { name: true, permissions: true }, orderBy: { name: "asc" } }),
    prisma.subscriptionTierConfig.findMany({ select: { tier: true }, orderBy: { tier: "asc" } }),
    prisma.order.findMany({ select: { id: true }, orderBy: { id: "asc" } }),
  ]);
  console.log(JSON.stringify({
    counts: { restaurants: restaurants.length, dishes: dishes.length, customers: customers.length, drivers: drivers.length, admins: admins.length, addresses: addresses.length, permissions: permissions.length, roles: roles.length, tiers: tiers.length, orders: orders.length },
    keys: {
      restaurants: restaurants.map(({ email }) => email),
      dishes: dishes.map(({ name, restaurant }) => `${restaurant.email}::${name}`),
      customers: customers.map(({ email }) => email),
      drivers: drivers.map(({ email }) => email),
      admins: admins.map(({ email }) => email),
      addresses: addresses.map(({ customer, street, city, postalCode }) => `${customer.email}::${street}::${city}::${postalCode}`),
      permissions: permissions.map(({ resource, action }) => `${resource}:${action}`),
      roles: roles.map(({ name, permissions }) => `${name}::${[...permissions].sort().join(",")}`),
      tiers: tiers.map(({ tier }) => tier),
      orders: orders.map(({ id }) => id),
    },
  }));
} finally {
  await prisma.$disconnect();
}
