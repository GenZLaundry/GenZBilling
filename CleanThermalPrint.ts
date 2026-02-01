// PROFESSIONAL THERMAL RECEIPT - BUSINESS GRADE LAYOUT WITH DYNAMIC QR
import { getUPIConfig } from './upiConfig';

export interface BillData {
  businessName: string;
  address: string;
  phone: string;
  billNumber: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  grandTotal: number;
  thankYouMessage?: string;
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

  const currentDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Generate DYNAMIC UPI QR Code - WORKING SOLUTION
  const upiConfig = getUPIConfig();
  let qrCodeUrl = '';
  
  // ALWAYS generate dynamic QR code
  if (billData.grandTotal > 0) {
    const transactionNote = `Bill ${billData.billNumber}`;
    const upiId = upiConfig.upiId || '6367493127@ybl'; // Fallback to default
    const payeeName = upiConfig.payeeName || 'GenZ Laundry'; // Fallback to default
    
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${billData.grandTotal}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    
    // Use QR Server API - PROVEN TO WORK
    qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiUrl)}&ecc=H&margin=15&color=000000&bgcolor=FFFFFF&format=png`;
  } else {
    qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=upi://pay?pa=6367493127@ybl&pn=GenZ%20Laundry&am=1&cu=INR&tn=Test&ecc=H&margin=15&color=000000&bgcolor=FFFFFF&format=png`;
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
      width: 80mm !important; padding: 3mm !important;
      font-family: 'Arial', 'Helvetica', sans-serif !important; font-size: 10pt !important;
      line-height: 1.2 !important; background: white !important; color: black !important;
      font-weight: 600 !important;
    }
    
    .center { text-align: center !important; }
    .bold { font-weight: bold !important; }
    .xl { font-size: 16pt !important; font-weight: bold !important; }
    .large { font-size: 14pt !important; font-weight: bold !important; }
    .medium { font-size: 12pt !important; }
    .small { font-size: 9pt !important; }
    
    .header {
      text-align: center !important; padding: 2mm 0 !important;
      border-bottom: 2px solid #000 !important; margin-bottom: 2mm !important;
    }
    
    .business-name {
      font-size: 18pt !important; font-weight: bold !important;
      text-transform: uppercase !important; letter-spacing: 1px !important;
      margin-bottom: 1mm !important;
    }
    
    .bill-info {
      background: #f8f8f8 !important; padding: 2mm !important;
      border: 1px solid #ddd !important; border-radius: 1mm !important;
      margin-bottom: 2mm !important;
    }
    
    .bill-row {
      display: flex !important; justify-content: space-between !important;
      margin-bottom: 0.5mm !important; font-size: 9pt !important;
    }
    
    .items-header {
      background: #e8e8e8 !important; padding: 1mm !important;
      border: 1px solid #ccc !important; font-weight: bold !important;
      text-align: center !important; margin-bottom: 1mm !important;
      font-size: 9pt !important;
    }
    
    .item-row {
      display: flex !important; justify-content: space-between !important;
      padding: 0.5mm 0 !important; border-bottom: 1px dotted #ccc !important;
      align-items: center !important; font-size: 8pt !important;
    }
    
    .totals-section {
      background: #f5f5f5 !important; padding: 2mm !important;
      border: 1px solid #ddd !important; border-radius: 1mm !important;
      margin: 2mm 0 !important;
    }
    
    .total-row {
      display: flex !important; justify-content: space-between !important;
      margin-bottom: 0.5mm !important; font-size: 10pt !important;
    }
    
    .grand-total {
      background: #000 !important; color: #fff !important;
      padding: 2mm !important; border-radius: 2mm !important;
      text-align: center !important; margin: 2mm 0 !important;
      font-size: 16pt !important; font-weight: bold !important;
    }
    
    .payment-section {
      text-align: center !important; margin: 3mm 0 !important;
      padding: 3mm !important; border: 3px solid #000 !important;
      border-radius: 3mm !important;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%) !important;
    }
    
    .qr-code {
      width: 45mm !important; height: 45mm !important;
      border: 3px solid #000 !important; border-radius: 3mm !important;
      background: white !important; padding: 2mm !important;
      margin: 2mm auto !important; display: block !important;
      
      /* ULTRA HIGH QUALITY FOR THERMAL PRINTERS */
      image-rendering: pixelated !important;
      image-rendering: -moz-crisp-edges !important;
      image-rendering: crisp-edges !important;
      filter: contrast(5.0) brightness(1.8) saturate(0) !important;
      -webkit-filter: contrast(5.0) brightness(1.8) saturate(0) !important;
      -ms-interpolation-mode: nearest-neighbor !important;
      box-shadow: inset 0 0 0 2px #000, 0 2px 4px rgba(0,0,0,0.3) !important;
      
      /* Additional thermal printer optimizations */
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-transform: translateZ(0) !important;
      transform: translateZ(0) !important;
    }
    
    .footer {
      text-align: center !important; margin-top: 3mm !important;
      padding-top: 2mm !important; border-top: 1px solid #ddd !important;
    }
  </style>
