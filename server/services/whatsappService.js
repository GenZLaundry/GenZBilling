// WhatsApp Business API Service via Fast2SMS
const axios = require('axios');

const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || process.env.FAST2SMS_API_KEY;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const FAST2SMS_WA_URL = 'https://www.fast2sms.com/dev/whatsapp';

// Template IDs
const TEMPLATES = {
  ORDER_RECEIVED: process.env.WHATSAPP_TEMPLATE_ORDER_RECEIVED,  // order_received
  ORDER_READY: process.env.WHATSAPP_TEMPLATE_ORDER_READY,        // order_ready
  PAYMENT_RECEIVED: process.env.WHATSAPP_TEMPLATE_PAYMENT_RECEIVED // payment_received
};

/**
 * Send WhatsApp template message via Fast2SMS
 */
const sendWhatsApp = async (phone, templateId, variables = []) => {
  if (!WHATSAPP_API_KEY) {
    console.warn('⚠️ WhatsApp API key not configured');
    return { success: false, message: 'WhatsApp API key not configured' };
  }

  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return { success: false, message: 'Invalid phone number' };
  }

  try {
    console.log(`📱 Sending WhatsApp to ${cleanPhone}, template: ${templateId}`);

    const payload = {
      authorization: WHATSAPP_API_KEY,
      route: 'whatsapp',
      phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
      message_id: templateId, 
      numbers: '91' + cleanPhone, // Country code is often required
      variables_values: variables.join('|')
    };

    const response = await axios.get(FAST2SMS_WA_URL, {
      params: payload,
      headers: {
        'cache-control': 'no-cache',
        'accept': 'application/json'
      },
      timeout: 10000
    });

    console.log('📨 WhatsApp response:', response.data);

    if (response.data && response.data.return === true) {
      console.log(`✅ WhatsApp sent to ${cleanPhone}`);
      return { success: true, message: 'WhatsApp sent successfully', data: response.data };
    } else {
      console.warn('⚠️ WhatsApp send failed:', response.data);
      return { success: false, message: response.data?.message || 'WhatsApp send failed', data: response.data };
    }
  } catch (error) {
    console.error('❌ WhatsApp error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || error.message };
  }
};

/**
 * Send bill generated WhatsApp (no amount)
 * Template: Hi {{1}}, your laundry order has been received at Gen-Z Laundry & Dry Cleaners. Items: {{2}}. We will notify you when ready. Thank you!
 */
const sendBillGeneratedWA = async (phone, customerName, items) => {
  const itemList = items
    .slice(0, 5)
    .map(item => `${item.name} x${item.quantity}`)
    .join(', ');
  const moreItems = items.length > 5 ? ` +${items.length - 5} more` : '';
  
  return sendWhatsApp(phone, TEMPLATES.ORDER_RECEIVED, [customerName, itemList + moreItems]);
};

/**
 * Send ready for pickup WhatsApp
 * Template: Hi {{1}}, your clothes are ready for pickup at Gen-Z Laundry & Dry Cleaners, Ratanada Jodhpur. Call +91 9256930727. Thank you!
 */
const sendReadyPickupWA = async (phone, customerName) => {
  return sendWhatsApp(phone, TEMPLATES.ORDER_READY, [customerName]);
};

/**
 * Send payment received WhatsApp
 * Template: Hi {{1}}, we have received your payment of Rs.{{2}}. Balance due: Rs.{{3}}. Thank you for choosing Gen-Z Laundry!
 */
const sendPaymentReceivedWA = async (phone, customerName, amountPaid, amountDue) => {
  return sendWhatsApp(phone, TEMPLATES.PAYMENT_RECEIVED, [customerName, amountPaid.toString(), amountDue.toString()]);
};

module.exports = {
  sendBillGeneratedWA,
  sendReadyPickupWA,
  sendPaymentReceivedWA,
  sendWhatsApp,
  TEMPLATES
};
