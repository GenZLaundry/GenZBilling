// PROFESSIONAL THERMAL RECEIPT - BUSINESS GRADE LAYOUT WITH DYNAMIC QR
import { getUPIConfig } from './upiConfig';

export interface BillData {
  businessName: string;
  address: string;
  phone: string;
  billNumber: string;
  billDate?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  previousBills?: Array<{
    billNumber: string;
    items: Array<{
      name: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  previousBalance?: number;
  grandTotal: number;
  thankYouMessage?: string;
  amountPaid?: number;
  amountDue?: number;
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  paymentHistory?: Array<{ amount: number; date: string; note: string }>;
}

export const printCleanThermalBill = (billData: BillData, onError?: (message: string) => void) => {
  const printWindow = window.open('', '_blank', 'width=320,height=700,scrollbars=no');
  if (!printWindow) {
    if (onError) {
      onError('Please allow popups for thermal printing');
    } else {
      alert('Please allow popups for thermal printing');
    }
    return;
  }

  const currentDate = billData.billDate 
    ? new Date(billData.billDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
  
  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Generate DYNAMIC UPI QR Code
  const upiConfig = getUPIConfig();
  let qrCodeUrl = '';
  
  // Use amountDue for QR if partial payment, otherwise use grandTotal
  // If bill is fully paid (amountDue === 0), no QR needed
  const amountPaid = billData.amountPaid || 0;
  const amountDue = billData.amountDue !== undefined 
    ? billData.amountDue 
    : billData.grandTotal - amountPaid;
  
  const qrAmount = amountDue > 0 ? amountDue : (amountPaid === 0 ? billData.grandTotal : 0);

  if (qrAmount > 0) {
    const transactionNote = `Bill ${billData.billNumber}`;
    const upiId = upiConfig.upiId || '6367493127@ybl';
    const payeeName = upiConfig.payeeName || 'GenZ Laundry';
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${qrAmount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiUrl)}&ecc=H&margin=15&color=000000&bgcolor=FFFFFF&format=png`;
  }

  const professionalHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Professional Receipt</title>
  <style>
    @page { size: 80mm auto !important; margin: 0 !important; }
    * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
    
    body {
      width: 80mm !important; padding: 4mm !important;
      font-family: 'Courier New', 'Arial', monospace !important; font-size: 9pt !important;
      line-height: 1.3 !important; background: #ffffff !important; color: #000000 !important;
      font-weight: bold !important;
      
      /* PROFESSIONAL BLACK & WHITE THERMAL PRINTING */
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .center { text-align: center !important; }
    .left { text-align: left !important; }
    .right { text-align: right !important; }
    .bold { font-weight: 900 !important; }
    .normal { font-weight: normal !important; }
    
    /* PROFESSIONAL HEADER */
    .header {
      text-align: center !important; padding: 2mm 0 !important;
      margin-bottom: 3mm !important;
    }
    
    /* BUSINESS INFO BOX - Single box for name and address */
    .business-info-box {
      border: 2px solid #000000 !important;
      padding: 3mm !important;
      margin-bottom: 3mm !important;
      display: inline-block !important;
      text-align: center !important;
    }
    
    .business-name {
      font-size: 20pt !important; font-weight: 900 !important;
      letter-spacing: 2px !important; margin-bottom: 1mm !important;
    }
    
    .business-subtitle {
      font-size: 11pt !important; font-weight: bold !important;
      letter-spacing: 1px !important; margin-bottom: 2mm !important;
    }
    
    .business-info {
      font-size: 8pt !important; font-weight: bold !important;
      line-height: 1.4 !important; margin-top: 2mm !important;
      color: #000000 !important;
    }
    
    /* BILL INFO BOX */
    .bill-info-box {
      border: 2px solid #000000 !important;
      padding: 2mm !important; margin: 3mm 0 !important;
    }
    
    .bill-info-row {
      display: flex !important; justify-content: space-between !important;
      padding: 0.5mm 0 !important; font-size: 9pt !important;
      border-bottom: 1px dotted #000000 !important;
    }
    
    .bill-info-row:last-child {
      border-bottom: none !important;
    }
    
    /* SECTION HEADERS */
    .section-header {
      padding: 2mm !important; text-align: center !important;
      font-size: 10pt !important; font-weight: 900 !important;
      margin: 3mm 0 1mm 0 !important;
      letter-spacing: 1px !important;
      color: #000000 !important;
      border-top: 2px solid #000000 !important;
      border-bottom: 2px solid #000000 !important;
    }
    
    /* ITEM TABLE */
    .item-table-header {
      display: flex !important; justify-content: space-between !important;
      padding: 1mm 0 !important; font-size: 8pt !important;
      font-weight: 900 !important; border-bottom: 2px solid #000000 !important;
      margin-bottom: 1mm !important;
    }
    
    .item-table-row {
      display: flex !important; justify-content: space-between !important;
      padding: 1mm 0 !important; font-size: 8pt !important;
      border-bottom: 1px dotted #000000 !important;
      align-items: flex-start !important;
    }
    
    .item-name { width: 50% !important; font-weight: bold !important; }
    .item-qty { width: 15% !important; text-align: center !important; }
    .item-price { width: 17.5% !important; text-align: right !important; }
    .item-total { width: 17.5% !important; text-align: right !important; font-weight: bold !important; }
    
    /* TOTALS SECTION */
    .totals-box {
      border: 2px solid #000000 !important;
      padding: 2mm !important; margin: 3mm 0 !important;
    }
    
    .total-line {
      display: flex !important; justify-content: space-between !important;
      padding: 0.5mm 0 !important; font-size: 9pt !important;
    }
    
    .grand-total-box {
      padding: 3mm !important; text-align: center !important;
      margin: 3mm 0 !important; font-size: 18pt !important;
      font-weight: 900 !important; letter-spacing: 1px !important;
      color: #000000 !important;
      border-top: 3px solid #000000 !important;
      border-bottom: 3px solid #000000 !important;
    }
    
    /* PAYMENT SECTION */
    .payment-box {
      border: 3px solid #000000 !important;
      padding: 3mm !important; text-align: center !important;
      margin: 3mm 0 !important;
    }
    
    .qr-code {
      width: 40mm !important; height: 40mm !important;
      border: 2px solid #000000 !important;
      background: #ffffff !important; padding: 1mm !important;
      margin: 2mm auto !important; display: block !important;
      
      /* THERMAL PRINTER OPTIMIZATION */
      image-rendering: pixelated !important;
      image-rendering: -moz-crisp-edges !important;
      image-rendering: crisp-edges !important;
      filter: contrast(2.0) brightness(1.0) !important;
      -webkit-filter: contrast(2.0) brightness(1.0) !important;
    }
    
    /* FOOTER */
    .footer-box {
      border-top: 2px solid #000000 !important;
      padding-top: 2mm !important; margin-top: 3mm !important;
      text-align: center !important; font-size: 8pt !important;
    }
  </style>
</head>
<body>

  <!-- PROFESSIONAL HEADER -->
  <div class="header">
    <!-- Business Name and Address in Single Box -->
    <div class="business-info-box">
      <div class="business-name">GEN-Z</div>
      <div class="business-subtitle">LAUNDRY & DRY CLEANERS</div>
      <div class="business-info">
        ${billData.address}<br>
        📞 ${billData.phone}
      </div>
    </div>
  </div>
  
  <!-- BILL INFORMATION BOX -->
  <div class="bill-info-box">
    ${billData.customerName ? `
    <div class="bill-info-row">
      <span>Customer Name:</span>
      <span class="bold">${billData.customerName}</span>
    </div>
    ` : ''}
    <div class="bill-info-row">
      <span class="bold">Bill No:</span>
      <span class="bold">${billData.billNumber}</span>
    </div>
    <div class="bill-info-row">
      <span>Date:</span>
      <span>${currentDate}</span>
    </div>
    <div class="bill-info-row">
      <span>Time:</span>
      <span>${currentTime}</span>
    </div>
  </div>
  
  <!-- ORDER DETAILS SECTION -->
  <div class="section-header">ORDER DETAILS</div>
  
  <!-- CURRENT ORDER ITEMS (always first) -->
  ${billData.items.length > 0 ? `
  <div style="margin-bottom: 3mm;">
    <div style="font-size: 9pt; font-weight: bold; padding: 1mm; border: 1px solid #000000; text-align: center; margin-bottom: 2mm;">
      🛍️ CURRENT ORDER (${billData.items.reduce((sum, item) => sum + item.quantity, 0)} items)
    </div>
    
    <div class="item-table-header">
      <div class="item-name">ITEM</div>
      <div class="item-qty">QTY</div>
      <div class="item-price">PRICE</div>
      <div class="item-total">TOTAL</div>
    </div>
    
    ${billData.items.map(item => `
    <div class="item-table-row">
      <div class="item-name">${item.name}</div>
      <div class="item-qty">${item.quantity}</div>
      <div class="item-price">₹${item.rate}</div>
      <div class="item-total">₹${item.amount}</div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- PREVIOUS BILLS (after current order) -->
  ${billData.previousBills && billData.previousBills.length > 0 ? `
  <div style="margin-bottom: 3mm;">
    <div style="font-size: 9pt; font-weight: bold; padding: 1mm; border: 1px solid #000000; text-align: center; margin-bottom: 2mm;">
      📋 PREVIOUS BILLS (${billData.previousBills.length} bill${billData.previousBills.length > 1 ? 's' : ''})
    </div>
    ${billData.previousBills.map(prevBill => `
    <div style="margin-bottom: 2mm; border: 1px solid #000000; padding: 1mm;">
      <div style="font-size: 8pt; font-weight: bold; margin-bottom: 1mm;">Bill: ${prevBill.billNumber}</div>
      
      <div class="item-table-header">
        <div class="item-name">ITEM</div>
        <div class="item-qty">QTY</div>
        <div class="item-price">PRICE</div>
        <div class="item-total">TOTAL</div>
      </div>
      
      ${prevBill.items.map(item => `
      <div class="item-table-row">
        <div class="item-name">${item.name}</div>
        <div class="item-qty">${item.quantity}</div>
        <div class="item-price">₹${item.rate}</div>
        <div class="item-total">₹${item.amount}</div>
      </div>
      `).join('')}
      
      <div style="text-align: right; font-weight: bold; font-size: 9pt; margin-top: 1mm; border-top: 2px solid #000000; padding-top: 1mm;">
        Previous Bill Total: ₹${prevBill.total}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}
  
  <!-- TOTALS SECTION -->
  <div class="totals-box">
    ${billData.previousBills && billData.previousBills.length > 0 ? `
    <div class="total-line">
      <span>Previous Bills Total:</span>
      <span class="bold">₹${billData.previousBills.reduce((sum, bill) => sum + bill.total, 0)}</span>
    </div>
    ` : ''}
    ${billData.previousBalance && billData.previousBalance > 0 ? `
    <div class="total-line">
      <span>Previous Due:</span>
      <span class="bold">₹${billData.previousBalance}</span>
    </div>
    ` : ''}
    ${billData.items.length > 0 ? `
    <div class="total-line">
      <span>Current Order:</span>
      <span class="bold">₹${billData.items.reduce((sum, item) => sum + item.amount, 0)}</span>
    </div>
    ` : ''}
    <div class="total-line">
      <span>Subtotal:</span>
      <span class="bold">₹${billData.subtotal}</span>
    </div>
    ${billData.discount && billData.discount > 0 ? `
    <div class="total-line">
      <span>Discount:</span>
      <span class="bold">-₹${billData.discount}</span>
    </div>
    ` : ''}
    ${billData.deliveryCharge && billData.deliveryCharge > 0 ? `
    <div class="total-line">
      <span>Delivery:</span>
      <span class="bold">₹${billData.deliveryCharge}</span>
    </div>
    ` : ''}
  </div>
  
  <!-- GRAND TOTAL -->
  <div class="grand-total-box">TOTAL: ₹${billData.grandTotal}</div>
  
  <!-- PAYMENT BREAKDOWN (for partial payments) -->
  ${billData.paymentStatus === 'partial' || billData.paymentStatus === 'paid' || (billData.amountPaid && billData.amountPaid > 0) ? `
  <div style="border: 2px solid #000; padding: 3mm; margin: 2mm 0; font-family: 'Courier New', monospace;">
    <div style="font-size: 10pt; font-weight: bold; text-align: center; border-bottom: 1px dashed #000; padding-bottom: 1mm; margin-bottom: 2mm;">
      PAYMENT DETAILS
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10pt; margin-bottom: 1mm;">
      <span>Bill Total:</span>
      <span style="font-weight: bold;">₹${billData.grandTotal}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10pt; margin-bottom: 1mm; color: #000;">
      <span>Amount Paid:</span>
      <span style="font-weight: bold;">₹${billData.amountPaid || 0}</span>
    </div>
    ${billData.paymentHistory && billData.paymentHistory.length > 0 ? billData.paymentHistory.map((p: any) => `
    <div style="display: flex; justify-content: space-between; font-size: 8pt; padding-left: 4mm; color: #333;">
      <span>${new Date(p.date).toLocaleDateString('en-IN')}${p.note ? ' (' + p.note + ')' : ''}</span>
      <span>₹${p.amount}</span>
    </div>`).join('') : ''}
    <div style="border-top: 2px solid #000; margin-top: 2mm; padding-top: 2mm; display: flex; justify-content: space-between; font-size: 12pt; font-weight: bold;">
      <span>${(billData.amountDue || 0) <= 0 ? '✓ FULLY PAID' : 'BALANCE DUE:'}</span>
      <span>${(billData.amountDue || 0) <= 0 ? '' : '₹' + (billData.amountDue || (billData.grandTotal - (billData.amountPaid || 0)))}</span>
    </div>
  </div>
  ` : ''}
  
  <!-- PAYMENT SECTION -->
  ${qrAmount > 0 ? `
  <div class="payment-box">
    <div style="font-size: 12pt; font-weight: bold; margin-bottom: 2mm;">SCAN TO PAY</div>
    <div style="font-size: 16pt; font-weight: bold; margin-bottom: 2mm;">
      ₹${qrAmount}${amountDue > 0 && amountPaid > 0 ? ' (Due)' : ''}
    </div>
    <img src="${qrCodeUrl}" alt="UPI Payment QR Code" class="qr-code" 
         crossorigin="anonymous" loading="eager">
    <div style="font-size: 9pt; font-weight: bold; margin: 2mm 0;">
      PhonePe | GPay | Paytm | UPI
    </div>
    <div style="font-size: 7pt; font-family: monospace;">
      UPI: ${upiConfig.upiId || '6367493127@ybl'}
    </div>
  </div>
  ` : `
  <div class="payment-box">
    <div style="font-size: 18pt; font-weight: bold; margin: 3mm 0;">✅ FULLY PAID</div>
    <div style="font-size: 11pt; margin-bottom: 2mm;">Amount Paid: ₹${amountPaid}</div>
    <div style="font-size: 9pt; color: #333;">Thank you for the payment!</div>
  </div>
  `}
  
  <!-- FOOTER -->
  <div class="footer-box">
    <div style="font-size: 9pt; font-weight: bold; margin-bottom: 1mm;">
      ${billData.thankYouMessage || 'Thank you for choosing Gen-Z laundry!'}
    </div>
    <div style="font-size: 7pt;">
      Website: www.genzlaundry.com
    </div>
    <div style="font-size: 7pt; margin-top: 1mm;">
      Visit us again • Gen-Z Laundry & Dry Cleaners
    </div>
  </div>

</body>
</html>
  `;

  printWindow.document.write(professionalHTML);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 2000);
  };
};

export default printCleanThermalBill;