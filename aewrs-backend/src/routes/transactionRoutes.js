const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all transactions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        u.name as user_name,
        u.sit_id,
        e.name as equipment_name,
        l.compartment_number
      FROM transactions t
      JOIN users u ON t.user_id = u.user_id
      JOIN equipment e ON t.equipment_id = e.equipment_id
      LEFT JOIN lockers l ON t.locker_id = l.locker_id
      ORDER BY t.created_at DESC
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

// GET transactions by user
router.get('/user/:sitId', async (req, res) => {
  try {
    const { sitId } = req.params;
    const result = await pool.query(`
      SELECT
        t.*,
        e.name as equipment_name,
        e.description as equipment_description,
        e.category as equipment_category,
        l.compartment_number,
        l.location as locker_location
      FROM transactions t
      JOIN users u ON t.user_id = u.user_id
      JOIN equipment e ON t.equipment_id = e.equipment_id
      LEFT JOIN lockers l ON t.locker_id = l.locker_id
      WHERE u.sit_id = $1
      ORDER BY t.created_at DESC
    `, [sitId]);
    
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

// POST create borrow request
router.post('/borrow', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { sit_id, equipment_id, due_date } = req.body;
    
    // Validate required fields
    if (!sit_id || !equipment_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sit_id, equipment_id'
      });
    }
    
    await client.query('BEGIN');
    
    // Get user_id
    const userResult = await client.query(
      'SELECT user_id FROM users WHERE sit_id = $1',
      [sit_id]
    );
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user_id = userResult.rows[0].user_id;
    
    // Check equipment availability
    const equipmentResult = await client.query(
      'SELECT available_quantity FROM equipment WHERE equipment_id = $1',
      [equipment_id]
    );
    
    if (equipmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }
    
    if (equipmentResult.rows[0].available_quantity <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Equipment not available'
      });
    }
    
    // Find available locker
    const lockerResult = await client.query(
      "SELECT locker_id FROM lockers WHERE status = 'available' LIMIT 1"
    );
    
    if (lockerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'No available lockers'
      });
    }
    
    const locker_id = lockerResult.rows[0].locker_id;
    
    // Create transaction with pending_pickup status
    const transactionResult = await client.query(
      `INSERT INTO transactions
       (user_id, equipment_id, locker_id, action, status, due_date)
       VALUES ($1, $2, $3, 'borrow', 'pending_pickup', $4)
       RETURNING *`,
      [user_id, equipment_id, locker_id, due_date || null]
    );
    
    // Update equipment quantity
    await client.query(
      'UPDATE equipment SET available_quantity = available_quantity - 1 WHERE equipment_id = $1',
      [equipment_id]
    );
    
    // Update locker status
    await client.query(
      "UPDATE lockers SET status = 'occupied', current_equipment_id = $1 WHERE locker_id = $2",
      [equipment_id, locker_id]
    );
    
    await client.query('COMMIT');
    
    // Get full transaction details
    const fullTransaction = await pool.query(`
      SELECT 
        t.*,
        u.name as user_name,
        u.sit_id,
        e.name as equipment_name,
        l.compartment_number
      FROM transactions t
      JOIN users u ON t.user_id = u.user_id
      JOIN equipment e ON t.equipment_id = e.equipment_id
      JOIN lockers l ON t.locker_id = l.locker_id
      WHERE t.transaction_id = $1
    `, [transactionResult.rows[0].transaction_id]);
    
    res.status(201).json({
      success: true,
      message: 'Borrow request created successfully',
      data: fullTransaction.rows[0]
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

// POST return equipment
router.post('/return', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { transaction_id } = req.body;
    
    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: transaction_id'
      });
    }
    
    await client.query('BEGIN');
    
    // Get transaction details
    const transactionResult = await client.query(
      'SELECT * FROM transactions WHERE transaction_id = $1',
      [transaction_id]
    );
    
    if (transactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    const transaction = transactionResult.rows[0];

    // Validate transaction status
    if (transaction.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: transaction.status === 'pending_pickup'
          ? 'Cannot return equipment that has not been picked up yet'
          : transaction.status === 'pending_return'
          ? 'Return already requested. Please go to the locker to complete return.'
          : 'This transaction cannot be returned'
      });
    }

    // Mark as pending_return (user still needs to physically return to locker)
    await client.query(
      "UPDATE transactions SET status = 'pending_return' WHERE transaction_id = $1",
      [transaction_id]
    );

    // Equipment and locker will be updated when RFID confirms physical return
    
    await client.query('COMMIT');

    // Get updated transaction with locker info
    const updatedTransaction = await pool.query(`
      SELECT
        t.*,
        l.compartment_number
      FROM transactions t
      LEFT JOIN lockers l ON t.locker_id = l.locker_id
      WHERE t.transaction_id = $1
    `, [transaction_id]);

    res.json({
      success: true,
      message: 'Return request submitted. Please go to the locker to complete return.',
      data: updatedTransaction.rows[0]
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

module.exports = router;