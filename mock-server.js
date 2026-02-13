const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// Mock /api/orders with status filtering
app.get('/api/orders', (req, res) => {
  const { status } = req.query;

  let mockOrders = [
    {
      id: '1',
      status: 'PENDING',
      totalAmount: 25.99,
      createdAt: new Date().toISOString(),
      customer: {
        id: '1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        phone: '+49123456789'
      },
      restaurant: {
        id: '1',
        name: 'Pizza Palace',
        address: 'Musterstraße 123, 12345 Musterstadt'
      },
      driver: null,
      address: 'Lieferstraße 456, 54321 Lieferstadt'
    },
    {
      id: '2',
      status: 'PREPARING',
      totalAmount: 18.50,
      createdAt: new Date(Date.now() - 300000).toISOString(),
      customer: {
        id: '2',
        name: 'Anna Schmidt',
        email: 'anna@example.com',
        phone: '+49987654321'
      },
      restaurant: {
        id: '2',
        name: 'Burger Heaven',
        address: 'Burgerweg 789, 98765 Burgerstadt'
      },
      driver: {
        id: '1',
        name: 'John Driver',
        phone: '+491122334455'
      },
      address: 'Kundenweg 321, 13579 Kundstadt'
    },
    {
      id: '3',
      status: 'READY',
      totalAmount: 32.75,
      createdAt: new Date(Date.now() - 600000).toISOString(),
      customer: {
        id: '3',
        name: 'Tom Weber',
        email: 'tom@example.com',
        phone: '+495566778899'
      },
      restaurant: {
        id: '1',
        name: 'Pizza Palace',
        address: 'Musterstraße 123, 12345 Musterstadt'
      },
      driver: {
        id: '2',
        name: 'Sarah Courier',
        phone: '+493344556677'
      },
      address: 'Tomweg 654, 24680 Tomstadt'
    },
    {
      id: '4',
      status: 'IN_TRANSIT',
      totalAmount: 15.25,
      createdAt: new Date(Date.now() - 900000).toISOString(),
      customer: {
        id: '4',
        name: 'Lisa Müller',
        email: 'lisa@example.com',
        phone: '+497788990011'
      },
      restaurant: {
        id: '2',
        name: 'Burger Heaven',
        address: 'Burgerweg 789, 98765 Burgerstadt'
      },
      driver: {
        id: '1',
        name: 'John Driver',
        phone: '+491122334455'
      },
      address: 'Lisastraße 987, 11223 Listadt'
    }
  ];

  // Filter by status if provided
  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    mockOrders = mockOrders.filter(order => statusArray.includes(order.status));
  }

  // Mock pagination/limiting
  const limit = parseInt(req.query.limit) || 50;
  mockOrders = mockOrders.slice(0, limit);

  res.json(mockOrders);
});

// Mock /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Simple mock authentication
  if (email === 'admin@uberfoods.com' && password === 'admin123') {
    res.json({
      access_token: 'mock-jwt-token-' + Date.now(),
      refresh_token: 'mock-refresh-token-' + Date.now(),
      user: {
        id: 1,
        email: 'admin@uberfoods.com',
        name: 'Admin User',
        role: 'admin',
        permissions: ['all']
      }
    });
  } else {
    res.status(401).json({
      error: 'Invalid credentials',
      message: 'Email oder Passwort ist falsch'
    });
  }
});

// Mock /api/auth/me (get current user)
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    res.json({
      id: 1,
      email: 'admin@uberfoods.com',
      name: 'Admin User',
      role: 'admin'
    });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Mock /api/dashboard/stats
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    totalOrders: 1456,
    activeOrders: 23,
    totalRevenue: 45678.90,
    totalCustomers: 892,
    totalDrivers: 45,
    averageOrderValue: 31.42,
    ordersToday: 67,
    revenueToday: 2108.45
  });
});

// Mock /api/customers
app.get('/api/customers', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Max Mustermann',
      email: 'max@example.com',
      phone: '+49123456789',
      totalOrders: 12,
      totalSpent: 387.50,
      isActive: true,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
    },
    {
      id: '2',
      name: 'Anna Schmidt',
      email: 'anna@example.com',
      phone: '+49987654321',
      totalOrders: 8,
      totalSpent: 234.75,
      isActive: true,
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
    }
  ]);
});

// Mock /api/drivers
app.get('/api/drivers', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'John Driver',
      email: 'john@uberfoods.com',
      phone: '+491122334455',
      vehicleType: 'Car',
      licensePlate: 'UBER-001',
      rating: 4.8,
      totalDeliveries: 1247,
      isActive: true,
      currentStatus: 'AVAILABLE'
    },
    {
      id: '2',
      name: 'Sarah Courier',
      email: 'sarah@uberfoods.com',
      phone: '+493344556677',
      vehicleType: 'Bike',
      licensePlate: 'BIKE-002',
      rating: 4.9,
      totalDeliveries: 892,
      isActive: true,
      currentStatus: 'BUSY'
    }
  ]);
});

// Mock /api/restaurants
app.get('/api/restaurants', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Pizza Palace',
      email: 'info@pizzapalace.com',
      phone: '+499876543210',
      address: 'Musterstraße 123, 12345 Musterstadt',
      cuisine: 'Italian',
      rating: 4.5,
      totalOrders: 2341,
      isActive: true,
      openingHours: {
        monday: '11:00-22:00',
        tuesday: '11:00-22:00',
        wednesday: '11:00-22:00',
        thursday: '11:00-22:00',
        friday: '11:00-23:00',
        saturday: '12:00-23:00',
        sunday: '12:00-22:00'
      }
    },
    {
      id: '2',
      name: 'Burger Heaven',
      email: 'hello@burgerheaven.com',
      phone: '+491122334466',
      address: 'Burgerweg 789, 98765 Burgerstadt',
      cuisine: 'American',
      rating: 4.3,
      totalOrders: 1876,
      isActive: true,
      openingHours: {
        monday: '10:00-21:00',
        tuesday: '10:00-21:00',
        wednesday: '10:00-21:00',
        thursday: '10:00-21:00',
        friday: '10:00-22:00',
        saturday: '11:00-22:00',
        sunday: '11:00-21:00'
      }
    }
  ]);
});

// Catch-all for other routes
app.use((req, res) => {
  console.log(`Unhandled ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not implemented in mock server`
  });
});

const PORT = process.env.MOCK_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Mock Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/orders`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   GET  /api/dashboard/stats`);
  console.log(`   GET  /api/customers`);
  console.log(`   GET  /api/drivers`);
  console.log(`   GET  /api/restaurants`);
});