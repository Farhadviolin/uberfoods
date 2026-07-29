const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

async function main() {
  const password = process.env.PROD_SIM_DRIVER_B_PASSWORD;
  if (!process.env.DATABASE_URL || !password) {
    throw new Error(
      "DATABASE_URL and PROD_SIM_DRIVER_B_PASSWORD must be configured",
    );
  }
  const prisma = new PrismaClient({ log: ["error", "warn"] });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const driver = await prisma.driver.upsert({
      where: { email: "production-sim-driver-b@example.test" },
      update: {
        password: passwordHash,
        currentStatus: "AVAILABLE",
        isActive: true,
      },
      create: {
        email: "production-sim-driver-b@example.test",
        password: passwordHash,
        name: "Production Simulation Driver B",
        phone: "+43100000002",
        currentStatus: "AVAILABLE",
        isActive: true,
      },
      select: { id: true },
    });
    console.log(`Production simulation Driver B ready: ${driver.id}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to prepare production simulation Driver B:", error);
  process.exitCode = 1;
});
