const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Expense = require('../models/Expense');

// Dashboard Overview - Get key metrics
router.get('/dashboard-overview', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Today's metrics
    const todayStats = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } },
          avgBillValue: { $avg: '$grandTotal' }
        }
      }
    ]);

    // This week's metrics
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
          totalRevenue: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);

    // This month's metrics
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
          totalRevenue: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);

    // Pending bills count
    const pendingBillsCount = await Bill.countDocuments({ status: 'pending' });

    // Today's expenses
    const todayExpenses = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          expenseCount: { $sum: 1 }
        }
      }
    ]);

    // Month's expenses
    const monthExpenses = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          expenseCount: { $sum: 1 }
        }
      }
    ]);

    // Recent activity (last 10 bills)
    const recentBills = await Bill.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('billNumber customerName grandTotal status createdAt');

    // Top customers (by total spending)
    const topCustomers = await Bill.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'delivered'] },
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$customerName',
          totalSpent: { $sum: '$grandTotal' },
          billCount: { $sum: 1 },
          lastVisit: { $max: '$createdAt' }
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Popular services (most ordered items)
    const popularServices = await Bill.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'delivered'] },
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.amount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalQuantity: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const overview = {
      today: {
        revenue: todayStats[0]?.totalRevenue || 0,
        bills: todayStats[0]?.totalBills || 0,
        items: todayStats[0]?.totalItems || 0,
        avgBillValue: todayStats[0]?.avgBillValue || 0,
        expenses: todayExpenses[0]?.totalExpenses || 0,
        profit: (todayStats[0]?.totalRevenue || 0) - (todayExpenses[0]?.totalExpenses || 0)
      },
      week: {
        revenue: weekStats[0]?.totalRevenue || 0,
        bills: weekStats[0]?.totalBills || 0,
        items: weekStats[0]?.totalItems || 0
      },
      month: {
        revenue: monthStats[0]?.totalRevenue || 0,
        bills: monthStats[0]?.totalBills || 0,
        items: monthStats[0]?.totalItems || 0,
        expenses: monthExpenses[0]?.totalExpenses || 0,
        profit: (monthStats[0]?.totalRevenue || 0) - (monthExpenses[0]?.totalExpenses || 0)
      },
      pendingBills: pendingBillsCount,
      recentActivity: recentBills,
      topCustomers,
      popularServices
    };

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard overview',
      error: error.message
    });
  }
});

// Business Reports - Detailed analytics
router.get('/business-reports', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let start, end;
    const now = new Date();
    
    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        start = new Date(startDate);
        end = new Date(endDate);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Revenue trends
    const revenueTrends = await Bill.aggregate([
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
          revenue: { $sum: '$grandTotal' },
          bills: { $sum: 1 },
          items: { $sum: { $size: '$items' } },
          date: { $first: '$createdAt' }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Service performance
    const servicePerformance = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.amount' },
          avgPrice: { $avg: '$items.rate' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    // Customer analysis
    const customerAnalysis = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: '$customerName',
          totalSpent: { $sum: '$grandTotal' },
          billCount: { $sum: 1 },
          avgBillValue: { $avg: '$grandTotal' },
          firstVisit: { $min: '$createdAt' },
          lastVisit: { $max: '$createdAt' },
          totalItems: { $sum: { $size: '$items' } }
        }
      },
      {
        $sort: { totalSpent: -1 }
      }
    ]);

    // Payment status analysis
    const paymentAnalysis = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' }
        }
      }
    ]);

    // Expense breakdown
    const expenseBreakdown = await Expense.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    // Summary statistics
    const summary = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } },
          avgBillValue: { $avg: '$grandTotal' },
          totalDiscount: { $sum: '$discount' },
          totalDeliveryCharges: { $sum: '$deliveryCharge' }
        }
      }
    ]);

    const totalExpenses = await Expense.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' }
        }
      }
    ]);

    const reports = {
      period,
      dateRange: { start, end },
      summary: {
        ...summary[0],
        totalExpenses: totalExpenses[0]?.totalExpenses || 0,
        netProfit: (summary[0]?.totalRevenue || 0) - (totalExpenses[0]?.totalExpenses || 0)
      },
      revenueTrends,
      servicePerformance,
      customerAnalysis,
      paymentAnalysis,
      expenseBreakdown
    };

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching business reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching business reports',
      error: error.message
    });
  }
});

// Stats for quick overview
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Today's stats
    const todayStats = await Bill.getDailyIncome(today);
    
    // Total stats
    const totalStats = await Bill.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          totalCustomers: { $addToSet: '$customerName' }
        }
      }
    ]);

    // Pending bills
    const pendingStats = await Bill.aggregate([
      {
        $match: {
          status: 'pending'
        }
      },
      {
        $group: {
          _id: null,
          pendingAmount: { $sum: '$grandTotal' },
          pendingCount: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      today: todayStats,
      total: {
        revenue: totalStats[0]?.totalRevenue || 0,
        bills: totalStats[0]?.totalBills || 0,
        customers: totalStats[0]?.totalCustomers?.length || 0
      },
      pending: {
        amount: pendingStats[0]?.pendingAmount || 0,
        count: pendingStats[0]?.pendingCount || 0
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
});

// Revenue chart data
router.get('/revenue-chart', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const today = new Date();
    let start, end;

    switch (period) {
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
    }

    const chartData = await Bill.aggregate([
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
          revenue: { $sum: '$grandTotal' },
          bills: { $sum: 1 },
          date: { $first: '$createdAt' }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error fetching revenue chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue chart data',
      error: error.message
    });
  }
});

module.exports = router;