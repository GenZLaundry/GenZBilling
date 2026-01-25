// COMPLETE THERMAL PRINTING SERVER FOR GENZ LAUNDRY
// Direct USB/Serial printing with zero browser limitations

const express = require('express');
const cors = require('cors');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const SerialPort = require('serialport').SerialPort;
const escpos = require('escpos');
const moment = require('moment');
const QRCode = require('qrcode');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Printer configuration
let thermalPrinter = null;
let printerConnected = false;

// Initialize thermal printer
async function initializePrinter() {
  try {
    // Try USB connection first
    thermalPrinter = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'printer:SP-POS893UED',
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      lineCharacter: "=",
      breakLine: BreakLine.WORD,
      options: {
        timeout: 5000
      }
    });

    // Test connection
    const isConnected = await thermalPrinter.isPrinterConnected();
    if (isConnected) {
      printerConnected = true;
      console.log('✅ SP-POS893UED Connected via USB');
      return true;
    }

    // Try serial port connection
    const ports = await SerialPort.list();
    const printerPort = ports.find(port => 
      port.manufacturer && port.manufacturer.toLowerCase().includes('prolific') ||
      port.productId === '2303' || // Common USB-Serial adapter
      port.vendorId === '067b'
    );

    if (printerPort) {
      thermalPrinter = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: `serial:${printerPort.path}:9600`,
        characterSet: CharacterSet.PC852_LATIN2,
        removeSpecialCharacters: false,
        lineCharacter: "=",
        breakLine: BreakLine.WORD
      });

      const serialConnected = await thermalPrinter.isPrinterConnected();
      if (serialConnected) {
        printerConnected = true;
        console.log(`✅ SP-POS893UED Connected via Serial: ${printerPort.path}`);
        return true;
      }
    }

    console.log('❌ SP-POS893UED not found');
    return false;

  } catch (error) {
    console.error('❌ Printer initialization error:', error.message);
    return false;
  }
}

// Print thermal receipt
async function printThermalReceipt(receiptData) {
  if (!printerConnected || !thermalPrinter) {
    throw new Error('Printer not connected');
  }

  try {
    // Clear any previous content
    thermalPrinter.clear();

    // Header
    thermalPrinter.alignCenter();
    thermalPrinter.setTextDoubleHeight();
    thermalPrinter.setTextDoubleWidth();
    thermalPrinter.bold(true);
    thermalPrinter.println(receiptData.businessName);
    thermalPrinter.setTextNormal();
    thermalPrinter.bold(false);
    thermalPrinter.println(receiptData.address);
    thermalPrinter.println(`Ph: ${receiptData.phone}`);
    
    // Separator
    thermalPrinter.alignLeft();
    thermalPrinter.drawLine();

    // Order info
    thermalPrinter.println(`CUST: ${receiptData.customerName}`);
    thermalPrinter.println(`ORDER: ${receiptData.billNumber}`);
    thermalPrinter.println(`DATE: ${moment().format('DD MMM YYYY, h:mm a')}`);
    thermalPrinter.drawLine();

    // Items header
    thermalPrinter.tableCustom([
      { text: "ITEM", align: "LEFT", width: 0.5 },
      { text: "QTY", align: "CENTER", width: 0.2 },
      { text: "PRICE", align: "RIGHT", width: 0.3 }
    ]);
    thermalPrinter.println('--------------------------------');

    // Items
    receiptData.items.forEach(item => {
      const itemName = item.name.length > 16 ? item.name.substring(0, 16) : item.name;
      thermalPrinter.tableCustom([
        { text: itemName, align: "LEFT", width: 0.5 },
        { text: item.quantity.toString(), align: "CENTER", width: 0.2 },
        { text: `₹${item.amount}`, align: "RIGHT", width: 0.3 }
      ]);
    });

    thermalPrinter.println('--------------------------------');

    // Totals
    thermalPrinter.tableCustom([
      { text: "Subtotal:", align: "LEFT", width: 0.7 },
      { text: `₹${receiptData.subtotal}`, align: "RIGHT", width: 0.3 }
    ]);

    if (receiptData.discount > 0) {
      thermalPrinter.tableCustom([
        { text: "Discount:", align: "LEFT", width: 0.7 },
        { text: `-₹${receiptData.discount}`, align: "RIGHT", width: 0.3 }
      ]);
    }

    if (receiptData.deliveryCharge > 0) {
      thermalPrinter.tableCustom([
        { text: "Delivery:", align: "LEFT", width: 0.7 },
        { text: `₹${receiptData.deliveryCharge}`, align: "RIGHT", width: 0.3 }
      ]);
    }

    thermalPrinter.drawLine();
    thermalPrinter.bold(true);
    thermalPrinter.setTextSize(1, 1);
    thermalPrinter.tableCustom([
      { text: "TOTAL:", align: "LEFT", width: 0.7 },
      { text: `₹${receiptData.grandTotal}`, align: "RIGHT", width: 0.3 }
    ]);
    thermalPrinter.setTextNormal();
    thermalPrinter.bold(false);
    thermalPrinter.drawLine();

    // Footer
    thermalPrinter.alignCenter();
    thermalPrinter.println('Your clothes, cared for with Gen-Z speed.');
    thermalPrinter.bold(true);
    thermalPrinter.println('THANK YOU!');
    thermalPrinter.bold(false);
    thermalPrinter.newLine();

    // Cut paper
    thermalPrinter.cut();

    // Execute print
    await thermalPrinter.execute();
    
    console.log('✅ Receipt printed successfully');
    return { success: true, message: 'Receipt printed successfully' };

  } catch (error) {
    console.error('❌ Print error:', error);
    throw new Error(`Print failed: ${error.message}`);
  }
}

