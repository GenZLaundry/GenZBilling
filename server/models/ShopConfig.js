const mongoose = require('mongoose');

const shopConfigSchema = new mongoose.Schema({
  shopName: {
    type: String,
    required: true,
    default: 'GenZ Laundry'
  },
  address: {
    type: String,
    required: true,
    default: 'Sabji Mandi Circle,Ratanada, Jodhpur (342011)'
  },
  contact: {
    type: String,
    required: true,
    default: '+91 9256930727'
  },
  gstNumber: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one active shop config
shopConfigSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

module.exports = mongoose.model('ShopConfig', shopConfigSchema);