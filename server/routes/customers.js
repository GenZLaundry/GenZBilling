const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Bill = require('../models/Bill');
const ManualEntry = require('../models/ManualEntry');
const customerService = require('../services/customerService');

// Get all customers (with search, tier filtering, and sorting)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      tier = '',
      sortBy = 'totalSpent',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Search by name or phone
    if (search.trim()) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch } }
      ];
    }

    // Filter by VIP tier
    if (tier && ['Bronze', 'Silver', 'Gold', 'Platinum'].includes(tier)) {
      query.vipTier = tier;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    };

    const customers = await Customer.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .exec();

    const total = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: customers,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
        totalItems: total,
        itemsPerPage: options.limit
      }
    });
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
});

// Trigger database migration manually
router.post('/migrate', async (req, res) => {
  try {
    const result = await customerService.runOneTimeMigration();
    res.json(result);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

// Get customer details (including bill and manual entry history)
router.get('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    let customer = await Customer.findOne({ phone: cleanPhone });
    
    // Self-healing: if customer stats aren't created yet but they exist in bills, sync now
    if (!customer) {
      customer = await customerService.syncCustomerStats(cleanPhone);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const nameRegex = new RegExp(`^${customer.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    // Fetch full history of Bills (sorted by date)
    const phoneRegex = new RegExp(`${cleanPhone}$`);
    const bills = await Bill.find({
      $or: [
        { customerPhone: { $regex: phoneRegex } },
        {
          $and: [
            { $or: [{ customerPhone: '' }, { customerPhone: null }, { customerPhone: { $exists: false } }] },
            { customerName: { $regex: nameRegex } }
          ]
        }
      ]
    }).sort({ createdAt: -1 });

    // Fetch full history of Manual Entries
    const manualEntries = await ManualEntry.find({
      $or: [
        { phone: { $regex: phoneRegex } },
        {
          $and: [
            { $or: [{ phone: '' }, { phone: null }, { phone: { $exists: false } }] },
            { customerName: { $regex: nameRegex } }
          ]
        }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        profile: customer,
        history: {
          bills,
          manualEntries
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer details',
      error: error.message
    });
  }
});

// Update customer profile details
router.put('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { name, email, notes } = req.body;
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const customer = await Customer.findOne({ phone: cleanPhone });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (name) customer.name = name.trim();
    if (email !== undefined) customer.email = email.trim();
    if (notes !== undefined) customer.notes = notes.trim();

    await customer.save();

    res.json({
      success: true,
      message: 'Customer profile updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('❌ Error updating customer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer profile',
      error: error.message
    });
  }
});

// Manually adjust loyalty points
router.post('/:phone/adjust-points', async (req, res) => {
  try {
    const { phone } = req.params;
    const { points, note } = req.body;

    if (points === undefined || isNaN(points)) {
      return res.status(400).json({
        success: false,
        message: 'Points adjustment value is required'
      });
    }

    const customer = await customerService.adjustLoyaltyPoints(phone, parseInt(points), note);

    res.json({
      success: true,
      message: `Loyalty points adjusted by ${points} successfully`,
      data: customer
    });
  } catch (error) {
    console.error('❌ Error adjusting customer points:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to adjust loyalty points'
    });
  }
});

module.exports = router;
