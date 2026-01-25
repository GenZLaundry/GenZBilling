const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Expense = require('../models/Expense');
const moment = require('moment');

// Get dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const startOfWeek = moment().startOf('week').toDate();
    const endOfWeek = moment().endOf('week').toDate();
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Today's stats
    const todayStats = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lte: endOfToday },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } },
          avgBillAmount: { $avg: '$grandTotal' }
        }
      }
    ]);

    // This week's stats
    const weekStats = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek, $lte: endOfWeek },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);

    // This month's stats
    const monthStats = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);

    // Pending bills count
    const pendingCount = await Bill.countDocuments({ status: 'pending' });

    // Recent bills
    const recentBills = await Bill.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('billNumber customerName grandTotal status createdAt');

    // Top customers this month
    const topCustomers = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: '$customerName',
          totalSpent: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 }
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.json({
      success: true,
      data: {
        today: todayStats[0] || { totalIncome: 0, totalBills: 0, totalItems: 0, avgBillAmount: 0 },
        week: weekStats[0] || { totalIncome: 0, totalBills: 0, totalItems: 0 },
        month: monthStats[0] || { totalIncome: 0, totalBills: 0, totalItems: 0 },
        pendingCount,
        recentBills,
        topCustomers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard analytics',
      error: error.message
    });
  }
});

// Get daily income for a specific date range
router.get('/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dailyData = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
          totalIncome: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } },
          avgBillAmount: { $avg: '$grandTotal' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      success: true,
      data: dailyData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching daily analytics',
      error: error.message
    });
  }
});

// Get weekly income
router.get('/weekly', async (req, res) => {
  try {
    const { year, week } = req.query;
    
    let startDate, endDate;
    
    if (year && week) {
      startDate = moment().year(year).week(week).startOf('week').toDate();
      endDate = moment().year(year).week(week).endOf('week').toDate();
    } else {
      // Default to current week
      startDate = moment().startOf('week').toDate();
      endDate = moment().endOf('week').toDate();
    }

    const weeklyData = await Bill.getWeeklyIncome(startDate, endDate);

    const totalIncome = weeklyData.reduce((sum, day) => sum + day.dailyIncome, 0);
    const totalBills = weeklyData.reduce((sum, day) => sum + day.dailyBills, 0);

    res.json({
      success: true,
      data: {
        weeklyData,
        summary: {
          totalIncome,
          totalBills,
          avgDailyIncome: weeklyData.length > 0 ? totalIncome / weeklyData.length : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly analytics',
      error: error.message
    });
  }
});

// Get monthly income
router.get('/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    const monthlyData = await Bill.getMonthlyIncome(currentYear, currentMonth);

    const totalIncome = monthlyData.reduce((sum, day) => sum + day.dailyIncome, 0);
    const totalBills = monthlyData.reduce((sum, day) => sum + day.dailyBills, 0);

    res.json({
      success: true,
      data: {
        monthlyData,
        summary: {
          totalIncome,
          totalBills,
          avgDailyIncome: monthlyData.length > 0 ? totalIncome / monthlyData.length : 0,
          year: currentYear,
          month: currentMonth
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly analytics',
      error: error.message
    });
  }
});

// Get income comparison (current vs previous period)
router.get('/comparison', async (req, res) => {
  try {
    const { period = 'month' } = req.query; // 'day', 'week', 'month'
    
    let currentStart, currentEnd, previousStart, previousEnd;
    
    const now = new Date();
    
    if (period === 'day') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(previousStart);
      previousEnd.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      currentStart = moment().startOf('week').toDate();
      currentEnd = moment().endOf('week').toDate();
      previousStart = moment().subtract(1, 'week').startOf('week').toDate();
      previousEnd = moment().subtract(1, 'week').endOf('week').toDate();
    } else { // month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    const [currentPeriod, previousPeriod] = await Promise.all([
      Bill.aggregate([
        {
          $match: {
            createdAt: { $gte: currentStart, $lte: currentEnd },
            status: { $in: ['completed', 'delivered'] }
          }
        },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: '$grandTotal' },
            totalBills: { $sum: 1 }
          }
        }
      ]),
      Bill.aggregate([
        {
          $match: {
            createdAt: { $gte: previousStart, $lte: previousEnd },
            status: { $in: ['completed', 'delivered'] }
          }
        },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: '$grandTotal' },
            totalBills: { $sum: 1 }
          }
        }
      ])
    ]);

    const current = currentPeriod[0] || { totalIncome: 0, totalBills: 0 };
    const previous = previousPeriod[0] || { totalIncome: 0, totalBills: 0 };

    const incomeChange = previous.totalIncome > 0 
      ? ((current.totalIncome - previous.totalIncome) / previous.totalIncome) * 100 
      : 0;
    
    const billsChange = previous.totalBills > 0 
      ? ((current.totalBills - previous.totalBills) / previous.totalBills) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        current,
        previous,
        changes: {
          incomeChange: Math.round(incomeChange * 100) / 100,
          billsChange: Math.round(billsChange * 100) / 100
        },
        period
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comparison analytics',
      error: error.message
    });
  }
});

// Get profit analysis (income - expenses)
router.get('/profit', async (req, res) => {
  try {
    const { period = 'month' } = req.query; // 'day', 'week', 'month', 'year'
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = moment().startOf('week').toDate();
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

    // Get total income for the period
    const incomeData = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 }
        }
      }
    ]);

    // Get total expenses for the period
    const expenseData = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          totalExpenseCount: { $sum: 1 }
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

    const income = incomeData[0] || { totalIncome: 0, totalBills: 0 };
    const expenses = expenseData[0] || { totalExpenses: 0, totalExpenseCount: 0 };
    
    const profit = income.totalIncome - expenses.totalExpenses;
    const profitMargin = income.totalIncome > 0 ? (profit / income.totalIncome) * 100 : 0;

    res.json({
      success: true,
      data: {
        income: income.totalIncome,
        expenses: expenses.totalExpenses,
        profit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        totalBills: income.totalBills,
        totalExpenseCount: expenses.totalExpenseCount,
        expensesByCategory,
        period,
        dateRange: {
          start: startDate,
          end: now
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching profit analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profit analysis',
      error: error.message
    });
  }
});

module.exports = router;