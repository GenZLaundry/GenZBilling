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
  deliveryDate?: string;
  serviceType?: string;
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
    @page { margin: 0 !important; }
    * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
    
    body {
      width: 80mm !important; padding: 0 4mm 4mm 4mm !important;
      font-family: Arial, Helvetica, "Liberation Sans", sans-serif !important;
      font-size: 10pt !important;
      line-height: 1.4 !important; background: #ffffff !important; color: #000000 !important;
      font-weight: 600 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased !important;
    }
    
    @media print {
      @page {
        margin: 0 !important;
      }
      body {
        margin: 0 !important;
        padding-top: 0 !important;
      }
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

export const printCleanThermalOrderReceipt = (billData: BillData, onError?: (message: string) => void) => {
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
    ? new Date(billData.billDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
  
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const formattedDeliveryDate = billData.deliveryDate
    ? billData.deliveryDate.split('-').reverse().join('/')
    : currentDate;

  const serviceType = billData.serviceType || 'Wash & Iron';
  const totalItems = billData.items.reduce((sum, item) => sum + item.quantity, 0);

  // Generate QR code pointing to online status tracker
  const trackUrl = `https://genzlaundry.com/track?id=${billData.billNumber}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackUrl)}&ecc=M&margin=0&color=000000&bgcolor=FFFFFF`;

  const orderReceiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Receipt</title>
  <style>
    @page { margin: 0 !important; }
    * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
    
    body {
      width: 80mm !important; padding: 0 4mm 4mm 4mm !important;
      font-family: Arial, Helvetica, "Liberation Sans", sans-serif !important;
      font-size: 10pt !important;
      line-height: 1.4 !important; background: #ffffff !important; color: #000000 !important;
      font-weight: 600 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased !important;
    }
    
    @media print {
      @page {
        margin: 0 !important;
      }
      body {
        margin: 0 !important;
        padding-top: 0 !important;
      }
    }
    
    .center { text-align: center !important; }
    .bold { font-weight: 700 !important; }
    .extra-bold { font-weight: 800 !important; }
    .black-bold { font-weight: 900 !important; }
    
    /* HEADER */
    .header {
      text-align: center !important;
      padding: 0 0 1mm 0 !important;
      margin-bottom: 1.5mm !important;
    }
    
    .business-name {
      font-size: 18pt !important;
      font-weight: 900 !important;
      letter-spacing: 1.5px !important;
      margin-bottom: 1px !important;
      text-transform: uppercase !important;
    }
    
    .business-subtitle {
      font-size: 10pt !important;
      font-weight: 800 !important;
      letter-spacing: 0.5px !important;
      margin-bottom: 1.5mm !important;
      text-transform: uppercase !important;
    }
  </style>
</head>
<body>

  <!-- BRAND HEADER -->
  <div class="header">
    <!-- SVG Coat Hanger + Smiley Logo -->
    <svg width="55" height="55" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto 2mm auto;">
      <!-- Hanger hook -->
      <path d="M50,28 C50,15 62,15 62,23 C62,30 50,30 50,38" stroke="black" stroke-width="4.5" stroke-linecap="round" fill="none" />
      <!-- Smiley Face Circle -->
      <circle cx="50" cy="62" r="22" stroke="black" stroke-width="4.5" fill="white" />
      <!-- Hanger Shoulders overlapping circle top -->
      <path d="M22,46 C32,38 42,38 50,38 C58,38 68,38 78,46" stroke="black" stroke-width="4.5" stroke-linecap="round" fill="none" />
      <!-- Eyes -->
      <circle cx="42" cy="58" r="3.5" fill="black" />
      <circle cx="58" cy="58" r="3.5" fill="black" />
      <!-- Mouth -->
      <path d="M42,67 Q50,74 58,67" stroke="black" stroke-width="3" stroke-linecap="round" fill="none" />
    </svg>
    <div class="business-name">GEN-Z</div>
    <div class="business-subtitle">LAUNDRY & DRY CLEANERS</div>
  </div>
  
  <!-- DIVIDER -->
  <div style="border-bottom: 1.2px dashed #000; margin-bottom: 1.5mm;"></div>
  
  <!-- DOCUMENT TITLE -->
  <div class="center bold extra-bold" style="font-size: 13pt; letter-spacing: 1.5px; margin-bottom: 1.5mm; text-transform: uppercase;">
    ORDER RECEIPT
  </div>
  
  <!-- INFO GRID -->
  <table style="width: 100%; border-collapse: collapse; margin: 1mm 0 2mm 0;">
    <tr>
      <td style="font-size: 9.5pt; font-weight: 700; width: 52%; padding: 0.8mm 0; text-align: left; vertical-align: middle;">
        Order ID&nbsp;&nbsp;: <span class="black-bold" style="font-size: 10.5pt;">${billData.billNumber}</span>
      </td>
      <td style="font-size: 9.5pt; font-weight: 700; width: 48%; padding: 0.8mm 0; text-align: right; vertical-align: middle;">
        Date : ${currentDate}
      </td>
    </tr>
    <tr>
      <td style="font-size: 9.5pt; font-weight: 700; padding: 0.8mm 0; text-align: left; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 42mm;">
        Customer : ${billData.customerName || 'Walk-in'}
      </td>
      <td style="font-size: 9.5pt; font-weight: 700; padding: 0.8mm 0; text-align: right; vertical-align: middle;">
        Time : ${currentTime}
      </td>
    </tr>
    <tr>
      <td colspan="2" style="font-size: 9.5pt; font-weight: 700; padding: 0.8mm 0; text-align: left; vertical-align: middle;">
        Mobile&nbsp;&nbsp;&nbsp;: ${billData.customerPhone || 'N/A'}
      </td>
    </tr>
  </table>
  
  <!-- DIVIDER -->
  <div style="border-bottom: 1.2px dashed #000; margin-bottom: 1.5mm;"></div>
  
  <!-- ITEMS TABLE -->
  <div style="display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 9.5pt; font-weight: 900; border-bottom: 1.5px solid #000; letter-spacing: 0.5px; text-transform: uppercase;">
    <span>Item</span>
    <span>Qty</span>
  </div>
  
  <div style="margin-bottom: 2mm;">
    ${billData.items.map(item => {
      // Strip details inside parenthesis if any, or print normal item name
      const nameOnly = item.name.split('(')[0].trim();
      return `
    <div style="display: flex; justify-content: space-between; padding: 1.8mm 0; font-size: 10pt; font-weight: 700; border-bottom: 1px dotted #000; align-items: center;">
      <span style="text-transform: capitalize;">${nameOnly}</span>
      <span style="font-family: monospace; font-size: 11pt; font-weight: 800;">${item.quantity.toString().padStart(2, '0')}</span>
    </div>`;
    }).join('')}
  </div>
  
  <!-- TOTAL ITEMS -->
  <div style="display: flex; justify-content: space-between; padding: 2.5mm 0; font-size: 11pt; font-weight: 900; border-top: 1.2px dashed #000; border-bottom: 1.2px dashed #000; margin-top: 1mm; margin-bottom: 2mm; align-items: center;">
    <span>Total Items</span>
    <span style="font-family: monospace; font-size: 12pt;">${totalItems.toString().padStart(2, '0')}</span>
  </div>
  
  <!-- ORDER STATUS/PICKUP DETAILS -->
  <div style="padding: 1.5mm 0; font-size: 10pt; font-weight: 700; line-height: 1.5; margin-bottom: 2mm;">
    <div>Service Type&nbsp;&nbsp;: <span style="font-weight: 900; text-transform: capitalize;">${serviceType}</span></div>
    <div>Delivery Date : <span style="font-weight: 900;">${formattedDeliveryDate}</span></div>
  </div>
  
  <!-- QR CODE BLOCK -->
  <div style="display: flex; align-items: center; gap: 4mm; padding: 3mm 0; border-top: 1.2px dashed #000; border-bottom: 1.2px dashed #000; margin: 1mm 0 3mm 0;">
    <img src="${qrCodeUrl}" style="width: 22mm; height: 22mm; border: 1px solid #000; padding: 1px; display: block; image-rendering: pixelated;" />
    <div style="font-size: 8.5pt; font-weight: 800; line-height: 1.4; text-align: left; color: #000;">
      Scan QR for order updates<br>
      Please keep this receipt<br>
      for collection.
    </div>
  </div>
  
  <!-- SIGNATURES -->
  <div style="display: flex; justify-content: space-between; margin-top: 5mm; padding-bottom: 4mm; border-bottom: 1.2px dashed #000; margin-bottom: 2.5mm;">
    <div style="text-align: center; width: 45%;">
      <div style="font-size: 9pt; font-weight: 800; margin-bottom: 9mm;">Received By</div>
      <div style="border-top: 1.2px solid #000; width: 100%;"></div>
    </div>
    <div style="text-align: center; width: 45%;">
      <div style="font-size: 9pt; font-weight: 800; margin-bottom: 9mm;">Customer Sign</div>
      <div style="border-top: 1.2px solid #000; width: 100%;"></div>
    </div>
  </div>
  
  <!-- FOOTER -->
  <div class="center bold extra-bold" style="padding-top: 1mm; font-size: 9.5pt; letter-spacing: 0.5px; text-transform: uppercase;">
    &#9829; Thank You! Visit Again
  </div>

</body>
</html>
  `;

  printWindow.document.write(orderReceiptHTML);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1500);
  };
};

export default printCleanThermalBill;