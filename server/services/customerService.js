const Customer = require('../models/Customer');
const Bill = require('../models/Bill');
const ManualEntry = require('../models/ManualEntry');

/**
 * Recalculate and update statistics for a customer by phone number
 * Self-healing design: aggregates values from all bills and manual entries.
 */
/**
 * Sync stats for all customers matching a specific name (case-insensitive)
 */
const syncCustomerStatsByName = async (name) => {
  if (!name || name.trim() === '' || name === 'Valued Customer') return null;
  try {
    const nameRegex = new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const customers = await Customer.find({ name: { $regex: nameRegex } });
    const results = [];
    for (const customer of customers) {
      const res = await syncCustomerStats(customer.phone, customer.name);
      if (res) results.push(res);
    }
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error(`❌ Error syncing customer stats by name for ${name}:`, error);
    return null;
  }
};

/**
 * Recalculate and update statistics for a customer by phone number
 * Self-healing design: aggregates values from all bills and manual entries.
 */
const syncCustomerStats = async (phone, defaultName = 'Valued Customer') => {
  // Clean phone number (extract last 10 digits)
  let cleanPhone = null;
  if (phone) {
    cleanPhone = phone.replace(/\D/g, '').slice(-10);
  }

  // If cleanPhone is invalid/missing, fallback to name-based syncing if defaultName is provided
  if (!cleanPhone || cleanPhone.length !== 10) {
    if (defaultName && defaultName !== 'Valued Customer') {
      return syncCustomerStatsByName(defaultName);
    }
    return null;
  }

  try {
    const phoneRegex = new RegExp(`${cleanPhone}$`);
    
    // Find customer first to know their name
    let customer = await Customer.findOne({ phone: cleanPhone });
    let name = defaultName;
    if (customer && customer.name) {
      name = customer.name;
    }

    if (name === 'Valued Customer') {
      // Look up in DB for any name associated with this phone number
      const firstWithName = await Bill.findOne({
        customerPhone: { $regex: phoneRegex },
        customerName: { $ne: '', $ne: 'Valued Customer' }
      }) || await ManualEntry.findOne({
        phone: { $regex: phoneRegex },
        customerName: { $ne: '', $ne: 'Valued Customer' }
      });
      if (firstWithName) {
        name = firstWithName.customerName;
      }
    }

    const nameRegex = new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    // 1. Fetch completed/delivered bills for this phone OR matching customerName where customerPhone is empty
    const bills = await Bill.find({
      $or: [
        { customerPhone: { $regex: phoneRegex } },
        {
          $and: [
            { $or: [{ customerPhone: '' }, { customerPhone: null }, { customerPhone: { $exists: false } }] },
            { customerName: { $regex: nameRegex } }
          ]
        }
      ],
      status: { $in: ['completed', 'delivered'] }
    });

    // 2. Fetch manual entries for this phone OR matching customerName where phone is empty
    const manualEntries = await ManualEntry.find({
      $or: [
        { phone: { $regex: phoneRegex } },
        {
          $and: [
            { $or: [{ phone: '' }, { phone: null }, { phone: { $exists: false } }] },
            { customerName: { $regex: nameRegex } }
          ]
        }
      ]
    });

    // 3. Aggregate totals
    const totalSpent = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    const totalOrders = bills.length + manualEntries.length;
    const totalPointsRedeemed = bills.reduce((sum, b) => sum + (b.pointsRedeemed || 0), 0);

    // 4. Calculate last visit date
    let lastVisit = null;
    const dates = [
      ...bills.map(b => b.createdAt),
      ...manualEntries.map(e => e.createdAt)
    ].filter(Boolean);

    if (dates.length > 0) {
      lastVisit = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    }

    // 5. Determine VIP Tier
    let vipTier = 'Bronze';
    if (totalSpent >= 30000) {
      vipTier = 'Platinum';
    } else if (totalSpent >= 15000) {
      vipTier = 'Gold';
    } else if (totalSpent >= 5000) {
      vipTier = 'Silver';
    }

    // 6. Create profile if it doesn't exist
    if (!customer) {
      customer = new Customer({
        name: name || 'Valued Customer',
        phone: cleanPhone,
        pointsAdjustment: 0
      });
    } else if (name !== 'Valued Customer' && customer.name !== name) {
      // Sync names if they differ
      customer.name = name;
    }

    // 7. Calculate loyalty points
    const pointsAdjustment = customer.pointsAdjustment || 0;
    const earnedPoints = Math.floor(totalSpent / 100); // 1 point for every ₹100 spent
    const loyaltyPoints = Math.max(0, earnedPoints + pointsAdjustment - totalPointsRedeemed);

    // 8. Update fields
    customer.totalSpent = totalSpent;
    customer.totalOrders = totalOrders;
    customer.lastVisit = lastVisit;
    customer.vipTier = vipTier;
    customer.loyaltyPoints = loyaltyPoints;

    await customer.save();
    console.log(`👤 Customer stats synced: ${customer.name} (${cleanPhone}) - Spent: ₹${totalSpent}, Points: ${loyaltyPoints}, Tier: ${vipTier}`);
    return customer;
  } catch (error) {
    console.error(`❌ Error syncing customer stats for ${phone}:`, error);
    return null;
  }
};

/**
 * Manually adjust customer loyalty points
 */
const adjustLoyaltyPoints = async (phone, points, note = '') => {
  if (!phone) throw new Error('Phone number is required');
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  
  let customer = await Customer.findOne({ phone: cleanPhone });
  if (!customer) {
    throw new Error('Customer profile not found');
  }

  // Update adjustment accumulator
  customer.pointsAdjustment = (customer.pointsAdjustment || 0) + Number(points);
  
  // Re-run stats sync to calculate the new points balance safely
  return syncCustomerStats(cleanPhone, customer.name);
};

/**
 * Run a one-time migration to populate the Customer collection from existing bills & manual entries
 */
const runOneTimeMigration = async () => {
  console.log('🔄 Starting Customer Database migration...');
  try {
    // Get all unique phone numbers from customers, bills, and manual entries
    const customerPhones = await Customer.distinct('phone');
    const billPhones = await Bill.distinct('customerPhone');
    const manualPhones = await ManualEntry.distinct('phone');

    const allPhones = Array.from(new Set([...customerPhones, ...billPhones, ...manualPhones]))
      .map(p => p ? p.replace(/\D/g, '').slice(-10) : '')
      .filter(p => p.length === 10);

    console.log(`🔍 Found ${allPhones.length} unique customer phones to migrate.`);

    let count = 0;
    for (const phone of allPhones) {
      const result = await syncCustomerStats(phone);
      if (result) count++;
    }

    console.log(`✅ Customer database migration completed. Synced ${count}/${allPhones.length} customers.`);
    return { success: true, count, total: allPhones.length };
  } catch (error) {
    console.error('❌ Customer migration failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  syncCustomerStats,
  adjustLoyaltyPoints,
  runOneTimeMigration
};
