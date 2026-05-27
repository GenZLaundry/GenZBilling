import React, { useState, useRef, useEffect } from 'react';
import { printThermalBill, BillData } from './ThermalPrintManager';
import { printCleanThermalBill } from './CleanThermalPrint';
import { ShopConfig, PendingBill } from './types';
import PendingBillSelector from './PendingBillSelector';
import FunctionalQRCode from './FunctionalQRCode';
import UPISettings from './UPISettings';
import UPIStatusIndicator from './UPIStatusIndicator';
import ItemListManager from './ItemListManager';
import ManualEntry from './ManualEntry';
import apiService from './api';
import { useAlert } from './GlobalAlert';
import BillShareButton from './BillShareButton';
import { ShareableBillData } from './BillShareUtils';
import CountryCodePicker, { ALL_COUNTRIES } from './CountryCodePicker';
const COUNTRY_CODES = ALL_COUNTRIES; // for parsePhoneNumber compatibility

const parsePhoneNumber = (phoneStr: string) => {
  const clean = (phoneStr || '').trim();
  if (clean.startsWith('+')) {
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const item of sortedCodes) {
      if (clean.startsWith(item.code)) {
        const numberPart = clean.slice(item.code.length).trim();
        return { countryCode: item.code, number: numberPart };
      }
    }
  }
  return { countryCode: '+91', number: clean };
};

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
  const [countryCode, setCountryCode] = useState('+91');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentWashType, setCurrentWashType] = useState<'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN'>('WASH');
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentUnit, setCurrentUnit] = useState<'qty' | 'kg'>('qty');
  const [currentKg, setCurrentKg] = useState('');
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
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [reminderTrigger, setReminderTrigger] = useState(0);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [customerPendingDue, setCustomerPendingDue] = useState<{amount: number, count: number, bills: PendingBill[]}>({amount: 0, count: 0, bills: []});
  const [showQuickDiscount, setShowQuickDiscount] = useState(false);
  const [lastBillTotal, setLastBillTotal] = useState(0);
  const [customerSuggestions, setCustomerSuggestions] = useState<Array<{name: string, phone: string, lastBill?: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastGeneratedBill, setLastGeneratedBill] = useState<ShareableBillData | null>(null);
  
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    entryId: string;
    title: string;
    body: string;
    icon: string;
    time: string;
    type: 'pickup' | 'delivery';
  } | null>(null);
  const notifiedEntriesRef = useRef<Set<string>>(new Set());

  const playNotificationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Soft, smooth, premium glass-like warm chime tone
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5 (pleasant, warm, smooth frequency)
      
      // Gentle attack: volume rises smoothly from 0 to 0.08 in 0.05s to eliminate click pop sounds
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      
      // Soft, long acoustic decay: volume falls exponentially to 0.001 in 0.6s
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (error) {
      console.error("Audio context failed to play smooth chime:", error);
    }
  };

  const itemInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const quickItems = [
    { name: 'Dress Pieces', price: 30, washTypes: ['WASH', 'IRON'], icon: 'fa-shirt' },
    { name: 'Only Iron', price: 20, washTypes: ['WASH', 'IRON'], icon: 'fa-shirt' },
    { name: 'white Shirt (kadap)', price: 80, washTypes: ['WASH', 'IRON'], icon: 'fa-shirt' },
    { name: 'white Shirt', price: 50, washTypes: ['WASH', 'IRON'], icon: 'fa-shirt' },
    { name: 'white Kurta(kadap)', price: 100, washTypes: ['WASH', 'IRON'], icon: 'fa-shirt' },
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
    if (!phone || phone.length < 10) {
      setCustomerPendingDue({ amount: 0, count: 0, bills: [] });
      return;
    }

    try {
      const response = await apiService.getBillsByCustomer(phone);
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : (response.data as any).bills || [];
        setCustomerHistory(data.slice(0, 5)); // Last 5 bills
        calculatePendingDue(data);
      }
    } catch (error) {
      console.log('Could not load customer history:', error);
      // Fallback to localStorage
      const localHistory = JSON.parse(localStorage.getItem('laundry_bill_history') || '[]');
      const customerBills = localHistory.filter((bill: any) =>
        bill.customerPhone === phone
      );
      setCustomerHistory(customerBills.slice(0, 5));
      calculatePendingDue(customerBills);
    }
  };

  const calculatePendingDue = (bills: any[]) => {
    const pendingBills = bills.filter(b => 
      (b.status === 'pending' || b.status === 'partial') && 
      (b.amountDue > 0 || (b.grandTotal - (b.amountPaid || 0) > 0))
    );
    
    let totalDue = 0;
    pendingBills.forEach((b: any) => {
      if (b.amountDue !== undefined && b.amountDue !== null) {
        totalDue += Number(b.amountDue);
      } else {
        totalDue += (b.grandTotal - (b.amountPaid || 0));
      }
    });

    setCustomerPendingDue({
      amount: totalDue,
      count: pendingBills.length,
      bills: pendingBills
    });
  };

  const searchCustomers = async (query: string) => {
    if (!query || query.trim().length < 1) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = query.toLowerCase().trim();
    const customerMap = new Map<string, { name: string; phone: string; lastBill?: string; count: number }>();

    // 1. Gather suggestions from local storage to work offline/instantly
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
    } catch (e) {
      console.error('Error parsing local history for suggestions:', e);
    }

    try {
      const localManual = JSON.parse(localStorage.getItem('laundry_manual_entries') || '[]');
      if (Array.isArray(localManual)) {
        localManual.forEach((entry: any) => {
          const name = entry.customerName || '';
          if (name.toLowerCase().includes(q)) {
            const key = name.toLowerCase().trim();
            if (!customerMap.has(key)) {
              customerMap.set(key, { name, phone: entry.phone || '', lastBill: entry.createdAt, count: 1 });
            } else {
              const existing = customerMap.get(key)!;
              existing.count++;
              if (entry.createdAt > (existing.lastBill || '')) {
                existing.lastBill = entry.createdAt;
                existing.phone = entry.phone || existing.phone;
              }
            }
          }
        });
      }
    } catch (e) {
      console.error('Error parsing local manual entries for suggestions:', e);
    }

    let suggestions = Array.from(customerMap.values())
      .sort((a, b) => b.count - a.count)
      .map(c => ({ name: c.name, phone: c.phone, lastBill: c.lastBill }));

    setCustomerSuggestions(suggestions.slice(0, 6));
    setShowSuggestions(suggestions.length > 0);

    // 2. Fetch from Database Customer CRM API asynchronously (if online)
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

        suggestions = Array.from(customerMap.values())
          .sort((a, b) => b.count - a.count)
          .map(c => ({ name: c.name, phone: c.phone, lastBill: c.lastBill }));

        setCustomerSuggestions(suggestions.slice(0, 8));
        setShowSuggestions(suggestions.length > 0);
      }
    } catch (apiError) {
      console.log('Customer API search offline or failed:', apiError);
    }
  };


  const selectCustomerSuggestion = (suggestion: { name: string; phone: string; lastBill?: string }) => {
    const parsed = parsePhoneNumber(suggestion.phone);
    setCountryCode(parsed.countryCode);
    setCustomer({ name: suggestion.name, phone: parsed.number });
    setShowSuggestions(false);
    setCustomerSuggestions([]);
    if (suggestion.phone) loadCustomerHistory(suggestion.phone);
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
      loadCustomerHistory(`${countryCode}${customer.phone}`);
    } else {
      setCustomerPendingDue({ amount: 0, count: 0, bills: [] });
    }
  }, [customer.phone, countryCode]);


  useEffect(() => {
    setBillNumber(`GZ${Date.now().toString().slice(-6)}`);
    loadShopConfig();
    if (itemInputRef.current) {
      itemInputRef.current.focus();
    }
  }, []);

  // Polling check for manual entry pickup & delivery reminders
  useEffect(() => {
    const checkReminders = async () => {
      let entries: any[] = [];
      try {
        const response = await apiService.getManualEntries();
        if (response && response.success && Array.isArray(response.data)) {
          entries = response.data;
        } else {
          entries = JSON.parse(localStorage.getItem('laundry_manual_entries') || '[]');
        }
      } catch (e) {
        entries = JSON.parse(localStorage.getItem('laundry_manual_entries') || '[]');
      }

      if (!Array.isArray(entries) || entries.length === 0) return;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

      for (const entry of entries) {
        const isPending = entry.status === 'pending';
        const isDelivered = entry.status === 'delivered';

        if (isDelivered) continue;

        // check pickup times (for pending manual entries)
        if (isPending && entry.pickupDate) {
          const hasTime = !!entry.pickupTime;
          const pickupDateTimeStr = `${entry.pickupDate}T${entry.pickupTime || '23:59'}:00`;
          const pickupDateObj = new Date(pickupDateTimeStr);
          const timeDiffMins = Math.round((pickupDateObj.getTime() - now.getTime()) / (1000 * 60));

          if (entry.pickupDate === todayStr) {
            if (hasTime) {
              // Only fire reminders if a specific time was set
              if (timeDiffMins > 0 && timeDiffMins <= 30) {
                // 30 min pickup reminder
                const key = `${entry._id || entry.id}_pickup_soon`;
                if (!notifiedEntriesRef.current.has(key)) {
                  notifiedEntriesRef.current.add(key);
                  playNotificationChime();
                  setActiveNotification({
                    id: key,
                    entryId: entry._id || entry.id,
                    title: '⏰ Pickup Due Soon',
                    body: `${entry.customerName} is scheduled for pickup in ${timeDiffMins} mins (${entry.pickupTime})`,
                    icon: '⏰',
                    time: 'now',
                    type: 'pickup'
                  });
                  break;
                }
              } else if (timeDiffMins <= 0) {
                // Overdue pickup today — only if time was explicitly set
                const key = `${entry._id || entry.id}_pickup_overdue`;
                if (!notifiedEntriesRef.current.has(key)) {
                  notifiedEntriesRef.current.add(key);
                  playNotificationChime();
                  setActiveNotification({
                    id: key,
                    entryId: entry._id || entry.id,
                    title: '🚨 Overdue Pickup Alert',
                    body: `Pickup for ${entry.customerName} was due at ${entry.pickupTime}`,
                    icon: '🚨',
                    time: 'now',
                    type: 'pickup'
                  });
                  break;
                }
              }
            }
            // No time set for today — no reminder, admin didn't specify a time
          } else if (entry.pickupDate < todayStr) {
            // Overdue pickup from a past date — only fire if time was set OR it's been past the full day
            const key = `${entry._id || entry.id}_pickup_overdue_past`;
            if (!notifiedEntriesRef.current.has(key)) {
              notifiedEntriesRef.current.add(key);
              playNotificationChime();
              setActiveNotification({
                id: key,
                entryId: entry._id || entry.id,
                title: '🚨 Overdue Pickup Alert',
                body: hasTime
                  ? `Pickup for ${entry.customerName} was due on ${entry.pickupDate} at ${entry.pickupTime}`
                  : `Pickup for ${entry.customerName} was due on ${entry.pickupDate}`,
                icon: '🚨',
                time: 'now',
                type: 'pickup'
              });
              break;
            }
          }
        }

        // check delivery times (for pending or completed manual entries)
        if (!isDelivered && entry.deliveryDate) {
          const hasTime = !!entry.deliveryTime;
          const deliveryDateTimeStr = `${entry.deliveryDate}T${entry.deliveryTime || '23:59'}:00`;
          const deliveryDateObj = new Date(deliveryDateTimeStr);
          const timeDiffMins = Math.round((deliveryDateObj.getTime() - now.getTime()) / (1000 * 60));

          if (entry.deliveryDate === todayStr) {
            if (hasTime) {
              // Only fire if a specific time was set
              if (timeDiffMins > 0 && timeDiffMins <= 30) {
                const key = `${entry._id || entry.id}_delivery_soon`;
                if (!notifiedEntriesRef.current.has(key)) {
                  notifiedEntriesRef.current.add(key);
                  playNotificationChime();
                  setActiveNotification({
                    id: key,
                    entryId: entry._id || entry.id,
                    title: '⏰ Delivery Due Soon',
                    body: `Delivery for ${entry.customerName} is due in ${timeDiffMins} mins (${entry.deliveryTime})`,
                    icon: '⏰',
                    time: 'now',
                    type: 'delivery'
                  });
                  break;
                }
              } else if (timeDiffMins <= 0) {
                const key = `${entry._id || entry.id}_delivery_overdue`;
                if (!notifiedEntriesRef.current.has(key)) {
                  notifiedEntriesRef.current.add(key);
                  playNotificationChime();
                  setActiveNotification({
                    id: key,
                    entryId: entry._id || entry.id,
                    title: '🚨 Overdue Delivery Alert',
                    body: `Delivery for ${entry.customerName} was due at ${entry.deliveryTime}`,
                    icon: '🚨',
                    time: 'now',
                    type: 'delivery'
                  });
                  break;
                }
              }
            }
            // No time set for today — no reminder
          } else if (entry.deliveryDate < todayStr) {
            // Past date overdue
            const key = `${entry._id || entry.id}_delivery_overdue_past`;
            if (!notifiedEntriesRef.current.has(key)) {
              notifiedEntriesRef.current.add(key);
              playNotificationChime();
              setActiveNotification({
                id: key,
                entryId: entry._id || entry.id,
                title: '🚨 Overdue Delivery Alert',
                body: hasTime
                  ? `Delivery for ${entry.customerName} was due on ${entry.deliveryDate} at ${entry.deliveryTime}`
                  : `Delivery for ${entry.customerName} was due on ${entry.deliveryDate}`,
                icon: '🚨',
                time: 'now',
                type: 'delivery'
              });
              break;
            }
          }
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [reminderTrigger]);

  // Dismiss notification after 4 seconds
  useEffect(() => {
    if (activeNotification) {
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeNotification]);

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

    if (currentUnit === 'kg') {
      const kg = parseFloat(currentKg);
      if (isNaN(kg) || kg <= 0) {
        showAlert({ message: 'Please enter a valid weight in kg', type: 'warning' });
        return;
      }
      const total = parseFloat((price * kg).toFixed(2));
      const newItem: OrderItem = {
        id: `${Date.now()}-${Math.random()}`,
        name: `${currentItem} (${kg} kg @ ₹${price}/kg)`,
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
        customerPhone: customer.phone ? `${countryCode}${customer.phone}` : '',
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

      // Save to localStorage FIRST (always, before DB attempt)
      let localStorageSaveSuccess = false;
      try {
        const existingHistory = JSON.parse(localStorage.getItem('laundry_bill_history') || '[]');
        const billForHistory = {
          ...billData,
          id: `local_${Date.now()}`,
          _id: `local_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _syncedToDb: false
        };
        existingHistory.unshift(billForHistory);
        if (existingHistory.length > 500) existingHistory.splice(500);
        localStorage.setItem('laundry_bill_history', JSON.stringify(existingHistory));
        localStorageSaveSuccess = true;
        console.log('✅ Bill saved to localStorage first');
      } catch (localError) {
        console.error('❌ localStorage save error:', localError);
      }

      // Then try to save to database
      let databaseSaveSuccess = false;
      try {
        console.log('💾 Saving bill to database...');
        const response = await apiService.createBill(billData);
        if (response.success) {
          console.log('✅ Bill saved to database:', response.data);
          databaseSaveSuccess = true;
          // Mark local copy as synced
          try {
            const existing = JSON.parse(localStorage.getItem('laundry_bill_history') || '[]');
            const updated = existing.map((b: any) => b.billNumber === billData.billNumber ? { ...b, _syncedToDb: true, _id: (response.data as any)?._id || b._id } : b);
            localStorage.setItem('laundry_bill_history', JSON.stringify(updated));
          } catch (e) { /* ignore */ }

          // AUTOMATICALLY SEND BACKGROUND SMS
          if (billData.customerPhone && billData.customerPhone.length >= 10) {
            try {
              console.log('📱 Automatically triggering background SMS via Fast2SMS...');
              apiService.sendBillGeneratedSMS(
                billData.customerPhone,
                billData.customerName || 'Customer',
                billData.items.map(i => ({ name: i.name, quantity: i.quantity }))
              ).catch(err => console.warn('⚠️ Auto-SMS failed:', err));
            } catch (smsError) {
              console.warn('⚠️ Could not send auto-SMS:', smsError);
            }
          }

        } else {
          console.warn('⚠️ Database save failed:', response.message);
        }
      } catch (apiError) {
        console.warn('⚠️ Database unavailable, bill saved locally and will sync later:', apiError);
      }

      console.log('💾 Save Status — DB:', databaseSaveSuccess ? '✅' : '❌ (saved locally)', '| Local:', localStorageSaveSuccess ? '✅' : '❌');

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

      // Send WhatsApp notification — done via button in success modal, not auto-send
      // (auto window.open after await is blocked by browsers as popup)

      // Store bill data for sharing
      setLastGeneratedBill({
        billNumber: billData.billNumber,
        customerName: billData.customerName || '',
        customerPhone: billData.customerPhone,
        items: billData.items,
        previousBills: billData.previousBills,
        subtotal: billData.subtotal,
        discount: billData.discount,
        deliveryCharge: billData.deliveryCharge,
        previousBalance: billData.previousBalance,
        grandTotal: billData.grandTotal,
        businessName: billData.businessName,
        businessPhone: billData.phone,
        businessAddress: billData.address,
        billDate: billDate,
        thankYouMessage: billData.thankYouMessage
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
          customerPhone: customer.phone ? `${countryCode}${customer.phone}` : '',
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
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* WhatsApp button — direct user click, no popup blocker */}
                {lastGeneratedBill.customerPhone && (
                  <button
                    className="btn btn-sm"
                    style={{ background: '#25D366', color: '#fff', border: 'none', fontSize: '14px', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => sendBillGeneratedWA(
                      lastGeneratedBill.customerPhone!,
                      lastGeneratedBill.customerName,
                      lastGeneratedBill.billNumber,
                      lastGeneratedBill.items.map(i => ({ name: i.name, quantity: i.quantity })),
                      lastGeneratedBill.grandTotal
                    )}
                  >
                    <i className="fab fa-whatsapp" style={{ fontSize: '18px' }}></i>
                    Send Bill on WhatsApp
                  </button>
                )}
                <BillShareButton billData={lastGeneratedBill} variant="full" />
              </div>
            )}
            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                setShowSuccess(false);
                setOrderItems([]);
                setCustomer({ name: '', phone: '' });
                setCountryCode('+91');
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
          <div className="pos-section">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '12px'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '14px',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
              }}>
                <i className="fas fa-user-circle"></i>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#f9fafb' }}>
                Customer Information
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 90px', gap: '16px' }}>
              {/* Customer Name Input with Autocomplete */}
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
                    fontSize: '14px',
                    pointerEvents: 'none'
                  }}>
                    <i className="fas fa-user"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={customer.name}
                    onChange={(e) => {
                      setCustomer({ ...customer, name: e.target.value });
                      searchCustomers(e.target.value);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => customer.name.length >= 1 && searchCustomers(customer.name)}
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      borderRadius: showSuggestions ? '8px 8px 0 0' : '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  />
                  {/* Autocomplete Dropdown */}
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#1f2937',
                      border: '1px solid #3b82f6',
                      borderTop: 'none',
                      borderRadius: '0 0 8px 8px',
                      zIndex: 1000,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      overflow: 'hidden'
                    }}>
                      {customerSuggestions.map((s, i) => (
                        <div
                          key={i}
                          onMouseDown={() => selectCustomerSuggestion(s)}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: i < customerSuggestions.length - 1 ? '1px solid #374151' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#374151')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <div style={{ color: '#f9fafb', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-user" style={{ color: '#3b82f6', fontSize: '12px' }}></i> {s.name}
                            </div>
                            {s.phone && (
                              <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fas fa-phone" style={{ color: '#10b981', fontSize: '10px' }}></i> {s.phone}
                              </div>
                            )}
                          </div>
                          {s.lastBill && (
                            <div style={{ color: '#6b7280', fontSize: '10px', textAlign: 'right' }}>
                              Last visit<br/>
                              {new Date(s.lastBill).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone Number Input with Country Code */}
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
                <div style={{ position: 'relative', display: 'flex', gap: '0' }}>
                  {/* Country Code Picker */}
                  <CountryCodePicker value={countryCode} onChange={setCountryCode} />
                  {/* Phone Number Input */}
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={customer.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setCustomer({ ...customer, phone: val });
                    }}
                    className="professional-input"
                    style={{
                      flex: 1,
                      padding: '12px 40px 12px 12px',
                      borderRadius: '0 8px 8px 0',
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
                    fontSize: '14px',
                    pointerEvents: 'none'
                  }}>
                    <i className="fas fa-calendar-alt"></i>
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
                <i className="fas fa-calendar-day"></i> Today
              </button>
            </div>
            
            {customerPendingDue.amount > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'pulse 2s infinite'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ef4444'
                  }}>
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#ef4444', fontSize: '15px', fontWeight: '700' }}>
                      Pending Due Alert!
                    </h4>
                    <p style={{ margin: 0, color: '#fca5a5', fontSize: '13px', marginTop: '2px' }}>
                      This customer has <strong style={{ color: '#fff' }}>₹{customerPendingDue.amount}</strong> unpaid across {customerPendingDue.count} bills.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPreviousBalance(customerPendingDue.amount);
                    setSelectedPendingBills(customerPendingDue.bills);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    background: '#ef4444',
                    border: 'none',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  Collect Now
                </button>
              </div>
            )}
          </div>

          {/* Item Entry */}
          <div className="pos-section">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '12px'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '14px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}>
                <i className="fas fa-plus"></i>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#f9fafb' }}>
                Add New Item
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr auto', gap: '16px', alignItems: 'end' }}>
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
                    fontSize: '14px',
                    pointerEvents: 'none'
                  }}>
                    <i className="fas fa-tag"></i>
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

              {/* Quantity / KG Input with Toggle */}
              <div style={{ position: 'relative' }}>
                {/* Unit Toggle on top */}
                <div style={{
                  display: 'flex',
                  background: '#1f2937',
                  borderRadius: '8px 8px 0 0',
                  border: '1px solid #4b5563',
                  borderBottom: 'none',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => setCurrentUnit('qty')}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: currentUnit === 'qty' ? '#3b82f6' : 'transparent',
                      color: currentUnit === 'qty' ? 'white' : '#9ca3af',
                      transition: 'all 0.2s'
                    }}
                  ><i className="fas fa-hashtag" style={{ marginRight: '4px' }}></i> QTY</button>
                  <button
                    type="button"
                    onClick={() => setCurrentUnit('kg')}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      border: 'none',
                      borderLeft: '1px solid #4b5563',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: currentUnit === 'kg' ? '#10b981' : 'transparent',
                      color: currentUnit === 'kg' ? 'white' : '#9ca3af',
                      transition: 'all 0.2s'
                    }}
                  ><i className="fas fa-weight-hanging" style={{ marginRight: '4px' }}></i> KG</button>
                </div>

                {/* Number Input below */}
                {currentUnit === 'qty' ? (
                  <input
                    type="number"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    min="1"
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '0 0 8px 8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      textAlign: 'center',
                      border: '1px solid #4b5563',
                      borderTop: '1px solid #3b82f6',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div>
                    <input
                      type="number"
                      value={currentKg}
                      onChange={(e) => setCurrentKg(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0.00"
                      step="0.1"
                      min="0"
                      className="professional-input"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '0 0 8px 8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        textAlign: 'center',
                        border: '1px solid #4b5563',
                        borderTop: '1px solid #10b981',
                        boxSizing: 'border-box'
                      }}
                    />
                    {/* Live total preview */}
                    {currentKg && currentPrice && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: 0, right: 0,
                        fontSize: '11px',
                        color: '#10b981',
                        fontWeight: '700',
                        textAlign: 'center'
                      }}>
                        = ₹{(parseFloat(currentPrice) * parseFloat(currentKg) || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
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
                    fontSize: '14px',
                    pointerEvents: 'none'
                  }}>
                    <i className="fas fa-soap"></i>
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
                    <option value="WASH">WASH ONLY</option>
                    <option value="IRON">IRON ONLY</option>
                    <option value="WASH+IRON">WASH + IRON</option>
                    <option value="DRY CLEAN">DRY CLEAN</option>
                  </select>
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={addItemToOrder}
                className="professional-btn"
                style={{
                  padding: '0 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                  whiteSpace: 'nowrap',
                  alignSelf: 'flex-end',
                  height: '44px',
                  marginTop: '8px'
                }}
              >
                <i className="fas fa-plus" style={{ fontSize: '11px' }}></i> Add
              </button>
            </div>
          </div>

          {/* Quick Items */}
          <div className="scrollable-area pos-section" style={{ flex: 1, overflow: 'auto', borderBottom: 'none' }}>
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
                color: 'white', fontSize: '14px',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
              }}>
                <i className="fas fa-bolt"></i>
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
        <div className="pos-panel-right">

          {/* Bill Header */}
          <div style={{
            padding: '20px 24px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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

              <button
                onClick={() => setShowManualEntry(true)}
                className="professional-btn"
                style={{
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: '#0ea5e9',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                Entry
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
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.2)'
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
                className="btn btn-warning"
                style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '13px' }}
              >
                <i className="fas fa-tag"></i> Print Tags
              </button>

              <button
                onClick={clearOrder}
                disabled={orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0}
                className="btn btn-ghost"
                style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '13px' }}
              >
                <i className="fas fa-trash"></i> Clear
              </button>
            </div>

            {/* UPI QR Code Scanner Section */}
            {calculateTotal() > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                {/* QR + download button stacked */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <FunctionalQRCode
                    amount={calculateTotal()}
                    billNumber={billNumber}
                    businessName={shopConfig.shopName}
                    style={{
                      width: '76px',
                      height: '76px',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      background: 'white',
                      padding: '4px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                    }}
                  />
                  {/* Download QR as JPG */}
                  <button
                    title="Download QR as JPG"
                    onClick={async () => {
                      try {
                        const { getUPIConfig } = await import('./upiConfig');
                        const config = getUPIConfig();
                        const total = calculateTotal();
                        const note = `Bill ${billNumber} - ${shopConfig.shopName}`;
                        const upiString = `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.payeeName)}&am=${total}&cu=INR&tn=${encodeURIComponent(note)}`;
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiString)}&ecc=H&margin=10&color=000000&bgcolor=FFFFFF`;

                        // Fetch and download
                        const resp = await fetch(qrUrl);
                        const blob = await resp.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `UPI_QR_${billNumber}_₹${total}.jpg`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        showAlert({ message: 'Could not download QR. Check internet connection.', type: 'error' });
                      }
                    }}
                    style={{
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: '5px',
                      padding: '3px 8px',
                      color: '#10b981',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <i className="fas fa-download" style={{ fontSize: '9px' }}></i> Save QR
                  </button>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#10b981',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '3px'
                  }}>
                    UPI Scan & Pay
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#ffffff',
                    marginBottom: '3px'
                  }}>
                    ₹{calculateTotal()}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#a1a1aa',
                    lineHeight: '1.3'
                  }}>
                    Scan with any UPI app to pay
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={processOrder}
              disabled={!customer.name || (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) || isProcessing}
              className="btn btn-success"
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '15px',
                letterSpacing: '1.5px',
                fontWeight: '800',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              {isProcessing ? (
                <><i className="fas fa-spinner fa-spin"></i> Processing...</>
              ) : (
                <><i className="fas fa-print"></i> PRINT BILL</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pending Bill Selector Modal */}
      {showPendingBillSelector && (
        <PendingBillSelector
          customerName={customer.name}
          initialSelected={selectedPendingBills}
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

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <ManualEntry onClose={() => {
          setShowManualEntry(false);
          setReminderTrigger(prev => prev + 1);
        }} />
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

      {/* iOS-Style Push Notification Banner Overlay */}
      {activeNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '390px',
          maxWidth: '90%',
          background: 'rgba(31, 41, 55, 0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          padding: '12px 16px',
          zIndex: 99999,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), 0 1px 1px rgba(255,255,255,0.1) inset',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          animation: 'iosSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setActiveNotification(null)}
        >
          {/* Header Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '11px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                <i className="fas fa-bell"></i>
              </div>
              <span style={{
                color: '#e5e7eb',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '-0.2px',
                textTransform: 'uppercase',
                opacity: 0.8
              }}>
                GENZ REMINDER
              </span>
            </div>
            <span style={{
              color: '#9ca3af',
              fontSize: '11px',
              fontWeight: '500',
              opacity: 0.7
            }}>
              now
            </span>
          </div>

          {/* Body Content */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              lineHeight: '1.2',
              letterSpacing: '-0.1px',
              marginBottom: '2px'
            }}>
              {activeNotification.title}
            </div>
            <div style={{
              color: '#d1d5db',
              fontSize: '13px',
              fontWeight: '500',
              lineHeight: '1.3',
              letterSpacing: '-0.1px'
            }}>
              {activeNotification.body}
            </div>
          </div>

          {/* iOS Push Notification Action Row */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '8px',
            justifyContent: 'flex-end',
            width: '100%'
          }}>
            <button
              onMouseDown={async (e) => {
                e.stopPropagation(); // Avoid triggering top banner onClick
                try {
                  const res = await apiService.updateManualEntryStatus(activeNotification.entryId, 'delivered');
                  if (res && res.success) {
                    showAlert({ message: 'Entry marked as Done. Reminders stopped.', type: 'success' });
                    // Prevent this entry from alerting again in the current session
                    const id = activeNotification.entryId;
                    notifiedEntriesRef.current.add(`${id}_pickup_soon`);
                    notifiedEntriesRef.current.add(`${id}_pickup_overdue`);
                    notifiedEntriesRef.current.add(`${id}_pickup_overdue_past`);
                    notifiedEntriesRef.current.add(`${id}_delivery_soon`);
                    notifiedEntriesRef.current.add(`${id}_delivery_overdue`);
                    notifiedEntriesRef.current.add(`${id}_delivery_overdue_past`);
                    setActiveNotification(null);
                  } else {
                    showAlert({ message: res?.message || 'Failed to update entry status', type: 'error' });
                  }
                } catch (err: any) {
                  showAlert({ message: err.message || 'Error updating status', type: 'error' });
                }
              }}
              style={{
                background: 'rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.35)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)')}
            >
              ✓ Mark Done
            </button>
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                setActiveNotification(null);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
            >
              Dismiss
            </button>
          </div>

          {/* Swipe Indicator (iOS Style) */}
          <div style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255, 255, 255, 0.2)',
            margin: '4px auto 0 auto'
          }} />
        </div>
      )}

      {/* Global CSS injection for spring keyframes */}
      <style>{`
        @keyframes iosSlideDown {
          0% {
            transform: translate(-50%, -100px);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};


export default BillingMachineInterface;
