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
  gst?: number;
  grandTotal: number;
  thankYouMessage?: string;
  termsAndConditions?: string;
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
      font-family: Arial, Helvetica, "Liberation Sans", sans-serif !important;
      font-size: 10pt !important;
      line-height: 1.4 !important; background: #ffffff !important; color: #000000 !important;
      font-weight: 600 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased !important;
    }
    
    .center { text-align: center !important; }
    .left { text-align: left !important; }
    .right { text-align: right !important; }
    .bold { font-weight: 700 !important; }
    .extra-bold { font-weight: 800 !important; }
    .black-bold { font-weight: 900 !important; }
    .normal { font-weight: normal !important; }
    
    /* HEADER */
    .header {
      text-align: center !important;
      padding: 0 0 2mm 0 !important;
      margin-bottom: 2mm !important;
    }
    
    .logo-container {
      margin-bottom: 2.5mm !important;
      text-align: center !important;
    }
    
    .logo-img {
      max-width: 42mm !important;
      height: auto !important;
      display: block !important;
      margin: 0 auto !important;
      filter: grayscale(100%) contrast(2.0) brightness(1.0) !important;
      -webkit-filter: grayscale(100%) contrast(2.0) brightness(1.0) !important;
    }
    
    .business-name {
      font-size: 15pt !important;
      font-weight: 900 !important;
      letter-spacing: 1.5px !important;
      margin-bottom: 1px !important;
      text-transform: uppercase !important;
    }
    
    .business-subtitle {
      font-size: 9.5pt !important;
      font-weight: 800 !important;
      letter-spacing: 0.5px !important;
      margin-bottom: 2mm !important;
      text-transform: uppercase !important;
    }
    
    .business-info {
      font-size: 9pt !important;
      line-height: 1.4 !important;
      color: #000000 !important;
      font-weight: 600 !important;
    }
    
    /* VALUED CUSTOMER CARD */
    .customer-card {
      border: 1.2px solid #000000 !important;
      border-radius: 6px !important;
      padding: 2.5mm 3mm !important;
      margin: 1.5mm 0 3mm 0 !important;
      text-align: center !important;
      background: #ffffff !important;
    }
    .customer-subtitle {
      font-size: 8pt !important;
      font-weight: 700 !important;
      letter-spacing: 1.5px !important;
      color: #000000 !important;
      text-transform: uppercase !important;
      margin-bottom: 0.8mm !important;
    }
    .customer-title {
      font-size: 12.5pt !important;
      font-weight: 900 !important;
      letter-spacing: 0.5px !important;
      color: #000000 !important;
      text-transform: uppercase !important;
    }
    
    /* BILL INFO TABLE */
    .info-table {
      width: 100% !important;
      border-collapse: collapse !important;
      border-top: 1.2px solid #000000 !important;
      border-bottom: 1.2px solid #000000 !important;
      padding: 2mm 0 !important;
      margin: 2mm 0 !important;
    }
    
    .info-table td {
      padding: 1mm 0 !important;
      font-size: 9.5pt !important;
    }
    
    .info-label {
      text-align: left !important;
      font-weight: 600 !important;
      color: #000000 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    
    .info-value {
      text-align: right !important;
      font-weight: 800 !important;
      color: #000000 !important;
    }
    
    /* SECTION HEADERS */
    .section-header {
      padding: 2mm 0 !important;
      text-align: center !important;
      font-size: 10.5pt !important;
      font-weight: 800 !important;
      margin: 3mm 0 2mm 0 !important;
      letter-spacing: 2px !important;
      border-top: 1.2px solid #000000 !important;
      border-bottom: 1.2px solid #000000 !important;
      text-transform: uppercase !important;
    }
    
    /* ORDER BOX TILES */
    .order-category-title {
      font-size: 10pt !important;
      font-weight: 800 !important;
      padding: 1.5mm 0 !important;
      text-align: center !important;
      margin-bottom: 2mm !important;
      border-bottom: 1px dashed #000000 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    
    /* ITEM TABLE */
    .item-table-header {
      display: flex !important;
      justify-content: space-between !important;
      padding: 1.5mm 0 !important;
      font-size: 9pt !important;
      font-weight: 800 !important;
      border-bottom: 1.2px solid #000000 !important;
      margin-bottom: 1mm !important;
      letter-spacing: 0.5px !important;
    }
    
    .item-table-row {
      display: flex !important;
      justify-content: space-between !important;
      padding: 1.8mm 0 !important;
      font-size: 9.5pt !important;
      border-bottom: 1px dotted #000000 !important;
      align-items: flex-start !important;
    }
    
    .item-table-row:last-child {
      border-bottom: none !important;
    }
    
    .item-name { width: 50% !important; font-weight: 700 !important; text-transform: uppercase !important; }
    .item-qty { width: 15% !important; text-align: center !important; font-weight: 700 !important; }
    .item-price { width: 17.5% !important; text-align: right !important; font-weight: 700 !important; }
    .item-total { width: 17.5% !important; text-align: right !important; font-weight: 800 !important; }
    
    /* TOTALS SECTION */
    .totals-box {
      border-top: 1.2px solid #000000 !important;
      padding: 2.5mm 0 1mm 0 !important;
      margin-top: 3mm !important;
    }
    
    .total-line {
      display: flex !important;
      justify-content: space-between !important;
      padding: 0.8mm 0 !important;
      font-size: 9.5pt !important;
      font-weight: 600 !important;
    }
    
    .grand-total-box {
      padding: 3mm 0 !important;
      text-align: center !important;
      margin: 2.5mm 0 !important;
      font-size: 14pt !important;
      font-weight: 900 !important;
      letter-spacing: 1px !important;
      border-top: 1.2px solid #000000 !important;
      border-bottom: 3.5px double #000000 !important;
    }
    
    /* PAYMENT SECTION */
    .payment-box {
      border: 1.2px solid #000000 !important;
      padding: 4mm 2mm !important;
      text-align: center !important;
      margin: 3mm 0 !important;
      border-radius: 8px !important;
    }
    
    .qr-code {
      width: 36mm !important;
      height: 36mm !important;
      border: 1.2px solid #000000 !important;
      border-radius: 4px !important;
      background: #ffffff !important;
      padding: 1mm !important;
      margin: 2.5mm auto !important;
      display: block !important;
      image-rendering: pixelated !important;
      image-rendering: -moz-crisp-edges !important;
      image-rendering: crisp-edges !important;
      filter: grayscale(100%) contrast(2.5) brightness(1.0) !important;
    }
    
    /* FOOTER */
    .footer-box {
      border-top: 1.2px solid #000000 !important;
      padding-top: 3mm !important;
      margin-top: 4mm !important;
      text-align: center !important;
      font-size: 8.5pt !important;
      line-height: 1.4 !important;
      color: #000000 !important;
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
      PH: ${billData.phone}
    </div>
  </div>
  
  <!-- BILL INFORMATION -->
  <table class="info-table">
    ${billData.customerName ? `
    <tr>
      <td class="info-label" style="white-space: nowrap;">CUSTOMER NAME:</td>
      <td class="info-value bold extra-bold" style="font-size: 11pt; text-transform: uppercase;">${billData.customerName}</td>
    </tr>
    ` : ''}
    ${billData.customerPhone ? `
    <tr>
      <td class="info-label" style="white-space: nowrap;">PHONE:</td>
      <td class="info-value bold">${billData.customerPhone}</td>
    </tr>
    ` : ''}
    <tr>
      <td class="info-label">BILL NUMBER:</td>
      <td class="info-value bold">${billData.billNumber}</td>
    </tr>
    <tr>
      <td class="info-label">DATE & TIME:</td>
      <td class="info-value">${currentDate} • ${currentTime}</td>
    </tr>
  </table>
  
  <!-- ORDER DETAILS SECTION -->
  <div class="section-header">ORDER DETAILS</div>
  
  <!-- CURRENT ORDER ITEMS -->
  ${billData.items.length > 0 ? `
  <div style="margin-bottom: 3mm;">
    <div class="order-category-title">
      CURRENT ORDER &mdash; ${billData.items.reduce((sum, item) => sum + item.quantity, 0)} ITEMS
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
      PREVIOUS BILLS &mdash; ${billData.previousBills.length} RECORD(S)
    </div>
    ${billData.previousBills.map(prevBill => `
    <div style="margin-bottom: 3mm; border-bottom: 1.2px solid #000000; padding-bottom: 2mm;">
      <div style="font-size: 9.5pt; font-weight: 800; margin-bottom: 1.5mm; text-transform: uppercase;">BILL: ${prevBill.billNumber}</div>
      
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
      
      <div style="text-align: right; font-weight: 800; font-size: 9.5pt; margin-top: 1.5mm; border-top: 1.2px solid #000000; padding-top: 1mm; text-transform: uppercase;">
        PREVIOUS TOTAL: ₹${prevBill.total}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}
  
  <!-- TOTALS SECTION -->
  <div class="totals-box">
    ${billData.previousBills && billData.previousBills.length > 0 ? `
    <div class="total-line">
      <span>PREVIOUS BILLS TOTAL:</span>
      <span class="bold">₹${billData.previousBills.reduce((sum, bill) => sum + bill.total, 0)}</span>
    </div>
    ` : ''}
    ${billData.previousBalance && billData.previousBalance > 0 ? `
    <div class="total-line">
      <span>PREVIOUS DUE:</span>
      <span class="bold">₹${billData.previousBalance}</span>
    </div>
    ` : ''}
    ${billData.items.length > 0 ? `
    <div class="total-line">
      <span>CURRENT ORDER:</span>
      <span class="bold">₹${billData.items.reduce((sum, item) => sum + item.amount, 0)}</span>
    </div>
    ` : ''}
    <div class="total-line">
      <span>SUBTOTAL:</span>
      <span class="bold">₹${billData.subtotal}</span>
    </div>
    ${billData.discount && billData.discount > 0 ? `
    <div class="total-line">
      <span>DISCOUNT:</span>
      <span class="bold">-₹${billData.discount}</span>
    </div>
    ` : ''}
    ${billData.deliveryCharge && billData.deliveryCharge > 0 ? `
    <div class="total-line">
      <span>DELIVERY:</span>
      <span class="bold">₹${billData.deliveryCharge}</span>
    </div>
    ` : ''}
    ${billData.gst && billData.gst > 0 ? `
    <div class="total-line">
      <span>GST:</span>
      <span class="bold">₹${billData.gst}</span>
    </div>
    ` : ''}
  </div>
  
  <!-- GRAND TOTAL -->
  <div class="grand-total-box">TOTAL: ₹${billData.grandTotal}</div>
  
  <!-- PAYMENT BREAKDOWN (for partial payments) -->
  ${billData.paymentStatus === 'partial' || billData.paymentStatus === 'paid' || (billData.amountPaid && billData.amountPaid > 0) ? `
  <div style="border: 1.2px solid #000000; padding: 3.5mm 3mm; margin: 3mm 0; border-radius: 8px;">
    <div style="font-size: 9.5pt; font-weight: 800; text-align: center; border-bottom: 1.2px solid #000; padding-bottom: 1.5mm; margin-bottom: 2.5mm; letter-spacing: 1px; text-transform: uppercase;">
      PAYMENT DETAILS
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 1.2mm; font-size: 9.5pt; font-weight: 600;">
      <span>BILL TOTAL:</span>
      <span class="bold">₹${billData.grandTotal}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 1.2mm; font-size: 9.5pt; font-weight: 600;">
      <span>AMOUNT PAID:</span>
      <span class="bold">₹${billData.amountPaid || 0}</span>
    </div>
    ${billData.paymentHistory && billData.paymentHistory.length > 0 ? billData.paymentHistory.map((p: any) => `
    <div style="display: flex; justify-content: space-between; font-size: 8.5pt; padding-left: 3mm; color: #000000; font-weight: 600;">
      <span>&bull; ${new Date(p.date).toLocaleDateString('en-IN')}${p.note ? ' (' + p.note + ')' : ''}</span>
      <span>₹${p.amount}</span>
    </div>`).join('') : ''}
    <div style="border-top: 1px dashed #000000; margin-top: 2.5mm; padding-top: 2.5mm; display: flex; justify-content: space-between; font-size: 11pt; font-weight: 900;">
      <span>BALANCE DUE:</span>
      <span>₹${billData.amountDue !== undefined && billData.amountDue !== null ? billData.amountDue : (billData.grandTotal - (billData.amountPaid || 0))}</span>
    </div>
  </div>
  ` : ''}
  
  <!-- PAYMENT SECTION -->
  ${qrAmount > 0 ? `
  <div class="payment-box">
    <div style="font-size: 10pt; font-weight: 800; margin-bottom: 1mm; letter-spacing: 1.5px; text-transform: uppercase;">SCAN TO PAY</div>
    <div style="font-size: 15pt; font-weight: 900; margin-bottom: 2mm;">
      ₹${qrAmount}${amountDue > 0 && amountPaid > 0 ? ' (Due)' : ''}
    </div>
    <img src="${qrCodeUrl}" alt="UPI Payment QR Code" class="qr-code" 
         crossorigin="anonymous" loading="eager">
    <div style="font-size: 8.5pt; font-weight: 800; margin: 2mm 0 1mm 0; letter-spacing: 0.5px; text-transform: uppercase;">
      PhonePe | GPay | Paytm | UPI
    </div>
    <div style="font-size: 8pt; font-family: monospace; color: #000000; font-weight: 700; word-break: break-all;">
      UPI: ${upiConfig.upiId || '6367493127@ybl'}
    </div>
  </div>
  ` : ''}
  
  <!-- FOOTER -->
  <div class="footer-box">
    <div style="font-size: 10pt; font-weight: 800; margin-bottom: 1.5mm; color: #000000; text-transform: uppercase;">
      ${billData.thankYouMessage || 'Thank you for choosing Gen-Z laundry!'}
    </div>
    <div style="font-size: 8.5pt; margin-bottom: 0.5mm; font-weight: 600;">
      Website: www.genzlaundry.com
    </div>
    <div style="font-size: 8.5pt; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
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