// Print laundry tags
async function printLaundryTags(tagsData) {
  if (!printerConnected || !thermalPrinter) {
    throw new Error('Printer not connected');
  }

  try {
    for (let i = 0; i < tagsData.length; i++) {
      const tag = tagsData[i];
      
      thermalPrinter.clear();
      
      // Tag header
      thermalPrinter.alignCenter();
      thermalPrinter.bold(true);
      thermalPrinter.println(tag.laundryName);
      thermalPrinter.bold(false);
      thermalPrinter.println(`Order: ${tag.billNumber}`);
      
      // Customer info
      thermalPrinter.alignLeft();
      thermalPrinter.println(`Customer: ${tag.customerName}`);
      
      // Item info
      thermalPrinter.alignCenter();
      thermalPrinter.setTextSize(1, 1);
      thermalPrinter.bold(true);
      thermalPrinter.println(tag.itemName.toUpperCase());
      thermalPrinter.setTextNormal();
      thermalPrinter.bold(false);
      
      // Wash type
      if (tag.washType) {
        thermalPrinter.println(`Wash: ${tag.washType}`);
      }
      
      // Tag counter
      thermalPrinter.alignRight();
      thermalPrinter.println(`Tag: ${tag.tagIndex}/${tag.totalTags}`);
      
      // QR Code if available
      if (tag.qrCode) {
        try {
          const qrBuffer = await QRCode.toBuffer(tag.qrCode, { width: 128 });
          thermalPrinter.alignCenter();
          thermalPrinter.printImageBuffer(qrBuffer);
        } catch (qrError) {
          console.log('QR code generation failed:', qrError.message);
        }
      }
      
      thermalPrinter.newLine();
      thermalPrinter.cut();
      
      await thermalPrinter.execute();
      
      // Small delay between tags
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ ${tagsData.length} laundry tags printed successfully`);
    return { success: true, message: `${tagsData.length} tags printed successfully` };

  } catch (error) {
    console.error('❌ Tag print error:', error);
    throw new Error(`Tag printing failed: ${error.message}`);
  }
}

// API Routes

// Health check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    printerConnected: printerConnected,
    timestamp: new Date().toISOString()
  });
});

// Initialize printer
app.post('/api/printer/init', async (req, res) => {
  try {
    const connected = await initializePrinter();
    res.json({
      success: connected,
      message: connected ? 'Printer connected successfully' : 'Printer connection failed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Print receipt
app.post('/api/print/receipt', async (req, res) => {
  try {
    const result = await printThermalReceipt(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Print tags
app.post('/api/print/tags', async (req, res) => {
  try {
    const result = await printLaundryTags(req.body.tags);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test print
app.post('/api/print/test', async (req, res) => {
  try {
    const testReceipt = {
      businessName: 'GenZ Laundry',
      address: 'Sabji Mandi Circle, Ratanada Jodhpur-342011',
      phone: '+91 9256930727',
      customerName: 'Test Customer',
      billNumber: 'TEST-001',
      items: [
        { name: 'Test Shirt', quantity: 1, amount: 50 },
        { name: 'Test Pant', quantity: 2, amount: 100 }
      ],
      subtotal: 150,
      discount: 0,
      deliveryCharge: 0,
      grandTotal: 150
    };

    const result = await printThermalReceipt(testReceipt);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// List available printers
app.get('/api/printers', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json({
      success: true,
      ports: ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        productId: port.productId,
        vendorId: port.vendorId
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 GenZ Laundry Thermal Print Server running on port ${PORT}`);
  console.log(`📡 API available at: http://localhost:${PORT}`);
  console.log(`🖨️ Initializing SP-POS893UED connection...`);
  
  // Auto-initialize printer on startup
  await initializePrinter();
  
  console.log(`✅ Server ready for thermal printing!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down thermal print server...');
  if (thermalPrinter) {
    thermalPrinter.clear();
  }
  process.exit(0);
});