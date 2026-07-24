const mongoose = require('mongoose');

const alternativeUPIConfigSchema = new mongoose.Schema({
  upiId: {
    type: String,
    required: true
  },
  payeeName: {
    type: String,
    required: true
  },
  merchantCode: {
    type: String,
    default: ''
  }
});

const upiConfigSchema = new mongoose.Schema({
  upiId: {
    type: String,
    required: true,
    default: '6367493127@ybl'
  },
  payeeName: {
    type: String,
    required: true,
    default: 'GenZ Laundry'
  },
  merchantCode: {
    type: String,
    default: 'GENZ001'
  },
  alternativeConfigs: [alternativeUPIConfigSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure only one active UPI config record exists
upiConfigSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

module.exports = mongoose.model('UPIConfig', upiConfigSchema);
