const express = require('express');

const app = express();
const port = 3000;

app.use(express.json());

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
  res.json({ status: 'ok', message: 'Mock Backend is running' });
});

// Dashboard stats
app.get('/api/admin/statistics/dashboard', (req, res) => {
  const period = req.query.period || '7d';

  // Mock dashboard data
  const mockData = {
    orders: {
      total: 145,
      completed: 132,
      completionRate: 91.03,
    },
    revenue: {
      total: 12450.75,
      average: 85.87,
    },
    customers: {
      total: 89,
      new: 12,
    },
    restaurants: {
      total: 23,
    },
    drivers: {
      total: 34,
      active: 28,
    },
  };

  res.json(mockData);
});

// Orders
app.get('/api/admin/orders', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Mock orders data
  const mockOrders = [
    {
      id: 'ord-001',
      status: 'DELIVERED',
      totalAmount: 25.50,
      createdAt: '2025-12-16T10:30:00Z',
      customer: { id: 'cust-001', name: 'John Doe', email: 'john@example.com' },
      restaurant: { id: 'rest-001', name: 'Pizza Palace' },
      driver: { id: 'drv-001', name: 'Mike Johnson' },
      items: [
        { dish: { id: 'dish-001', name: 'Margherita Pizza', price: 18.50 } },
        { dish: { id: 'dish-002', name: 'Coca Cola', price: 3.00 } },
        { dish: { id: 'dish-003', name: 'Garlic Bread', price: 4.00 } },
      ],
    },
    {
      id: 'ord-002',
      status: 'IN_PROGRESS',
      totalAmount: 32.75,
      createdAt: '2025-12-16T11:15:00Z',
      customer: { id: 'cust-002', name: 'Jane Smith', email: 'jane@example.com' },
      restaurant: { id: 'rest-002', name: 'Burger Joint' },
      driver: { id: 'drv-002', name: 'Sarah Wilson' },
      items: [
        { dish: { id: 'dish-004', name: 'Cheeseburger', price: 12.50 } },
        { dish: { id: 'dish-005', name: 'Fries', price: 5.25 } },
        { dish: { id: 'dish-006', name: 'Milkshake', price: 15.00 } },
      ],
    },
  ];

  res.json({
    data: mockOrders,
    pagination: {
      page,
      limit,
      total: mockOrders.length,
      totalPages: 1,
    },
  });
});

// Customers
app.get('/api/admin/customers', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Mock customers data
  const mockCustomers = [
    {
      id: 'cust-001',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      createdAt: '2025-12-01T08:00:00Z',
      addresses: [
        { street: '123 Main St', city: 'New York', zipCode: '10001' },
      ],
      orders: [
        { id: 'ord-001', totalAmount: 25.50, status: 'DELIVERED', createdAt: '2025-12-16T10:30:00Z' },
        { id: 'ord-003', totalAmount: 18.25, status: 'DELIVERED', createdAt: '2025-12-15T14:20:00Z' },
      ],
    },
    {
      id: 'cust-002',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1987654321',
      createdAt: '2025-12-02T09:15:00Z',
      addresses: [
        { street: '456 Oak Ave', city: 'Los Angeles', zipCode: '90210' },
      ],
      orders: [
        { id: 'ord-002', totalAmount: 32.75, status: 'IN_PROGRESS', createdAt: '2025-12-16T11:15:00Z' },
      ],
    },
  ];

  res.json({
    data: mockCustomers,
    pagination: {
      page,
      limit,
      total: mockCustomers.length,
      totalPages: 1,
    },
  });
});

// Restaurants
app.get('/api/admin/restaurants', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Mock restaurants data
  const mockRestaurants = [
    {
      id: 'rest-001',
      name: 'Pizza Palace',
      address: '789 Pizza St, Food City',
      phone: '+1555123456',
      cuisine: 'Italian',
      isActive: true,
      createdAt: '2025-11-15T10:00:00Z',
      dishes: [
        { id: 'dish-001', name: 'Margherita Pizza', price: 18.50, isAvailable: true },
        { id: 'dish-002', name: 'Pepperoni Pizza', price: 22.00, isAvailable: true },
        { id: 'dish-003', name: 'Garlic Bread', price: 4.00, isAvailable: true },
      ],
    },
    {
      id: 'rest-002',
      name: 'Burger Joint',
      address: '321 Burger Blvd, Grill Town',
      phone: '+1555654321',
      cuisine: 'American',
      isActive: true,
      createdAt: '2025-11-20T11:30:00Z',
      dishes: [
        { id: 'dish-004', name: 'Cheeseburger', price: 12.50, isAvailable: true },
        { id: 'dish-005', name: 'Fries', price: 5.25, isAvailable: true },
        { id: 'dish-006', name: 'Milkshake', price: 15.00, isAvailable: false },
      ],
    },
  ];

  res.json({
    data: mockRestaurants,
    pagination: {
      page,
      limit,
      total: mockRestaurants.length,
      totalPages: 1,
    },
  });
});

