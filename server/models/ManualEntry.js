const mongoose = require('mongoose');

const manualEntryItemSchema = new mongoose.Schema({
  serviceType: {
    type: String,
    enum: ['WASH', 'IRON', 'WASH+IRON', 'DRY CLEAN'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  unit: {
    type: String,
    enum: ['pcs', 'kg'],
    default: 'pcs'
  }
});

const manualEntrySchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  pickupDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  pickupTime: {
    type: String, // HH:MM
    default: ''
  },
  deliveryDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  deliveryTime: {
    type: String, // HH:MM
    default: ''
  },
  serviceType: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    min: 0.01
  },
  items: [manualEntryItemSchema],
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'partial'],
    required: true,
    default: 'unpaid'
  },
  partialAmount: {
    type: Number,
    min: 0,
    required: function() { return this.paymentStatus === 'partial'; }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'delivered'],
    default: 'pending'
  },
  remark: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ManualEntry = mongoose.model('ManualEntry', manualEntrySchema);

module.exports = ManualEntry;
