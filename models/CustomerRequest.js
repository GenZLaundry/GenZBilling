const mongoose = require('mongoose');

const customerRequestSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    unique: true,
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    default: ''
  },
  pickupAddress: {
    type: String,
    trim: true,
    default: ''
  },
  serviceType: {
    type: String,
    trim: true,
    default: 'WASH ONLY'
  },
  preferredTime: {
    type: String,
    trim: true,
    default: ''
  },
  instructions: {
    type: String,
    trim: true,
    default: ''
  },
  items: [{
    itemName: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    serviceType: { type: String, default: 'WASH ONLY' }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  source: {
    type: String,
    enum: ['website', 'manual', 'whatsapp'],
    default: 'website'
  }
}, {
  timestamps: true
});

// Auto-generate request number before validate
customerRequestSchema.pre('validate', async function(next) {
  if (!this.requestNumber) {
    const count = await mongoose.model('CustomerRequest').countDocuments();
    this.requestNumber = `REQ-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('CustomerRequest', customerRequestSchema);
