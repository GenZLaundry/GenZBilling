const express = require('express');
const router = express.Router();
const Advance = require('../models/Advance');

// Get all advances
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = {};
    
    if (status && status !== 'ALL') {
      query.status = status;
    }
    
    if (search) {
      query.personName = { $regex: search, $options: 'i' };
    }

    const advances = await Advance.find(query).sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: advances
    });
  } catch (error) {
    console.error('❌ Error fetching advances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advances',
      error: error.message
    });
  }
});

// Create new advance
router.post('/', async (req, res) => {
  try {
    const { personName, amountGiven, date, note } = req.body;

    if (!personName || !amountGiven || amountGiven <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Person name and valid amount are required'
      });
    }

    const advance = new Advance({
      personName: personName.trim(),
      amountGiven: parseFloat(amountGiven),
      date: date ? new Date(date) : new Date(),
      history: [{
        amount: parseFloat(amountGiven),
        type: 'GIVEN',
        date: date ? new Date(date) : new Date(),
        note: note || 'Initial advance'
      }]
    });

    await advance.save();

    res.status(201).json({
      success: true,
      message: 'Advance created successfully',
      data: advance
    });
  } catch (error) {
    console.error('❌ Error creating advance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advance',
      error: error.message
    });
  }
});

// Add repayment/return or additional advance
router.post('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, date, note } = req.body;

    if (!amount || amount <= 0 || !['GIVEN', 'RETURNED'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount and type (GIVEN or RETURNED) are required'
      });
    }

    const advance = await Advance.findById(id);
    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Advance record not found'
      });
    }

    // Add to history
    advance.history.push({
      amount: parseFloat(amount),
      type,
      date: date ? new Date(date) : new Date(),
      note: note || ''
    });

    // Update totals
    if (type === 'GIVEN') {
      advance.amountGiven += parseFloat(amount);
    } else if (type === 'RETURNED') {
      advance.amountReturned += parseFloat(amount);
    }

    await advance.save();

    res.json({
      success: true,
      message: 'History updated successfully',
      data: advance
    });
  } catch (error) {
    console.error('❌ Error updating advance history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update advance history',
      error: error.message
    });
  }
});

// Delete advance
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const advance = await Advance.findByIdAndDelete(id);

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Advance not found'
      });
    }

    res.json({
      success: true,
      message: 'Advance deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting advance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete advance',
      error: error.message
    });
  }
});

module.exports = router;
