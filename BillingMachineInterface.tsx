import React, { useState, useRef, useEffect } from 'react';
import { printThermalBill, BillData } from './ThermalPrintManager';
import { ShopConfig, PendingBill } from './types';
import PendingBillSelector from './PendingBillSelector';
import apiService from './api';
import { useAlert } from './GlobalAlert';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  washType: 'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN';
  total: number;
}

interface Customer {
  name: string;
  phone: string;
}

interface BillingMachineInterfaceProps {
  onLogout?: () => void;
  onSwitchToAdmin?: () => void;
}

const BillingMachineInterface: React.FC<BillingMachineInterfaceProps> = ({ onLogout, onSwitchToAdmin }) => {
  const { showAlert, showConfirm } = useAlert();
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '' });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentWashType, setCurrentWashType] = useState<'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN'>('WASH');
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [shopConfig, setShopConfig] = useState<ShopConfig>({
    shopName: 'GenZ Laundry',
    address: 'Sabji Mandi Circle,Ratanada, Jodhpur (342011)',
    contact: '+91 9256930727',
    gstNumber: ''
  });
  const [showPendingBillSelector, setShowPendingBillSelector] = useState(false);
  const [selectedPendingBills, setSelectedPendingBills] = useState<PendingBill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const itemInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

const quickItems = [
  { name: 'T-Shirt', price: 20, washTypes: ['WASH', 'IRON'], icon: '👕' },
  { name: 'Shirt', price: 20, washTypes: ['WASH', 'IRON'], icon: '👔' },
  { name: 'Kurti', price: 20, washTypes: ['WASH', 'IRON'], icon: '👗' },
  { name: 'Underwear', price: 20, washTypes: ['WASH'], icon: '🩲' },
  { name: 'Banyan', price: 20, washTypes: ['WASH'], icon: '🎽' },

  { name: 'Sweater', price: 50, washTypes: ['WASH', 'DRY CLEAN'], icon: '🧶' },
  { name: 'Hoodie', price: 50, washTypes: ['WASH'], icon: '🧥' },
  { name: 'Sweatshirt', price: 50, washTypes: ['WASH'], icon: '🧥' },

  { name: 'Jeans', price: 20, washTypes: ['WASH', 'IRON'], icon: '👖' },
  { name: 'Pant / Trouser', price: 20, washTypes: ['WASH', 'IRON'], icon: '👖' },
  { name: 'Track Pant', price: 20, washTypes: ['WASH'], icon: '🏃‍♂️' },
  { name: 'Joggers', price: 20, washTypes: ['WASH'], icon: '🏃' },
  { name: 'Leggings', price: 20, washTypes: ['WASH'], icon: '🩳' },
  { name: 'Jeggings', price: 20, washTypes: ['WASH'], icon: '🩳' },
  { name: 'Shorts', price: 20, washTypes: ['WASH'], icon: '🩳' },
  { name: 'Skirt', price: 20, washTypes: ['WASH', 'IRON'], icon: '👗' },

  { name: 'Socks', price: 15, washTypes: ['WASH'], icon: '🧦' },
  { name: 'Pyjama', price: 20, washTypes: ['WASH'], icon: '🩳' },
  { name: 'Salwar', price: 50, washTypes: ['WASH', 'IRON'], icon: '👖' },
  { name: 'Dupatta', price: 20, washTypes: ['WASH', 'IRON'], icon: '🧣' },

  { name: 'Jacket (Light)', price: 50, washTypes: ['WASH'], icon: '🧥' },
  { name: 'Jacket (Heavy)', price: 80, washTypes: ['DRY CLEAN'], icon: '🧥' },
  { name: 'Coat Pant', price: 400, washTypes: ['DRY CLEAN'], icon: '🤵' },

  { name: 'Shawl', price: 100, washTypes: ['DRY CLEAN'], icon: '🧣' },

  { name: 'Blanket (Double Bed)', price: 300, washTypes: ['WASH'], icon: '🛏️' },
  { name: 'Blanket (Single)', price: 200, washTypes: ['WASH'], icon: '🛌' }
];

  // Filter quick items based on search query
  const filteredQuickItems = quickItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  useEffect(() => {
    setBillNumber(`GZ${Date.now().toString().slice(-6)}`);
    loadShopConfig();
    if (itemInputRef.current) {
      itemInputRef.current.focus();
    }
  }, []);

  const loadShopConfig = async () => {
    try {
      const response = await apiService.getShopConfig();
      if (response.success && response.data) {
        setShopConfig(response.data);
        return;
      }
    } catch (error) {
      console.log('⚠️ Database unavailable, using local shop config');
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem('laundry_shop_config');
    if (saved) {
      setShopConfig(JSON.parse(saved));
    }
  };

  const addItemToOrder = () => {
    if (!currentItem || !currentPrice) {
      showAlert({ message: 'Please enter item name and price', type: 'warning' });
      return;
    }

    const price = parseFloat(currentPrice);
    if (isNaN(price) || price <= 0) {
      showAlert({ message: 'Please enter a valid price', type: 'warning' });
      return;
    }

    if (currentQuantity < 0) {
      showAlert({ message: 'Quantity cannot be negative', type: 'warning' });
      return;
    }

    const newItem: OrderItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: currentItem,
      quantity: currentQuantity,
      price: price,
      washType: currentWashType,
      total: price * currentQuantity
    };

    setOrderItems([...orderItems, newItem]);
    setCurrentItem('');
    setCurrentPrice('');
    setCurrentQuantity(1);
    if (itemInputRef.current) {
      itemInputRef.current.focus();
    }
  };

  const addQuickItem = (item: typeof quickItems[0]) => {
    setCurrentItem(item.name);
    setCurrentPrice(item.price.toString());
    setCurrentWashType(item.washTypes[0] as any);
    if (priceInputRef.current) {
      priceInputRef.current.focus();
    }
  };

  const removeItem = (id: string) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 0) {
      return; // Don't allow negative quantities
    }
    
    setOrderItems(orderItems.map(item => 
      item.id === id 
        ? { ...item, quantity, total: item.price * quantity }
        : item
    ));
  };

  const calculateSubtotal = () => {
    const currentOrderTotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const pendingBillsTotal = selectedPendingBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
    return currentOrderTotal + pendingBillsTotal + previousBalance;
  };
  
  const calculateTotal = () => calculateSubtotal() - discount + deliveryCharge;

  const removePendingBillsFromStorage = (billIds: string[]) => {
    const existingBills = JSON.parse(localStorage.getItem('laundry_pending_bills') || '[]');
    const updatedBills = existingBills.filter((bill: PendingBill) => {
      const billId = bill.id || (bill as any)._id;
      return !billIds.includes(billId);
    });
    localStorage.setItem('laundry_pending_bills', JSON.stringify(updatedBills));
  };

  const handlePendingBillsSelected = (bills: PendingBill[]) => {
    setSelectedPendingBills(bills);
    setShowPendingBillSelector(false);
  };

  const removePendingBill = (billId: string) => {
    setSelectedPendingBills(prev => prev.filter(bill => 
      bill.id !== billId && bill._id !== billId
    ));
  };

  const processOrder = async () => {
    if (!customer.name || (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0)) {
      showAlert({ message: 'Please enter customer name and add items, select pending bills, or add previous balance', type: 'warning' });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Combine current order items with pending bill items
      const allItems = [
        ...orderItems.map(item => ({
          name: `${item.name} (${item.washType})`,
          quantity: item.quantity,
          rate: item.price,
          amount: item.total
        })),
        ...selectedPendingBills.flatMap(bill => bill.items)
      ];

      // Add previous balance as a line item if it exists
      if (previousBalance > 0) {
        allItems.push({
          name: 'Previous Balance',
          quantity: 1,
          rate: previousBalance,
          amount: previousBalance
        });
      }

      const currentOrderSubtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
      const pendingBillsSubtotal = selectedPendingBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
      
      // Prepare previous bills data for thermal printing
      const previousBillsData = selectedPendingBills.map(bill => ({
        billNumber: bill.billNumber,
        items: bill.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        })),
        total: bill.grandTotal
      }));
      
      const billData: BillData = {
        businessName: shopConfig.shopName,
        address: shopConfig.address,
        phone: shopConfig.contact,
        billNumber,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: orderItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          rate: item.price,
          amount: item.total
        })),
        previousBills: previousBillsData.length > 0 ? previousBillsData : undefined,
        subtotal: currentOrderSubtotal + pendingBillsSubtotal + previousBalance,
        discount,
        deliveryCharge,
        previousBalance,
        grandTotal: calculateTotal(),
        status: 'completed',
        thankYouMessage: 'Thank you for choosing us!'
      };

      console.log('🧾 Processing bill:', billData);

      // Try to save bill to database (graceful fallback if API is down)
      let databaseSaveSuccess = false;
      try {
        console.log('💾 Saving bill to database...');
        console.log('📡 API URL:', 'http://localhost:8000/api/bills');
        console.log('📦 Bill data being sent:', JSON.stringify(billData, null, 2));
        
        const response = await apiService.createBill(billData);
        console.log('📨 API Response:', response);
        
        if (response.success) {
          console.log('✅ Bill saved to database:', response.data);
          databaseSaveSuccess = true;
        } else {
          console.warn('⚠️ Database save failed:', response.message);
          console.warn('⚠️ Full response:', response);
        }
      } catch (apiError) {
        console.error('❌ Database API error:', apiError);
        console.warn('⚠️ Database unavailable, continuing with local operation:', apiError);
        // Continue without database - this is not a critical error
      }

      // Also save to localStorage as backup for bill history
      let localStorageSaveSuccess = false;
      try {
        console.log('💾 Saving bill to localStorage...');
        const existingHistory = JSON.parse(localStorage.getItem('laundry_bill_history') || '[]');
        console.log('📚 Existing history count:', existingHistory.length);
        
        const billForHistory = {
          ...billData,
          id: `local_${Date.now()}`,
          _id: databaseSaveSuccess ? `db_${Date.now()}` : `local_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        existingHistory.unshift(billForHistory); // Add to beginning
        // Keep only last 100 bills in localStorage
        if (existingHistory.length > 100) {
          existingHistory.splice(100);
        }
        localStorage.setItem('laundry_bill_history', JSON.stringify(existingHistory));
        console.log('✅ Bill saved to localStorage backup');
        console.log('📚 New history count:', existingHistory.length);
        localStorageSaveSuccess = true;
      } catch (localError) {
        console.error('❌ localStorage save error:', localError);
        console.warn('⚠️ Could not save to localStorage:', localError);
      }

      // Log save status
      console.log('💾 Save Status Summary:');
      console.log('  - Database:', databaseSaveSuccess ? '✅ Success' : '❌ Failed');
      console.log('  - localStorage:', localStorageSaveSuccess ? '✅ Success' : '❌ Failed');

      // Remove selected pending bills from storage (they're now completed)
      if (selectedPendingBills.length > 0) {
        console.log('🔄 Updating pending bills status...');
        // Try to update via API first
        for (const bill of selectedPendingBills) {
          try {
            const billId = bill.id || bill._id;
            await apiService.updateBillStatus(billId, 'completed');
            console.log(`✅ Updated bill ${bill.billNumber} status to completed`);
          } catch (error) {
            console.warn('⚠️ Could not update bill status via API, using local storage:', error);
          }
        }
        removePendingBillsFromStorage(selectedPendingBills.map(bill => bill.id || bill._id));
      }
      
      // Print the combined bill
      console.log('🖨️ Printing bill...');
      await printThermalBill(billData, (message) => showAlert({ message, type: 'error' }));
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setOrderItems([]);
        setCustomer({ name: '', phone: '' });
        setDiscount(0);
        setDeliveryCharge(0);
        setPreviousBalance(0);
        setSelectedPendingBills([]);
        setBillNumber(`GZ${Date.now().toString().slice(-6)}`);
        if (itemInputRef.current) {
          itemInputRef.current.focus();
        }
      }, 2000);
    } catch (error) {
      console.error('❌ Order processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showAlert({ message: `Order processing failed: ${errorMessage}. Please try again.`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const printClothingTags = () => {
    if (!customer.name || orderItems.length === 0) {
      showAlert({ message: 'Please add items and customer name first', type: 'warning' });
      return;
    }

    const tags: any[] = [];
    let tagCounter = 1;
    const totalTags = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });

    orderItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        tags.push({
          businessName: shopConfig.shopName,
          billNumber,
          customerName: customer.name,
          itemName: item.name.toUpperCase(),
          washType: item.washType,
          tagIndex: tagCounter,
          totalTags: totalTags,
          date: currentDate,
          barcode: `GZ${billNumber}${tagCounter.toString().padStart(3, '0')}`,
          price: item.price
        });
        tagCounter++;
      }
    });
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showAlert({ message: 'Please allow popups for tag printing', type: 'warning' });
      return;
    }

    const tagHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Clothing Tags - ${billNumber}</title>
  <style>
    @page { size: 4.25in auto; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
      .tag { page-break-after: always; }
      .tag:last-child { page-break-after: avoid; }
    }
    body { font-family: 'Courier New', monospace; margin: 0; padding: 3mm; background: #f0f0f0; width: 4.25in; }
    .tag { width: 50mm; height: 30mm; border: 2px solid #000; margin: 2mm auto; padding: 2mm; background: white; display: block; position: relative; box-sizing: border-box; page-break-inside: avoid; }
    .tag-header { display: flex; justify-content: space-between; align-items: center; font-size: 7px; font-weight: bold; margin-bottom: 1mm; border-bottom: 1px solid #000; padding-bottom: 0.5mm; }
    .business-name { font-size: 8px; font-weight: bold; }
    .date { font-size: 6px; }
    .item-section { text-align: center; margin: 1mm 0; }
    .item-name { font-size: 9px; font-weight: bold; margin-bottom: 0.5mm; }
    .bill-number { font-size: 10px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 0.5mm; }
    .barcode { font-size: 8px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 1px; border: 1px solid #000; padding: 1px 2px; margin: 1mm 0; }
    .wash-type { font-size: 6px; font-weight: bold; background: #000; color: white; padding: 1px 3px; margin-top: 0.5mm; }
    .bottom-section { position: absolute; bottom: 1.5mm; left: 2mm; right: 2mm; display: flex; justify-content: space-between; align-items: center; font-size: 6px; border-top: 1px solid #000; padding-top: 0.5mm; }
    .customer-info { font-size: 5px; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag-counter { background: #000; color: white; padding: 1px 3px; font-size: 7px; font-weight: bold; }
    .price { font-size: 6px; font-weight: bold; }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 3mm; font-weight: bold; font-size: 10px;">
    TSC TL240 Clothing Tags - ${tags.length} Tags
  </div>
  
  ${tags.map(tag => `
    <div class="tag">
      <div class="tag-header">
        <span class="business-name">${tag.businessName}</span>
        <span class="date">${tag.date}</span>
      </div>
      
      <div class="item-section">
        <div class="item-name">${tag.itemName}</div>
        <div class="bill-number">${tag.billNumber}</div>
        <div class="barcode">*${tag.barcode}*</div>
        <div class="wash-type">${tag.washType}</div>
      </div>
      
      <div class="bottom-section">
        <div>
          <div class="customer-info">${tag.customerName.substring(0, 10)}</div>
          <div class="price">₹${tag.price}</div>
        </div>
        <span class="tag-counter">${tag.tagIndex}/${tag.totalTags}</span>
      </div>
    </div>
  `).join('')}
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          window.close();
        }, 1000);
      }, 500);
    }
  </script>
</body>
</html>
    `;

    printWindow.document.write(tagHTML);
    printWindow.document.close();
  };

  const clearOrder = () => {
    if ((orderItems.length > 0 || selectedPendingBills.length > 0 || previousBalance > 0)) {
      showConfirm(
        'Clear all items, pending bills, and previous balance?',
        () => {
          setOrderItems([]);
          setSelectedPendingBills([]);
          setPreviousBalance(0);
          setCurrentItem('');
          setCurrentPrice('');
          setCurrentQuantity(1);
          if (itemInputRef.current) {
            itemInputRef.current.focus();
          }
        }
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'addItem') {
        addItemToOrder();
      } else if (action === 'processOrder') {
        processOrder();
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3b82f6 100%)',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      position: 'relative'
    }}>
      <style>{`
        .glass { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); }
        .input-modern { background: rgba(255, 255, 255, 0.15); border: 2px solid rgba(255, 255, 255, 0.2); color: white; transition: all 0.3s ease; }
        .input-modern:focus { background: rgba(255, 255, 255, 0.25); border-color: rgba(255, 255, 255, 0.5); box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1); }
        .input-modern::placeholder { color: rgba(255, 255, 255, 0.7); }
        .btn-modern { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: none; font-weight: 600; }
        .btn-modern:hover { transform: translateY(-2px); }
        .quick-item { background: rgba(255, 255, 255, 0.1); border: 2px solid rgba(255, 255, 255, 0.2); transition: all 0.3s ease; }
        .quick-item:hover { background: rgba(255, 255, 255, 0.2); transform: translateY(-3px) scale(1.02); }
        
        /* Search input styling */
        input[type="text"]::placeholder {
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
        }
      `}</style>

      {/* Success Modal */}
      {showSuccess && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, backdropFilter: 'blur(10px)'
        }}>
          <div className="glass" style={{
            padding: '30px', borderRadius: '20px', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)', color: 'white'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'pulse 2s infinite' }}>✅</div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>
              Success!
            </h2>
            <p style={{ margin: '15px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
              Bill #{billNumber} printed successfully<br/>
              {orderItems.reduce((sum, item) => sum + item.quantity, 0)} new tags generated
              {selectedPendingBills.length > 0 && (
                <>
                  <br/>+ {selectedPendingBills.length} previous bill{selectedPendingBills.length > 1 ? 's' : ''} included
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass" style={{
        color: 'white', padding: '15px 25px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', margin: '10px', borderRadius: '15px', boxShadow: '0 6px 24px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo.png" alt="Logo" style={{
            height: '50px', width: '50px', borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.9)', padding: '6px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
          }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              {shopConfig.shopName} POS
            </h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
              Bill #{billNumber} • {new Date().toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="glass" style={{ padding: '12px 20px', borderRadius: '15px', textAlign: 'right' }}>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>Operator</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>👤 Admin</div>
          </div>
          {onLogout && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {onSwitchToAdmin && (
                <button onClick={onSwitchToAdmin} className="btn-modern" style={{
                  padding: '12px 24px', borderRadius: '15px', fontSize: '14px',
                  background: 'linear-gradient(135deg, #9b59b6, #8e44ad)', color: 'white', cursor: 'pointer',
                  border: 'none'
                }}>
                  🛠️ Admin
                </button>
              )}
              <button onClick={onLogout} className="btn-modern" style={{
                padding: '12px 24px', borderRadius: '15px', fontSize: '14px',
                background: 'linear-gradient(135deg, #e74c3c, #c0392b)', color: 'white', cursor: 'pointer',
                border: 'none'
              }}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', padding: '0 15px 15px', gap: '20px', height: 'calc(100vh - 120px)' }}>
        
        {/* Left Panel */}
        <div className="glass" style={{ width: '60%', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {/* Customer Section */}
          <div style={{
            padding: '25px', background: 'linear-gradient(135deg, #ffffff, #f8f9fa)', color: '#2c3e50'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>
              👤 Customer Information
            </h3>
            <div style={{ display: 'flex', gap: '15px' }}>
              <input
                type="text" placeholder="Customer Name *" value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                style={{ 
                  flex: 1, padding: '15px', borderRadius: '12px', fontSize: '16px', outline: 'none',
                  background: 'rgba(44, 62, 80, 0.1)', border: '2px solid rgba(44, 62, 80, 0.2)', 
                  color: '#2c3e50', transition: 'all 0.3s ease'
                }}
              />
              <input
                type="tel" placeholder="📱 Phone Number" value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                style={{ 
                  flex: 1, padding: '15px', borderRadius: '12px', fontSize: '16px', outline: 'none',
                  background: 'rgba(44, 62, 80, 0.1)', border: '2px solid rgba(44, 62, 80, 0.2)', 
                  color: '#2c3e50', transition: 'all 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Item Entry */}
          <div style={{ padding: '25px', background: 'rgba(52, 73, 94, 0.8)', color: 'white' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#ecf0f1' }}>➕ Add Item</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#bdc3c7' }}>Item Name</label>
                <input
                  ref={itemInputRef} type="text" value={currentItem} onChange={(e) => setCurrentItem(e.target.value)}
                  placeholder="Enter item name" className="input-modern"
                  style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '16px', outline: 'none' }}
                  onKeyPress={(e) => handleKeyPress(e, 'addItem')}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#bdc3c7' }}>Price (₹)</label>
                <input
                  ref={priceInputRef} type="number" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder="0" className="input-modern"
                  style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '16px', outline: 'none' }}
                  onKeyPress={(e) => handleKeyPress(e, 'addItem')}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#bdc3c7' }}>Quantity</label>
                <input
                  type="number" value={currentQuantity} onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 0)}
                  min="0" className="input-modern"
                  style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '16px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#bdc3c7' }}>Wash Type</label>
                <select
                  value={currentWashType} onChange={(e) => setCurrentWashType(e.target.value as any)}
                  className="input-modern" style={{ padding: '15px', borderRadius: '12px', fontSize: '16px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="WASH">🧺 WASH</option>
                  <option value="IRON">🔥 IRON</option>
                  <option value="WASH+IRON">🧺🔥 WASH+IRON</option>
                  <option value="DRY CLEAN">✨ DRY CLEAN</option>
                </select>
              </div>
              <button onClick={addItemToOrder} className="btn-modern" style={{
                padding: '15px 25px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold',
                background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: 'white', cursor: 'pointer'
              }}>
                ➕ ADD
              </button>
            </div>
          </div>

          {/* Quick Items */}
          <div style={{ padding: '25px', flex: 1, overflow: 'auto', background: 'rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '20px', color: 'white' }}>⚡ Quick Items</h3>
            
            {/* Search Bar */}
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="🔍 Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
              {filteredQuickItems.length > 0 ? (
                filteredQuickItems.map((item, index) => (
                  <button
                    key={index} onClick={() => addQuickItem(item)} className="quick-item"
                    style={{
                      padding: '20px 15px', borderRadius: '15px', cursor: 'pointer',
                      fontSize: '14px', fontWeight: 'bold', textAlign: 'center', color: 'white'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                    <div>{item.name}</div>
                    <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>₹{item.price}</div>
                  </button>
                ))
              ) : (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '16px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <div style={{ fontWeight: '500', marginBottom: '8px' }}>No items found</div>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>
                    Try searching with different keywords
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Bill */}
        <div className="glass" style={{ width: '40%', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Bill Header */}
          <div style={{
            padding: '20px', background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: 'white'
          }}>
            <h2 style={{ margin: 0, fontSize: '22px', textAlign: 'center', fontWeight: 'bold' }}>
              🧾 BILL SUMMARY
            </h2>
          </div>

          {/* Quick Actions */}
          <div style={{ padding: '15px', background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              onClick={() => setShowPendingBillSelector(true)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #3498db, #2980b9)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              📋 Add Previous Bills
              {selectedPendingBills.length > 0 && (
                <span style={{ 
                  background: 'rgba(255, 255, 255, 0.3)', 
                  borderRadius: '10px', 
                  padding: '1px 6px', 
                  fontSize: '11px' 
                }}>
                  {selectedPendingBills.length}
                </span>
              )}
            </button>
          </div>

          {/* Items List */}
          <div style={{ flex: 1, overflow: 'auto', background: 'rgba(255, 255, 255, 0.05)' }}>
            {orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}>📝</div>
                <div>No items added yet</div>
                <small style={{ opacity: 0.7 }}>Add items, bills, or balance</small>
              </div>
            ) : (
              <div style={{ padding: '10px' }}>
                
                {/* Current Order Items */}
                {orderItems.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      color: '#3498db', 
                      marginBottom: '8px',
                      padding: '0 5px'
                    }}>
                      🛍️ CURRENT ORDER ({orderItems.length})
                    </div>
                    {orderItems.map((item) => (
                      <div key={item.id} style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '10px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ color: 'white', flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', opacity: 0.8 }}>
                            {item.washType} • Qty: {item.quantity} • ₹{item.price} each
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>₹{item.total}</div>
                          <button
                            onClick={() => removeItem(item.id)}
                            style={{
                              background: 'rgba(231, 76, 60, 0.8)',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Pending Bills */}
                {selectedPendingBills.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      color: '#e67e22', 
                      marginBottom: '8px',
                      padding: '0 5px'
                    }}>
                      📋 PREVIOUS BILLS ({selectedPendingBills.length})
                    </div>
                    {selectedPendingBills.map((bill) => {
                      const billId = bill.id || bill._id;
                      return (
                      <div key={billId} style={{
                        background: 'rgba(230, 126, 34, 0.1)',
                        borderRadius: '8px',
                        padding: '10px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid rgba(230, 126, 34, 0.3)'
                      }}>
                        <div style={{ color: 'white', flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{bill.billNumber}</div>
                          <div style={{ fontSize: '11px', opacity: 0.8 }}>
                            {bill.items.length} items • {new Date(bill.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ color: '#e67e22', fontWeight: 'bold', fontSize: '14px' }}>₹{bill.grandTotal}</div>
                          <button
                            onClick={() => removePendingBill(billId)}
                            style={{
                              background: 'rgba(231, 76, 60, 0.8)',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )})}
                  </div>
                )}

                {/* Previous Balance */}
                {previousBalance > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      color: '#f39c12', 
                      marginBottom: '8px',
                      padding: '0 5px'
                    }}>
                      💰 PREVIOUS BALANCE
                    </div>
                    <div style={{
                      background: 'rgba(243, 156, 18, 0.1)',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid rgba(243, 156, 18, 0.3)'
                    }}>
                      <div style={{ color: 'white', flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Outstanding Amount</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>
                          Previous balance to settle
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ color: '#f39c12', fontWeight: 'bold', fontSize: '14px' }}>₹{previousBalance}</div>
                        <button
                          onClick={() => setPreviousBalance(0)}
                          style={{
                            background: 'rgba(231, 76, 60, 0.8)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 6px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bill Calculations */}
          <div style={{ padding: '15px', background: 'rgba(255, 255, 255, 0.05)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            
            {/* Discount, Delivery, Previous Balance - All in One Line */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                  Discount (₹)
                </label>
                <input
                  type="number" 
                  value={discount} 
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0" 
                  className="input-modern"
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    outline: 'none',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                  Delivery (₹)
                </label>
                <input
                  type="number" 
                  value={deliveryCharge} 
                  onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0" 
                  className="input-modern"
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    outline: 'none',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#f39c12' }}>
                  💰 Add Previous Due Balance (₹)
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="number" 
                    value={previousBalance} 
                    onChange={(e) => setPreviousBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0" 
                    className="input-modern"
                    style={{ 
                      flex: 1,
                      padding: '8px', 
                      borderRadius: '6px', 
                      fontSize: '13px', 
                      outline: 'none',
                      border: previousBalance > 0 ? '2px solid #f39c12' : 'none',
                      background: 'rgba(255, 255, 255, 0.9)'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[50, 100, 200, 500].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setPreviousBalance(amount)}
                        style={{
                          padding: '4px 6px',
                          fontSize: '9px',
                          border: 'none',
                          borderRadius: '3px',
                          background: 'rgba(243, 156, 18, 0.8)',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          minWidth: '28px'
                        }}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', color: 'white' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 'bold' }}>₹{calculateSubtotal()}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#e74c3c', fontSize: '13px' }}>
                  <span>Discount:</span>
                  <span style={{ fontWeight: 'bold' }}>-₹{discount}</span>
                </div>
              )}
              {deliveryCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#f39c12', fontSize: '13px' }}>
                  <span>Delivery:</span>
                  <span style={{ fontWeight: 'bold' }}>+₹{deliveryCharge}</span>
                </div>
              )}
              <hr style={{ margin: '10px 0', border: '1px solid rgba(255, 255, 255, 0.2)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                <span>TOTAL:</span>
                <span style={{ color: '#3498db' }}>₹{calculateTotal()}</span>
              </div>
            </div>

            {/* All Action Buttons in One Line */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={printClothingTags} 
                disabled={orderItems.length === 0 || !customer.name}
                className="btn-modern" 
                style={{
                  padding: '12px 8px', 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  background: orderItems.length === 0 || !customer.name 
                    ? 'rgba(189, 195, 199, 0.5)' 
                    : 'linear-gradient(135deg, #f39c12, #e67e22)',
                  color: 'white', 
                  cursor: orderItems.length === 0 || !customer.name ? 'not-allowed' : 'pointer',
                  border: 'none',
                  textAlign: 'center'
                }}
              >
                🏷️ Tags
              </button>
              
              <button
                onClick={processOrder} 
                disabled={!customer.name || (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) || isProcessing}
                className="btn-modern" 
                style={{
                  padding: '12px', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  fontWeight: 'bold',
                  background: (!customer.name || (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) || isProcessing) 
                    ? 'rgba(189, 195, 199, 0.5)' 
                    : 'linear-gradient(135deg, #27ae60, #2ecc71)',
                  color: 'white', 
                  cursor: (!customer.name || (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) || isProcessing) 
                    ? 'not-allowed' 
                    : 'pointer',
                  border: 'none',
                  textAlign: 'center'
                }}
              >
                🧾 Print Bill
              </button>
              
              <button
                onClick={clearOrder} 
                disabled={orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0}
                className="btn-modern" 
                style={{
                  padding: '12px 8px', 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  background: (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) 
                    ? 'rgba(189, 195, 199, 0.5)' 
                    : 'linear-gradient(135deg, #95a5a6, #7f8c8d)',
                  color: 'white', 
                  cursor: (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) 
                    ? 'not-allowed' 
                    : 'pointer',
                  border: 'none',
                  textAlign: 'center'
                }}
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Bill Selector Modal */}
      {showPendingBillSelector && (
        <PendingBillSelector
          customerName={customer.name}
          onClose={() => setShowPendingBillSelector(false)}
          onSelectBills={handlePendingBillsSelected}
        />
      )}
    </div>
  );
};

export default BillingMachineInterface;