// Dishes
app.get('/api/admin/dishes', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Mock dishes data
  const mockDishes = [
    {
      id: 'dish-001',
      name: 'Margherita Pizza',
      description: 'Fresh mozzarella, tomato sauce, basil',
      price: 18.50,
      category: 'Pizza',
      isAvailable: true,
      createdAt: '2025-11-15T10:15:00Z',
      restaurant: { id: 'rest-001', name: 'Pizza Palace' },
    },
    {
      id: 'dish-002',
      name: 'Pepperoni Pizza',
      description: 'Pepperoni, mozzarella, tomato sauce',
      price: 22.00,
      category: 'Pizza',
      isAvailable: true,
      createdAt: '2025-11-15T10:20:00Z',
      restaurant: { id: 'rest-001', name: 'Pizza Palace' },
    },
    {
      id: 'dish-003',
      name: 'Garlic Bread',
      description: 'Fresh bread with garlic butter',
      price: 4.00,
      category: 'Side',
      isAvailable: true,
      createdAt: '2025-11-15T10:25:00Z',
      restaurant: { id: 'rest-001', name: 'Pizza Palace' },
    },
    {
      id: 'dish-004',
      name: 'Cheeseburger',
      description: 'Beef patty with cheese, lettuce, tomato',
      price: 12.50,
      category: 'Burger',
      isAvailable: true,
      createdAt: '2025-11-20T11:45:00Z',
      restaurant: { id: 'rest-002', name: 'Burger Joint' },
    },
  ];

  res.json({
    data: mockDishes,
    pagination: {
      page,
      limit,
      total: mockDishes.length,
      totalPages: 1,
    },
  });
});

// Drivers
app.get('/api/admin/drivers', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  // Mock drivers data
  const mockDrivers = [
    {
      id: 'drv-001',
      name: 'Mike Johnson',
      email: 'mike@uberfoods.com',
      phone: '+1444987654',
      isActive: true,
      createdAt: '2025-11-10T09:00:00Z',
      orders: [
        { id: 'ord-001', status: 'DELIVERED', totalAmount: 25.50 },
        { id: 'ord-003', status: 'DELIVERED', totalAmount: 18.25 },
      ],
    },
    {
      id: 'drv-002',
      name: 'Sarah Wilson',
      email: 'sarah@uberfoods.com',
      phone: '+1444123987',
      isActive: true,
      createdAt: '2025-11-12T10:30:00Z',
      orders: [
        { id: 'ord-002', status: 'IN_PROGRESS', totalAmount: 32.75 },
      ],
    },
  ];

  res.json({
    data: mockDrivers,
    pagination: {
      page,
      limit,
      total: mockDrivers.length,
      totalPages: 1,
    },
  });
});

// ===== ADDITIONAL STATISTICS ENDPOINTS =====

// Revenue statistics
app.get('/api/admin/statistics/revenue', (req, res) => {
  const period = req.query.period || '7d';

  const mockRevenue = [
    { date: '2025-12-10', revenue: 1250.50, orders: 15 },
    { date: '2025-12-11', revenue: 1380.75, orders: 18 },
    { date: '2025-12-12', revenue: 1120.25, orders: 14 },
    { date: '2025-12-13', revenue: 1450.00, orders: 22 },
    { date: '2025-12-14', revenue: 1320.80, orders: 16 },
    { date: '2025-12-15', revenue: 1580.90, orders: 25 },
    { date: '2025-12-16', revenue: 1420.60, orders: 19 },
  ];

  res.json({ data: mockRevenue });
});

