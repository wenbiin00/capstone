const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST RFID scan - handles both pickup and return
router.post('/scan', async (req, res) => {
  const client = await pool.connect();

  try {
    const { rfid_uid, locker_id } = req.body;

    if (!rfid_uid || !locker_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: rfid_uid, locker_id'
      });
    }

    await client.query('BEGIN');

    // Get user by RFID
    const userResult = await client.query(
      'SELECT user_id, sit_id, name FROM users WHERE rfid_uid = $1',
      [rfid_uid]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Unauthorized RFID card'
      });
    }

    const user = userResult.rows[0];

    // Check for pending_pickup transaction at this locker for this user
    const pickupResult = await client.query(`
      SELECT t.*, e.name as equipment_name, l.compartment_number
      FROM transactions t
      JOIN equipment e ON t.equipment_id = e.equipment_id
      JOIN lockers l ON t.locker_id = l.locker_id
      WHERE t.user_id = $1
        AND t.locker_id = $2
        AND t.status = 'pending_pickup'
      LIMIT 1
    `, [user.user_id, locker_id]);

    if (pickupResult.rows.length > 0) {
      // PICKUP: Change pending_pickup → active
      const transaction = pickupResult.rows[0];

      await client.query(
        "UPDATE transactions SET status = 'active', borrow_time = NOW() WHERE transaction_id = $1",
        [transaction.transaction_id]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        action: 'pickup',
        message: `Equipment picked up successfully`,
        data: {
          transaction_id: transaction.transaction_id,
          equipment_name: transaction.equipment_name,
          compartment_number: transaction.compartment_number,
          due_date: transaction.due_date
        }
      });
    }

    // Check for pending_return transaction at this locker for this user
    const returnResult = await client.query(`
      SELECT t.*, e.name as equipment_name, l.compartment_number
      FROM transactions t
      JOIN equipment e ON t.equipment_id = e.equipment_id
      JOIN lockers l ON t.locker_id = l.locker_id
      WHERE t.user_id = $1
        AND t.locker_id = $2
        AND t.status = 'pending_return'
      LIMIT 1
    `, [user.user_id, locker_id]);

    if (returnResult.rows.length > 0) {
      // RETURN: Change pending_return → completed
      const transaction = returnResult.rows[0];

      await client.query(
        "UPDATE transactions SET status = 'completed', return_time = NOW() WHERE transaction_id = $1",
        [transaction.transaction_id]
      );

      // Update equipment quantity
      await client.query(
        'UPDATE equipment SET available_quantity = available_quantity + 1 WHERE equipment_id = $1',
        [transaction.equipment_id]
      );

      // Update locker status
      await client.query(
        "UPDATE lockers SET status = 'available', current_equipment_id = NULL WHERE locker_id = $1",
        [transaction.locker_id]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        action: 'return',
        message: `Equipment returned successfully`,
        data: {
          transaction_id: transaction.transaction_id,
          equipment_name: transaction.equipment_name,
          compartment_number: transaction.compartment_number
        }
      });
    }

    // No authorized transaction found
    await client.query('ROLLBACK');
    return res.status(403).json({
      success: false,
      error: 'No authorized transaction for this locker',
      message: 'You do not have a pending pickup or return at this locker.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// GET transaction status by RFID (for user to check their transactions)
router.get('/check/:rfid_uid', async (req, res) => {
  try {
    const { rfid_uid } = req.params;

    const result = await pool.query(`
      SELECT
        t.*,
        e.name as equipment_name,
        l.compartment_number
      FROM transactions t
      JOIN users u ON t.user_id = u.user_id
      JOIN equipment e ON t.equipment_id = e.equipment_id
      LEFT JOIN lockers l ON t.locker_id = l.locker_id
      WHERE u.rfid_uid = $1
        AND t.status IN ('pending_pickup', 'active', 'pending_return')
      ORDER BY t.created_at DESC
    `, [rfid_uid]);

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

module.exports = router;
