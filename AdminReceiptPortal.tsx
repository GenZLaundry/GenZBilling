import React, { useState, useEffect, useRef } from 'react';
import { useAlert } from './GlobalAlert';
import apiService from './api';
import { printCleanThermalOrderReceipt } from './CleanThermalPrint';
import { PendingBill, ShopConfig } from './types';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  washType: 'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN';
  total: number;
}

interface AdminReceiptPortalProps {
  onClose: () => void;
}

const quickItems = [
  { name: 'Shirt', price: 20, washTypes: ['WASH', 'IRON'] },
  { name: 'T-Shirt', price: 20, washTypes: ['WASH', 'IRON'] },
  { name: 'Jeans', price: 20, washTypes: ['WASH', 'IRON'] },
  { name: 'Pant / Trouser', price: 20, washTypes: ['WASH', 'IRON'] },
  { name: 'Kurta', price: 20, washTypes: ['WASH', 'IRON'] },
  { name: 'Pyjama', price: 20, washTypes: ['WASH', 'IRON'] },
  { name: 'Dress Pieces', price: 30, washTypes: ['WASH', 'IRON'] },
  { name: 'Only Iron', price: 20, washTypes: ['WASH', 'IRON'] },
  { name: 'white Shirt', price: 50, washTypes: ['WASH', 'IRON'] },
  { name: 'Sweater', price: 50, washTypes: ['WASH', 'DRY CLEAN'] },
  { name: 'Jacket (Light)', price: 50, washTypes: ['WASH'] },
  { name: 'Jacket (Heavy)', price: 80, washTypes: ['DRY CLEAN'] },
  { name: 'Coat Pant', price: 400, washTypes: ['DRY CLEAN'] },
  { name: 'Blanket (Double Bed)', price: 300, washTypes: ['WASH'] },
  { name: 'Blanket (Single)', price: 200, washTypes: ['WASH'] }
];

