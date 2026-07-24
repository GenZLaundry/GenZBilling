const express = require('express');
const router = express.Router();
const CustomerRequest = require('../models/CustomerRequest');

// ─── GET all customer requests (with optional status filter) ───
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await CustomerRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching customer requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST create a new customer request (PUBLIC — called by website form) ───
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      pickupAddress,
      serviceType,
      preferredTime,
      instructions,
      items,
      source
    } = req.body;

    // Validation
    if (!customerName || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and phone number are required'
      });
    }

    // Build items array — if service was selected but no specific items, create one entry
    let requestItems = [];
    if (items && Array.isArray(items) && items.length > 0) {
      requestItems = items;
    } else if (serviceType) {
      requestItems = [{
        itemName: serviceType,
        quantity: 1,
        serviceType: serviceType
      }];
    }

    const newRequest = new CustomerRequest({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: (customerEmail || '').trim(),
      pickupAddress: (pickupAddress || '').trim(),
      serviceType: (serviceType || 'WASH ONLY').trim(),
      preferredTime: (preferredTime || '').trim(),
      instructions: (instructions || '').trim(),
      items: requestItems,
      status: 'pending',
      source: source || 'website'
    });

    await newRequest.save();

    console.log(`📥 New customer request: ${newRequest.requestNumber} from ${newRequest.customerName} (${newRequest.source})`);

    res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully!',
      data: newRequest
    });
  } catch (error) {
    console.error('Error creating customer request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT update request status (approve / reject) ───
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, approved, rejected, or completed'
      });
    }

    const updated = await CustomerRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    console.log(`📋 Request ${updated.requestNumber} status → ${status}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE a customer request ───
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CustomerRequest.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
