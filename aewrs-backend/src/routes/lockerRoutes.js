const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');

// GET all lockers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        l.locker_id,
        l.compartment_number,
        l.status,
        l.assigned_equipment_id,
        e.name as equipment_name,
        e.category as equipment_category
      FROM lockers l
      LEFT JOIN equipment e ON l.assigned_equipment_id = e.equipment_id
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

// PATCH /:locker_id/assign — staff: reassign a locker to a different equipment
router.patch('/:locker_id/assign', verifyToken, requireStaff, async (req, res) => {
  const client = await pool.connect();
  try {
    const { locker_id } = req.params;
    const { equipment_id } = req.body; // null to unassign

    await client.query('BEGIN');

    // Check locker exists
    const lockerCheck = await client.query(
      'SELECT locker_id FROM lockers WHERE locker_id = $1',
      [locker_id]
    );
    if (lockerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Locker not found' });
    }

    if (equipment_id !== null && equipment_id !== undefined) {
      // Check equipment exists
      const eqCheck = await client.query(
        'SELECT equipment_id FROM equipment WHERE equipment_id = $1',
        [equipment_id]
      );
      if (eqCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Equipment not found' });
      }

      // Clear any other locker that already has this equipment assigned
      await client.query(
        'UPDATE lockers SET assigned_equipment_id = NULL WHERE assigned_equipment_id = $1 AND locker_id != $2',
        [equipment_id, locker_id]
      );
    }

    // Assign (or unassign) this locker
    const result = await client.query(
      `UPDATE lockers SET assigned_equipment_id = $1 WHERE locker_id = $2
       RETURNING locker_id, compartment_number, status, assigned_equipment_id`,
      [equipment_id || null, locker_id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: equipment_id ? 'Locker assigned successfully' : 'Locker unassigned',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;