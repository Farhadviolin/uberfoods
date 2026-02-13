const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock Daten
const mockDishes = [
  { id: 1, name: 'Pizza Margherita', price: 12.99, restaurantId: 1 },
  { id: 2, name: 'Burger Classic', price: 9.99, restaurantId: 1 },
];

const mockCustomers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891' },
];

const mockRestaurants = [
  { id: 1, name: 'Pizza Palace', address: '123 Main St', phone: '+1234567890' },
  { id: 2, name: 'Burger Joint', address: '456 Oak St', phone: '+1234567891' },
];

const mockOrders = [
  { id: 1, customerId: 1, restaurantId: 1, status: 'pending', totalAmount: 25.98 },
  { id: 2, customerId: 2, restaurantId: 2, status: 'completed', totalAmount: 15.99 },
];

const mockDrivers = [
  { id: 1, name: 'Mike Johnson', email: 'mike@example.com', phone: '+1234567892', status: 'available' },
  { id: 2, name: 'Sarah Wilson', email: 'sarah@example.com', phone: '+1234567893', status: 'busy' },
];

// API Endpunkte
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@UberFoods.com' && password === 'admin123') {
    res.json({
      access_token: 'mock-jwt-token-' + Date.now(),
      refresh_token: 'mock-refresh-token-' + Date.now(),
      user: {
        id: 1,
        email: 'admin@UberFoods.com',
        name: 'Admin User',
        role: 'SUPER_ADMIN'
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Dishes
app.get('/api/admin/dishes', (req, res) => {
  res.json({
    data: mockDishes,
    total: mockDishes.length,
    page: 1,
    limit: 10
  });
});

// Customers
app.get('/api/admin/customers', (req, res) => {
  res.json({
    data: mockCustomers,
    total: mockCustomers.length,
    page: 1,
    limit: 10
  });
});

// Restaurants
app.get('/api/admin/restaurants', (req, res) => {
  res.json({
    data: mockRestaurants,
    total: mockRestaurants.length,
    page: 1,
    limit: 10
  });
});

// Orders
app.get('/api/admin/orders', (req, res) => {
  res.json({
    data: mockOrders,
    total: mockOrders.length,
    page: 1,
    limit: 10
  });
});

// Drivers
app.get('/api/admin/drivers', (req, res) => {
  res.json({
    data: mockDrivers,
    total: mockDrivers.length,
    page: 1,
    limit: 10
  });
});

// Fallback für andere Endpunkte
app.use('/api', (req, res) => {
  res.json({ message: 'Mock API endpoint', method: req.method, path: req.path });
});

console.log('🚀 Starting server...');
app.listen(3000, () => {
  console.log('🚀 Simple Mock Backend läuft auf http://localhost:3000');
  console.log('📚 Alle API-Endpunkte geben Mock-Daten zurück');
});
