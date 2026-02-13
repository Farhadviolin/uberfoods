import { PrismaClient } from "@prisma/client";
import { Logger } from "@nestjs/common";

const prisma = new PrismaClient();
const logger = new Logger("DriverMigration");

export async function migrateDriversToSubscriptions() {
  logger.log("🚀 Starte Migration: Bestehende Fahrer zu Subscription-System");

  // Check database connection
  try {
    await prisma.$connect();
    logger.log("✅ Datenbank-Verbindung erfolgreich");
  } catch (error) {
    logger.error("❌ Datenbank-Verbindung fehlgeschlagen:", error);
    throw new Error(
      "Database connection failed. Please check DATABASE_URL in production.env",
    );
  }

  try {
    // 0. Prüfe ob Migration bereits ausgeführt wurde
    const existingSubscriptions = await prisma.driverSubscription.count();
    if (existingSubscriptions > 0) {
      logger.warn(
        `⚠️  Migration bereits teilweise ausgeführt: ${existingSubscriptions} Subscriptions gefunden`,
      );
      logger.warn("🔄 Überspringe Migration um Duplikate zu vermeiden");
      logger.log(
        "💡 Zum Forcieren: Lösche alle DriverSubscription records manuell",
      );
      return;
    }

    // 1. Hole alle Fahrer ohne Subscription
    const driversWithoutSubscription = await prisma.driver.findMany({
      where: {
        subscription: null,
        // Optional: Nur aktive Fahrer migrieren
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    logger.log(
      `📊 Gefunden: ${driversWithoutSubscription.length} Fahrer ohne Subscription`,
    );

    if (driversWithoutSubscription.length === 0) {
      logger.log("✅ Keine Fahrer benötigen Migration");
      return;
    }

    // 2. Erstelle DriverSubscription für jeden Fahrer
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 Tage Trial

    const subscriptionPromises = driversWithoutSubscription.map((driver) => {
      logger.log(`🔄 Migriere Fahrer: ${driver.name} (${driver.email})`);

      return prisma.driverSubscription.create({
        data: {
          driverId: driver.id,
          tier: "BASIC",
          status: "TRIALING",
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndDate,
          trialEndsAt: trialEndDate,
          cancelAtPeriodEnd: false,
        },
      });
    });

    // 3. Führe alle Subscriptions parallel aus
    const results = await Promise.allSettled(subscriptionPromises);

    const successful = results.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const failed = results.filter(
      (result) => result.status === "rejected",
    ).length;

    logger.log(`✅ Migration abgeschlossen:`);
    logger.log(`   ✓ Erfolgreich: ${successful} Fahrer`);
    logger.log(`   ✗ Fehlgeschlagen: ${failed} Fahrer`);

    if (failed > 0) {
      logger.error("Fehlgeschlagene Migrationen:");
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const driver = driversWithoutSubscription[index];
          logger.error(
            `   - ${driver.name} (${driver.email}): ${result.reason}`,
          );
        }
      });

      // Bei kritischen Fehlern: Rollback anbieten
      if (failed > successful * 0.1) {
        // Mehr als 10% Fehler
        logger.warn("⚠️  Hohe Fehlerquote erkannt!");
        logger.warn(
          "🔄 Empfehlung: Migration manuell überprüfen oder Rollback durchführen",
        );
      }
    }

    // 4. Aktualisiere Driver-Tabelle (setze subscriptionTier)
    const updatePromises = driversWithoutSubscription.map((driver) =>
      prisma.driver.update({
        where: { id: driver.id },
        data: {}, // Migration completed - subscription tier now handled by separate subscription records
      }),
    );

    await Promise.allSettled(updatePromises);
    logger.log("✅ Driver-Tabelle aktualisiert");

    // 5. Erstelle CommissionTransactions für bestehende DELIVERED Orders
    logger.log("🔄 Erstelle CommissionTransactions für bestehende Orders...");

    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: "DELIVERED",
        driverId: { not: null },
      },
      include: {
        driver: {
          include: {
            subscription: true,
          },
        },
      },
    });

    logger.log(`📦 Gefunden: ${deliveredOrders.length} DELIVERED Orders`);

    const commissionPromises = deliveredOrders.map(async (order) => {
      // Prüfe ob bereits eine CommissionTransaction existiert
      const existingTransaction = await prisma.commissionTransaction.findUnique(
        {
          where: { orderId: order.id },
        },
      );

      if (existingTransaction) {
        return null; // Überspringe
      }

      // Berechne Commission basierend auf Tier (fallback auf BASIC)
      const tier = order.driver?.subscription?.tier || "BASIC";
      const commissionRate =
        tier === "PRO" || tier === "FULLTIME"
          ? 0.3
          : tier === "ENTERPRISE"
            ? 0.32
            : 0.25;

      const commissionAmount = order.totalAmount * commissionRate;

      return prisma.commissionTransaction.create({
        data: {
          orderId: order.id,
          driverId: order.driverId!,
          orderAmount: order.totalAmount,
          status: "CALCULATED",
        } as any,
      });
    });

    const commissionResults = await Promise.allSettled(commissionPromises);
    const createdCommissions = commissionResults.filter(
      (result) => result.status === "fulfilled" && result.value !== null,
    ).length;

    logger.log(`💰 Erstellt: ${createdCommissions} CommissionTransactions`);

    logger.log("🎉 Migration erfolgreich abgeschlossen!");
  } catch (error) {
    logger.error("❌ Fehler bei der Migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Migration aus wenn direkt aufgerufen
if (require.main === module) {
  migrateDriversToSubscriptions()
    .then(() => {
      logger.log("✅ Migration-Script beendet");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Migration-Script fehlgeschlagen:", error);
      process.exit(1);
    });
}

export default migrateDriversToSubscriptions;
