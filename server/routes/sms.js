const express = require('express');
const router = express.Router();
const { sendSMS, SMS_TEMPLATES } = require('../services/smsService');
const { sendBillGeneratedWA, sendReadyPickupWA, sendPaymentReceivedWA, sendWhatsApp, sendManualEntryWA } = require('../services/whatsappService');
const Bill = require('../models/Bill');

// Helper: try WhatsApp first, fallback to SMS
const sendNotification = async (phone, type, data) => {
  let waResult = { success: false };
  
  try {
    if (type === 'bill_generated') {
      waResult = await sendBillGeneratedWA(phone, data.customerName, data.items);
    } else if (type === 'ready_pickup') {
      waResult = await sendReadyPickupWA(phone, data.customerName);
    } else if (type === 'payment_received') {
      waResult = await sendPaymentReceivedWA(phone, data.customerName, data.amountPaid, data.amountDue);
    }
  } catch (e) {
    console.warn('WhatsApp failed, trying SMS fallback:', e.message);
  }

  // If WhatsApp failed, fallback to SMS
  if (!waResult.success) {
    console.log('📱 WhatsApp failed, falling back to SMS...');
    let smsMessage = '';
    if (type === 'bill_generated') {
      smsMessage = SMS_TEMPLATES.billGenerated(data.customerName, data.items);
    } else if (type === 'ready_pickup') {
      smsMessage = SMS_TEMPLATES.readyForPickup(data.customerName);
    } else if (type === 'payment_received') {
      smsMessage = SMS_TEMPLATES.paymentReceived(data.customerName, data.amountPaid, data.amountDue);
    }
    const smsResult = await sendSMS(phone, smsMessage);
    return { ...smsResult, channel: 'sms' };
  }

  return { ...waResult, channel: 'whatsapp' };
};

// Send bill generated notification
router.post('/bill-generated', async (req, res) => {
  try {
    const { phone, customerName, items } = req.body;
    if (!phone || !customerName || !items) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const result = await sendNotification(phone, 'bill_generated', { customerName, items });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send ready for pickup notification
router.post('/ready-pickup', async (req, res) => {
  try {
    const { phone, customerName } = req.body;
    if (!phone || !customerName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const result = await sendNotification(phone, 'ready_pickup', { customerName });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send payment received notification
router.post('/payment-received', async (req, res) => {
  try {
    const { phone, customerName, amountPaid, amountDue } = req.body;
    if (!phone || !customerName || amountPaid === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const result = await sendNotification(phone, 'payment_received', { customerName, amountPaid, amountDue: amountDue || 0 });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send custom bulk WhatsApp/SMS to multiple customers
router.post('/bulk-custom', async (req, res) => {
  try {
    const { message, phones } = req.body;
    if (!message || !phones || phones.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing message or phone numbers' });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const phone of phones) {
      // For bulk custom, use SMS (no template needed)
      const result = await sendSMS(phone, message);
      results.push({ phone, ...result });
      if (result.success) successCount++;
      else failCount++;
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    res.json({
      success: true,
      message: `Sent: ${successCount} success, ${failCount} failed`,
      results, successCount, failCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all unique customer phones from bill history
router.get('/customers', async (req, res) => {
  try {
    const bills = await Bill.find({ customerPhone: { $exists: true, $ne: '' } })
      .select('customerName customerPhone createdAt')
      .sort({ createdAt: -1 });

    const customerMap = new Map();
    bills.forEach(bill => {
      const phone = bill.customerPhone?.replace(/\D/g, '').slice(-10);
      if (phone && phone.length === 10 && !customerMap.has(phone)) {
        customerMap.set(phone, { name: bill.customerName, phone, lastVisit: bill.createdAt });
      }
    });

    const customers = Array.from(customerMap.values());
    res.json({ success: true, data: customers, total: customers.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send manual entry notification
router.post('/manual-entry-received', async (req, res) => {
  try {
    const { phone, customerName, serviceType, quantity, pickupDate, deliveryDate, paymentStatus, partialAmount } = req.body;
    if (!phone || !customerName || !serviceType || !quantity) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const result = await sendManualEntryWA(
      phone,
      customerName,
      serviceType,
      quantity,
      pickupDate,
      deliveryDate,
      paymentStatus,
      partialAmount
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
