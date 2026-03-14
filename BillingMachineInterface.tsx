import React, { useState, useRef, useEffect } from 'react';
import { printThermalBill, BillData } from './ThermalPrintManager';
import { printCleanThermalBill } from './CleanThermalPrint';
import { ShopConfig, PendingBill } from './types';
import PendingBillSelector from './PendingBillSelector';
import FunctionalQRCode from './FunctionalQRCode';
import UPISettings from './UPISettings';
import UPIStatusIndicator from './UPIStatusIndicator';
import ItemListManager from './ItemListManager';
import apiService from './api';
import { useAlert } from './GlobalAlert';
import BillShareButton from './BillShareButton';
import { ShareableBillData } from './BillShareUtils';

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
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
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
  const [showUPISettings, setShowUPISettings] = useState(false);
  const [showItemListManager, setShowItemListManager] = useState(false);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [showQuickDiscount, setShowQuickDiscount] = useState(false);
  const [lastBillTotal, setLastBillTotal] = useState(0);
  const [lastGeneratedBill, setLastGeneratedBill] = useState<ShareableBillData | null>(null);

  const itemInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const quickItems = [
    { name: 'T-Shirt', price: 20, washTypes: ['WASH', 'IRON'], icon: 'fa-shirt' },
    { name: 'Shirt', price: 20, washTypes: ['WASH', 'IRON'], icon: 'fa-shirt' },
    { name: 'Kurti', price: 20, washTypes: ['WASH', 'IRON'], icon: 'fa-vest' },
    { name: 'Underwear', price: 20, washTypes: ['WASH'], icon: 'fa-shirt' },
    { name: 'Banyan', price: 20, washTypes: ['WASH'], icon: 'fa-shirt' },
    { name: 'Sweater', price: 50, washTypes: ['WASH', 'DRY CLEAN'], icon: 'fa-shirt' },
    { name: 'Hoodie', price: 50, washTypes: ['WASH'], icon: 'fa-vest' },
    { name: 'Sweatshirt', price: 50, washTypes: ['WASH'], icon: 'fa-vest' },
    { name: 'Jeans', price: 20, washTypes: ['WASH', 'IRON'], icon: 'fa-vest-patches' },
    { name: 'Pant / Trouser', price: 20, washTypes: ['WASH', 'IRON'], icon: 'fa-vest-patches' },
    { name: 'Track Pant', price: 20, washTypes: ['WASH'], icon: 'fa-person-running' },
    { name: 'Joggers', price: 20, washTypes: ['WASH'], icon: 'fa-person-running' },
    { name: 'Leggings', price: 20, washTypes: ['WASH'], icon: 'fa-vest-patches' },
    { name: 'Jeggings', price: 20, washTypes: ['WASH'], icon: 'fa-vest-patches' },
    { name: 'Shorts', price: 20, washTypes: ['WASH'], icon: 'fa-vest-patches' },
    { name: 'Skirt', price: 20, washTypes: ['WASH', 'IRON'], icon: 'fa-vest' },
    { name: 'Socks', price: 15, washTypes: ['WASH'], icon: 'fa-socks' },
    { name: 'Pyjama', price: 20, washTypes: ['WASH'], icon: 'fa-vest-patches' },
    { name: 'Salwar', price: 50, washTypes: ['WASH', 'IRON'], icon: 'fa-vest' },
    { name: 'Dupatta', price: 20, washTypes: ['WASH', 'IRON'], icon: 'fa-vest' },
    { name: 'Jacket (Light)', price: 50, washTypes: ['WASH'], icon: 'fa-vest' },
    { name: 'Jacket (Heavy)', price: 80, washTypes: ['DRY CLEAN'], icon: 'fa-vest' },
    { name: 'Coat Pant', price: 400, washTypes: ['DRY CLEAN'], icon: 'fa-user-tie' },
    { name: 'Shawl', price: 100, washTypes: ['DRY CLEAN'], icon: 'fa-vest' },
    { name: 'Blanket (Double Bed)', price: 300, washTypes: ['WASH'], icon: 'fa-bed' },
    { name: 'Blanket (Single)', price: 200, washTypes: ['WASH'], icon: 'fa-bed' }
  ];

  const quickDiscounts = [
    { label: '5%', value: 5, type: 'percentage' },
    { label: '10%', value: 10, type: 'percentage' },
    { label: '15%', value: 15, type: 'percentage' },
    { label: '₹20', value: 20, type: 'fixed' },
    { label: '₹50', value: 50, type: 'fixed' },
    { label: '₹100', value: 100, type: 'fixed' }
  ];

  const deliveryTimeSlots = [
    '9:00 AM - 12:00 PM',
    '12:00 PM - 3:00 PM',
    '3:00 PM - 6:00 PM',
    '6:00 PM - 9:00 PM'
  ];

  const applyQuickDiscount = (discountItem: any) => {
    const subtotal = calculateSubtotal();
    if (discountItem.type === 'percentage') {
      setDiscount(Math.round((subtotal * discountItem.value) / 100));
    } else {
      setDiscount(discountItem.value);
    }
    setShowQuickDiscount(false);
  };

  const loadCustomerHistory = async (phone: string) => {
    if (!phone || phone.length < 10) return;

    try {
      const response = await apiService.getBillsByCustomer(phone);
      if (response.success && response.data) {
        setCustomerHistory(response.data.slice(0, 5)); // Last 5 bills
      }
    } catch (error) {
      console.log('Could not load customer history:', error);
      // Fallback to localStorage
      const localHistory = JSON.parse(localStorage.getItem('laundry_bill_history') || '[]');
      const customerBills = localHistory.filter((bill: any) =>
        bill.customerPhone === phone
      ).slice(0, 5);
      setCustomerHistory(customerBills);
    }
  };

  const addFromHistory = (historyBill: any) => {
    const newItems = historyBill.items.map((item: any) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: item.name,
      quantity: item.quantity,
      price: item.rate,
      washType: 'WASH' as any,
      total: item.amount
    }));
    setOrderItems([...orderItems, ...newItems]);
    setShowCustomerHistory(false);
    showAlert({ message: `Added ${newItems.length} items from previous order`, type: 'success' });
  };

  // Filter quick items based on search query
  const filteredQuickItems = quickItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (customer.phone && customer.phone.length >= 10) {
      loadCustomerHistory(customer.phone);
    }
  }, [customer.phone]);


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
      showAlert({ message: 'Please enter customer name and add items, select pending bills, or add previous due', type: 'warning' });
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

      // Add previous due as a line item if it exists
      if (previousBalance > 0) {
        allItems.push({
          name: 'Previous Due',
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
        billDate,
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
        thankYouMessage: 'Thank you for choosing Gen-z laundry!'
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

      // Print the combined bill using CLEAN thermal layout
      console.log('🖨️ Printing clean thermal bill...');
      await printCleanThermalBill(billData, (message) => showAlert({ message, type: 'error' }));

      // Store bill data for sharing
      setLastGeneratedBill({
        billNumber: billData.billNumber,
        customerName: billData.customerName || '',
        customerPhone: billData.customerPhone,
        items: billData.items,
        subtotal: billData.subtotal,
        discount: billData.discount,
        deliveryCharge: billData.deliveryCharge,
        previousBalance: billData.previousBalance,
        grandTotal: billData.grandTotal,
        businessName: billData.businessName,
        businessPhone: billData.phone,
        billDate: billDate
      });

      setShowSuccess(true);
      // Removed auto-close - user must manually close the success modal
    } catch (error) {
      console.error('❌ Order processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showAlert({ message: `Order processing failed: ${errorMessage}. Please try again.`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const printClothingTags = async () => {
    if (!customer.name || orderItems.length === 0) {
      showAlert({ message: 'Please add items and customer name first', type: 'warning' });
      return;
    }

    const tags: any[] = [];
    let tagCounter = 1;
    const totalTags = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    orderItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        tags.push({
          businessName: shopConfig.shopName,
          billNumber,
          customerName: customer.name,
          customerPhone: customer.phone,
          itemName: item.name.toUpperCase(),
          washType: item.washType,
          tagIndex: tagCounter,
          totalTags: totalTags,
          date: currentDate,
          barcode: `GZ${billNumber}${tagCounter.toString().padStart(3, '0')}`,
          qrCode: `GZ${billNumber}${tagCounter.toString().padStart(3, '0')}`,
          price: item.price
        });
        tagCounter++;
      }
    });

    // Save tag history to database
    try {
      const response = await apiService.post('/tag-history', { tags });
      if (response.success) {
        console.log('✅ Tag history saved:', response.data);
      }
    } catch (error) {
      console.error('❌ Failed to save tag history:', error);
      // Don't block printing if history save fails
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showAlert({ message: 'Please allow popups for tag printing', type: 'warning' });
      return;
    }

    const tagHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Clothing Tags</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 20mm auto; margin: 0 !important; }
    @media print {
      html, body { width: 20mm !important; margin: 0 !important; padding: 0 !important; }
      .tag { page-break-after: avoid; }
    }
    body { 
      font-family: 'Arial', sans-serif; 
      margin: 0; 
      padding: 0; 
      background: white; 
      width: 20mm;
    }
    .tag { 
      width: 19mm;
      margin: 1.5mm auto; 
      padding: 0.8mm; 
      background: white; 
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box; 
      overflow: hidden;
      border: 0.5px solid #000;
    }
    .top-header {
      text-align: center;
      padding-bottom: 0.3mm;
      border-bottom: 0.3px solid #000;
      line-height: 1.15;
    }
    .brand-line1 {
      font-size: 4px;
      font-weight: 900;
      display: block;
    }
    .brand-line2 {
      font-size: 3px;
      font-weight: 700;
      display: block;
    }
    .tag-date {
      font-size: 3.5px;
      font-weight: bold;
      text-align: center;
      margin-top: 0.8mm;
      line-height: 1;
    }
    .customer-name { 
      text-align: center; 
      font-size: 6px; 
      font-weight: 900; 
      text-transform: uppercase;
      letter-spacing: 0;
      margin: 0.5mm 0;
      line-height: 1.1;
      word-wrap: break-word;
      overflow-wrap: break-word;
      max-width: 100%;
    }
    .bill-info { 
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 4.5px; 
      font-weight: bold; 
      letter-spacing: 0; 
      font-family: 'Courier New', monospace;
      margin: 0.3mm 0;
    }
    .tag-number { 
      font-size: 4.5px; 
      font-weight: 900;
      border: 0.5px solid #000;
      padding: 0px 1px;
    }
    .website { 
      text-align: center;
      font-size: 3px; 
      font-weight: bold;
      margin-top: 0.3mm;
      padding-top: 0.3mm;
      border-top: 0.3px solid #000;
    }
  </style>
