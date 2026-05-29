// THERMAL PRINT MANAGER - PURE POS BEHAVIOR
// Eliminates all A4/document behavior for thermal receipts

import { getUPIConfig } from './upiConfig';
import { printCleanThermalBill, BillData as CleanBillData } from './CleanThermalPrint';

export type BillData = CleanBillData;

// Method 1: Pure Thermal Window Print (Delegated to consolidated premium print)
export const printThermalBill = (billData: BillData, onError?: (message: string) => void) => {
  printCleanThermalBill(billData, onError);
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
        const kgMatch = item.name.match(/^(.+?)\s*\((\d+\.?\d*)\s*kg\s*@\s*(?:₹|Rs\.?|Rs)?\s*(\d+\.?\d*)\/kg\)$/i);
        let nameToPrint = item.name;
        let qtyToPrint = item.quantity.toString();
        let rateToPrint = '₹' + item.rate;
        if (kgMatch) {
          nameToPrint = kgMatch[1];
          qtyToPrint = kgMatch[2] + 'kg';
          rateToPrint = '₹' + kgMatch[3] + '/kg';
        }
        const itemName = nameToPrint.length > 16 ? nameToPrint.substring(0, 16) : nameToPrint.padEnd(16);
        const qty = qtyToPrint.padStart(4);
        const rate = rateToPrint.padStart(6);
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
      const kgMatch = item.name.match(/^(.+?)\s*\((\d+\.?\d*)\s*kg\s*@\s*(?:₹|Rs\.?|Rs)?\s*(\d+\.?\d*)\/kg\)$/i);
      let nameToPrint = item.name;
      let qtyToPrint = item.quantity.toString();
      let rateToPrint = '₹' + item.rate;
      if (kgMatch) {
        nameToPrint = kgMatch[1];
        qtyToPrint = kgMatch[2] + 'kg';
        rateToPrint = '₹' + kgMatch[3] + '/kg';
      }
      const itemName = nameToPrint.length > 16 ? nameToPrint.substring(0, 16) : nameToPrint.padEnd(16);
      const qty = qtyToPrint.padStart(4);
      const rate = rateToPrint.padStart(6);
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
    commands += ('Previous Due: ₹' + billData.previousBalance).padStart(32) + '\n';
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
  commands += ESC + 'a' + '\x01'; // Center align
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