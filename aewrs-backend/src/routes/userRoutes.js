const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');

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

// GET all users (staff only)
router.get('/', verifyToken, requireStaff, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, sit_id, name, email, role, created_at,
              (rfid_uid IS NOT NULL) AS has_rfid
       FROM users
       ORDER BY role ASC, sit_id ASC`
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

// PATCH /:id/rfid — staff: assign or clear a user's RFID UID
router.patch('/:id/rfid', verifyToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { rfid_uid } = req.body; // pass null to clear

    // Reject duplicate RFID UIDs across users
    if (rfid_uid) {
      const dupCheck = await pool.query(
        'SELECT user_id FROM users WHERE rfid_uid = $1 AND user_id != $2',
        [rfid_uid, id]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'This RFID UID is already assigned to another user'
        });
      }
    }

    const result = await pool.query(
      `UPDATE users SET rfid_uid = $1 WHERE user_id = $2
       RETURNING user_id, sit_id, name, email, role, (rfid_uid IS NOT NULL) AS has_rfid`,
      [rfid_uid || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: rfid_uid ? 'RFID assigned successfully' : 'RFID cleared',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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