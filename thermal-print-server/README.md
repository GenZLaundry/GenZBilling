# 🧺 GenZ Laundry - Complete Thermal Print Server

## 🎯 **COMPLETE SOLUTION FOR SP-POS893UED**

This is a **complete Node.js thermal printing server** that eliminates all browser limitations and provides **perfect thermal receipt printing** for your GenZ Laundry POS system.

## ✅ **FEATURES**

### **Direct Hardware Control**
- **USB/Serial connection** to SP-POS893UED
- **Zero browser limitations** - no blank space issues
- **Professional formatting** - exactly like commercial POS
- **Automatic paper cutting** - cuts immediately after content
- **Multiple connection methods** - USB, Serial, Network

### **Complete POS Integration**
- **REST API** for web integration
- **Receipt printing** with itemized billing
- **Laundry tag printing** with QR codes
- **Test printing** for setup verification
- **Windows service** - runs automatically on startup

### **Professional Output**
- **Compact formatting** - minimal paper waste
- **Proper spacing** - thermal printer optimized
- **Clean cutting** - no manual tearing needed
- **Consistent results** - reliable every time

## 🚀 **INSTALLATION & SETUP**

### **Step 1: Install Node.js**
```bash
# Download and install Node.js from nodejs.org
# Version 16+ recommended
```

### **Step 2: Install Dependencies**
```bash
cd thermal-print-server
npm install
```

### **Step 3: Connect SP-POS893UED**
- **Connect via USB** cable to computer
- **Power on** the printer
- **Install drivers** if needed (Windows should auto-detect)

### **Step 4: Start Server**
```bash
# Development mode
npm run dev

# Production mode
npm start

# Install as Windows service (runs on startup)
npm run install-service
```

### **Step 5: Test Connection**
- **Open browser**: http://localhost:3001
- **Click "Test Print"** - should print test receipt
- **Verify cutting** - paper should cut automatically

## 🔗 **INTEGRATION WITH RENDER.COM**

### **Update Your Web POS (genzlaundry.onrender.com)**

Add this JavaScript to your web POS for direct printing:

```javascript
// Direct thermal printing function
async function printDirectThermal(receiptData) {
  try {
    const response = await fetch('http://localhost:3001/api/print/receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(receiptData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ Receipt printed successfully!');
    } else {
      alert('❌ Print failed: ' + result.message);
    }
  } catch (error) {
    alert('❌ Connection error: ' + error.message);
  }
}

// Usage in your POS system
const receiptData = {
  businessName: 'GenZ Laundry',
  address: 'Sabji Mandi Circle, Ratanada Jodhpur-342011',
  phone: '+91 9256930727',
  customerName: 'Customer Name',
  billNumber: 'GenZ-024',
  items: [
    { name: 'Shirt (Cotton)', quantity: 3, amount: 210 },
    { name: 'Saree', quantity: 1, amount: 250 }
  ],
  subtotal: 460,
  discount: 0,
  deliveryCharge: 0,
  grandTotal: 460
};

// Print receipt
printDirectThermal(receiptData);
```

## 📡 **API ENDPOINTS**

### **Print Receipt**
```http
POST /api/print/receipt
Content-Type: application/json

{
  "businessName": "GenZ Laundry",
  "address": "Sabji Mandi Circle, Ratanada Jodhpur-342011",
  "phone": "+91 9356930727",
  "customerName": "Customer Name",
  "billNumber": "GenZ-024",
  "items": [
    {
      "name": "Shirt (Cotton)",
      "quantity": 3,
      "amount": 210
    }
  ],
  "subtotal": 210,
  "discount": 0,
  "deliveryCharge": 0,
  "grandTotal": 210
}
```

### **Print Laundry Tags**
```http
POST /api/print/tags
Content-Type: application/json

{
  "tags": [
    {
      "laundryName": "GenZ Laundry",
      "billNumber": "GenZ-024",
      "customerName": "Customer Name",
      "itemName": "Shirt (Cotton)",
      "washType": "WASH+IRON",
      "qrCode": "https://genzlaundry.com/track/GenZ-024-1",
      "tagIndex": 1,
      "totalTags": 3
    }
  ]
}
```

### **Test Print**
```http
POST /api/print/test
```

### **Check Status**
```http
GET /api/status
```

### **List Printers**
```http
GET /api/printers
```

## 🎯 **WORKFLOW INTEGRATION**

### **Complete POS Workflow:**
1. **Customer places order** on genzlaundry.onrender.com
2. **Web POS sends data** to local thermal server (localhost:3001)
3. **Server prints receipt** directly to SP-POS893UED
4. **Paper cuts automatically** - zero waste
5. **Customer gets perfect receipt** - professional appearance

### **Benefits:**
- ✅ **Zero browser limitations** - direct hardware control
- ✅ **Perfect formatting** - no blank space issues
- ✅ **Reliable cutting** - automatic paper cutting
- ✅ **Professional results** - exactly like commercial POS
- ✅ **Easy integration** - simple REST API calls

## 🔧 **TROUBLESHOOTING**

### **Printer Not Found:**
```bash
# Check available ports
curl http://localhost:3001/api/printers

# Initialize printer manually
curl -X POST http://localhost:3001/api/printer/init
```

### **Connection Issues:**
- **Check USB cable** - ensure data cable, not charging only
- **Verify drivers** - SP-POS893UED should appear in Device Manager
- **Test with manufacturer software** first
- **Try different USB port**

### **Print Quality Issues:**
- **Check thermal paper** - use recommended paper type
- **Clean print head** - follow manufacturer instructions
- **Adjust print density** - modify server.js settings

## 🎉 **FINAL RESULT**

This complete thermal printing server provides:

✅ **Perfect thermal receipts** - zero blank space
✅ **Automatic paper cutting** - no manual intervention
✅ **Professional formatting** - commercial POS quality
✅ **Easy web integration** - simple API calls
✅ **Reliable operation** - Windows service support
✅ **Complete solution** - no browser limitations

**Your GenZ Laundry POS now has professional-grade thermal printing that works exactly like commercial laundry systems!** 🎯