const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'UberFoods Backend Running',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    note: 'Minimal Express server - NestJS compilation in progress'
  });
});

// API Docs placeholder
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'Swagger UI would be here - backend compilation in progress',
    version: '2.0.0',
    endpoints: [
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/restaurants',
      'GET /api/orders',
      'GET /api/admin/users'
    ],
    note: 'Using minimal Express backend until NestJS is fully compiled'
  });
});

// Auth endpoints (mock)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'admin@uberfoods.com' && password === 'admin123') {
    return res.json({
      access_token: 'admin-jwt-token-demo',
      user: { id: '1', email, role: 'admin', name: 'Admin User' }
    });
  }

  if (email === 'customer@uberfoods.com' && password === 'customer123') {
    return res.json({
      access_token: 'customer-jwt-token-demo',
      user: { id: '2', email, role: 'customer', name: 'Customer User' }
    });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// Restaurants endpoint
app.get('/api/restaurants', (req, res) => {
  res.json({
    data: [
      {
        id: '1',
        name: 'Pizza Palace',
        description: 'Authentic Italian Pizza',
        address: 'Hauptstrasse 1, 1010 Vienna',
        rating: 4.5,
        status: 'OPEN',
        cuisines: ['Italian'],
        deliveryFee: 2.5
      },
      {
        id: '2',
        name: 'Burger Joint',
        description: 'Gourmet Burgers',
        address: 'Karlsplatz 1, 1010 Vienna',
        rating: 4.2,
        status: 'OPEN',
        cuisines: ['American'],
        deliveryFee: 1.8
      }
    ],
    pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
  });
});

// Orders endpoint
app.get('/api/orders', (req, res) => {
  res.json({
    data: [
      {
        id: '1',
        status: 'PENDING',
        totalAmount: 25.99,
        createdAt: new Date().toISOString(),
        customer: { name: 'John Doe' },
        restaurant: { name: 'Pizza Palace' },
        items: [{ dish: { name: 'Margherita Pizza' }, quantity: 1, price: 25.99 }]
      }
    ],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
  });
});

// Admin endpoints
app.get('/api/admin/users', (req, res) => {
  res.json({
    data: [
      { id: '1', email: 'admin@uberfoods.com', role: 'admin', name: 'Admin User' },
      { id: '2', email: 'customer@uberfoods.com', role: 'customer', name: 'Customer User' }
    ],
    pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 UberFoods Backend Running');
  console.log(`📍 Port: ${PORT}`);
  console.log('🏥 Health: http://localhost:' + PORT + '/api/health');
  console.log('📚 API Docs: http://localhost:' + PORT + '/api/docs');
  console.log('⚠️  Note: Using minimal Express backend - NestJS compilation in progress');
});