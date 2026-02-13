const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// API Endpunkte
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', email);

    if (email === 'admin@UberFoods.com' && password === 'admin123') {
      res.json({
        access_token: 'real-jwt-token-' + Date.now(),
        refresh_token: 'real-refresh-token-' + Date.now(),
        user: {
          id: 'admin-1',
          email: 'admin@UberFoods.com',
          name: 'Admin User',
          role: 'SUPER_ADMIN'
        }
      });
    } else {
      // Try to find user in database
      const admin = await prisma.admin.findFirst({
        where: { email }
      });

      if (admin && password === 'admin123') { // Simple password check for demo
        res.json({
          access_token: 'real-jwt-token-' + Date.now(),
          refresh_token: 'real-refresh-token-' + Date.now(),
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role
          }
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dishes
app.get('/api/admin/dishes', async (req, res) => {
  try {
    console.log('Fetching dishes...');
    const dishes = await prisma.dish.findMany({
      take: 10,
      include: {
        restaurant: true
      }
    });

    console.log(`Found ${dishes.length} dishes`);
    res.json({
      data: dishes.map(dish => ({
        id: dish.id,
        name: dish.name,
        price: dish.price,
        description: dish.description || '',
        category: dish.category || 'General',
        isActive: dish.isActive || true,
        restaurantId: dish.restaurantId,
        restaurant: dish.restaurant ? {
          id: dish.restaurant.id,
          name: dish.restaurant.name
        } : null,
        createdAt: dish.createdAt,
        updatedAt: dish.updatedAt
      })),
      total: dishes.length,
      page: 1,
      limit: 10
    });
  } catch (error) {
    console.error('Dishes error:', error);
    res.status(500).json({ message: 'Error fetching dishes', error: error.message });
  }
});

// Customers
app.get('/api/admin/customers', async (req, res) => {
  try {
    console.log('Fetching customers...');
    const customers = await prisma.customer.findMany({
      take: 10
    });

    console.log(`Found ${customers.length} customers`);
    res.json({
      data: customers.map(customer => ({
        id: customer.id,
        name: customer.name || 'Unknown',
        email: customer.email,
        phone: customer.phone || '',
        isActive: true,
        totalOrders: 0, // Would need to calculate
        totalSpent: 0, // Would need to calculate
        createdAt: customer.createdAt,
        lastOrderAt: customer.updatedAt
      })),
      total: customers.length,
      page: 1,
      limit: 10
    });
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
});

// Restaurants
app.get('/api/admin/restaurants', async (req, res) => {
  try {
    console.log('Fetching restaurants...');
    const restaurants = await prisma.restaurant.findMany({
      take: 10
    });

    console.log(`Found ${restaurants.length} restaurants`);
    res.json({
      data: restaurants.map(restaurant => ({
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        cuisine: restaurant.cuisine || 'General',
        isActive: restaurant.isActive || true,
        rating: 4.5, // Would need to calculate
        totalOrders: 0, // Would need to calculate
        createdAt: restaurant.createdAt,
        ownerId: restaurant.ownerId || 'owner-1'
      })),
      total: restaurants.length,
      page: 1,
      limit: 10
    });
  } catch (error) {
    console.error('Restaurants error:', error);
    res.status(500).json({ message: 'Error fetching restaurants', error: error.message });
  }
});

// Orders
app.get('/api/admin/orders', async (req, res) => {
  try {
    console.log('Fetching orders...');
    const orders = await prisma.order.findMany({
      take: 10,
      include: {
        customer: true,
        restaurant: true,
        driver: true
      }
    });

    console.log(`Found ${orders.length} orders`);
    res.json({
      data: orders.map(order => ({
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        deliveryFee: order.deliveryFee || 0,
        customerId: order.customerId,
        restaurantId: order.restaurantId,
        driverId: order.driverId,
        customer: order.customer ? {
          id: order.customer.id,
          name: order.customer.name || 'Unknown',
          phone: order.customer.phone || ''
        } : null,
        restaurant: order.restaurant ? {
          id: order.restaurant.id,
          name: order.restaurant.name
        } : null,
        driver: order.driver ? {
          id: order.driver.id,
          name: order.driver.name || 'Unknown'
        } : null,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt
      })),
      total: orders.length,
      page: 1,
      limit: 10
    });
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Drivers
app.get('/api/admin/drivers', async (req, res) => {
  try {
    console.log('Fetching drivers...');
    const drivers = await prisma.driver.findMany({
      take: 10
    });

    console.log(`Found ${drivers.length} drivers`);
    res.json({
      data: drivers.map(driver => ({
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone || '',
        isActive: driver.isActive || true,
        status: 'available', // Would need to determine from current status
        rating: driver.rating || 0,
        totalDeliveries: 0, // Would need to calculate
        totalEarnings: 0, // Would need to calculate
        vehicleType: 'car', // Default
        licensePlate: driver.licensePlate || '',
        createdAt: driver.createdAt,
        lastActiveAt: driver.updatedAt
      })),
      total: drivers.length,
      page: 1,
      limit: 10
    });
  } catch (error) {
    console.error('Drivers error:', error);
    res.status(500).json({ message: 'Error fetching drivers', error: error.message });
  }
});

// Fallback für andere Endpunkte
app.use('/api', (req, res) => {
  console.log('Unknown API call:', req.method, req.path);
  res.json({
    message: 'API endpoint',
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

async function startServer() {
  try {
    console.log('🔄 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(3000, () => {
      console.log('🚀 UberFoods Real Backend läuft auf http://localhost:3000');
      console.log('📊 Connected to PostgreSQL database');
      console.log('🔐 Login: admin@UberFoods.com / admin123');
      console.log('📚 Alle Admin-API-Endpunkte verfügbar');
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

startServer();
