const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required but not set.');
  process.exit(1);
}

// Generate JWT token for driver
const payload = {
  sub: 'driver-test-real-001', // Driver ID
  email: 'driver.test@uberfoods.com',
  role: 'driver',
  status: 'ACTIVE',
  exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
};

const token = jwt.sign(payload, JWT_SECRET);
console.log('Driver JWT Token:', token);
