const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const port = 3000;

app.use(express.json());

// Initialize Prisma
const prisma = new PrismaClient();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API prefix
app.use('/api', (req, res, next) => {
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Dashboard stats
app.get('/api/admin/statistics/dashboard', async (req, res) => {
  try {
    const period = req.query.period || '7d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [
      totalOrders,
      completedOrders,
      totalRevenue,
      totalCustomers,
      totalRestaurants,
      totalDrivers,
      activeDrivers,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startDate } } }),
      prisma.order.count({
        where: {
          createdAt: { gte: startDate },
          status: 'DELIVERED',
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'DELIVERED',
        },
        _sum: { totalAmount: true },
      }),
      prisma.customer.count(),
      prisma.restaurant.count(),
      prisma.driver.count(),
      prisma.driver.count({ where: { isActive: true } }),
    ]);

    res.json({
      orders: {
        total: totalOrders,
        completed: completedOrders,
        completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      },
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
        average: totalOrders > 0 ? (totalRevenue._sum.totalAmount || 0) / totalOrders : 0,
      },
      customers: {
        total: totalCustomers,
        new: 0,
      },
      restaurants: {
        total: totalRestaurants,
      },
      drivers: {
        total: totalDrivers,
        active: activeDrivers,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Orders
app.get('/api/admin/orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.status) where.status = req.query.status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          restaurant: { select: { id: true, name: true } },
          driver: { select: { id: true, name: true } },
          items: {
            include: {
              dish: { select: { id: true, name: true, price: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Customers
app.get('/api/admin/customers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          addresses: true,
          orders: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
            take: 5,
          },
        },
      }),
      prisma.customer.count(),
    ]);

    res.json({
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Restaurants
app.get('/api/admin/restaurants', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          dishes: {
            select: {
              id: true,
              name: true,
              price: true,
              isAvailable: true,
            },
            take: 10,
          },
        },
      }),
      prisma.restaurant.count(),
    ]);

    res.json({
      data: restaurants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Restaurants error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// Dishes
app.get('/api/admin/dishes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.restaurantId) where.restaurantId = req.query.restaurantId;
    if (req.query.category) where.category = req.query.category;

    const [dishes, total] = await Promise.all([
      prisma.dish.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          restaurant: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.dish.count({ where }),
    ]);

    res.json({
      data: dishes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Dishes error:', error);
    res.status(500).json({ error: 'Failed to fetch dishes' });
  }
});

// Drivers
app.get('/api/admin/drivers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orders: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
            },
            take: 5,
          },
        },
      }),
      prisma.driver.count(),
    ]);

    res.json({
      data: drivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
  console.log(`🚀 Simple Backend läuft auf http://localhost:${port}`);
  console.log(`🏥 Health Checks verfügbar unter http://localhost:${port}/api/health`);
  console.log(`📊 Dashboard Stats unter http://localhost:${port}/api/admin/statistics/dashboard`);
  console.log(`👥 Customers unter http://localhost:${port}/api/admin/customers`);
  console.log(`🍽️ Restaurants unter http://localhost:${port}/api/admin/restaurants`);
  console.log(`🍕 Dishes unter http://localhost:${port}/api/admin/dishes`);
  console.log(`📦 Orders unter http://localhost:${port}/api/admin/orders`);
  console.log(`🚗 Drivers unter http://localhost:${port}/api/admin/drivers`);
});