const AdminReceiptPortal: React.FC<AdminReceiptPortalProps> = ({ onClose }) => {
  const { showAlert } = useAlert();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [address, setAddress] = useState('');
  const [remark, setRemark] = useState('');

  // Suggestions Autocomplete
  const [customerSuggestions, setCustomerSuggestions] = useState<Array<{ name: string; phone: string; lastBill?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Cart/Items State
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentUnit, setCurrentUnit] = useState<'qty' | 'kg'>('qty');
  const [currentKg, setCurrentKg] = useState('');
  const [currentKgPcs, setCurrentKgPcs] = useState('');
  const [currentWashType, setCurrentWashType] = useState<'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN'>('WASH');

  // Receipt Settings
  const [receiptDeliveryDate, setReceiptDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // Default to today + 2 days
    return d.toISOString().split('T')[0];
  });
  const [receiptServiceType, setReceiptServiceType] = useState('Wash & Iron');
  const [receiptCustomServiceType, setReceiptCustomServiceType] = useState('');
  const [receiptAdvancePaid, setReceiptAdvancePaid] = useState('0');
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [receiptPrintTags, setReceiptPrintTags] = useState(true);
  const [receiptMode, setReceiptMode] = useState<'qty' | 'weight' | 'combined'>('qty');

  // Manual Overrides
  const [receiptTotalClothes, setReceiptTotalClothes] = useState('');
  const [receiptTotalWeight, setReceiptTotalWeight] = useState('');

  const [shopConfig, setShopConfig] = useState<ShopConfig>({
    shopName: 'GenZ Laundry',
    address: 'Sabji Mandi Circle, Ratanada, Jodhpur (342011)',
    contact: '+91 9256930727',
    gstNumber: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const itemInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load config
    try {
      const saved = localStorage.getItem('laundry_shop_config');
      if (saved) {
        setShopConfig(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const parsePhoneNumber = (fullPhone: string) => {
    if (fullPhone.startsWith('+91')) {
      return { countryCode: '+91', number: fullPhone.slice(3) };
    }
    return { countryCode: '+91', number: fullPhone };
  };

  const searchCustomers = async (query: string) => {
    if (!query || query.trim().length < 1) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = query.toLowerCase().trim();
    const customerMap = new Map<string, { name: string; phone: string; lastBill?: string; count: number }>();

    try {
      const localHistory = JSON.parse(localStorage.getItem('laundry_bill_history') || '[]');
      if (Array.isArray(localHistory)) {
        localHistory.forEach((bill: any) => {
          const name = bill.customerName || '';
          if (name.toLowerCase().includes(q)) {
            const key = name.toLowerCase().trim();
            if (!customerMap.has(key)) {
              customerMap.set(key, { name, phone: bill.customerPhone || '', lastBill: bill.createdAt, count: 1 });
            } else {
              const existing = customerMap.get(key)!;
              existing.count++;
              if (bill.createdAt > (existing.lastBill || '')) {
                existing.lastBill = bill.createdAt;
                existing.phone = bill.customerPhone || existing.phone;
              }
            }
          }
        });
      }
    } catch (e) {}

    try {
      const response = await apiService.getCustomers({ search: query, limit: 10 });
      if (response && response.success && Array.isArray(response.data)) {
        response.data.forEach((c: any) => {
          const key = c.name.toLowerCase().trim();
          if (!customerMap.has(key)) {
            customerMap.set(key, { name: c.name, phone: c.phone, lastBill: c.lastVisit, count: c.totalOrders || 1 });
          } else {
            const existing = customerMap.get(key)!;
            if (!existing.phone && c.phone) {
              existing.phone = c.phone;
            }
            if (c.lastVisit && c.lastVisit > (existing.lastBill || '')) {
              existing.lastBill = c.lastVisit;
            }
          }
        });
      }
    } catch (err) {}

    const suggestions = Array.from(customerMap.values())
      .sort((a, b) => b.count - a.count)
      .map(c => ({ name: c.name, phone: c.phone, lastBill: c.lastBill }));

    setCustomerSuggestions(suggestions.slice(0, 6));
    setShowSuggestions(suggestions.length > 0);
  };

  const selectCustomerSuggestion = (suggestion: { name: string; phone: string }) => {
    const parsed = parsePhoneNumber(suggestion.phone);
    setCountryCode(parsed.countryCode);
    setCustomerName(suggestion.name);
    setCustomerPhone(parsed.number);
    setShowSuggestions(false);
    setCustomerSuggestions([]);
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
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

    if (currentUnit === 'kg') {
      const kg = parseFloat(currentKg);
      if (isNaN(kg) || kg <= 0) {
        showAlert({ message: 'Please enter a valid weight in kg', type: 'warning' });
        return;
      }
      const pcs = parseInt(currentKgPcs, 10);
      const pcsStr = !isNaN(pcs) && pcs > 0 ? ` (${pcs} pcs)` : '';
      const total = parseFloat((price * kg).toFixed(2));
      const newItem: OrderItem = {
        id: `${Date.now()}-${Math.random()}`,
        name: `${currentItem}${pcsStr} (${kg} kg @ ₹${price}/kg)`,
        quantity: 1,
        price: total,
        washType: currentWashType,
        total
      };
      setOrderItems([...orderItems, newItem]);
    } else {
      if (currentQuantity < 1) {
        showAlert({ message: 'Quantity must be at least 1', type: 'warning' });
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
    }

    setCurrentItem('');
    setCurrentPrice('');
    setCurrentQuantity(1);
    setCurrentKg('');
    setCurrentKgPcs('');
    if (itemInputRef.current) {
      itemInputRef.current.focus();
    }
  };

  const addQuickItem = (item: typeof quickItems[0]) => {
    setCurrentItem(item.name);
    setCurrentPrice(item.price.toString());
    setCurrentWashType(item.washTypes[0] as any);
    if (itemInputRef.current) {
      itemInputRef.current.focus();
    }
  };

  const handleCreateReceipt = async () => {
    if (!customerName || orderItems.length === 0) {
      showAlert({ message: 'Please enter customer details and add at least one item', type: 'warning' });
      return;
    }

    setIsProcessing(true);
    const billNum = `GZ${Date.now().toString().slice(-6)}`;
    const finalServiceType = receiptServiceType === 'Custom' ? receiptCustomServiceType : receiptServiceType;
    const advancePaidNum = parseFloat(receiptAdvancePaid) || 0;
    const total = calculateSubtotal();

    // Auto-calculate values for template mapping
    const autoClothes = orderItems.reduce((sum, item) => {
      const pcsMatch = item.name.match(/\((\d+)\s*pcs\)/i);
      if (pcsMatch) return sum + parseInt(pcsMatch[1], 10);
      const kgMatch = item.name.match(/\((\d+\.?\d*)\s*kg/i);
      return sum + (kgMatch ? 0 : item.quantity);
    }, 0);

    const autoWeight = orderItems.reduce((sum, item) => {
      const kgMatch = item.name.match(/\((\d+\.?\d*)\s*kg/i);
      return sum + (kgMatch ? parseFloat(kgMatch[1]) : 0);
    }, 0);

    const billData: PendingBill = {
      id: `local_${Date.now()}`,
      businessName: shopConfig.shopName,
      address: shopConfig.address,
      phone: shopConfig.contact,
      billNumber: billNum,
      customerName: customerName.trim(),
      customerPhone: customerPhone ? `${countryCode}${customerPhone}` : '',
      items: orderItems.map(item => ({
        name: `${item.name} (${item.washType})`,
        quantity: item.quantity,
        rate: item.price,
        amount: item.total
      })),
      subtotal: total,
      grandTotal: total,
      status: 'pending',
      paymentStatus: advancePaidNum === 0 ? 'unpaid' : (advancePaidNum >= total ? 'paid' : 'partial'),
      amountPaid: advancePaidNum,
      amountDue: total - advancePaidNum,
      paymentHistory: advancePaidNum > 0 ? [{ amount: advancePaidNum, date: new Date().toISOString(), note: 'Advance: ' + receiptPaymentMethod }] : [],
      deliveryDate: receiptDeliveryDate,
      serviceType: finalServiceType,
      thankYouMessage: 'Please keep this receipt for collection.',
      printLogo: true,
      receiptMode: receiptMode,
      totalClothes: receiptTotalClothes ? parseInt(receiptTotalClothes, 10) : autoClothes,
      totalWeight: receiptTotalWeight ? parseFloat(receiptTotalWeight) : autoWeight,
      createdAt: new Date().toISOString()
    };

    try {
      // Local Save
      const existingPending = JSON.parse(localStorage.getItem('laundry_pending_bills') || '[]');
      existingPending.unshift(billData);
      localStorage.setItem('laundry_pending_bills', JSON.stringify(existingPending));

      const existingHistory = JSON.parse(localStorage.getItem('laundry_bill_history') || '[]');
      existingHistory.unshift({ ...billData, _syncedToDb: false });
      localStorage.setItem('laundry_bill_history', JSON.stringify(existingHistory));

      // Async DB Save
      try {
        const response = await apiService.createBill(billData);
        if (response.success) {
          const serverBillId = (response.data as any)?._id || (response.data as any)?.id;
          
          const updatedHistory = existingHistory.map((b: any) => 
            b.billNumber === billData.billNumber ? { ...b, _syncedToDb: true, _id: serverBillId } : b
          );
          localStorage.setItem('laundry_bill_history', JSON.stringify(updatedHistory));

          const updatedPending = existingPending.map((b: any) => 
            b.billNumber === billData.billNumber ? { ...b, _id: serverBillId } : b
          );
          localStorage.setItem('laundry_pending_bills', JSON.stringify(updatedPending));

          // Send auto SMS if online
          if (billData.customerPhone && billData.customerPhone.length >= 10) {
            apiService.sendBillGeneratedSMS(
              billData.customerPhone,
              billData.customerName,
              billData.items.map(i => ({ name: i.name, quantity: i.quantity }))
            ).catch(err => console.warn(err));
          }
        }
      } catch (err) {}

      // Trigger Thermal Printing
      await printCleanThermalOrderReceipt(billData, (message) => showAlert({ message, type: 'error' }));
      
      showAlert({ message: `Receipt ${billNum} generated successfully!`, type: 'success' });
      
      // Reset Form
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setRemark('');
      setOrderItems([]);
      setReceiptAdvancePaid('0');
      setReceiptTotalClothes('');
      setReceiptTotalWeight('');
    } catch (error) {
      console.error(error);
      showAlert({ message: 'Failed to generate receipt', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #1e293b, #0f172a)',
      color: '#f8fafc',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '20px'
          }}>📝</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>Order Intake & Receipt Portal</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Generate deposit receipts and log garments cleanly</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.08)',
            padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          <i className="fas fa-arrow-left"></i> Back to POS Console
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        {/* Left Side: Customer Info & Items Builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Customer Card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.65)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
              <i className="fas fa-user-circle" style={{ marginRight: '6px' }} /> Customer Details
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px', position: 'relative' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Customer Name *</label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    searchCustomers(e.target.value);
                  }}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)',
                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
                
                {/* Suggestions Autocomplete */}
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#1e293b', border: '1px solid #10b981',
                    borderRadius: '8px', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    maxHeight: '200px', overflowY: 'auto'
                  }}>
                    {customerSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectCustomerSuggestion(s)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: idx < customerSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          display: 'flex', justifyContent: 'space-between', fontSize: '13px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: '600' }}>{s.name}</span>
                        <span style={{ color: '#94a3b8' }}>{s.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Phone Number</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#cbd5e1'
                  }}>+91</span>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)',
                      color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Garments Builder Card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.65)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#38bdf8' }}>
              <i className="fas fa-tags" style={{ marginRight: '6px' }} /> Add Laundry Items
            </h3>

            {/* Quick selection grid */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '8px',
              marginBottom: '16px', maxHeight: '110px', overflowY: 'auto',
              padding: '6px', background: 'rgba(0,0,0,0.12)', borderRadius: '10px'
            }}>
              {quickItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => addQuickItem(item)}
                  style={{
                    background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#38bdf8'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e2e8f0'; }}
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* Item entry panel */}
            <div style={{
              background: 'rgba(15,23,42,0.3)', borderRadius: '12px', padding: '16px',
              border: '1px solid rgba(255,255,255,0.05)', display: 'grid',
              gridTemplateColumns: '1.4fr 0.8fr 1fr 1fr auto', gap: '10px', alignItems: 'end'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Silk Saree"
                  ref={itemInputRef}
                  value={currentItem}
                  onChange={(e) => setCurrentItem(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                    color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Price (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                    color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                    textAlign: 'center'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Service</label>
                <select
                  value={currentWashType}
                  onChange={(e) => setCurrentWashType(e.target.value as any)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                    color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="WASH">🧺 Wash</option>
                  <option value="IRON">🔥 Iron</option>
                  <option value="WASH+IRON">🧺🔥 Wash+Iron</option>
                  <option value="DRY CLEAN">✨ Dry Clean</option>
                </select>
              </div>

              <div>
                {/* Unit Switch Toggle */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentUnit('qty')}
                    style={{
                      flex: 1, padding: '4px 0', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold',
                      background: currentUnit === 'qty' ? '#3b82f6' : 'transparent', color: '#fff'
                    }}
                  >QTY</button>
                  <button
                    type="button"
                    onClick={() => setCurrentUnit('kg')}
                    style={{
                      flex: 1, padding: '4px 0', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold',
                      background: currentUnit === 'kg' ? '#10b981' : 'transparent', color: '#fff'
                    }}
                  >KG</button>
                </div>
                
                {currentUnit === 'qty' ? (
                  <input
                    type="number"
                    min="1"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                      color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                      textAlign: 'center'
                    }}
                  />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '3px' }}>
                    <input
                      type="number"
                      placeholder="kg"
                      value={currentKg}
                      onChange={(e) => setCurrentKg(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 6px', borderRadius: '8px 0 0 8px',
                        border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                        color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                        textAlign: 'center'
                      }}
                    />
                    <input
                      type="number"
                      placeholder="pcs"
                      value={currentKgPcs}
                      onChange={(e) => setCurrentKgPcs(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 6px', borderRadius: '0 8px 8px 0',
                        border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                        color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                        textAlign: 'center', borderLeft: 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={addItemToOrder}
                style={{
                  padding: '10px 18px', borderRadius: '8px', border: 'none',
                  background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8',
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer', height: '38px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                + Add
              </button>
            </div>

            {/* Cart Preview */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600', marginBottom: '8px' }}>Garments Basket ({orderItems.length})</div>
              {orderItems.length === 0 ? (
                <div style={{
                  padding: '30px', textAlign: 'center', background: 'rgba(0,0,0,0.12)',
                  borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)',
                  color: '#64748b', fontSize: '13px'
                }}>
                  No clothes added yet. Tap quick selector or write manually above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {orderItems.map((item, idx) => (
                    <div key={item.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '8px', padding: '10px 14px', fontSize: '13px'
                    }}>
                      <div>
                        <span style={{ fontWeight: '700', color: '#10b981', marginRight: '8px' }}>#{idx+1}</span>
                        <span style={{ color: '#fff', fontWeight: '600' }}>{item.name}</span>
                        <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.1)' }}>|</span>
                        <span style={{ color: '#94a3b8' }}>{item.washType}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ color: '#f8fafc', fontWeight: '700' }}>₹{item.total}</span>
                        <button
                          onClick={() => setOrderItems(orderItems.filter(i => i.id !== item.id))}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Delivery Slot & Advance Checkout details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{
            background: 'rgba(30, 41, 59, 0.65)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#f59e0b' }}>
              <i className="fas fa-shipping-fast" style={{ marginRight: '6px' }} /> Delivery & Deposit
            </h3>

            {/* Delivery Date */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Delivery Target Date</label>
              <input
                type="date"
                value={receiptDeliveryDate}
                onChange={(e) => setReceiptDeliveryDate(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)',
                  color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {['Tomorrow', 'In 2 Days', 'In 3 Days'].map((label, idx) => {
                  const days = idx + 1;
                  const d = new Date();
                  d.setDate(d.getDate() + days);
                  const dateStr = d.toISOString().split('T')[0];
                  const isSelected = receiptDeliveryDate === dateStr;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setReceiptDeliveryDate(dateStr)}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px',
                        background: isSelected ? '#10b981' : 'rgba(255,255,255,0.05)', color: isSelected ? '#fff' : '#cbd5e1'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Type */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Receipt Service Mode</label>
              <select
                value={receiptServiceType}
                onChange={(e) => setReceiptServiceType(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)',
                  color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="Wash & Iron">Wash & Iron</option>
                <option value="Dry Clean">Dry Clean</option>
                <option value="Wash Only">Wash Only</option>
                <option value="Iron Only">Iron Only</option>
                <option value="Steam Iron">Steam Iron</option>
                <option value="Premium Care">Premium Care</option>
                <option value="Custom">Custom / Mixed...</option>
              </select>
              {receiptServiceType === 'Custom' && (
                <input
                  type="text"
                  placeholder="e.g. Wash & Fold"
                  value={receiptCustomServiceType}
                  onChange={(e) => setReceiptCustomServiceType(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)',
                    color: '#fff', fontSize: '13px', outline: 'none', marginTop: '6px', boxSizing: 'border-box'
                  }}
                />
              )}
            </div>

            {/* Advance Payment */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Advance Paid Amount</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="0"
                  value={receiptAdvancePaid}
                  onChange={(e) => {
                    const val = e.target.value;
                    const max = calculateSubtotal();
                    if (parseFloat(val) > max) {
                      setReceiptAdvancePaid(max.toString());
                    } else {
                      setReceiptAdvancePaid(val);
                    }
                  }}
                  style={{
                    flex: 1.2, padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)',
                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    textAlign: 'center'
                  }}
                />
                <select
                  value={receiptPaymentMethod}
                  onChange={(e) => setReceiptPaymentMethod(e.target.value as any)}
                  disabled={parseFloat(receiptAdvancePaid) <= 0}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)',
                    color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer',
                    opacity: parseFloat(receiptAdvancePaid) <= 0 ? 0.4 : 1
                  }}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>
            </div>

            {/* Receipt Print Formats */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>Receipt Layout Type</label>
                <select
                  value={receiptMode}
                  onChange={(e) => setReceiptMode(e.target.value as any)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)',
                    color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="qty">By Quantity (Pcs only)</option>
                  <option value="weight">By Weight (Kg only)</option>
                  <option value="combined">Combined (Pcs & Weight)</option>
                </select>
              </div>

              {/* Overrides */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Override Total Pcs</label>
                  <input
                    type="number"
                    placeholder="Auto"
                    value={receiptTotalClothes}
                    onChange={(e) => setReceiptTotalClothes(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.4)',
                      color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Override Total Kg</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Auto"
                    value={receiptTotalWeight}
                    onChange={(e) => setReceiptTotalWeight(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.4)',
                      color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  checked={receiptPrintTags}
                  onChange={(e) => setReceiptPrintTags(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '15px', height: '15px' }}
                />
                Print clothes sticker tags too
              </label>
            </div>

            {/* Checkout Pricing overview */}
            <div style={{
              background: 'rgba(0,0,0,0.18)', borderRadius: '12px', padding: '16px',
              border: '1px solid rgba(255,255,255,0.04)', marginTop: '8px', fontSize: '13px',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600' }}>₹{calculateSubtotal()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Advance Paid:</span>
                <span style={{ color: '#10b981', fontWeight: '600' }}>-₹{parseFloat(receiptAdvancePaid) || 0}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)',
                paddingTop: '8px', fontSize: '15px', fontWeight: '800'
              }}>
                <span>Balance Due:</span>
                <span style={{ color: '#fbbf24' }}>₹{calculateSubtotal() - (parseFloat(receiptAdvancePaid) || 0)}</span>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleCreateReceipt}
              disabled={isProcessing || orderItems.length === 0}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: orderItems.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10b981, #059669)',
                color: orderItems.length === 0 ? '#64748b' : '#fff',
                fontSize: '15px', fontWeight: '700', cursor: orderItems.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: orderItems.length === 0 ? 'none' : '0 6px 20px rgba(16,185,129,0.25)',
                transition: 'all 0.2s', marginTop: '12px'
              }}
            >
              {isProcessing ? 'Generating...' : '✓ Generate & Print Receipt'}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminReceiptPortal;