</head>
<body>

  <!-- PROFESSIONAL HEADER -->
  <div class="header">
    <div class="business-name">${billData.businessName}</div>
    <div class="small">${billData.address}</div>
    <div class="small">📞 ${billData.phone}</div>
  </div>
  
  <!-- BILL INFORMATION -->
  <div class="bill-info">
    <div class="bill-row">
      <span class="bold">Bill No:</span>
      <span class="bold">${billData.billNumber}</span>
    </div>
    <div class="bill-row">
      <span>Date:</span>
      <span>${currentDate.split(',')[0]}</span>
    </div>
    <div class="bill-row">
      <span>Time:</span>
      <span>${currentDate.split(',')[1]?.trim()}</span>
    </div>
    ${billData.customerName ? `
    <div class="bill-row">
      <span>Customer:</span>
      <span class="bold">${billData.customerName}</span>
    </div>
    ` : ''}
  </div>
  
  <!-- ITEMS HEADER -->
  <div class="items-header">ORDER DETAILS</div>
  
  <!-- ITEMS LIST -->
  <div style="margin-bottom: 2mm;">
    ${billData.items.map(item => `
    <div class="item-row">
      <div style="width: 50%; font-weight: bold;">${item.name}</div>
      <div style="width: 50%; text-align: right;">
        ${item.quantity} × ₹${item.rate} = <strong>₹${item.amount}</strong>
      </div>
    </div>
    `).join('')}
  </div>
  
  <!-- TOTALS SECTION -->
  <div class="totals-section">
    <div class="total-row">
      <span>Subtotal:</span>
      <span class="bold">₹${billData.subtotal}</span>
    </div>
    ${billData.discount && billData.discount > 0 ? `
    <div class="total-row" style="color: #e74c3c;">
      <span>Discount:</span>
      <span class="bold">-₹${billData.discount}</span>
    </div>
    ` : ''}
    ${billData.deliveryCharge && billData.deliveryCharge > 0 ? `
    <div class="total-row">
      <span>Delivery:</span>
      <span class="bold">₹${billData.deliveryCharge}</span>
    </div>
    ` : ''}
  </div>
  
  <!-- GRAND TOTAL -->
  <div class="grand-total">💰 TOTAL: ₹${billData.grandTotal}</div>
  
  <!-- PAYMENT SECTION - ALWAYS SHOW DYNAMIC QR -->
  <div class="payment-section">
    <div class="large" style="margin-bottom: 2mm; color: #2c3e50;">💳 SCAN TO PAY</div>
    <div class="xl" style="color: #e74c3c; margin-bottom: 2mm;">₹${billData.grandTotal}</div>
    
    <img src="${qrCodeUrl}" alt="UPI Payment QR Code" class="qr-code" 
         crossorigin="anonymous"
         loading="eager">
    
    <div class="medium bold" style="color: #27ae60; margin: 1mm 0;">
      📱 PhonePe | GPay | Paytm | UPI
    </div>
    <div class="small" style="color: #7f8c8d; font-family: monospace;">
      UPI: ${upiConfig.upiId || '6367493127@ybl'}
    </div>
  </div>
  
  <!-- FOOTER -->
  <div class="footer">
    <div class="medium" style="font-style: italic; margin-bottom: 1mm; color: #2c3e50;">
      ${billData.thankYouMessage || '🙏 Thank you for choosing us!'}
    </div>
    <div class="small" style="color: #95a5a6;">
      Visit us again • ${billData.businessName}
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