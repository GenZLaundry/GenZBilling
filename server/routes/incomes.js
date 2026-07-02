const express = require('express');
const router = express.Router();
const Income = require('../models/Income');

// Get all incomes
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = {};
    if (startDate && endDate) {
      query.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }

    const incomes = await Income.find(query).sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      data: incomes
    });
  } catch (error) {
    console.error('❌ Error fetching incomes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incomes',
      error: error.message
    });
  }
});

// Create new income
router.post('/', async (req, res) => {
  try {
    const { source, amount, description, date, type } = req.body;

    if (!source || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Source and valid amount are required'
      });
    }

    const income = new Income({
      source: source.trim(),
      amount: parseFloat(amount),
      description: description?.trim() || '',
      type: type === 'RETURNED' ? 'RETURNED' : 'INVESTED',
      date: date ? new Date(date) : new Date()
    });

    await income.save();

    res.status(201).json({
      success: true,
      message: 'Income logged successfully',
      data: income
    });
  } catch (error) {
    console.error('❌ Error logging income:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log income',
      error: error.message
    });
  }
});

// Update income
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { source, amount, description, date, type } = req.body;

    if (!source || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Source and valid amount are required'
      });
    }

    const income = await Income.findByIdAndUpdate(
      id,
      {
        source: source.trim(),
        amount: parseFloat(amount),
        description: description?.trim() || '',
        type: type === 'RETURNED' ? 'RETURNED' : 'INVESTED',
        date: date ? new Date(date) : undefined
      },
      { new: true, runValidators: true }
    );

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income not found'
      });
    }

    res.json({
      success: true,
      message: 'Income updated successfully',
      data: income
    });
  } catch (error) {
    console.error('❌ Error updating income:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update income',
      error: error.message
    });
  }
});

// Delete income
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const income = await Income.findByIdAndDelete(id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income not found'
      });
    }

    res.json({
      success: true,
      message: 'Income deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting income:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete income',
      error: error.message
    });
  }
});

module.exports = router;
