const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Income = mongoose.model('Income', incomeSchema);

module.exports = Income;
