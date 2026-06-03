/**
 * whatsappNotify.ts
 *
 * Sends WhatsApp notifications by opening pre-filled wa.me links.
 * No API key, no template registration, works instantly on any device.
 *
 * On mobile  → opens WhatsApp app directly
 * On desktop → opens WhatsApp Web
 */

const SHOP_NAME    = 'Gen-Z Laundry & Dry Cleaners';
const SHOP_PHONE   = '+91 9256930727';
const SHOP_ADDRESS = 'Sabji Mandi Circle, Ratanada, Jodhpur';

function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Ensure 91 country code
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return '91' + digits;
  return digits;
}

function openWA(phone: string, message: string): void {
  const clean = cleanPhone(phone);
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  // Open synchronously — must be called from a user-gesture context
  // or use window.open with a pre-opened window to avoid popup blocker
  window.open(url, '_blank');
}

// ─── Message templates ────────────────────────────────────────────────────────

export function sendBillGeneratedWA(
  phone: string,
  customerName: string,
  billNumber: string,
  items: Array<{ name: string; quantity: number }>,
  grandTotal: number
): void {
  const itemList = items
    .slice(0, 6)
    .map(i => `  • ${i.name} ×${i.quantity}`)
    .join('\n');
  const more = items.length > 6 ? `\n  +${items.length - 6} more items` : '';

  const msg =
    `🧺 *Order Received — ${SHOP_NAME}*\n\n` +
    `Hi ${customerName}! Your laundry order has been received.\n\n` +
    `📋 *Bill No:* ${billNumber}\n` +
    `🛍️ *Items:*\n${itemList}${more}\n\n` +
    `💰 *Total: ₹${grandTotal}*\n\n` +
    `We will notify you when your clothes are ready for pickup.\n\n` +
    `📍 ${SHOP_ADDRESS}\n` +
    `📞 ${SHOP_PHONE}\n\n` +
    `_Thank you for choosing ${SHOP_NAME}!_`;

  openWA(phone, msg);
}

export function sendReadyPickupWA(
  phone: string,
  customerName: string,
  billNumber?: string
): void {
  const msg =
    `✅ *Clothes Ready — ${SHOP_NAME}*\n\n` +
    `Hi ${customerName}! Your clothes are ready for pickup. 🎉\n\n` +
    (billNumber ? `📋 *Bill No:* ${billNumber}\n\n` : '') +
    `Please collect at your earliest convenience.\n\n` +
    `📍 ${SHOP_ADDRESS}\n` +
    `📞 ${SHOP_PHONE}\n\n` +
    `_Thank you for choosing ${SHOP_NAME}!_`;

  openWA(phone, msg);
}

export function sendPaymentReceivedWA(
  phone: string,
  customerName: string,
  amountPaid: number,
  amountDue: number,
  billNumber?: string
): void {
  const status = amountDue <= 0
    ? `✅ *Your account is fully cleared!*`
    : `⚠️ *Balance Due: ₹${amountDue}*`;

  const msg =
    `💳 *Payment Received — ${SHOP_NAME}*\n\n` +
    `Hi ${customerName}! We have received your payment.\n\n` +
    (billNumber ? `📋 *Bill No:* ${billNumber}\n` : '') +
    `💰 *Amount Paid: ₹${amountPaid}*\n` +
    `${status}\n\n` +
    `📍 ${SHOP_ADDRESS}\n` +
    `📞 ${SHOP_PHONE}\n\n` +
    `_Thank you for choosing ${SHOP_NAME}!_`;

  openWA(phone, msg);
}

export function sendDeliveredWA(
  phone: string,
  customerName: string,
  billNumber?: string
): void {
  const msg =
    `🚚 *Order Delivered — ${SHOP_NAME}*\n\n` +
    `Hi ${customerName}! Your laundry order has been delivered.\n\n` +
    (billNumber ? `📋 *Bill No:* ${billNumber}\n\n` : '') +
    `We hope you are satisfied with our service!\n\n` +
    `📞 ${SHOP_PHONE}\n\n` +
    `_Thank you for choosing ${SHOP_NAME}!_`;

  openWA(phone, msg);
}

export function sendCustomWA(phone: string, message: string): void {
  openWA(phone, message);
}

export function sendManualEntryWA(
  phone: string,
  customerName: string,
  serviceType: string,
  quantity: number,
  pickupDate: string,
  deliveryDate: string,
  paymentStatus: string,
  partialAmount?: number
): void {
  const paymentDetails = paymentStatus === 'paid' 
    ? 'Paid ✅' 
    : paymentStatus === 'partial' 
    ? `Partially Paid (₹${partialAmount}) ⚠️` 
    : 'Unpaid ❌';

  const msg =
    `🧺 *Order Received — ${SHOP_NAME}*\n\n` +
    `Hi ${customerName}! Your laundry order has been received.\n\n` +
    `📋 *Order Details:*\n` +
    `  • *Service:* ${serviceType}\n` +
    `  • *Quantity:* ${quantity} items\n` +
    `  • *Pickup Date:* ${new Date(pickupDate).toLocaleDateString('en-IN')}\n` +
    `  • *Delivery Date:* ${new Date(deliveryDate).toLocaleDateString('en-IN')}\n` +
    `  • *Payment Status:* ${paymentDetails}\n\n` +
    `📍 ${SHOP_ADDRESS}\n` +
    `📞 ${SHOP_PHONE}\n\n` +
    `_Thank you for choosing ${SHOP_NAME}!_`;

  openWA(phone, msg);
}