</head>
<body>
  
  ${tags.map((tag, index) => `
    <div class="tag">
      <div class="top-header">
        <span class="brand-line1">Gen-Z Laundry</span>
        <span class="brand-line2">& Dry Cleaners</span>
      </div>
      <div class="tag-date">${tag.date}</div>
      
      <div class="customer-name">${tag.customerName}</div>
      
      <div class="bill-info">
        <span>${tag.billNumber}</span>
        <span class="tag-number">${tag.tagIndex} / ${tag.totalTags}</span>
      </div>
      
      <div class="website">www.genzlaundry.com</div>
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
        'Clear all items, pending bills, and previous due?',
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
      background: 'var(--bg-base)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)'
    }}>



      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div className="alert-icon alert-icon-success" style={{ margin: '0 auto 16px', width: '48px', height: '48px', fontSize: '20px' }}>
              <i className="fas fa-check"></i>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Bill Created
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Bill #{billNumber} printed &middot; {orderItems.reduce((sum, item) => sum + item.quantity, 0)} tags generated
              {selectedPendingBills.length > 0 && (
                <> &middot; {selectedPendingBills.length} previous bill{selectedPendingBills.length > 1 ? 's' : ''} included</>
              )}
            </p>
            {lastGeneratedBill && (
              <div style={{ marginBottom: '16px' }}>
                <BillShareButton billData={lastGeneratedBill} variant="full" />
              </div>
            )}
            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                setShowSuccess(false);
                setOrderItems([]);
                setCustomer({ name: '', phone: '' });
                setDiscount(0);
                setDeliveryCharge(0);
                setPreviousBalance(0);
                setSelectedPendingBills([]);
                setBillNumber(`GZ${Date.now().toString().slice(-6)}`);
                if (itemInputRef.current) itemInputRef.current.focus();
              }}
            >
              Next Bill
            </button>
          </div>
        </div>
      )}

      <div className="pos-header">
        <div className="pos-header-brand">
          <img src="/logo.png" alt="GenZ Laundry" className="pos-header-logo" />
          <div>
            <h1>{shopConfig.shopName}</h1>
            <p>#{billNumber} &middot; {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        <div className="pos-header-actions">
          {onLogout && (
            <>
              {onSwitchToAdmin && (
                <button onClick={onSwitchToAdmin} className="btn btn-ghost btn-sm">
                  <i className="fas fa-cog"></i> Admin
                </button>
              )}
              <button onClick={onLogout} className="btn btn-danger btn-sm">
                <i className="fas fa-right-from-bracket"></i> Logout
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pos-layout">
        <div className="pos-panel-left">

          {/* Customer Section */}
          <div style={{
            padding: '24px 28px',
            borderBottom: '1px solid #4b5563'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '12px'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: '#3b82f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '16px'
              }}>
                👤
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#f9fafb' }}>
                Customer Information
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 90px', gap: '16px' }}>
              {/* Customer Name Input */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '12px',
                  background: '#374151',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#d1d5db',
                  borderRadius: '4px',
                  zIndex: 1
                }}>
                  Customer Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '16px',
                    pointerEvents: 'none'
                  }}>
                    👤
                  </div>
                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </div>
              </div>

              {/* Phone Number Input with History */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '12px',
                  background: '#374151',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#d1d5db',
                  borderRadius: '4px',
                  zIndex: 1
                }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '16px',
                    pointerEvents: 'none'
                  }}>
                    📱
                  </div>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 40px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  />
                  {customerHistory.length > 0 && (
                    <button
                      onClick={() => setShowCustomerHistory(true)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#3b82f6',
                        border: 'none',
                        color: 'white',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      title="View customer history"
                    >
                      <i className="fas fa-clipboard-list"></i> {customerHistory.length}
                    </button>
                  )}
                </div>
              </div>

              {/* Date Input */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '12px',
                  background: '#374151',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#d1d5db',
                  borderRadius: '4px',
                  zIndex: 1
                }}>
                  Bill Date
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '16px',
                    pointerEvents: 'none'
                  }}>
                    📅
                  </div>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </div>
              </div>

              {/* Today Button */}
              <button
                onClick={() => setBillDate(new Date().toISOString().split('T')[0])}
                className="professional-btn"
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                }}
              >
                📅 Today
              </button>
            </div>
          </div>

          {/* Item Entry */}
          <div style={{
            padding: '24px 28px',
            borderBottom: '1px solid #4b5563'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '12px'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '16px'
              }}>
                <i className="fas fa-plus" style={{ fontSize: '14px' }}></i>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#f9fafb' }}>
                Add New Item
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr auto', gap: '16px' }}>
              {/* Item Name Input */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '12px',
                  background: '#374151',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#d1d5db',
                  borderRadius: '4px',
                  zIndex: 1
                }}>
                  Item Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '16px',
                    pointerEvents: 'none'
                  }}>
                    🏷️
                  </div>
                  <input
                    ref={itemInputRef}
                    type="text"
                    value={currentItem}
                    onChange={(e) => setCurrentItem(e.target.value)}
                    placeholder="Enter item name"
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onKeyPress={(e) => handleKeyPress(e, 'addItem')}
                  />
                </div>
              </div>

              {/* Price Input */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '12px',
                  background: '#374151',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#d1d5db',
                  borderRadius: '4px',
                  zIndex: 1
                }}>
                  Price (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '16px',
                    pointerEvents: 'none'
                  }}>
                    ₹
                  </div>
                  <input
                    ref={priceInputRef}
                    type="number"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="0.00"
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onKeyPress={(e) => handleKeyPress(e, 'addItem')}
                  />
                </div>
              </div>

              {/* Quantity Input */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '12px',
                  background: '#374151',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#d1d5db',
                  borderRadius: '4px',
                  zIndex: 1
                }}>
                  Quantity
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '16px',
                    pointerEvents: 'none'
                  }}>
                    #
                  </div>
                  <input
                    type="number"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 0)}
                    min="0"
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </div>
              </div>

              {/* Wash Type Select */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '12px',
                  background: '#374151',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#d1d5db',
                  borderRadius: '4px',
                  zIndex: 1
                }}>
                  Service Type
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '16px',
                    pointerEvents: 'none'
                  }}>
                    🧺
                  </div>
                  <select
                    value={currentWashType}
                    onChange={(e) => setCurrentWashType(e.target.value as any)}
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px'
                    }}
                  >
                    <option value="WASH">🧺 WASH ONLY</option>
                    <option value="IRON">🔥 IRON ONLY</option>
                    <option value="WASH+IRON">🧺🔥 WASH + IRON</option>
                    <option value="DRY CLEAN">✨ DRY CLEAN</option>
                  </select>
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={addItemToOrder}
                className="professional-btn"
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                  minHeight: '48px'
                }}
              >
                <i className="fas fa-plus"></i> Add Item
              </button>
            </div>
          </div>

          {/* Quick Items */}
          <div className="scrollable-area" style={{
            padding: '24px 28px', flex: 1, overflow: 'auto',
            borderTop: '2px solid #4b5563'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '12px',
              paddingBottom: '16px',
              borderBottom: '1px solid #4b5563'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '16px',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
              }}>
                ⚡
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#f9fafb' }}>
                Quick Add Items
              </h3>
            </div>

            {/* Enhanced Search Bar */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <label style={{
                position: 'absolute',
                top: '-8px',
                left: '12px',
                background: '#374151',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: '500',
                color: '#d1d5db',
                borderRadius: '4px',
                zIndex: 1
              }}>
                Search Items
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '16px',
                  pointerEvents: 'none'
                }}>
                  <i className="fas fa-search" style={{ pointerEvents: 'none' }}></i>
                </div>
                <input
                  type="text"
                  placeholder="Type to search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="professional-input"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 40px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px'
            }}>
              {filteredQuickItems.length > 0 ? (
                filteredQuickItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => addQuickItem(item)}
                    className="quick-item-btn"
                  >
                    <i className={`fas ${item.icon}`}></i>
                    <span>{item.name}</span>
                    <span className="price-tag">₹{item.price}</span>
                  </button>
                ))
              ) : (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#9ca3af'
                }}>
                  <i className="fas fa-search" style={{ fontSize: '24px', marginBottom: '12px', opacity: 0.5 }}></i>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    No items found
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Try searching with different keywords
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Bill Summary */}
        <div className="professional-card" style={{
          width: '35%', display: 'flex', flexDirection: 'column',
          margin: '0', borderRadius: '0', background: '#374151'
        }}>

          {/* Bill Header */}
          <div style={{
            padding: '16px 20px',
            background: '#1f2937',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Bill Summary
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowItemListManager(true)}
                className="professional-btn"
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  background: '#7c3aed',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                Manage ({orderItems.length})
              </button>

              <button
                onClick={() => setShowPendingBillSelector(true)}
                className="professional-btn"
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                Previous ({selectedPendingBills.length})
              </button>

              <button
                onClick={() => setShowQuickDiscount(true)}
                className="professional-btn"
                style={{
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: '#f59e0b',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                <i className="fas fa-percent"></i> Discount
              </button>

              <button
                onClick={() => setShowUPISettings(true)}
                className="professional-btn"
                style={{
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: '#10b981',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                UPI
              </button>
            </div>
          </div>

          {/* Items List - Scrollable */}
          <div className="scrollable-area" style={{
            flex: 1, overflow: 'auto', maxHeight: 'calc(100vh - 400px)'
          }}>
            {orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#9ca3af'
              }}>
                <i className="fas fa-receipt" style={{ fontSize: '24px', marginBottom: '12px', opacity: 0.3, color: 'var(--text-muted)' }}></i>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No items added</div>
                <div style={{ fontSize: '14px' }}>Add items to see bill summary</div>
              </div>
            ) : (
              <div style={{ padding: '16px' }}>

                {/* Current Order Items */}
                {orderItems.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#f9fafb',
                      marginBottom: '12px',
                      padding: '8px 12px',
                      background: '#4b5563',
                      borderRadius: '4px',
                      border: '1px solid #6b7280'
                    }}>
                      Current Order ({orderItems.reduce((sum, item) => sum + item.quantity, 0)} items)
                    </div>

                    {orderItems.map((item) => (
                      <div key={item.id} className="item-list-professional" style={{
                        borderRadius: '4px',
                        padding: '12px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: '500',
                            fontSize: '14px',
                            marginBottom: '4px',
                            color: '#f9fafb'
                          }}>
                            {item.name}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#d1d5db',
                            display: 'flex',
                            gap: '12px'
                          }}>
                            <span style={{
                              background: '#6b7280',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {item.washType}
                            </span>
                            <span>Qty: {item.quantity}</span>
                            <span>Rate: ₹{item.price}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            color: '#10b981',
                            fontWeight: '600',
                            fontSize: '16px'
                          }}>
                            ₹{item.total}
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="professional-btn"
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Pending Bills */}
                {selectedPendingBills.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#495057',
                      marginBottom: '12px',
                      padding: '8px 12px',
                      background: '#fff3cd',
                      borderRadius: '4px',
                      border: '1px solid #ffeaa7'
                    }}>
                      Previous Bills ({selectedPendingBills.length} bills)
                    </div>

                    {selectedPendingBills.map((bill) => {
                      const billId = bill.id || bill._id;
                      return (
                        <div key={billId} className="item-list-professional" style={{
                          borderRadius: '4px',
                          padding: '12px',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#fff3cd'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: '500',
                              fontSize: '14px',
                              marginBottom: '4px',
                              color: '#212529'
                            }}>
                              {bill.billNumber}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#6c757d'
                            }}>
                              {bill.items.length} items • {new Date(bill.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              color: '#fd7e14',
                              fontWeight: '600',
                              fontSize: '16px'
                            }}>
                              ₹{bill.grandTotal}
                            </div>
                            <button
                              onClick={() => removePendingBill(billId)}
                              className="professional-btn"
                              style={{
                                background: '#dc3545',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Previous Due */}
                {previousBalance > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#495057',
                      marginBottom: '12px',
                      padding: '8px 12px',
                      background: '#f8d7da',
                      borderRadius: '4px',
                      border: '1px solid #f5c6cb'
                    }}>
                      Previous Due
                    </div>

                    <div className="item-list-professional" style={{
                      borderRadius: '4px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8d7da'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: '500',
                          fontSize: '14px',
                          marginBottom: '4px',
                          color: '#212529'
                        }}>
                          Outstanding Amount
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6c757d'
                        }}>
                          Previous due to settle
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          color: '#dc3545',
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          ₹{previousBalance}
                        </div>
                        <button
                          onClick={() => setPreviousBalance(0)}
                          className="professional-btn"
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bill Footer - Professional Calculations & Actions */}
          <div style={{
            background: 'linear-gradient(135deg, #000000ff, #408999ff)',
            padding: '20px',
            borderTop: '1px solid rgba(91, 56, 56, 0.1)'
          }}>

            {/* Quick Adjustments */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Discount
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="₹0"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    outline: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#333',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Delivery
                </label>
                <input
                  type="number"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="₹0"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    outline: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#333',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#f39c12'
                }}>
                  Previous Due
                </label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={previousBalance}
                    onChange={(e) => setPreviousBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="₹0"
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      border: previousBalance > 0 ? '2px solid #f39c12' : '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: '#333',
                      transition: 'all 0.2s ease'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setPreviousBalance(amount)}
                        style={{
                          padding: '4px 6px',
                          fontSize: '9px',
                          border: 'none',
                          borderRadius: '4px',
                          background: 'rgba(243, 156, 18, 0.8)',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          minWidth: '24px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'rgba(243, 156, 18, 1)'}
                        onMouseOut={(e) => e.target.style.background = 'rgba(243, 156, 18, 0.8)'}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Totals */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600' }}>₹{calculateSubtotal()}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#e74c3c', fontSize: '13px' }}>
                  <span>Discount:</span>
                  <span style={{ fontWeight: '600' }}>-₹{discount}</span>
                </div>
              )}
              {deliveryCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#f39c12', fontSize: '13px' }}>
                  <span>Delivery:</span>
                  <span style={{ fontWeight: '600' }}>+₹{deliveryCharge}</span>
                </div>
              )}
              <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                <span>TOTAL:</span>
                <span style={{ color: '#2ecc71' }}>₹{calculateTotal()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                onClick={printClothingTags}
                disabled={orderItems.length === 0 || !customer.name}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: orderItems.length === 0 || !customer.name
                    ? 'rgba(189, 195, 199, 0.3)'
                    : 'linear-gradient(135deg, #f39c12, #e67e22)',
                  color: 'white',
                  cursor: orderItems.length === 0 || !customer.name ? 'not-allowed' : 'pointer',
                  border: 'none',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (orderItems.length > 0 && customer.name) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(243, 156, 18, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <i className="fas fa-tag"></i> Print Tags
              </button>

              <button
                onClick={clearOrder}
                disabled={orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0)
                    ? 'rgba(189, 195, 199, 0.3)'
                    : 'linear-gradient(135deg, #95a5a6, #7f8c8d)',
                  color: 'white',
                  cursor: (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0)
                    ? 'not-allowed'
                    : 'pointer',
                  border: 'none',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (orderItems.length > 0 || selectedPendingBills.length > 0 || previousBalance > 0) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(149, 165, 166, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <i className="fas fa-trash"></i> Clear
              </button>
            </div>

            <button
              onClick={processOrder}
              disabled={!customer.name || (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) || isProcessing}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 'bold',
                background: (!customer.name || (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) || isProcessing)
                  ? 'rgba(189, 195, 199, 0.3)'
                  : 'linear-gradient(135deg, #27ae60, #2ecc71)',
                color: 'white',
                cursor: (!customer.name || (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) || isProcessing)
                  ? 'not-allowed'
                  : 'pointer',
                border: 'none',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(39, 174, 96, 0.2)'
              }}
              onMouseOver={(e) => {
                if (customer.name && (orderItems.length > 0 || selectedPendingBills.length > 0 || previousBalance > 0) && !isProcessing) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(39, 174, 96, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(39, 174, 96, 0.2)';
              }}
            >
              <i className="fas fa-print"></i> PRINT BILL
            </button>

            {/* Bottom Section - Scanner Left, Controls Right */}
            <div style={{
              display: 'flex',
              gap: '10px',
              padding: '10px',
              background: 'linear-gradient(135deg, #34495e, #2c3e50)'
            }}>

              {/* SCANNER - Bottom Left */}
              <div style={{
                width: '140px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '10px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  SCANNER
                </div>

                {calculateTotal() > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <FunctionalQRCode
                      amount={calculateTotal()}
                      billNumber={billNumber}
                      businessName={shopConfig.shopName}
                      style={{
                        width: '90px',
                        height: '90px',
                        border: '3px solid #2ecc71',
                        borderRadius: '8px',
                        background: 'white',
                        padding: '4px',
                        filter: 'contrast(1.5) brightness(1.1)',
                        boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)'
                      }}
                    />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#2ecc71',
                        marginBottom: '3px',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                      }}>
                        ₹{calculateTotal()}
                      </div>
                      <div style={{
                        fontSize: '9px',
                        color: 'rgba(255,255,255,0.8)',
                        lineHeight: '1.2',
                        fontWeight: '500'
                      }}>
                        Scan with UPI app<br />
                        <span style={{ color: '#2ecc71' }}>High Contrast QR</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <img
                      src="/scanner.png"
                      alt="Scanner"
                      style={{
                        width: '90px',
                        height: '90px',
                        border: '3px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '8px',
                        background: 'white',
                        padding: '4px',
                        filter: 'contrast(1.3) brightness(1.1)',
                        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)'
                      }}
                    />
                    <div style={{
                      fontSize: '9px',
                      color: 'rgba(255,255,255,0.7)',
                      textAlign: 'center',
                      lineHeight: '1.2',
                      fontWeight: '500'
                    }}>
                      Add items to generate<br />
                      <span style={{ color: '#3498db' }}>High Contrast QR</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls - Bottom Right */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>

                {/* DISCOUNT, DELIVERY, PREVIOUS DUE */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      DISCOUNT
                    </label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="₹0"
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        outline: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: '#333',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3498db'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      DELIVERY
                    </label>
                    <input
                      type="number"
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="₹0"
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        outline: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: '#333',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3498db'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: '#f39c12'
                    }}>
                      PREVIOUS DUE
                    </label>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={previousBalance}
                        onChange={(e) => setPreviousBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="₹0"
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          outline: 'none',
                          border: previousBalance > 0 ? '2px solid #f39c12' : '1px solid rgba(255, 255, 255, 0.2)',
                          background: 'rgba(255, 255, 255, 0.95)',
                          color: '#333',
                          transition: 'all 0.2s ease'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '1px' }}>
                        {[50, 100].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setPreviousBalance(amount)}
                            style={{
                              padding: '3px 4px',
                              fontSize: '8px',
                              border: 'none',
                              borderRadius: '3px',
                              background: 'rgba(243, 156, 18, 0.8)',
                              color: 'white',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              minWidth: '20px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(243, 156, 18, 1)'}
                            onMouseOut={(e) => e.target.style.background = 'rgba(243, 156, 18, 0.8)'}
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill Totals */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  padding: '10px',
                  marginBottom: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: '600' }}>₹{calculateSubtotal()}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#e74c3c', fontSize: '11px' }}>
                      <span>Discount:</span>
                      <span style={{ fontWeight: '600' }}>-₹{discount}</span>
                    </div>
                  )}
                  {deliveryCharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#f39c12', fontSize: '11px' }}>
                      <span>Delivery:</span>
                      <span style={{ fontWeight: '600' }}>+₹{deliveryCharge}</span>
                    </div>
                  )}
                  <hr style={{ margin: '6px 0', border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', color: 'white' }}>
                    <span>TOTAL:</span>
                    <span style={{ color: '#2ecc71' }}>₹{calculateTotal()}</span>
                  </div>
                </div>


              </div>
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

      {/* UPI Settings Modal */}
      {showUPISettings && (
        <UPISettings
          onClose={() => setShowUPISettings(false)}
        />
      )}

      {/* Item List Manager Modal */}
      {showItemListManager && (
        <ItemListManager
          orderItems={orderItems}
          onUpdateOrderItems={setOrderItems}
          onClose={() => setShowItemListManager(false)}
        />
      )}

      {/* Customer History Modal */}
      {showCustomerHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: '#374151', borderRadius: '12px', padding: '24px', width: '500px', maxHeight: '70vh',
            overflow: 'auto', border: '1px solid #4b5563'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#f9fafb', fontSize: '18px', fontWeight: '600' }}>
                <i className="fas fa-clock-rotate-left"></i> Customer History - {customer.name}
              </h3>
              <button onClick={() => setShowCustomerHistory(false)} style={{
                background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px',
                padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '500'
              }}>
                <i className="fas fa-times"></i> Close
              </button>
            </div>

            {customerHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {customerHistory.map((bill, index) => (
                  <div key={index} style={{
                    background: '#4b5563', borderRadius: '8px', padding: '16px',
                    border: '1px solid #6b7280'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ color: '#f9fafb', fontWeight: '600', fontSize: '14px' }}>
                        {bill.billNumber}
                      </div>
                      <div style={{ color: '#10b981', fontWeight: '600', fontSize: '16px' }}>
                        ₹{bill.grandTotal}
                      </div>
                    </div>
                    <div style={{ color: '#d1d5db', fontSize: '12px', marginBottom: '8px' }}>
                      {new Date(bill.createdAt).toLocaleDateString()} • {bill.items.length} items
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                        {bill.items.slice(0, 3).map((item: any) => item.name).join(', ')}
                        {bill.items.length > 3 && ` +${bill.items.length - 3} more`}
                      </div>
                      <button
                        onClick={() => addFromHistory(bill)}
                        style={{
                          background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px',
                          padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: '500'
                        }}
                      >
                        <i className="fas fa-plus"></i> Add Items
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 20px' }}>
                <i className="fas fa-clipboard" style={{ fontSize: '24px', marginBottom: '12px', opacity: 0.3 }}></i>
                <div>No previous orders found</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Discount Modal */}
      {showQuickDiscount && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: '#374151', borderRadius: '12px', padding: '24px', width: '400px',
            border: '1px solid #4b5563'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#f9fafb', fontSize: '18px', fontWeight: '600' }}>
                <i className="fas fa-percent"></i> Quick Discount
              </h3>
              <button onClick={() => setShowQuickDiscount(false)} style={{
                background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px',
                padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '500'
              }}>
                <i className="fas fa-times"></i> Close
              </button>
            </div>

            <div style={{ marginBottom: '16px', color: '#d1d5db', fontSize: '14px' }}>
              Subtotal: ₹{calculateSubtotal()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {quickDiscounts.map((discountItem, index) => (
                <button
                  key={index}
                  onClick={() => applyQuickDiscount(discountItem)}
                  style={{
                    background: '#4b5563', color: '#f9fafb', border: '1px solid #6b7280',
                    borderRadius: '8px', padding: '12px', cursor: 'pointer', fontSize: '14px',
                    fontWeight: '600', transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#3b82f6';
                    e.target.style.borderColor = '#3b82f6';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#4b5563';
                    e.target.style.borderColor = '#6b7280';
                  }}
                >
                  {discountItem.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="number"
                placeholder="Custom amount"
                className="professional-input"
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const value = parseFloat((e.target as HTMLInputElement).value);
                    if (value > 0) {
                      setDiscount(value);
                      setShowQuickDiscount(false);
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  setDiscount(0);
                  setShowQuickDiscount(false);
                }}
                style={{
                  background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '12px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default BillingMachineInterface;
