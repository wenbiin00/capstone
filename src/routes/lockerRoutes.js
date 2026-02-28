const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all lockers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.locker_id,
        l.compartment_number,
        l.status,
        l.current_equipment_id,
        e.name as equipment_name,
        e.category as equipment_category
      FROM lockers l
      LEFT JOIN equipment e ON l.current_equipment_id = e.equipment_id
      ORDER BY l.compartment_number
    `);
    
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

// GET available lockers
router.get('/available', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM lockers WHERE status = 'available' ORDER BY compartment_number"
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

// GET single locker by compartment number
router.get('/:compartmentNumber', async (req, res) => {
  try {
    const { compartmentNumber } = req.params;
    const result = await pool.query(
      'SELECT * FROM lockers WHERE compartment_number = $1',
      [compartmentNumber]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Locker not found'
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

// POST /api/locker/access
router.post('/access', async (req, res) => {
  const { rfid_uid } = req.body;

  try {
    // Check if this RFID UID belongs to a registered user
    const result = await pool.query(
      'SELECT * FROM users WHERE rfid_uid = $1',
      [rfid_uid]
    );

    if (result.rows.length === 0) {
      return res.json({ access: 'deny', reason: 'Unknown card' });
    }

    const user = result.rows[0];

    // Log the access attempt
    await pool.query(
      'INSERT INTO access_logs (user_id, rfid_uid, action, timestamp) VALUES ($1, $2, $3, NOW())',
      [user.id, rfid_uid, 'access_attempt']
    );

    res.json({ access: 'grant', user: user.name });

  } catch (err) {
    console.error(err);
    res.json({ access: 'deny', reason: 'Server error' });
  }
});

module.exports = router;