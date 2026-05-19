// SMS Service using Fast2SMS API
const axios = require('axios');

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Send SMS via Fast2SMS Quick SMS route (no DLT needed)
 * Switch to 'dlt' route after DLT registration for cheaper rates
 */
const sendSMS = async (phone, message) => {
  if (!FAST2SMS_API_KEY) {
    console.warn('⚠️ FAST2SMS_API_KEY not set — SMS not sent');
    return { success: false, message: 'SMS API key not configured' };
  }

  if (!phone || phone.length < 10) {
    return { success: false, message: 'Invalid phone number' };
  }

  // Clean phone number - remove +91, spaces, dashes
  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);

  if (cleanPhone.length !== 10) {
    return { success: false, message: 'Invalid phone number format' };
  }

  try {
    console.log(`📱 Sending SMS to ${cleanPhone}...`);

    const response = await axios.get(FAST2SMS_URL, {
      params: {
        authorization: FAST2SMS_API_KEY,
        route: 'q',           // 'q' = Quick SMS (no DLT), change to 'dlt' after registration
        message: message,
        flash: '0',
        numbers: cleanPhone
      },
      headers: {
        'cache-control': 'no-cache'
      },
      timeout: 10000
    });

    console.log('📨 Fast2SMS response:', response.data);

    if (response.data && response.data.return === true) {
      console.log(`✅ SMS sent successfully to ${cleanPhone}`);
      return { success: true, message: 'SMS sent successfully', data: response.data };
    } else {
      console.warn('⚠️ SMS send failed:', response.data);
      return { success: false, message: response.data?.message || 'SMS send failed', data: response.data };
    }
  } catch (error) {
    console.error('❌ SMS error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || error.message };
  }
};

/**
 * SMS Templates
 */
const SMS_TEMPLATES = {
  // Bill generated - NO amount (as per admin requirement)
  billGenerated: (customerName, items) => {
    const itemList = items
      .slice(0, 5) // Max 5 items to keep SMS short
      .map(item => `${item.name} x${item.quantity}`)
      .join(', ');
    const moreItems = items.length > 5 ? ` +${items.length - 5} more` : '';
    return `Hi ${customerName}, your laundry order is received at Gen-Z Laundry. Items: ${itemList}${moreItems}. We will notify you when ready. -Gen-Z Laundry`;
  },

  // Clothes ready for pickup
  readyForPickup: (customerName) => {
    return `Hi ${customerName}, your clothes are ready for pickup at Gen-Z Laundry, Ratanada Jodhpur. Call +91 9256930727. -Gen-Z Laundry`;
  },

  // Payment received
  paymentReceived: (customerName, amountPaid, amountDue) => {
    if (amountDue <= 0) {
      return `Hi ${customerName}, payment of Rs.${amountPaid} received. Your account is fully cleared. Thank you! -Gen-Z Laundry`;
    }
    return `Hi ${customerName}, payment of Rs.${amountPaid} received. Balance due: Rs.${amountDue}. Thank you! -Gen-Z Laundry`;
  },

  // Custom message from admin
  custom: (message) => message
};

module.exports = { sendSMS, SMS_TEMPLATES };
