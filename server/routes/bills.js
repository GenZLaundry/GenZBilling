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

    // Check if bill with same number already exists (duplicate prevention)
    const existing = await Bill.findOne({ billNumber: billData.billNumber });
    if (existing) {
      // Return the existing bill as success (idempotent)
      return res.status(200).json({
        success: true,
        message: 'Bill already exists (duplicate prevented)',
        data: existing
      });
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
      // Race condition duplicate — fetch and return existing
      try {
        const existing = await Bill.findOne({ billNumber: req.body.billNumber });
        if (existing) {
          return res.status(200).json({
            success: true,
            message: 'Bill already exists',
            data: existing
          });
        }
      } catch (e) { /* ignore */ }
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

// Add partial payment to a bill - uses billNumber for reliable lookup
router.patch('/payment/:billNumber', async (req, res) => {
  try {
    const { billNumber } = req.params;
    const { amount, note } = req.body;

    console.log('💰 Payment request - billNumber:', billNumber, 'amount:', amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    let bill = await Bill.findOne({ billNumber: billNumber });
    if (!bill) {
      return res.status(404).json({ success: false, message: `Bill not found with billNumber: ${billNumber}` });
    }

    if (!bill.paymentHistory) bill.paymentHistory = [];
    bill.paymentHistory.push({ amount: Number(amount), note: note || '', date: new Date() });

    const totalPaid = (bill.amountPaid || 0) + Number(amount);
    bill.amountPaid = totalPaid;
    bill.amountDue = Math.max(0, bill.grandTotal - totalPaid);
    bill.paymentStatus = bill.amountDue === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

    // Auto-complete bill when fully paid
    if (bill.amountDue === 0 && bill.status === 'pending') {
      bill.status = 'completed';
      bill.completedAt = new Date();
      console.log('✅ Bill auto-completed as fully paid');
    }

    await bill.save();
    console.log('✅ Payment saved. amountPaid:', bill.amountPaid, 'amountDue:', bill.amountDue);

    res.json({ success: true, message: 'Payment recorded successfully', data: bill });
  } catch (error) {
    console.error('❌ Payment route error:', error);
    res.status(500).json({ success: false, message: 'Error recording payment', error: error.message });
  }
});

// Delete/undo a specific payment entry by index
router.delete('/payment/:billNumber/:paymentIndex', async (req, res) => {
  try {
    const { billNumber, paymentIndex } = req.params;
    const index = parseInt(paymentIndex);

    const bill = await Bill.findOne({ billNumber });
    if (!bill) {
      return res.status(404).json({ success: false, message: `Bill not found: ${billNumber}` });
    }

    if (!bill.paymentHistory || index < 0 || index >= bill.paymentHistory.length) {
      return res.status(400).json({ success: false, message: 'Invalid payment index' });
    }

    // Remove the payment entry
    const removedPayment = bill.paymentHistory[index];
    bill.paymentHistory.splice(index, 1);

    // Recalculate totals from remaining payment history
    const totalPaid = bill.paymentHistory.reduce((sum, p) => sum + Number(p.amount), 0);
    bill.amountPaid = totalPaid;
    bill.amountDue = Math.max(0, bill.grandTotal - totalPaid);
    bill.paymentStatus = bill.amountDue === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

    await bill.save();
    console.log('✅ Payment removed. Removed amount:', removedPayment.amount, 'New amountPaid:', bill.amountPaid);

    res.json({ success: true, message: `Payment of ₹${removedPayment.amount} removed`, data: bill });
  } catch (error) {
    console.error('❌ Delete payment error:', error);
    res.status(500).json({ success: false, message: 'Error removing payment', error: error.message });
  }
});

// Add partial payment to a bill (legacy - by MongoDB ID)
router.patch('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note, billNumber } = req.body;

    console.log('💰 Payment request (legacy) - id:', id, 'billNumber:', billNumber, 'amount:', amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    let bill = null;
    if (id && id.match(/^[a-fA-F0-9]{24}$/)) {
      bill = await Bill.findById(id);
    }
    if (!bill && billNumber) {
      bill = await Bill.findOne({ billNumber });
    }
    if (!bill) {
      bill = await Bill.findOne({ billNumber: id });
    }

    if (!bill) {
      return res.status(404).json({ success: false, message: `Bill not found. id: ${id}` });
    }

    if (!bill.paymentHistory) bill.paymentHistory = [];
    bill.paymentHistory.push({ amount: Number(amount), note: note || '', date: new Date() });

    const totalPaid = (bill.amountPaid || 0) + Number(amount);
    bill.amountPaid = totalPaid;
    bill.amountDue = Math.max(0, bill.grandTotal - totalPaid);
    bill.paymentStatus = bill.amountDue === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

    await bill.save();

    res.json({ success: true, message: 'Payment recorded successfully', data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error recording payment', error: error.message });
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