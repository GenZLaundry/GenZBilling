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
  printLogo?: boolean;
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

  // Determine if logo should be printed
  let printLogo = true;
  if (billData.printLogo !== undefined) {
    printLogo = billData.printLogo;
  } else {
    try {
      const savedPrefs = localStorage.getItem('genz_system_prefs');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.printLogo !== undefined) {
          printLogo = prefs.printLogo;
        }
      }
    } catch (e) {
      console.warn('Failed to load printLogo preference from localStorage:', e);
    }
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
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      font-size: 8.5pt !important;
      line-height: 1.4 !important; background: #ffffff !important; color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .center { text-align: center !important; }
    .left { text-align: left !important; }
    .right { text-align: right !important; }
    .bold { font-weight: 700 !important; }
    .normal { font-weight: normal !important; }
    
    /* HEADER */
    .header {
      text-align: center !important;
      padding: 0 0 3mm 0 !important;
      margin-bottom: 2mm !important;
    }
    
    .logo-container {
      margin-bottom: 3mm !important;
      text-align: center !important;
    }
    
    .logo-img {
      max-width: 34mm !important;
      height: auto !important;
      display: block !important;
      margin: 0 auto !important;
      filter: grayscale(100%) contrast(1.8) brightness(1.05) !important;
      -webkit-filter: grayscale(100%) contrast(1.8) brightness(1.05) !important;
    }
    
    .business-name {
      font-size: 15pt !important;
      font-weight: 800 !important;
      letter-spacing: 1px !important;
      margin-bottom: 1mm !important;
      text-transform: uppercase !important;
    }
    
    .business-subtitle {
      font-size: 9pt !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
      margin-bottom: 2mm !important;
      text-transform: uppercase !important;
    }
    
    .business-info {
      font-size: 8pt !important;
      line-height: 1.4 !important;
      color: #000000 !important;
      font-weight: 500 !important;
    }
    
    /* BILL INFO */
    .bill-info-box {
      border-top: 1px dashed #000000 !important;
      border-bottom: 1px dashed #000000 !important;
      padding: 2.5mm 0 !important;
      margin: 2mm 0 !important;
    }
    
    .bill-info-row {
      display: flex !important;
      justify-content: space-between !important;
      padding: 0.5mm 0 !important;
      font-size: 8.5pt !important;
    }
    
    /* SECTION HEADERS */
    .section-header {
      padding: 2mm 0 !important;
      text-align: center !important;
      font-size: 9.5pt !important;
      font-weight: 700 !important;
      margin: 3mm 0 1.5mm 0 !important;
      letter-spacing: 2px !important;
      border-top: 1px solid #000000 !important;
      border-bottom: 1px solid #000000 !important;
      text-transform: uppercase !important;
    }
    
    /* ORDER BOX TILES */
    .order-category-title {
      font-size: 8.5pt !important;
      font-weight: 700 !important;
      padding: 1.5mm 0 !important;
      text-align: center !important;
      margin-bottom: 2mm !important;
      border-bottom: 1px dashed #000000 !important;
    }
    
    /* ITEM TABLE */
    .item-table-header {
      display: flex !important;
      justify-content: space-between !important;
      padding: 1.5mm 0 !important;
      font-size: 8pt !important;
      font-weight: 700 !important;
      border-bottom: 1px solid #000000 !important;
      margin-bottom: 1mm !important;
    }
    
    .item-table-row {
      display: flex !important;
      justify-content: space-between !important;
      padding: 1.5mm 0 !important;
      font-size: 8pt !important;
      border-bottom: 1px dotted #e0e0e0 !important;
      align-items: flex-start !important;
    }
    
    .item-table-row:last-child {
      border-bottom: none !important;
    }
    
    .item-name { width: 50% !important; font-weight: 500 !important; }
    .item-qty { width: 15% !important; text-align: center !important; font-weight: 500 !important; }
    .item-price { width: 17.5% !important; text-align: right !important; font-weight: 500 !important; }
    .item-total { width: 17.5% !important; text-align: right !important; font-weight: 600 !important; }
    
    /* TOTALS SECTION */
    .totals-box {
      border-top: 1px dashed #000000 !important;
      padding: 2.5mm 0 1mm 0 !important;
      margin-top: 3mm !important;
    }
    
    .total-line {
      display: flex !important;
      justify-content: space-between !important;
      padding: 0.5mm 0 !important;
      font-size: 8.5pt !important;
    }
    
    .grand-total-box {
      padding: 3mm 0 !important;
      text-align: center !important;
      margin: 2mm 0 !important;
      font-size: 14pt !important;
      font-weight: 800 !important;
      letter-spacing: 1px !important;
      border-top: 1px solid #000000 !important;
      border-bottom: 1px solid #000000 !important;
    }
    
    /* PAYMENT SECTION */
    .payment-box {
      border: 1px dashed #000000 !important;
      padding: 4mm 2mm !important;
      text-align: center !important;
      margin: 3mm 0 !important;
      border-radius: 4px !important;
    }
    
    .qr-code {
      width: 35mm !important;
      height: 35mm !important;
      border: 1px solid #000000 !important;
      background: #ffffff !important;
      padding: 1mm !important;
      margin: 2.5mm auto !important;
      display: block !important;
      image-rendering: pixelated !important;
      filter: contrast(1.8) brightness(1.0) !important;
    }
    
    /* FOOTER */
    .footer-box {
      border-top: 1px dashed #000000 !important;
      padding-top: 3mm !important;
      margin-top: 4mm !important;
      text-align: center !important;
      font-size: 7.5pt !important;
      line-height: 1.4 !important;
      color: #555555 !important;
    }
  </style>