// Top restaurants
app.get('/api/admin/statistics/top-restaurants', (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  const mockTopRestaurants = [
    { id: 'rest-001', name: 'Pizza Palace', orders: 145, revenue: 2850.50, rating: 4.5 },
    { id: 'rest-002', name: 'Burger Joint', orders: 98, revenue: 1950.75, rating: 4.2 },
    { id: 'rest-003', name: 'Sushi Garden', orders: 76, revenue: 1650.25, rating: 4.7 },
    { id: 'rest-004', name: 'Taco Fiesta', orders: 54, revenue: 1250.00, rating: 4.3 },
    { id: 'rest-005', name: 'Pasta Paradise', orders: 43, revenue: 1100.80, rating: 4.4 },
  ].slice(0, limit);

  res.json({ data: mockTopRestaurants });
});

// Driver performance
app.get('/api/admin/statistics/driver-performance', (req, res) => {
  const period = req.query.period || '7d';

  const mockDriverPerformance = [
    { driverId: 'drv-001', name: 'Mike Johnson', deliveries: 45, rating: 4.8, earnings: 225.50 },
    { driverId: 'drv-002', name: 'Sarah Wilson', deliveries: 38, rating: 4.6, earnings: 190.25 },
    { driverId: 'drv-003', name: 'John Smith', deliveries: 32, rating: 4.7, earnings: 160.00 },
    { driverId: 'drv-004', name: 'Emma Davis', deliveries: 28, rating: 4.5, earnings: 140.75 },
    { driverId: 'drv-005', name: 'Alex Brown', deliveries: 25, rating: 4.9, earnings: 125.00 },
  ];

  res.json({ data: mockDriverPerformance });
});

// Promotion performance
app.get('/api/admin/statistics/promotion-performance', (req, res) => {
  const period = req.query.period || '7d';

  const mockPromotionPerformance = [
    { promotionId: 'promo-001', name: 'Weekend Special', usage: 125, revenue: 1250.00, orders: 25 },
    { promotionId: 'promo-002', name: 'Student Discount', usage: 89, revenue: 890.00, orders: 18 },
    { promotionId: 'promo-003', name: 'First Order Free', usage: 67, revenue: 670.00, orders: 13 },
  ];

  res.json({ data: mockPromotionPerformance });
});

// Customer growth
app.get('/api/admin/statistics/customer-growth', (req, res) => {
  const period = req.query.period || '7d';

  const mockCustomerGrowth = [
    { date: '2025-12-10', newCustomers: 12, totalCustomers: 245 },
    { date: '2025-12-11', newCustomers: 8, totalCustomers: 253 },
    { date: '2025-12-12', newCustomers: 15, totalCustomers: 268 },
    { date: '2025-12-13', newCustomers: 10, totalCustomers: 278 },
    { date: '2025-12-14', newCustomers: 7, totalCustomers: 285 },
    { date: '2025-12-15', newCustomers: 14, totalCustomers: 299 },
    { date: '2025-12-16', newCustomers: 11, totalCustomers: 310 },
  ];

  res.json({ data: mockCustomerGrowth });
});

// Order status distribution
app.get('/api/admin/statistics/order-status-distribution', (req, res) => {
  const period = req.query.period || '7d';

  const mockOrderStatusDistribution = {
    PENDING: 15,
    CONFIRMED: 8,
    PREPARING: 12,
    READY_FOR_PICKUP: 6,
    IN_PROGRESS: 9,
    DELIVERED: 145,
    CANCELLED: 5,
  };

  res.json({ data: mockOrderStatusDistribution });
});

// Top promotions
app.get('/api/admin/statistics/top-promotions', (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  const mockTopPromotions = [
    { id: 'promo-001', name: 'Weekend Special', usage: 125, discount: '20%', revenue: 1250.00 },
    { id: 'promo-002', name: 'Student Discount', usage: 89, discount: '15%', revenue: 890.00 },
    { id: 'promo-003', name: 'First Order Free', usage: 67, discount: '100%', revenue: 670.00 },
    { id: 'promo-004', name: 'Loyalty Points', usage: 54, discount: '10%', revenue: 540.00 },
    { id: 'promo-005', name: 'Holiday Special', usage: 43, discount: '25%', revenue: 430.00 },
  ].slice(0, limit);

  res.json({ data: mockTopPromotions });
});

// ===== SUPPORT ENDPOINTS =====

