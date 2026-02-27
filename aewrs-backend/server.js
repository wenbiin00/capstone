const express = require('express');
const cors = require('cors');
const pool = require('./src/config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const equipmentRoutes = require('./src/routes/equipmentRoutes');
const userRoutes = require('./src/routes/userRoutes');
const lockerRoutes = require('./src/routes/lockerRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const rfidRoutes = require('./src/routes/rfidRoutes');

// Import middleware
const { verifyToken, requireStaff } = require('./src/middleware/authMiddleware');

// Base route
app.get('/', (req, res) => {
  res.json({ 
    message: 'AEWRS API v1.0',
    status: 'running',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        verify: 'POST /api/auth/verify',
        profile: 'GET /api/auth/profile (requires token)'
      },
      equipment: {
        getAll: 'GET /api/equipment',
        getById: 'GET /api/equipment/:id'
      },
      users: {
        getAll: 'GET /api/users (requires staff token)',
        getBySitId: 'GET /api/users/:sitId (requires token)',
        create: 'POST /api/users (requires staff token)'
      },
      lockers: {
        getAll: 'GET /api/lockers',
        getAvailable: 'GET /api/lockers/available',
        getByCompartment: 'GET /api/lockers/:compartmentNumber'
      },
      transactions: {
        getAll: 'GET /api/transactions (requires staff token)',
        getByUser: 'GET /api/transactions/user/:sitId (requires token)',
        borrow: 'POST /api/transactions/borrow (requires token)',
        return: 'POST /api/transactions/return (requires token)'
      },
      rfid: {
        scan: 'POST /api/rfid/scan (Arduino hardware)',
        check: 'GET /api/rfid/check/:rfid_uid'
      }
    }
  });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes); // Public - anyone can view equipment
app.use('/api/rfid', rfidRoutes); // Public - called by Arduino hardware

// Protected routes - require authentication
app.use('/api/lockers', lockerRoutes); // Public for now, can protect later
app.use('/api/transactions', verifyToken, transactionRoutes); // Requires login
app.use('/api/users', verifyToken, userRoutes); // Requires login

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/`);
  console.log(`JWT Authentication enabled`);
});