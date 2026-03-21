const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// JWT Secret (same as in authRoutes)
const JWT_SECRET = process.env.JWT_SECRET || 'aewrs-secret-key-change-in-production';

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
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

    // Add user info to request
    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      sit_id: decoded.sit_id
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Middleware to check if user is staff/admin
const requireStaff = async (req, res, next) => {
  try {
    // Check if role is already in the token
    if (req.user && ['staff', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Double-check from database
    const result = await pool.query(
      'SELECT role FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0 || !['staff', 'admin'].includes(result.rows[0].role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Staff privileges required.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = { verifyToken, requireStaff };
