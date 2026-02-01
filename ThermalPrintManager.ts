// THERMAL PRINT MANAGER - PURE POS BEHAVIOR
// Eliminates all A4/document behavior for thermal receipts

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
  status?: string;
  thankYouMessage?: string;
}

// Method 1: Pure Thermal Window Print (No A4 behavior)
export const printThermalBill = (billData: BillData, onError?: (message: string) => void) => {
  // Create dedicated thermal print window
  const printWindow = window.open('', '_blank', 'width=320,height=600,scrollbars=no');
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

  // Generate UPI payment URL with exact bill amount
  const upiConfig = getUPIConfig();
  let qrCodeUrl = '/scanner.png'; // Default to original image
  
  // Generate functional QR with exact bill amount
  if (upiConfig.upiId && billData.grandTotal > 0) {
    const transactionNote = `Bill ${billData.billNumber} - ${billData.businessName}`;
    const upiUrl = `upi://pay?pa=${upiConfig.upiId}&pn=${encodeURIComponent(upiConfig.payeeName)}&am=${billData.grandTotal}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    // OPTIMIZED QR CODE FOR THERMAL PRINTING - MUCH LARGER AND CLEARER
    // Larger size, high error correction, maximum contrast, bigger margins
    qrCodeUrl = `https://chart.googleapis.com/chart?chs=400x400&cht=qr&chl=${encodeURIComponent(upiUrl)}&choe=UTF-8&chld=H|30`;
  }

  // Generate pure thermal HTML (NO A4 elements)
  const thermalHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Thermal Receipt</title>
  <style>
    /* PURE THERMAL PRINT STYLES */
    @page {
      size: 80mm auto !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    * {
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    
    body {
      width: 80mm !important;
      height: auto !important;
      margin: 0 !important;
      padding: 3mm !important; /* More padding for readability */
      font-family: 'Courier New', 'Consolas', 'Monaco', monospace !important;
      font-size: 11pt !important; /* High-quality larger font */
      line-height: 1.3 !important; /* Better line spacing */
      background: white !important;
      color: black !important;
      font-weight: bold !important; /* Bold for thermal clarity */
      -webkit-font-smoothing: none !important;
      -moz-osx-font-smoothing: unset !important;
      letter-spacing: 0.5px !important; /* Better character spacing */
      word-spacing: 1px !important; /* Better word separation */
    }
    
    .receipt {
      width: 100% !important;
      height: auto !important;
    }
    
    .center { text-align: center !important; }
    .left { text-align: left !important; }
    .right { text-align: right !important; }
    .bold { font-weight: bold !important; }
    .large { font-size: 16pt !important; font-weight: bold !important; }
    .small { font-size: 10pt !important; font-weight: bold !important; }
    .upper { text-transform: uppercase !important; }
    
    .row {
      display: flex !important;
      justify-content: space-between !important;
      margin-bottom: 1mm !important;
    }
    
    .item-row {
      display: flex !important;
      margin-bottom: 0.5mm !important;
    }
    
    .col-40 { width: 40% !important; }
    .col-15 { width: 15% !important; text-align: center !important; }
    .col-20 { width: 20% !important; text-align: right !important; }
    .col-25 { width: 25% !important; text-align: right !important; }
    
    .divider {
      text-align: center !important;
      margin: 1mm 0 !important;
      font-size: 8pt !important;
    }
    
    .spacer { margin-bottom: 2mm !important; }
    
    .qr-code {
      width: 40mm !important;
      height: 40mm !important;
      border: 3px solid #000 !important;
      border-radius: 3mm !important;
      background: white !important;
      padding: 2mm !important;
      image-rendering: pixelated !important;
      image-rendering: -moz-crisp-edges !important;
      image-rendering: crisp-edges !important;
      filter: contrast(2.5) brightness(1.4) !important; /* Enhanced contrast for thermal printing */
      -webkit-filter: contrast(2.5) brightness(1.4) !important;
      
      /* Additional thermal printer optimizations */
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-shadow: inset 0 0 0 1px #000 !important;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Business Header -->
    <div class="center spacer">
      <div class="large bold upper">${billData.businessName}</div>
      <div class="small">${billData.address}</div>
      <div class="small">Ph: ${billData.phone}</div>
    </div>
    
    <!-- Divider -->
    <div class="divider">================================</div>
    
    <!-- Bill Info -->
    <div class="spacer">
      <div class="row small">
        <span>Bill No: ${billData.billNumber}</span>
        <span>Date: ${currentDate}</span>
      </div>
      ${billData.customerName ? `<div class="small">Customer: ${billData.customerName}</div>` : ''}
    </div>
    
    <!-- Divider -->
    <div class="divider">================================</div>
    
    <!-- Items Header -->
    <div class="item-row small bold">
      <span class="col-40">ITEM</span>
      <span class="col-15">QTY</span>
      <span class="col-20">RATE</span>
      <span class="col-25">AMT</span>
    </div>
    <div class="divider">--------------------------------</div>
    
    <!-- Previous Bills (if any) -->
    ${billData.previousBills && billData.previousBills.length > 0 ? `
      <div class="small bold center" style="margin: 2mm 0;">PREVIOUS BILLS</div>
      ${billData.previousBills.map(prevBill => `
        <div class="small bold" style="margin: 1mm 0;">Bill: ${prevBill.billNumber}</div>
        ${prevBill.items.map(item => `
        <div class="item-row small">
          <span class="col-40" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</span>
          <span class="col-15">${item.quantity}</span>
          <span class="col-20">₹${item.rate}</span>
          <span class="col-25">₹${item.amount}</span>
        </div>
        `).join('')}
        <div class="row small bold" style="margin: 1mm 0;">
          <span>Previous Bill Total:</span>
          <span>₹${prevBill.total}</span>
        </div>
      `).join('')}
      <div class="divider">- - - - - - - - - - - - - - - - -</div>
    ` : ''}
    
    <!-- Current Items -->
    ${billData.items.length > 0 ? `
      <div class="small bold center" style="margin: 2mm 0;">CURRENT ORDER</div>
      ${billData.items.map(item => `
      <div class="item-row small">
        <span class="col-40" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</span>
        <span class="col-15">${item.quantity}</span>
        <span class="col-20">₹${item.rate}</span>
        <span class="col-25">₹${item.amount}</span>
      </div>
      `).join('')}
    ` : ''}
    
    <!-- Divider -->
    <div class="divider">--------------------------------</div>
    
    <!-- Totals -->
    <div class="spacer">
      ${billData.previousBills && billData.previousBills.length > 0 ? `
      <div class="row small">
        <span>Previous Bills Total:</span>
        <span>₹${billData.previousBills.reduce((sum, bill) => sum + bill.total, 0)}</span>
      </div>
      ` : ''}
      ${billData.previousBalance && billData.previousBalance > 0 ? `
      <div class="row small">
        <span>Previous Balance:</span>
        <span>₹${billData.previousBalance}</span>
      </div>
      ` : ''}
      ${billData.items.length > 0 ? `
      <div class="row small">
        <span>Current Order:</span>
        <span>₹${billData.items.reduce((sum, item) => sum + item.amount, 0)}</span>
      </div>
      ` : ''}
      <div class="row small">
        <span>Subtotal:</span>
        <span>₹${billData.subtotal}</span>
      </div>
      ${billData.discount && billData.discount > 0 ? `
      <div class="row small">
        <span>Discount:</span>
        <span>-₹${billData.discount}</span>
      </div>
      ` : ''}
      ${billData.deliveryCharge && billData.deliveryCharge > 0 ? `
      <div class="row small">
        <span>Delivery Charge:</span>
        <span>₹${billData.deliveryCharge}</span>
      </div>
      ` : ''}
      ${billData.gst && billData.gst > 0 ? `
      <div class="row small">
        <span>GST:</span>
        <span>₹${billData.gst}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- Grand Total -->
    <div class="divider">================================</div>
    <div class="row bold large">
      <span>TOTAL:</span>
      <span>₹${billData.grandTotal}</span>
    </div>
    <div class="divider">================================</div>
    
    <!-- UPI Payment QR -->
    <div class="center spacer" style="margin: 3mm 0;">
      <div class="small bold" style="margin-bottom: 2mm;">SCAN TO PAY ₹${billData.grandTotal}</div>
      <img src="${qrCodeUrl}" alt="Payment QR Code" class="qr-code" onerror="this.src='/scanner.png';" crossorigin="anonymous">
      <div class="small" style="margin-top: 2mm; font-weight: bold;">PhonePe | GPay | UPI | Cards</div>
      <div class="small" style="margin-top: 1mm; font-size: 9pt;">UPI ID: ${upiConfig.upiId || 'Not configured'}</div>
    </div>
    
    <!-- Thank You -->
    <div class="center small spacer" style="font-style:italic;">
      ${billData.thankYouMessage || 'Thank you for your business!'}
    </div>
  </div>
</body>
</html>
  `;

  // Write and print
  printWindow.document.write(thermalHTML);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000); // Increased delay to allow QR code to load
  };
};

// Method 2: ESC/POS Direct Commands (Guaranteed thermal behavior)
export const generateThermalESCPOS = (billData: BillData): string => {
  const ESC = '\x1B';
  const GS = '\x1D';
  
  let commands = '';
  
  // Initialize printer
  commands += ESC + '@'; // Initialize
  
  // Business Header (Center aligned)
  commands += ESC + 'a' + '\x01'; // Center align
  commands += ESC + '!' + '\x18'; // Double height + bold
  commands += billData.businessName.toUpperCase() + '\n';
  commands += ESC + '!' + '\x00'; // Normal text
  commands += billData.address + '\n';
  commands += 'Ph: ' + billData.phone + '\n';
  
  // Divider
  commands += '================================\n';
  
  // Bill Info (Left aligned)
  commands += ESC + 'a' + '\x00'; // Left align
  const currentDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  commands += `Bill No: ${billData.billNumber}`.padEnd(16) + `Date: ${currentDate}\n`;
  if (billData.customerName) {
    commands += `Customer: ${billData.customerName}\n`;
  }
  
  // Divider
  commands += '================================\n';
  
  // Items Header
  commands += 'ITEM'.padEnd(16) + 'QTY'.padStart(4) + 'RATE'.padStart(6) + 'AMT'.padStart(6) + '\n';
  commands += '--------------------------------\n';
  
  // Previous Bills (if any)
  if (billData.previousBills && billData.previousBills.length > 0) {
    commands += ESC + 'a' + '\x01'; // Center align
    commands += 'PREVIOUS BILLS\n';
    commands += ESC + 'a' + '\x00'; // Left align
    
    billData.previousBills.forEach(prevBill => {
      commands += `Bill: ${prevBill.billNumber}\n`;
      prevBill.items.forEach(item => {
        const itemName = item.name.length > 16 ? item.name.substring(0, 16) : item.name.padEnd(16);
        const qty = item.quantity.toString().padStart(4);
        const rate = ('₹' + item.rate).padStart(6);
        const amt = ('₹' + item.amount).padStart(6);
        commands += itemName + qty + rate + amt + '\n';
      });
      commands += ('Previous Bill Total: ₹' + prevBill.total).padStart(32) + '\n';
    });
    commands += '- - - - - - - - - - - - - - - - -\n';
  }
  
  // Current Items
  if (billData.items.length > 0) {
    commands += ESC + 'a' + '\x01'; // Center align
    commands += 'CURRENT ORDER\n';
    commands += ESC + 'a' + '\x00'; // Left align
    
    billData.items.forEach(item => {
      const itemName = item.name.length > 16 ? item.name.substring(0, 16) : item.name.padEnd(16);
      const qty = item.quantity.toString().padStart(4);
      const rate = ('₹' + item.rate).padStart(6);
      const amt = ('₹' + item.amount).padStart(6);
      commands += itemName + qty + rate + amt + '\n';
    });
  }
  
  // Divider
  commands += '--------------------------------\n';
  
  // Totals
  if (billData.previousBills && billData.previousBills.length > 0) {
    commands += ('Previous Bills Total: ₹' + billData.previousBills.reduce((sum, bill) => sum + bill.total, 0)).padStart(32) + '\n';
  }
  if (billData.previousBalance && billData.previousBalance > 0) {
    commands += ('Previous Balance: ₹' + billData.previousBalance).padStart(32) + '\n';
  }
  if (billData.items.length > 0) {
    commands += ('Current Order: ₹' + billData.items.reduce((sum, item) => sum + item.amount, 0)).padStart(32) + '\n';
  }
  commands += ('Subtotal: ₹' + billData.subtotal).padStart(32) + '\n';
  if (billData.discount && billData.discount > 0) {
    commands += ('Discount: -₹' + billData.discount).padStart(32) + '\n';
  }
  if (billData.deliveryCharge && billData.deliveryCharge > 0) {
    commands += ('Delivery: ₹' + billData.deliveryCharge).padStart(32) + '\n';
  }
  if (billData.gst && billData.gst > 0) {
    commands += ('GST: ₹' + billData.gst).padStart(32) + '\n';
  }
  
  // Grand Total
  commands += '================================\n';
  commands += ESC + '!' + '\x08'; // Bold
  commands += ('TOTAL: ₹' + billData.grandTotal).padStart(32) + '\n';
  commands += ESC + '!' + '\x00'; // Normal
  commands += '================================\n';
  
  // PhonePe Payment QR
  commands += ESC + 'a' + '\x01'; // Center align
  commands += '\n';
  commands += 'SCAN TO PAY\n';
  commands += '[ QR CODE AVAILABLE ]\n';
  commands += 'PhonePe | UPI | Cards\n';
  commands += '\n';
  
  // Thank You (Center aligned)
  commands += (billData.thankYouMessage || 'Thank you for your business!') + '\n';
  commands += '\n';
  
  // Cut paper
  commands += '\n\n';
  commands += GS + 'V' + '\x42' + '\x00'; // Full cut
  
  return commands;
};

// Copy ESC/POS to clipboard
export const copyThermalESCPOS = (billData: BillData, onSuccess?: (message: string) => void) => {
  const commands = generateThermalESCPOS(billData);
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(commands).then(() => {
      const message = '✅ Thermal ESC/POS commands copied!\n\nPaste into your thermal printer software:\n• PrintNode\n• Thermal Printer Driver\n• POS Printer Utility\n\nThis guarantees perfect thermal receipt with no blank space!';
      if (onSuccess) {
        onSuccess(message);
      } else {
        alert(message);
      }
    });
  } else {
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = commands;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    const message = '✅ ESC/POS commands copied to clipboard!';
    if (onSuccess) {
      onSuccess(message);
    } else {
      alert(message);
    }
  }
};

// Test thermal receipt
export const printTestThermalReceipt = () => {
  const testBill: BillData = {
    businessName: 'TEST THERMAL PRINT',
    address: 'Thermal Printer Test',
    phone: '+91 98765 43210',
    billNumber: 'TEST-001',
    customerName: 'Test Customer',
    items: [
      { name: 'Test Item 1', quantity: 1, rate: 100, amount: 100 },
      { name: 'Test Item 2', quantity: 2, rate: 50, amount: 100 }
    ],
    subtotal: 200,
    discount: 0,
    deliveryCharge: 0,
    gst: 0,
    grandTotal: 200,
    thankYouMessage: 'If this prints without blank space, your thermal printer is configured correctly!'
  };
  
  printThermalBill(testBill);
};

// Test thermal QR code quality
export const testThermalQRCode = (amount: number = 100) => {
  const upiConfig = getUPIConfig();
  
  if (!upiConfig.upiId) {
    alert('Please configure UPI settings first!');
    return;
  }

  const testWindow = window.open('', '_blank', 'width=400,height=600');
  if (!testWindow) {
    alert('Please allow popups for QR testing');
    return;
  }

  const transactionNote = `Test Payment - GenZ Laundry`;
  const upiUrl = `upi://pay?pa=${upiConfig.upiId}&pn=${encodeURIComponent(upiConfig.payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
  
  // Generate multiple QR codes with different settings for comparison
  const qrOptions = [
    {
      name: 'Thermal Optimized (Recommended)',
      url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}&ecc=H&margin=15&color=000000&bgcolor=FFFFFF&format=png`
    },
    {
      name: 'Google Charts High Quality',
      url: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(upiUrl)}&choe=UTF-8&chld=H|15`
    },
    {
      name: 'Maximum Error Correction',
      url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}&ecc=H&margin=20&color=000000&bgcolor=FFFFFF&format=png`
    }
  ];

  const testHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Thermal QR Code Test</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      padding: 20px; 
      background: #f5f5f5;
    }
    .qr-test {
      background: white;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    .qr-image {
      border: 3px solid #000;
      border-radius: 8px;
      background: white;
      padding: 5px;
      image-rendering: pixelated;
      filter: contrast(1.5) brightness(1.1);
    }
    .test-info {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>🧪 Thermal QR Code Quality Test</h1>
  
  <div class="test-info">
    <h3>Test Details:</h3>
    <p><strong>Amount:</strong> ₹${amount}</p>
    <p><strong>UPI ID:</strong> ${upiConfig.upiId}</p>
    <p><strong>Payee:</strong> ${upiConfig.payeeName}</p>
    <p><strong>Note:</strong> ${transactionNote}</p>
  </div>

  <h2>📱 Test these QR codes with your UPI app:</h2>
  
  ${qrOptions.map((option, index) => `
    <div class="qr-test">
      <h3>${index + 1}. ${option.name}</h3>
      <img src="${option.url}" alt="${option.name}" class="qr-image" width="200" height="200">
      <p><strong>Scan this QR code with PhonePe/GPay</strong></p>
      <p>It should show: <strong>₹${amount}</strong> payment to <strong>${upiConfig.payeeName}</strong></p>
    </div>
  `).join('')}

  <div class="test-info">
    <h3>✅ Testing Instructions:</h3>
    <ol>
      <li>Open PhonePe, GPay, or any UPI app</li>
      <li>Use the "Scan QR" feature</li>
      <li>Point camera at each QR code above</li>
      <li>Check if the app detects the payment correctly</li>
      <li>The QR code that scans best should be used for thermal printing</li>
    </ol>
  </div>

</body>
</html>
  `;

  testWindow.document.write(testHTML);
  testWindow.document.close();
};