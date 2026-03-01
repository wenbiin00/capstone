const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'aewrs-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, sit_id, name } = req.body;

    // Validate required fields
    if (!email || !password || !sit_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, sit_id, name'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Determine role from SIT ID range (server-side, clients cannot self-assign)
    const sitIdNum = parseInt(sit_id, 10);
    if (isNaN(sitIdNum) || sitIdNum < 1000000 || sitIdNum > 3000000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid SIT ID. Staff IDs: 1000000–1999999. Student IDs: 2000000–3000000.'
      });
    }
    const assignedRole = sitIdNum >= 2000000 ? 'student' : 'staff';

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Check if SIT ID already exists
    const existingSitId = await pool.query(
      'SELECT sit_id FROM users WHERE sit_id = $1',
      [sit_id]
    );

    if (existingSitId.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'SIT ID already registered'
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Store user in database with hashed password
    const result = await pool.query(
      'INSERT INTO users (sit_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, sit_id, name, email, role, created_at',
      [sit_id, name, email, password_hash, assignedRole]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        sit_id: user.sit_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          user_id: user.user_id,
          sit_id: user.sit_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT user_id, sit_id, name, email, password_hash, role, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check if password_hash exists (for users created before bcrypt implementation)
    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'Account needs to be re-registered. Please contact support.'
      });
    }

    // Compare password with hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        sit_id: user.sit_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          user_id: user.user_id,
          sit_id: user.sit_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      success: true,
      user: {
        user_id: decoded.user_id,
        email: decoded.email,
        role: decoded.role,
        sit_id: decoded.sit_id
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const result = await pool.query(
      'SELECT user_id, sit_id, name, email, role, rfid_uid, created_at FROM users WHERE user_id = $1',
      [decoded.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found in database'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
