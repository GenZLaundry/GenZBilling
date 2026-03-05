const mongoose = require('mongoose');

const tagHistorySchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    required: true,
    index: true
  },
  customerPhone: {
    type: String,
    default: ''
  },
  itemName: {
    type: String,
    required: true
  },
  washType: {
    type: String,
    enum: ['WASH', 'IRON', 'WASH+IRON', 'DRY CLEAN'],
    required: true
  },
  tagIndex: {
    type: Number,
    required: true
  },
  totalTags: {
    type: Number,
    required: true
  },
  qrCode: {
    type: String,
    default: ''
  },
  barcode: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['created', 'printed', 'in-process', 'completed', 'delivered'],
    default: 'created'
  },
  events: [{
    status: {
      type: String,
      enum: ['created', 'printed', 'in-process', 'completed', 'delivered']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
tagHistorySchema.index({ billNumber: 1, tagIndex: 1 });
tagHistorySchema.index({ customerPhone: 1 });
tagHistorySchema.index({ status: 1 });
tagHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('TagHistory', tagHistorySchema);
