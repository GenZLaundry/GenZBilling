const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
});

const billSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true
  },
  businessName: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    default: ''
  },
  items: [billItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  previousBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'delivered'],
    default: 'completed'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'partial'],
    default: 'paid'
  },
  thankYouMessage: {
    type: String,
    default: 'Thank you for choosing us!'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
billSchema.index({ customerName: 1 });
billSchema.index({ status: 1 });
billSchema.index({ createdAt: -1 });
billSchema.index({ 'createdAt': 1, 'status': 1 });

// Virtual for formatted date
billSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN');
});

// Method to calculate daily income
billSchema.statics.getDailyIncome = async function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const result = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['completed', 'delivered'] }
      }
    },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: '$grandTotal' },
        totalBills: { $sum: 1 },
        totalItems: { $sum: { $size: '$items' } }
      }
    }
  ]);
  
  return result[0] || { totalIncome: 0, totalBills: 0, totalItems: 0 };
};

// Method to calculate weekly income
billSchema.statics.getWeeklyIncome = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: { $in: ['completed', 'delivered'] }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        dailyIncome: { $sum: '$grandTotal' },
        dailyBills: { $sum: 1 },
        date: { $first: '$createdAt' }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
  
  return result;
};

// Method to calculate monthly income
billSchema.statics.getMonthlyIncome = async function(year, month) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  
  const result = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $in: ['completed', 'delivered'] }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        dailyIncome: { $sum: '$grandTotal' },
        dailyBills: { $sum: 1 },
        date: { $first: '$createdAt' }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
  
  return result;
};

module.exports = mongoose.model('Bill', billSchema);