// Support tickets
app.get('/api/admin/support/tickets', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const mockTickets = [
    {
      id: 'ticket-001',
      subject: 'Order delayed',
      status: 'OPEN',
      priority: 'HIGH',
      customer: { id: 'cust-001', name: 'John Doe', email: 'john@example.com' },
      createdAt: '2025-12-16T09:30:00Z',
      lastActivity: '2025-12-16T10:15:00Z'
    },
    {
      id: 'ticket-002',
      subject: 'Wrong order received',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      customer: { id: 'cust-002', name: 'Jane Smith', email: 'jane@example.com' },
      createdAt: '2025-12-15T14:20:00Z',
      lastActivity: '2025-12-16T08:45:00Z'
    },
  ];

  res.json({
    data: mockTickets,
    pagination: {
      page,
      limit,
      total: mockTickets.length,
      totalPages: 1,
    },
  });
});

// Support analytics
app.get('/api/admin/support/analytics', (req, res) => {
  const mockAnalytics = {
    totalTickets: 245,
    openTickets: 18,
    resolvedToday: 12,
    averageResponseTime: '2.5h',
    customerSatisfaction: 4.2,
    categories: {
      'Order Issues': 45,
      'Delivery Problems': 38,
      'Payment Issues': 25,
      'App Problems': 18,
      'Other': 12,
    }
  };

  res.json(mockAnalytics);
});

// Support chat sessions
app.get('/api/admin/support/chat/sessions', (req, res) => {
  const mockSessions = [
    {
      id: 'chat-001',
      customer: { id: 'cust-001', name: 'John Doe' },
      status: 'ACTIVE',
      startedAt: '2025-12-16T10:30:00Z',
      lastMessage: '2025-12-16T10:45:00Z'
    },
    {
      id: 'chat-002',
      customer: { id: 'cust-002', name: 'Jane Smith' },
      status: 'ENDED',
      startedAt: '2025-12-16T09:15:00Z',
      endedAt: '2025-12-16T09:45:00Z'
    },
  ];

  res.json({ data: mockSessions });
});

// ===== REVIEWS ENDPOINTS =====

// Reviews stats
app.get('/api/admin/reviews/stats', (req, res) => {
  const mockStats = {
    total: 342,
    average: 4.3,
    distribution: {
      1: 12,
      2: 18,
      3: 45,
      4: 89,
      5: 178,
    },
    recent: {
      thisWeek: 28,
      thisMonth: 124,
      trend: '+12%'
    }
  };

  res.json(mockStats);
});

// All reviews
app.get('/api/admin/reviews/all', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const mockReviews = [
    {
      id: 'review-001',
      customer: { id: 'cust-001', name: 'John Doe' },
      restaurant: { id: 'rest-001', name: 'Pizza Palace' },
      rating: 5,
      comment: 'Excellent pizza! Fast delivery and great taste.',
      createdAt: '2025-12-16T08:30:00Z',
      response: null
    },
    {
      id: 'review-002',
      customer: { id: 'cust-002', name: 'Jane Smith' },
      restaurant: { id: 'rest-002', name: 'Burger Joint' },
      rating: 4,
      comment: 'Good burger but delivery took longer than expected.',
      createdAt: '2025-12-15T19:45:00Z',
      response: 'Sorry for the delay. We\'re working to improve our delivery times.'
    },
  ];

  res.json({
    data: mockReviews,
    pagination: {
      page,
      limit,
      total: mockReviews.length,
      totalPages: 1,
    },
  });
});

// ===== SYSTEM ENDPOINTS =====

// System metrics
app.get('/api/admin/system/metrics', (req, res) => {
  const mockMetrics = {
    uptime: '99.9%',
    responseTime: '245ms',
    activeUsers: 1250,
    serverLoad: 45,
    memoryUsage: 68,
    databaseConnections: 23,
    apiCallsPerMinute: 1250,
    errorRate: '0.02%',
    alerts: {
      critical: 0,
      warning: 2,
      info: 5
    }
  };

  res.json(mockMetrics);
});

// System alerts
app.get('/api/admin/system/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  const mockAlerts = [
    {
      id: 'alert-001',
      type: 'WARNING',
      title: 'High server load',
      message: 'Server load is above 80%',
      timestamp: '2025-12-16T10:30:00Z',
      resolved: false
    },
    {
      id: 'alert-002',
      type: 'INFO',
      title: 'Database backup completed',
      message: 'Daily backup finished successfully',
      timestamp: '2025-12-16T02:00:00Z',
      resolved: true
    },
  ].slice(0, limit);

  res.json({ data: mockAlerts });
});

