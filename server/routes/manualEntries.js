const express = require('express');
const router = express.Router();
const ManualEntry = require('../models/ManualEntry');
const { sendManualEntryWA } = require('../services/whatsappService');
const { syncCustomerStats } = require('../services/customerService');

// Helper to map DB ManualEntry to frontend object format
const mapEntry = (e) => {
  const items = e.items && e.items.length > 0 ? e.items.map(item => ({
    serviceType: item.serviceType,
    quantity: item.quantity,
    unit: item.unit || 'pcs'
  })) : [{
    serviceType: e.serviceType || 'WASH',
    quantity: e.quantity || 1,
    unit: 'pcs'
  }];

  return {
    id: e._id.toString(),
    customerName: e.customerName,
    phone: e.phone,
    pickupDate: e.pickupDate,
    pickupTime: e.pickupTime || '',
    deliveryDate: e.deliveryDate,
    deliveryTime: e.deliveryTime || '',
    serviceType: e.serviceType || (items[0] ? items[0].serviceType : 'WASH'),
    quantity: e.quantity || (items.reduce((sum, item) => sum + (item.quantity || 0), 0)),
    items,
    paymentStatus: e.paymentStatus,
    partialAmount: e.partialAmount,
    status: e.status || 'pending',
    remark: e.remark,
    createdAt: e.createdAt.toISOString()
  };
};

// Get all manual entries
router.get('/', async (req, res) => {
  try {
    const entries = await ManualEntry.find().sort({ createdAt: -1 });
    const mapped = entries.map(mapEntry);

    res.json({
      success: true,
      data: mapped
    });
  } catch (error) {
    console.error('❌ Error fetching manual entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manual entries',
      error: error.message
    });
  }
});

// Create new manual entry
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      phone,
      pickupDate,
      pickupTime,
      deliveryDate,
      deliveryTime,
      serviceType,
      quantity,
      items,
      paymentStatus,
      partialAmount,
      remark,
      status
    } = req.body;

    if (!customerName || !pickupDate || !deliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    // Resolve items (use fallback to single item if none provided)
    const entryItems = items && Array.isArray(items) && items.length > 0
      ? items
      : [{
          serviceType: serviceType || 'WASH',
          quantity: parseFloat(quantity) || 1,
          unit: 'pcs'
        }];

    // Validate items
    for (const item of entryItems) {
      if (!item.serviceType || item.quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item data'
        });
      }
    }

    // Summary calculation for backward compatibility
    const totalQty = entryItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const servicesSummary = Array.from(new Set(entryItems.map(item => item.serviceType))).join('+');

    const entry = new ManualEntry({
      customerName: customerName.trim(),
      phone: phone?.trim() || '',
      pickupDate,
      pickupTime: pickupTime || '',
      deliveryDate,
      deliveryTime: deliveryTime || '',
      serviceType: servicesSummary,
      quantity: totalQty,
      items: entryItems,
      paymentStatus: paymentStatus || 'unpaid',
      partialAmount: paymentStatus === 'partial' ? parseFloat(partialAmount) || 0 : undefined,
      status: status || 'pending',
      remark: remark?.trim() || ''
    });

    await entry.save();

    if (entry.phone || entry.customerName) {
      syncCustomerStats(entry.phone, entry.customerName).catch(err => console.error('⚠️ Customer sync error:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Manual entry saved successfully',
      data: mapEntry(entry)
    });
  } catch (error) {
    console.error('❌ Error creating manual entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save manual entry',
      error: error.message
    });
  }
});

// Update manual entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      phone,
      pickupDate,
      pickupTime,
      deliveryDate,
      deliveryTime,
      serviceType,
      quantity,
      items,
      paymentStatus,
      partialAmount,
      remark,
      status
    } = req.body;

    if (!customerName || !pickupDate || !deliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    // Resolve items (fallback to single item if none provided)
    const entryItems = items && Array.isArray(items) && items.length > 0
      ? items
      : [{
          serviceType: serviceType || 'WASH',
          quantity: parseFloat(quantity) || 1,
          unit: 'pcs'
        }];

    // Validate items
    for (const item of entryItems) {
      if (!item.serviceType || item.quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item data'
        });
      }
    }

    // Summary calculation for backward compatibility
    const totalQty = entryItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const servicesSummary = Array.from(new Set(entryItems.map(item => item.serviceType))).join('+');

    const updateData = {
      customerName: customerName.trim(),
      phone: phone?.trim() || '',
      pickupDate,
      pickupTime: pickupTime || '',
      deliveryDate,
      deliveryTime: deliveryTime || '',
      serviceType: servicesSummary,
      quantity: totalQty,
      items: entryItems,
      paymentStatus: paymentStatus || 'unpaid',
      partialAmount: paymentStatus === 'partial' ? parseFloat(partialAmount) || 0 : undefined,
      status: status || 'pending',
      remark: remark?.trim() || ''
    };

    const entry = await ManualEntry.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Manual entry not found'
      });
    }

    if (entry.phone || entry.customerName) {
      syncCustomerStats(entry.phone, entry.customerName).catch(err => console.error('⚠️ Customer sync error:', err.message));
    }

    res.json({
      success: true,
      message: 'Manual entry updated successfully',
      data: mapEntry(entry)
    });
  } catch (error) {
    console.error('❌ Error updating manual entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update manual entry',
      error: error.message
    });
  }
});

// Update payment status (inline cycling support)
router.patch('/:id/payment-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, partialAmount } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }

    const updateData = {
      paymentStatus,
      partialAmount: paymentStatus === 'partial' ? parseFloat(partialAmount) || 0 : undefined
    };

    const entry = await ManualEntry.findByIdAndUpdate(id, updateData, { new: true });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Manual entry not found'
      });
    }

    if (entry.phone || entry.customerName) {
      syncCustomerStats(entry.phone, entry.customerName).catch(err => console.error('⚠️ Customer sync error:', err.message));
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: mapEntry(entry)
    });
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
});

// Update status (pending/completed/delivered status cycling support)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const entry = await ManualEntry.findByIdAndUpdate(id, { status }, { new: true });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Manual entry not found'
      });
    }

    if (entry.phone || entry.customerName) {
      syncCustomerStats(entry.phone, entry.customerName).catch(err => console.error('⚠️ Customer sync error:', err.message));
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: mapEntry(entry)
    });
  } catch (error) {
    console.error('❌ Error updating status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// Delete manual entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await ManualEntry.findByIdAndDelete(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Manual entry not found'
      });
    }

    if (entry.phone || entry.customerName) {
      syncCustomerStats(entry.phone, entry.customerName).catch(err => console.error('⚠️ Customer sync error:', err.message));
    }

    res.json({
      success: true,
      message: 'Manual entry deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting manual entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete manual entry',
      error: error.message
    });
  }
});

module.exports = router;
