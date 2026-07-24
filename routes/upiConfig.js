const express = require('express');
const router = express.Router();
const UPIConfig = require('../models/UPIConfig');

// Default backup configurations if collection is empty
const defaultUPIConfig = {
  upiId: '6367493127@ybl',
  payeeName: 'GenZ Laundry',
  merchantCode: 'GENZ001',
  alternativeConfigs: [
    { upiId: '6367493127@ybl', payeeName: 'GenZ Laundry', merchantCode: 'GENZ002' },
    { upiId: 'genzlaundry@paytm', payeeName: 'GenZ Laundry', merchantCode: 'GENZ003' },
    { upiId: 'genzlaundry@googlepay', payeeName: 'GenZ Laundry', merchantCode: 'GENZ004' }
  ]
};

// GET active UPI configuration from MongoDB
router.get('/', async (req, res) => {
  try {
    let config = await UPIConfig.findOne({ isActive: true });
    
    // Create default config in MongoDB if none exists yet
    if (!config) {
      console.log('📌 Initializing default UPI configuration in MongoDB...');
      config = new UPIConfig({ ...defaultUPIConfig, isActive: true });
      await config.save();
    }

    res.json({
      success: true,
      data: {
        upiId: config.upiId,
        payeeName: config.payeeName,
        merchantCode: config.merchantCode,
        alternativeConfigs: config.alternativeConfigs || []
      }
    });
  } catch (error) {
    console.error('❌ Error fetching UPI configuration from MongoDB:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching UPI configuration',
      error: error.message
    });
  }
});

// UPDATE UPI configuration in MongoDB
router.put('/', async (req, res) => {
  try {
    const { upiId, payeeName, merchantCode, alternativeConfigs } = req.body;
    
    if (!upiId || !payeeName) {
      return res.status(400).json({
        success: false,
        message: 'UPI ID and Payee Name are required'
      });
    }

    let config = await UPIConfig.findOne({ isActive: true });
    
    if (!config) {
      config = new UPIConfig({
        upiId,
        payeeName,
        merchantCode,
        alternativeConfigs: alternativeConfigs || [],
        isActive: true
      });
    } else {
      config.upiId = upiId;
      config.payeeName = payeeName;
      if (merchantCode !== undefined) config.merchantCode = merchantCode;
      if (alternativeConfigs !== undefined) config.alternativeConfigs = alternativeConfigs;
    }
    
    await config.save();
    console.log('✅ UPI configuration updated in MongoDB successfully:', config.upiId);

    res.json({
      success: true,
      message: 'UPI configuration saved to MongoDB successfully',
      data: {
        upiId: config.upiId,
        payeeName: config.payeeName,
        merchantCode: config.merchantCode,
        alternativeConfigs: config.alternativeConfigs || []
      }
    });
  } catch (error) {
    console.error('❌ Error updating UPI configuration in MongoDB:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating UPI configuration in MongoDB',
      error: error.message
    });
  }
});

// Auto-initialize upiconfigs collection in MongoDB on server startup
const initUPIConfigDB = async () => {
  try {
    let config = await UPIConfig.findOne({ isActive: true });
    if (!config) {
      console.log('📌 Auto-creating upiconfigs collection in MongoDB Atlas...');
      config = new UPIConfig({ ...defaultUPIConfig, isActive: true });
      await config.save();
      console.log('✅ upiconfigs collection initialized successfully in MongoDB Atlas!');
    }
  } catch (err) {
    console.error('⚠️ upiconfigs collection initialization error:', err.message);
  }
};

router.initUPIConfigDB = initUPIConfigDB;
module.exports = router;