// ===== ANALYTICS ENDPOINTS =====

// System history
app.get('/api/admin/analytics/system-history', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;

  const mockHistory = [];
  const now = new Date();

  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    mockHistory.push({
      timestamp: timestamp.toISOString(),
      activeUsers: Math.floor(Math.random() * 100) + 50,
      responseTime: Math.floor(Math.random() * 200) + 100,
      errorRate: Math.random() * 0.01
    });
  }

  res.json({ data: mockHistory });
});

// Delivery times analytics
app.get('/api/admin/analytics/delivery-times', (req, res) => {
  const period = req.query.period || 'day';

  const mockDeliveryTimes = [
    { time: '08:00', average: 22, orders: 15 },
    { time: '09:00', average: 18, orders: 23 },
    { time: '10:00', average: 25, orders: 18 },
    { time: '11:00', average: 20, orders: 25 },
    { time: '12:00', average: 35, orders: 45 }, // Lunch rush
    { time: '13:00', average: 28, orders: 32 },
    { time: '14:00', average: 22, orders: 28 },
    { time: '15:00', average: 19, orders: 20 },
    { time: '16:00', average: 24, orders: 22 },
    { time: '17:00', average: 30, orders: 35 },
    { time: '18:00', average: 40, orders: 55 }, // Dinner rush
    { time: '19:00', average: 45, orders: 48 },
    { time: '20:00', average: 38, orders: 42 },
    { time: '21:00', average: 25, orders: 28 },
    { time: '22:00', average: 20, orders: 15 },
  ];

  res.json({ data: mockDeliveryTimes });
});

// ===== PROMOTIONS ENDPOINTS =====

// Promotions
app.get('/api/admin/promotions', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const mockPromotions = [
    {
      id: 'promo-001',
      name: 'Weekend Special',
      description: '20% off on all orders',
      discount: '20%',
      type: 'PERCENTAGE',
      isActive: true,
      usageCount: 125,
      validFrom: '2025-12-13T00:00:00Z',
      validUntil: '2025-12-16T23:59:59Z',
      createdAt: '2025-12-10T09:00:00Z'
    },
    {
      id: 'promo-002',
      name: 'Student Discount',
      description: '15% off for students',
      discount: '15%',
      type: 'PERCENTAGE',
      isActive: true,
      usageCount: 89,
      validFrom: '2025-12-01T00:00:00Z',
      validUntil: '2025-12-31T23:59:59Z',
      createdAt: '2025-12-01T10:00:00Z'
    },
    {
      id: 'promo-003',
      name: 'First Order Free',
      description: 'Free delivery on first order',
      discount: '100%',
      type: 'DELIVERY',
      isActive: true,
      usageCount: 67,
      validFrom: '2025-11-01T00:00:00Z',
      validUntil: '2025-12-31T23:59:59Z',
      createdAt: '2025-11-01T08:00:00Z'
    },
  ];

  res.json({
    data: mockPromotions,
    pagination: {
      page,
      limit,
      total: mockPromotions.length,
      totalPages: 1,
    },
  });
});

// Promotions POST, PUT, DELETE
app.post('/api/admin/promotions', (req, res) => {
  const newPromotion = {
    id: `promo-${Date.now()}`,
    ...req.body,
    usageCount: 0,
    createdAt: new Date().toISOString()
  };
  res.json(newPromotion);
});

