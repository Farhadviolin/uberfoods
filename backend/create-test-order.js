const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function createTestOrder() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5434/uberfoods';
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({ adapter });

  try {
    // Create a test customer first
    let customer;
    try {
      customer = await prisma.customer.create({
        data: {
          id: 'customer-test-001',
          email: 'customer.test@uberfoods.com',
          firstName: 'Test',
          lastName: 'Customer',
          phone: '+1234567890',
          password: 'hashedpassword'
        }
      });
      console.log('Created customer:', customer.id);
    } catch (error) {
      console.log('Customer creation failed, trying to find existing:', error.message);
      customer = await prisma.customer.findUnique({
        where: { id: 'customer-test-001' }
      });
      if (customer) {
        console.log('Customer already exists:', customer.id);
      } else {
        throw new Error('Could not create or find customer');
      }
    }

    // Create a test restaurant
    let restaurant;
    try {
      restaurant = await prisma.restaurant.create({
        data: {
          id: 'restaurant-test-001',
          name: 'Test Restaurant',
          email: 'restaurant.test@uberfoods.com',
          address: 'Test Address',
          password: 'hashedpassword'
        }
      });
      console.log('Created restaurant:', restaurant.id);
    } catch (error) {
      console.log('Restaurant creation failed, trying to find existing:', error.message);
      restaurant = await prisma.restaurant.findUnique({
        where: { id: 'restaurant-test-001' }
      });
      if (restaurant) {
        console.log('Restaurant already exists:', restaurant.id);
      } else {
        throw new Error('Could not create or find restaurant');
      }
    }

    // Create an order
    const order = await prisma.order.create({
      data: {
        id: 'order-test-real-001',
        customerId: customer.id,
        restaurantId: restaurant.id,
        status: 'READY_FOR_PICKUP',
        totalAmount: 25.99,
        deliveryAddress: 'Test Delivery Address'
      }
    });

    console.log('Created order:', JSON.stringify(order, null, 2));

  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestOrder();
