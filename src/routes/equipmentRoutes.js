const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');

// GET all equipment
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM equipment ORDER BY equipment_id'
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

// GET single equipment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM equipment WHERE equipment_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
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

// PATCH /:id/stock — staff: add units to inventory
router.patch('/:id/stock', verifyToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { add_quantity } = req.body;

    if (!add_quantity || !Number.isInteger(Number(add_quantity)) || Number(add_quantity) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'add_quantity must be a positive integer'
      });
    }

    const qty = Number(add_quantity);

    const result = await pool.query(
      `UPDATE equipment
       SET total_quantity = total_quantity + $1,
           available_quantity = available_quantity + $1
       WHERE equipment_id = $2
       RETURNING *`,
      [qty, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipment not found' });
    }

    res.json({
      success: true,
      message: `Added ${qty} unit(s) to stock`,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /:id — staff: edit equipment details
router.put('/:id', verifyToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category } = req.body;

    if (!name && !description && !category) {
      return res.status(400).json({
        success: false,
        error: 'Provide at least one field to update: name, description, category'
      });
    }

    // Build dynamic SET clause for only provided fields
    const fields = [];
    const values = [];
    let idx = 1;
    if (name)        { fields.push(`name = $${idx++}`);        values.push(name); }
    if (description) { fields.push(`description = $${idx++}`); values.push(description); }
    if (category)    { fields.push(`category = $${idx++}`);    values.push(category); }
    values.push(id);

    const result = await pool.query(
      `UPDATE equipment SET ${fields.join(', ')} WHERE equipment_id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipment not found' });
    }

    res.json({
      success: true,
      message: 'Equipment updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