app.put('/api/admin/promotions/:id', (req, res) => {
  const updatedPromotion = {
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  res.json(updatedPromotion);
});

app.delete('/api/admin/promotions/:id', (req, res) => {
  res.json({ message: 'Promotion deleted successfully' });
});

// ===== ADVANCED DRIVER ENDPOINTS =====

// Driver schedules
app.get('/api/drivers/advanced/schedules', (req, res) => {
  const mockSchedules = [
    {
      driverId: 'drv-001',
      name: 'Mike Johnson',
      schedule: {
        monday: { start: '09:00', end: '17:00', active: true },
        tuesday: { start: '09:00', end: '17:00', active: true },
        wednesday: { start: '09:00', end: '17:00', active: true },
        thursday: { start: '09:00', end: '17:00', active: true },
        friday: { start: '09:00', end: '17:00', active: true },
        saturday: { start: '10:00', end: '16:00', active: true },
        sunday: { start: null, end: null, active: false }
      }
    },
    {
      driverId: 'drv-002',
      name: 'Sarah Wilson',
      schedule: {
        monday: { start: '08:00', end: '16:00', active: true },
        tuesday: { start: '08:00', end: '16:00', active: true },
        wednesday: { start: '08:00', end: '16:00', active: true },
        thursday: { start: '08:00', end: '16:00', active: true },
        friday: { start: '08:00', end: '16:00', active: true },
        saturday: { start: null, end: null, active: false },
        sunday: { start: null, end: null, active: false }
      }
    }
  ];

  res.json({ data: mockSchedules });
});

// Driver overview
app.get('/api/drivers/advanced/overview', (req, res) => {
  const mockOverview = {
    totalDrivers: 34,
    activeDrivers: 28,
    availableDrivers: 22,
    busyDrivers: 6,
    offlineDrivers: 6,
    averageRating: 4.6,
    totalDeliveriesToday: 145,
    averageDeliveryTime: 24.5,
    onTimeDeliveryRate: 94.2
  };

  res.json(mockOverview);
});

// Driver performance
app.get('/api/drivers/advanced/performance', (req, res) => {
  const period = req.query.period || 'week';

  const mockPerformance = [
    {
      driverId: 'drv-001',
      name: 'Mike Johnson',
      metrics: {
        deliveriesCompleted: 45,
        averageRating: 4.8,
        averageDeliveryTime: 22,
        onTimeRate: 96,
        customerComplaints: 0,
        earnings: 225.50
      }
    },
    {
      driverId: 'drv-002',
      name: 'Sarah Wilson',
      metrics: {
        deliveriesCompleted: 38,
        averageRating: 4.6,
        averageDeliveryTime: 25,
        onTimeRate: 92,
        customerComplaints: 1,
        earnings: 190.25
      }
    }
  ];

  res.json({ data: mockPerformance });
});

// Driver earnings
app.get('/api/drivers/advanced/earnings', (req, res) => {
  const period = req.query.period || 'month';

  const mockEarnings = [
    {
      driverId: 'drv-001',
      name: 'Mike Johnson',
      earnings: {
        basePay: 180.00,
        bonuses: 35.50,
        tips: 10.00,
        total: 225.50,
        hourlyRate: 15.00,
        hoursWorked: 12.0
      }
    },
    {
      driverId: 'drv-002',
      name: 'Sarah Wilson',
      earnings: {
        basePay: 152.00,
        bonuses: 28.25,
        tips: 10.00,
        total: 190.25,
        hourlyRate: 14.50,
        hoursWorked: 10.5
      }
    }
  ];

  res.json({ data: mockEarnings });
});

// Driver analytics
app.get('/api/drivers/advanced/analytics', (req, res) => {
  const period = req.query.period || 'week';

  const mockAnalytics = {
    performance: {
      averageRating: 4.6,
      averageDeliveryTime: 24.5,
      onTimeDeliveryRate: 94.2,
      customerSatisfaction: 4.7
    },
    activity: {
      totalDeliveries: 1450,
      peakHours: ['12:00-13:00', '18:00-19:00', '19:00-20:00'],
      busiestDay: 'Friday',
      averageDailyDeliveries: 28
    },
    trends: {
      deliveriesTrend: '+12%',
      ratingTrend: '+0.2',
      efficiencyTrend: '+8%'
    }
  };

  res.json(mockAnalytics);
});

// ===== USER SUBSCRIPTIONS ENDPOINTS =====

// User subscriptions
app.get('/api/admin/users/subscriptions', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  const mockSubscriptions = [
    {
      id: 'sub-001',
      userId: 'user-001',
      userName: 'John Doe',
      plan: 'Premium',
      status: 'active',
      currentPeriodStart: '2025-12-01T00:00:00Z',
      currentPeriodEnd: '2026-01-01T00:00:00Z',
      amount: 29.99,
      currency: 'EUR',
      autoRenew: true,
      createdAt: '2025-11-15T10:00:00Z'
    },
    {
      id: 'sub-002',
      userId: 'user-002',
      userName: 'Jane Smith',
      plan: 'Basic',
      status: 'active',
      currentPeriodStart: '2025-12-01T00:00:00Z',
      currentPeriodEnd: '2026-01-01T00:00:00Z',
      amount: 9.99,
      currency: 'EUR',
      autoRenew: true,
      createdAt: '2025-11-20T14:30:00Z'
    }
  ];

  const paginatedData = mockSubscriptions.slice(offset, offset + limit);

  res.json({
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: mockSubscriptions.length,
      totalPages: Math.ceil(mockSubscriptions.length / limit),
      offset
    }
  });
});

