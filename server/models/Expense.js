const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['RENT', 'UTILITIES', 'SUPPLIES', 'MAINTENANCE', 'SALARY', 'MARKETING', 'TRANSPORT', 'FOOD', 'OTHER'],
    default: 'OTHER'
  },
  type: {
    type: String,
    enum: ['EXPENSE', 'RETURN'],
    default: 'EXPENSE'
  },
  date: {
    type: Date,
    default: Date.now
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', null],
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER'],
    default: 'CASH'
  },
  paidTo: {
    type: String,
    trim: true,
    default: ''
  },
  receiptNumber: {
    type: String,
    trim: true,
    default: ''
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

expenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);