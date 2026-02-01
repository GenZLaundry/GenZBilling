const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const moment = require('moment');

// Get all bills with pagination and filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      customerName,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by customer name or search
    if (customerName) {
      query.customerName = { $regex: customerName, $options: 'i' };
    }
    
    // Global search across multiple fields
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { billNumber: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    };

    const bills = await Bill.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .exec();

    const total = await Bill.countDocuments(query);

    res.json({
      success: true,
      data: bills,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
        totalItems: total,
        itemsPerPage: options.limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bills',
      error: error.message
    });
  }
});

// Get pending bills
router.get('/pending', async (req, res) => {
  try {
    const pendingBills = await Bill.find({ status: 'pending' })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingBills
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending bills',
      error: error.message
    });
  }
});

// Get completed bills (history)
router.get('/completed', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    
    const query = { 
      status: { $in: ['completed', 'delivered'] }
    };
    
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { billNumber: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    const total = await Bill.countDocuments(query);

    res.json({
      success: true,
      data: bills,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching completed bills',
      error: error.message
    });
  }
});

// Get bills by customer
router.get('/customer/:customerName', async (req, res) => {
  try {
    const { customerName } = req.params;
    const { limit = 10 } = req.query;

    const bills = await Bill.find({ 
      customerName: { $regex: customerName, $options: 'i' }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Calculate customer stats
    const customerStats = await Bill.aggregate([
      {
        $match: {
          customerName: { $regex: customerName, $options: 'i' },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$grandTotal' },
          totalBills: { $sum: 1 },
          avgBillValue: { $avg: '$grandTotal' },
          firstVisit: { $min: '$createdAt' },
          lastVisit: { $max: '$createdAt' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        bills,
        stats: customerStats[0] || {
          totalSpent: 0,
          totalBills: 0,
          avgBillValue: 0,
          firstVisit: null,
          lastVisit: null
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching customer bills',
      error: error.message
    });
  }
});

// Bulk update bill status
router.patch('/bulk-status', async (req, res) => {
  try {
    const { billIds, status } = req.body;

    if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bill IDs array is required'
      });
    }

    const updateData = { status };
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
      updateData.completedAt = updateData.completedAt || new Date();
    }

    const result = await Bill.updateMany(
      { _id: { $in: billIds } },
      updateData
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} bills updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating bills',
      error: error.message
    });
  }
});

// Bulk delete bills
router.delete('/bulk-delete', async (req, res) => {
  try {
    const { billIds } = req.body;

    if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bill IDs array is required'
      });
    }

    const result = await Bill.deleteMany({ _id: { $in: billIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} bills deleted successfully`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting bills',
      error: error.message
    });
  }
});

// Create new bill
router.post('/', async (req, res) => {
  try {
    const billData = req.body;
    
    // Generate bill number if not provided
    if (!billData.billNumber) {
      const lastBill = await Bill.findOne().sort({ createdAt: -1 });
      const lastNumber = lastBill ? parseInt(lastBill.billNumber.replace('GZ', '')) : 0;
      billData.billNumber = `GZ${(lastNumber + 1).toString().padStart(6, '0')}`;
    }

    const bill = new Bill(billData);
    await bill.save();

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: bill
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Bill number already exists',
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error creating bill',
        error: error.message
      });
    }
  }
});

// Update bill status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData = { status };
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
      updateData.completedAt = updateData.completedAt || new Date();
    }

    const bill = await Bill.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.json({
      success: true,
      message: 'Bill status updated successfully',
      data: bill
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating bill status',
      error: error.message
    });
  }
});

// Update entire bill
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Add updated timestamp
    updateData.updatedAt = new Date();

    const bill = await Bill.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.json({
      success: true,
      message: 'Bill updated successfully',
      data: bill
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating bill',
      error: error.message
    });
  }
});

// Delete bill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const bill = await Bill.findByIdAndDelete(id);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting bill',
      error: error.message
    });
  }
});

// Get bill by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bill',
      error: error.message
    });
  }
});

module.exports = router;