const express = require('express');
const router = express.Router();
const ShopConfig = require('../models/ShopConfig');

// Get shop configuration
router.get('/', async (req, res) => {
  try {
    let config = await ShopConfig.findOne({ isActive: true });
    
    // Create default config if none exists
    if (!config) {
      config = new ShopConfig({
        shopName: 'GenZ Laundry',
        address: 'Sabji Mandi Circle,Ratanada, Jodhpur (342011)',
        contact: '+91 9256930727',
        isActive: true
      });
      await config.save();
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching shop configuration',
      error: error.message
    });
  }
});

// Update shop configuration
router.put('/', async (req, res) => {
  try {
    const updateData = req.body;
    
    let config = await ShopConfig.findOne({ isActive: true });
    
    if (!config) {
      // Create new config if none exists
      config = new ShopConfig({ ...updateData, isActive: true });
    } else {
      // Update existing config
      Object.assign(config, updateData);
    }
    
    await config.save();

    res.json({
      success: true,
      message: 'Shop configuration updated successfully',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating shop configuration',
      error: error.message
    });
  }
});

module.exports = router;