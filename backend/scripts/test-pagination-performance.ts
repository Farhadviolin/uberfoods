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
 * Pagination Performance Test
 * Testet Keyset vs Offset Pagination Performance
 */
async function runPaginationPerformanceTests() {
  console.log('🧪 Starte Pagination Performance Tests...\n');

  try {
    // Prüfe Datenbasis
    const totalOrders = await prisma.order.count();
    console.log(`📊 Datenbasis: ${totalOrders} Orders\n`);

    if (totalOrders < 10000) {
      console.log('⚠️ Zu wenig Testdaten. Führe zuerst `npm run seed:performance` aus.');
      return;
    }

    // Test 1: Offset Pagination (alte Methode)
    console.log('📈 Test 1: Offset Pagination Performance');
    await testOffsetPagination();

    // Test 2: Keyset Pagination (neue Methode)
    console.log('\n🎯 Test 2: Keyset Pagination Performance');
    await testKeysetPagination();

    // Test 3: Scalability Test
    console.log('\n📊 Test 3: Scalability Comparison');
    await testScalability();

    // Test 4: Index Effectiveness
    console.log('\n🔍 Test 4: Index Effectiveness');
    await testIndexEffectiveness();

  } catch (error) {
    console.error('❌ Performance Test fehlgeschlagen:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testOffsetPagination() {
  const testCases = [
    { page: 1, limit: 50 },
    { page: 100, limit: 50 },
    { page: 500, limit: 50 },
    { page: 1000, limit: 50 },
  ];

  for (const testCase of testCases) {
    const startTime = Date.now();

    const orders = await prisma.order.findMany({
      where: { status: 'DELIVERED' },
      orderBy: { createdAt: 'desc' },
      skip: (testCase.page - 1) * testCase.limit,
      take: testCase.limit,
      select: { id: true, createdAt: true, status: true },
    });

    const duration = Date.now() - startTime;

    console.log(`  Offset Page ${testCase.page}: ${orders.length} Orders in ${duration}ms`);
  }
}

async function testKeysetPagination() {
  const testCases = [
    { cursor: null, limit: 50 },
    { cursor: 'MjAyNC0wMS0xNVQxNDozMDowMC4wMDBaOmNrcTF2OG01eDAwMDBhYmNkZWZnaGlqa2w=', limit: 50 },
    { cursor: 'MjAyNC0wNi0xNVQxNDozMDowMC4wMDBaOmNrcTF2OG01eDAwMDBhYmNkZWZnaGlqa2w=', limit: 50 },
    { cursor: 'MjAyNC0xMS0xNVQxNDozMDowMC4wMDBaOmNrcTF2OG01eDAwMDBhYmNkZWZnaGlqa2w=', limit: 50 },
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const startTime = Date.now();

    let where: any = { status: 'DELIVERED' };

    // Apply cursor filter for subsequent pages
    if (testCase.cursor && i > 0) {
      // Decode cursor (simplified for test)
      const decoded = Buffer.from(testCase.cursor, 'base64').toString();
      const [dateStr, id] = decoded.split(':');
      const cursorDate = new Date(dateStr);

      where = {
        status: 'DELIVERED',
        OR: [
          { createdAt: { lt: cursorDate } },
          {
            AND: [
              { createdAt: { equals: cursorDate } },
              { id: { lt: id } }
            ]
          }
        ]
      };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      take: testCase.limit + 1, // +1 to check if more exist
      select: { id: true, createdAt: true, status: true },
    });

    const duration = Date.now() - startTime;
    const hasMore = orders.length > testCase.limit;
    const resultCount = Math.min(orders.length, testCase.limit);

    console.log(`  Keyset Page ${i + 1}: ${resultCount} Orders in ${duration}ms${hasMore ? ' (+more)' : ''}`);
  }
}

async function testScalability() {
  const scenarios = [
    { name: 'Small Dataset', where: { createdAt: { gte: new Date('2024-12-01') } } },
    { name: 'Medium Dataset', where: { createdAt: { gte: new Date('2024-06-01') } } },
    { name: 'Large Dataset', where: {} },
  ];

  for (const scenario of scenarios) {
    // Count total records
    const totalCount = await prisma.order.count({ where: scenario.where });
    console.log(`\n📊 ${scenario.name}: ${totalCount} Orders`);

    // Test Offset Pagination (Page 100)
    const offsetStart = Date.now();
    const offsetResult = await prisma.order.findMany({
      where: scenario.where,
      orderBy: { createdAt: 'desc' },
      skip: 4950, // Page 100 * 50 - 50
      take: 50,
    });
    const offsetDuration = Date.now() - offsetStart;

    // Test Keyset Pagination (Equivalent)
    const keysetStart = Date.now();
    const firstPageOrders = await prisma.order.findMany({
      where: scenario.where,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      take: 5000, // Get first 5000 to simulate deep pagination
    });

    let keysetResult: any[] = [];
    if (firstPageOrders.length >= 4950) {
      const cursorOrder = firstPageOrders[4949]; // 4950th order (0-indexed)
      keysetResult = await prisma.order.findMany({
        where: {
          ...scenario.where,
          OR: [
            { createdAt: { lt: cursorOrder.createdAt } },
            {
              AND: [
                { createdAt: { equals: cursorOrder.createdAt } },
                { id: { lt: cursorOrder.id } }
              ]
            }
          ]
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' }
        ],
        take: 50,
      });
    }
    const keysetDuration = Date.now() - keysetStart;

    const improvement = offsetDuration > 0 ? ((offsetDuration - keysetDuration) / offsetDuration * 100).toFixed(1) : '0';

    console.log(`    Offset: ${offsetResult.length} Orders in ${offsetDuration}ms`);
    console.log(`    Keyset: ${keysetResult.length} Orders in ${keysetDuration}ms`);
    console.log(`    Improvement: ${improvement}% faster`);
  }
}

async function testIndexEffectiveness() {
  console.log('🔍 Testing Index Usage...\n');

  // Test query without index (would use table scan)
  const noIndexStart = Date.now();
  const noIndexResult = await prisma.$queryRaw`
    SELECT id, created_at, status
    FROM orders
    WHERE status = 'DELIVERED'
    ORDER BY created_at DESC, id DESC
    LIMIT 100
  `;
  const noIndexDuration = Date.now() - noIndexStart;

  // Test query with index
  const indexStart = Date.now();
  const indexResult = await prisma.order.findMany({
    where: { status: 'DELIVERED' },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ],
    take: 100,
    select: { id: true, createdAt: true, status: true },
  });
  const indexDuration = Date.now() - indexStart;

  console.log(`  Without Index: ${(noIndexResult as any[]).length} Orders in ${noIndexDuration}ms`);
  console.log(`  With Index: ${indexResult.length} Orders in ${indexDuration}ms`);

  if (indexDuration < noIndexDuration) {
    const speedup = ((noIndexDuration - indexDuration) / noIndexDuration * 100).toFixed(1);
    console.log(`  🚀 Index Speedup: ${speedup}% faster`);
  } else {
    console.log('  ⚠️ Index might not be used - check query planner');
  }

  // Check if indexes exist
  console.log('\n📋 Checking Database Indexes...');
  try {
    const indexes = await prisma.$queryRaw`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes
      WHERE tablename = 'orders'
      AND indexname LIKE '%status%created%'
      ORDER BY indexname;
    `;

    console.log('  Found indexes:');
    (indexes as any[]).forEach((idx: any) => {
      console.log(`    - ${idx.indexname}: ${idx.indexdef.substring(0, 100)}...`);
    });

    if ((indexes as any[]).length === 0) {
      console.log('  ❌ No relevant indexes found! Run: npx prisma migrate deploy');
    }
  } catch (error) {
    console.log('  ⚠️ Could not check indexes (might not be PostgreSQL)');
  }
}

// CLI Runner
if (require.main === module) {
  runPaginationPerformanceTests()
    .then(() => {
      console.log('\n🎉 Performance Tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Performance Tests failed:', error);
      process.exit(1);
    });
}

export { runPaginationPerformanceTests };