const mongoose = require('mongoose');

const advanceHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['GIVEN', 'RETURNED'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    default: ''
  }
});

const advanceSchema = new mongoose.Schema({
  personName: {
    type: String,
    required: true,
    trim: true
  },
  amountGiven: {
    type: Number,
    required: true,
    default: 0
  },
  amountReturned: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  history: [advanceHistorySchema],
  status: {
    type: String,
    enum: ['PENDING', 'SETTLED'],
    default: 'PENDING'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
advanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-settle if returned >= given
  if (this.amountReturned >= this.amountGiven && this.amountGiven > 0) {
    this.status = 'SETTLED';
  } else {
    this.status = 'PENDING';
  }
  
  next();
});

const Advance = mongoose.model('Advance', advanceSchema);

module.exports = Advance;