// User subscriptions analytics
app.get('/api/admin/users/subscriptions/analytics', (req, res) => {
  const period = req.query.period || 'month';

  const mockAnalytics = {
    overview: {
      totalSubscriptions: 1250,
      activeSubscriptions: 1180,
      trialSubscriptions: 45,
      cancelledSubscriptions: 25,
      churnRate: 2.1
    },
    revenue: {
      monthlyRecurringRevenue: 28747.50,
      averageRevenuePerUser: 24.25,
      projectedMonthlyRevenue: 31250.00,
      growthRate: 12.5
    },
    plans: {
      basic: { count: 450, percentage: 36 },
      premium: { count: 580, percentage: 46.4 },
      enterprise: { count: 220, percentage: 17.6 }
    },
    trends: {
      newSubscriptions: '+15%',
      cancellations: '-8%',
      upgrades: '+22%'
    }
  };

  res.json(mockAnalytics);
});

// Subscription tier configs
app.get('/api/admin/users/subscriptions/tier-configs', (req, res) => {
  const mockConfigs = [
    {
      id: 'tier-basic',
      name: 'Basic',
      price: 9.99,
      currency: 'EUR',
      features: [
        'Up to 5 deliveries per month',
        'Basic customer support',
        'Mobile app access'
      ],
      isActive: true,
      maxUsers: 1,
      trialDays: 7
    },
    {
      id: 'tier-premium',
      name: 'Premium',
      price: 29.99,
      currency: 'EUR',
      features: [
        'Unlimited deliveries',
        'Priority customer support',
        'Advanced analytics',
        'Custom branding'
      ],
      isActive: true,
      maxUsers: 5,
      trialDays: 14
    },
    {
      id: 'tier-enterprise',
      name: 'Enterprise',
      price: 99.99,
      currency: 'EUR',
      features: [
        'Everything in Premium',
        'Dedicated account manager',
        'Custom integrations',
        'White-label solution'
      ],
      isActive: true,
      maxUsers: -1, // unlimited
      trialDays: 30
    }
  ];

  res.json({ data: mockConfigs });
});

// ===== WEBSOCKET SUPPORT =====

// Basic WebSocket support for Socket.IO
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Mock real-time updates
  setInterval(() => {
    socket.emit('order-update', {
      orderId: 'ord-' + Math.random().toString(36).substr(2, 9),
      status: 'DELIVERED',
      timestamp: new Date().toISOString()
    });
  }, 30000); // Every 30 seconds
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

server.listen(port, () => {
  console.log(`🚀 Mock Backend läuft auf http://localhost:${port}`);
  console.log(`🏥 Health Checks verfügbar unter http://localhost:${port}/api/health`);
  console.log(`📊 Dashboard Stats unter http://localhost:${port}/api/admin/statistics/dashboard`);
  console.log(`👥 Customers unter http://localhost:${port}/api/admin/customers`);
  console.log(`🍽️ Restaurants unter http://localhost:${port}/api/admin/restaurants`);
  console.log(`🍕 Dishes unter http://localhost:${port}/api/admin/dishes`);
  console.log(`📦 Orders unter http://localhost:${port}/api/admin/orders`);
  console.log(`🚗 Drivers unter http://localhost:${port}/api/admin/drivers`);
  console.log(`📈 Zusätzliche Endpoints verfügbar:`);
  console.log(`   - Statistics: revenue, top-restaurants, driver-performance, etc.`);
  console.log(`   - Support: tickets, analytics, chat/sessions`);
  console.log(`   - Reviews: stats, all`);
  console.log(`   - System: metrics, alerts`);
  console.log(`   - Analytics: system-history, delivery-times`);
  console.log(`   - Promotions: CRUD operations`);
  console.log(`🔌 WebSocket-Unterstützung aktiviert`);
});
