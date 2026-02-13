const { PrismaClient } = require('./backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking restaurants in database...');

  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      status: true,
      email: true
    }
  });

  console.log(`Found ${restaurants.length} restaurants:`);
  restaurants.forEach(r => {
    console.log(`- ${r.name}: isActive=${r.isActive}, status=${r.status}`);
  });

  // Check public filter
  const publicRestaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      status: 'OPEN'
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      status: true
    }
  });

  console.log(`\nPublic restaurants (${publicRestaurants.length}):`);
  publicRestaurants.forEach(r => {
    console.log(`- ${r.name} (${r.id})`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);