</head>
<body>

  <!-- PROFESSIONAL HEADER -->
  <div class="header">
    ${printLogo ? `
    <div class="logo-container">
      <img src="/bill_logo.jpg" alt="Logo" class="logo-img" onerror="this.style.display='none';">
    </div>
    ` : `
    <div class="business-name">GEN-Z</div>
    <div class="business-subtitle">LAUNDRY & DRY CLEANERS</div>
    `}
    <div class="business-info">
      ${billData.address}<br>
      📞 ${billData.phone}
    </div>
  </div>
  
  <!-- BILL INFORMATION -->
  <div class="bill-info-box">
    ${billData.customerName ? `
    <div class="bill-info-row">
      <span>Customer Name:</span>
      <span class="bold">${billData.customerName}</span>
    </div>
    ` : ''}
    <div class="bill-info-row">
      <span>Bill No:</span>
      <span class="bold">${billData.billNumber}</span>
    </div>
    <div class="bill-info-row">
      <span>Date & Time:</span>
      <span>${currentDate} • ${currentTime}</span>
    </div>
  </div>
  
  <!-- ORDER DETAILS SECTION -->
  <div class="section-header">ORDER DETAILS</div>
  
  <!-- CURRENT ORDER ITEMS -->
  ${billData.items.length > 0 ? `
  <div style="margin-bottom: 3mm;">
    <div class="order-category-title">
      🛍️ CURRENT ORDER &mdash; ${billData.items.reduce((sum, item) => sum + item.quantity, 0)} ITEMS
    </div>
    
    <div class="item-table-header">
      <div class="item-name">ITEM</div>
      <div class="item-qty">QTY</div>
      <div class="item-price">PRICE</div>
      <div class="item-total">TOTAL</div>
    </div>
    
    ${billData.items.map(item => {
      const kgMatch = item.name.match(/^(.+?)\s*\((\d+\.?\d*)\s*kg\s*@\s*(?:₹|Rs\.?|Rs)?\s*(\d+\.?\d*)\/kg\)$/i);
      if (kgMatch) {
        const itemName = kgMatch[1];
        const kg = kgMatch[2];
        const ratePerKg = kgMatch[3];
        return `
    <div class="item-table-row">
      <div class="item-name">${itemName}</div>
      <div class="item-qty">${kg}kg</div>
      <div class="item-price">₹${ratePerKg}/kg</div>
      <div class="item-total">₹${item.amount}</div>
    </div>`;
      }
      return `
    <div class="item-table-row">
      <div class="item-name">${item.name}</div>
      <div class="item-qty">${item.quantity}</div>
      <div class="item-price">₹${item.rate}</div>
      <div class="item-total">₹${item.amount}</div>
    </div>`;
    }).join('')}
  </div>
  ` : ''}

  <!-- PREVIOUS BILLS -->
  ${billData.previousBills && billData.previousBills.length > 0 ? `
  <div style="margin-bottom: 3mm;">
    <div class="order-category-title">
      📋 PREVIOUS BILLS &mdash; ${billData.previousBills.length} RECORD(S)
    </div>
    ${billData.previousBills.map(prevBill => `
    <div style="margin-bottom: 3mm; border-bottom: 1px dashed #e0e0e0; padding-bottom: 2mm;">
      <div style="font-size: 8pt; font-weight: bold; margin-bottom: 1.5mm;">Bill: ${prevBill.billNumber}</div>
      
      <div class="item-table-header">
        <div class="item-name">ITEM</div>
        <div class="item-qty">QTY</div>
        <div class="item-price">PRICE</div>
        <div class="item-total">TOTAL</div>
      </div>
      
      ${prevBill.items.map(item => {
        const kgMatch = item.name.match(/^(.+?)\s*\((\d+\.?\d*)\s*kg\s*@\s*(?:₹|Rs\.?|Rs)?\s*(\d+\.?\d*)\/kg\)$/i);
        if (kgMatch) {
          const itemName = kgMatch[1];
          const kg = kgMatch[2];
          const ratePerKg = kgMatch[3];
          return `
      <div class="item-table-row">
        <div class="item-name">${itemName}</div>
        <div class="item-qty">${kg}kg</div>
        <div class="item-price">₹${ratePerKg}/kg</div>
        <div class="item-total">₹${item.amount}</div>
      </div>`;
        }
        return `
      <div class="item-table-row">
        <div class="item-name">${item.name}</div>
        <div class="item-qty">${item.quantity}</div>
        <div class="item-price">₹${item.rate}</div>
        <div class="item-total">₹${item.amount}</div>
      </div>`;
      }).join('')}
      
      <div style="text-align: right; font-weight: bold; font-size: 8.5pt; margin-top: 1.5mm; border-top: 1px dashed #000000; padding-top: 1mm;">
        Previous Total: ₹${prevBill.total}
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
  <div style="border: 1px dashed #000000; padding: 3mm; margin: 3mm 0; border-radius: 4px;">
    <div style="font-size: 9pt; font-weight: bold; text-align: center; border-bottom: 1px dotted #000; padding-bottom: 1.5mm; margin-bottom: 2.5mm; letter-spacing: 1px;">
      PAYMENT DETAILS
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
      <span>Bill Total:</span>
      <span class="bold">₹${billData.grandTotal}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
      <span>Amount Paid:</span>
      <span class="bold">₹${billData.amountPaid || 0}</span>
    </div>
    ${billData.paymentHistory && billData.paymentHistory.length > 0 ? billData.paymentHistory.map((p: any) => `
    <div style="display: flex; justify-content: space-between; font-size: 7.5pt; padding-left: 3mm; color: #555555;">
      <span>&bull; ${new Date(p.date).toLocaleDateString('en-IN')}${p.note ? ' (' + p.note + ')' : ''}</span>
      <span>₹${p.amount}</span>
    </div>`).join('') : ''}
    <div style="border-top: 1px dashed #000000; margin-top: 2.5mm; padding-top: 2.5mm; display: flex; justify-content: space-between; font-size: 11pt; font-weight: 800;">
      <span>BALANCE DUE:</span>
      <span>₹${billData.amountDue !== undefined && billData.amountDue !== null ? billData.amountDue : (billData.grandTotal - (billData.amountPaid || 0))}</span>
    </div>
  </div>
  ` : ''}
  
  <!-- PAYMENT SECTION -->
  ${qrAmount > 0 ? `
  <div class="payment-box">
    <div style="font-size: 11pt; font-weight: bold; margin-bottom: 1mm; letter-spacing: 1px;">SCAN TO PAY</div>
    <div style="font-size: 15pt; font-weight: 800; margin-bottom: 2mm;">
      ₹${qrAmount}${amountDue > 0 && amountPaid > 0 ? ' (Due)' : ''}
    </div>
    <img src="${qrCodeUrl}" alt="UPI Payment QR Code" class="qr-code" 
         crossorigin="anonymous" loading="eager">
    <div style="font-size: 8.5pt; font-weight: bold; margin: 2mm 0;">
      PhonePe | GPay | Paytm | UPI
    </div>
    <div style="font-size: 7.5pt; font-family: monospace; color: #333333;">
      UPI: ${upiConfig.upiId || '6367493127@ybl'}
    </div>
  </div>
  ` : ''}
  
  <!-- FOOTER -->
  <div class="footer-box">
    <div style="font-size: 9pt; font-weight: bold; margin-bottom: 1.5mm; color: #000000;">
      ${billData.thankYouMessage || 'Thank you for choosing Gen-Z laundry!'}
    </div>
    <div style="font-size: 7.5pt; margin-bottom: 0.5mm;">
      Website: www.genzlaundry.com
    </div>
    <div style="font-size: 7.5pt;">
      Visit us again &bull; Gen-Z Laundry & Dry Cleaners
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