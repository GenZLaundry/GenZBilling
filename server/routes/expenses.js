const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');

// Get all expenses with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, startDate, endDate } = req.query;
    
    // Build filter query
    const filter = {};
    if (category && category !== 'ALL') {
      filter.category = category;
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Expense.countDocuments(filter);

    res.json({
      success: true,
      data: {
        expenses,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalExpenses: total
      }
    });
  } catch (error) {
    console.error('❌ Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message
    });
  }
});

// Get expense summary/analytics
router.get('/summary', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get total expenses for the period
    const totalExpenses = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get expenses by category
    const expensesByCategory = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // Get recent expenses
    const recentExpenses = await Expense.find({
      date: { $gte: startDate, $lte: now }
    })
    .sort({ date: -1, createdAt: -1 })
    .limit(5);

    res.json({
      success: true,
      data: {
        totalExpenses: totalExpenses[0]?.total || 0,
        expensesByCategory,
        recentExpenses,
        period,
        dateRange: {
          start: startDate,
          end: now
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching expense summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense summary',
      error: error.message
    });
  }
});

// Create new expense
router.post('/', async (req, res) => {
  try {
    const { title, description, amount, category, date } = req.body;

    // Validation
    if (!title || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Title and valid amount are required'
      });
    }

    const expense = new Expense({
      title: title.trim(),
      description: description?.trim() || '',
      amount: parseFloat(amount),
      category: category || 'OTHER',
      date: date ? new Date(date) : new Date()
    });

    await expense.save();

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    console.error('❌ Error creating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create expense',
      error: error.message
    });
  }
});

// Update expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amount, category, date } = req.body;

    // Validation
    if (!title || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Title and valid amount are required'
      });
    }

    const expense = await Expense.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        description: description?.trim() || '',
        amount: parseFloat(amount),
        category: category || 'OTHER',
        date: date ? new Date(date) : undefined,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('❌ Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message
    });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully',
      data: expense
    });
  } catch (error) {
    console.error('❌ Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: error.message
    });
  }
});

module.exports = router;