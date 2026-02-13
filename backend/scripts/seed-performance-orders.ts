import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set!');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

/**
 * Performance Seed Script für 100k+ Orders
 * Erstellt realistische Testdaten für Pagination-Benchmarks
 */
async function seedPerformanceOrders() {
  console.log('🚀 Starte Performance Seed für Orders...');

  const startTime = Date.now();

  try {
    // Prüfe ob bereits Performance-Daten existieren
    const existingCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date('2023-01-01'), // Performance test data marker
        },
      },
    });

    if (existingCount > 50000) {
      console.log(`✅ Performance Daten bereits vorhanden: ${existingCount} Orders`);
      return;
    }

    console.log('📊 Erstelle Performance Test Daten...');

    // Hole vorhandene Restaurants und Customers
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true },
      take: 10, // Beschränke auf 10 Restaurants für Performance
    });

    const customers = await prisma.customer.findMany({
      select: { id: true, name: true },
      take: 1000, // Beschränke auf 1000 Customers
    });

    if (restaurants.length === 0 || customers.length === 0) {
      console.log('❌ Nicht genügend Basisdaten gefunden. Führe zuerst den normalen Seed aus.');
      return;
    }

    const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    const batchSize = 1000; // Insert in batches of 1000
    const totalOrders = 100000;

    console.log(`🎯 Erstelle ${totalOrders} Orders in Batches von ${batchSize}...`);

    for (let batchStart = 0; batchStart < totalOrders; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, totalOrders);
      const batchOrders = [];

      for (let i = batchStart; i < batchEnd; i++) {
        const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Erstelle realistische timestamps über die letzten 12 Monate
        const daysAgo = Math.floor(Math.random() * 365);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);

        // Generiere eine zufällige Adresse
        const streets = ['Hauptstraße', 'Kirchweg', 'Bahnhofstraße', 'Schulweg', 'Marktplatz'];
        const cities = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf'];
        const street = streets[Math.floor(Math.random() * streets.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const address = `${street} ${Math.floor(Math.random() * 200) + 1}, ${city}`;

        // Generiere Telefonnummer
        const phone = `+49 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000000) + 1000000}`;

        // Generiere Total Amount (5-50€)
        const totalAmount = Math.round((Math.random() * 45 + 5) * 100) / 100;

        // Erstelle Order-Objekt
        const orderData = {
          id: `perf-order-${i.toString().padStart(8, '0')}`,
          customerId: customer.id,
          restaurantId: restaurant.id,
          status,
          totalAmount,
          deliveryFee: 2.50,
          taxAmount: Math.round(totalAmount * 0.1 * 100) / 100,
          address,
          phone,
          createdAt,
          updatedAt: createdAt,
        };

        batchOrders.push(orderData);
      }

      // Batch Insert
      await prisma.order.createMany({
        data: batchOrders,
        skipDuplicates: true,
      });

      const progress = ((batchEnd / totalOrders) * 100).toFixed(1);
      console.log(`📊 Batch ${Math.floor(batchStart / batchSize) + 1}: ${batchStart}-${batchEnd} Orders erstellt (${progress}%)`);
    }

    const finalCount = await prisma.order.count();
    const duration = Date.now() - startTime;

    console.log(`✅ Performance Seed abgeschlossen!`);
    console.log(`📈 Gesamt Orders: ${finalCount}`);
    console.log(`⏱️ Dauer: ${Math.round(duration / 1000)}s`);
    console.log(`🚀 Durchschnitt: ${Math.round(totalOrders / (duration / 1000))} Orders/s`);

    // Erstelle Index-Statistiken
    console.log('\n📊 Index Performance Test...');
    const indexTestStart = Date.now();

    // Test Query mit neuem Index
    const testQuery = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: new Date('2024-01-01'),
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: 100,
    });

    const indexTestDuration = Date.now() - indexTestStart;
    console.log(`⚡ Index Query Performance: ${testQuery.length} Orders in ${indexTestDuration}ms`);

  } catch (error) {
    console.error('❌ Fehler beim Performance Seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Seed aus wenn direkt aufgerufen
if (require.main === module) {
  seedPerformanceOrders()
    .then(() => {
      console.log('🎉 Performance Seed erfolgreich beendet!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Performance Seed fehlgeschlagen:', error);
      process.exit(1);
    });
}

export { seedPerformanceOrders };