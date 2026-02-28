const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET user by SIT ID
router.get('/:sitId', async (req, res) => {
  try {
    const { sitId } = req.params;
    const result = await pool.query(
      'SELECT user_id, sit_id, name, email, role, created_at FROM users WHERE sit_id = $1',
      [sitId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET all users (for admin/staff)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, sit_id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST create new user
router.post('/', async (req, res) => {
  try {
    const { sit_id, name, email, role } = req.body;
    
    // Validate required fields
    if (!sit_id || !name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sit_id, name, email, role'
      });
    }
    
    const result = await pool.query(
      'INSERT INTO users (sit_id, name, email, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [sit_id, name, email, role]
    );
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Handle duplicate SIT ID or email
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'User with this SIT ID or email already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;