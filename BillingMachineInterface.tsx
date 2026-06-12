import React, { useState, useRef, useEffect } from 'react';
import { printThermalBill, BillData } from './ThermalPrintManager';
import { printCleanThermalBill, printCleanThermalOrderReceipt } from './CleanThermalPrint';
import { ShopConfig, PendingBill } from './types';
import PendingBillSelector from './PendingBillSelector';
import FunctionalQRCode from './FunctionalQRCode';
import UPISettings from './UPISettings';
import UPIStatusIndicator from './UPIStatusIndicator';
import ItemListManager from './ItemListManager';
import ManualEntry from './ManualEntry';
import apiService from './api';
import { syncOfflineBills } from './syncService';
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
  onOpenCustomerPortal?: () => void;
  onOpenReceiptPortal?: () => void;
}

const BillingMachineInterface: React.FC<BillingMachineInterfaceProps> = ({ onLogout, onSwitchToAdmin, onOpenCustomerPortal, onOpenReceiptPortal }) => {
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
  const [currentKgPcs, setCurrentKgPcs] = useState('');
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
  const [showTagOffsetSettings, setShowTagOffsetSettings] = useState(false);
  const [tagPrintOffset, setTagPrintOffset] = useState<number>(() => {
    return parseInt(localStorage.getItem('tag_print_offset') || '0', 10);
  });
  const [showItemListManager, setShowItemListManager] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [reminderTrigger, setReminderTrigger] = useState(0);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [customerPendingDue, setCustomerPendingDue] = useState<{amount: number, count: number, bills: PendingBill[]}>({amount: 0, count: 0, bills: []});
  const [showQuickDiscount, setShowQuickDiscount] = useState(false);
  const [enableGST, setEnableGST] = useState(false);
  const [customDiscountType, setCustomDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [lastBillTotal, setLastBillTotal] = useState(0);
  const [customerSuggestions, setCustomerSuggestions] = useState<Array<{name: string, phone: string, lastBill?: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastGeneratedBill, setLastGeneratedBill] = useState<ShareableBillData | null>(null);
  const [showStickerPrintModal, setShowStickerPrintModal] = useState(false);
  const [stickerPrintCopies, setStickerPrintCopies] = useState('1');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Client intake requests states
  const [clientRequests, setClientRequests] = useState<any[]>([]);
  const [showClientRequestsModal, setShowClientRequestsModal] = useState(false);
  
  // Order Receipt States
  const [showOrderReceiptModal, setShowOrderReceiptModal] = useState(false);
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
  const [receiptTotalClothes, setReceiptTotalClothes] = useState('');
  const [receiptTotalWeight, setReceiptTotalWeight] = useState('');
  
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

  const handleApplyCustomDiscount = (rawVal: string) => {
    const trimmed = rawVal.trim();
    if (!trimmed) return;
    
    let isPercent = customDiscountType === 'percentage';
    let cleanVal = trimmed;
    if (trimmed.endsWith('%')) {
      isPercent = true;
      cleanVal = trimmed.slice(0, -1).trim();
    }
    
    const value = parseFloat(cleanVal);
    if (!isNaN(value) && value > 0) {
      if (isPercent) {
        const subtotal = calculateSubtotal();
        setDiscount(Math.round((subtotal * value) / 100));
      } else {
        setDiscount(value);
      }
      setShowQuickDiscount(false);
    }
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

  const fetchClientRequests = async () => {
    try {
      const res = await apiService.getCustomerRequests('pending');
      if (res && res.success) {
        setClientRequests(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch client requests:', error);
    }
  };

  const loadClientRequest = (request: any) => {
    let rawPhone = request.customerPhone || '';
    if (rawPhone.startsWith('+91')) {
      rawPhone = rawPhone.slice(3);
    }
    setCustomer({
      name: request.customerName,
      phone: rawPhone
    });

    const loadedItems = request.items.map((item: any) => {
      const match = quickItems.find(q => q.name.toLowerCase() === item.itemName.toLowerCase());
      const price = match ? match.price : 0;
      return {
        id: `${Date.now()}-${Math.random()}`,
        name: item.itemName,
        quantity: item.quantity,
        price: price,
        washType: item.serviceType,
        total: price * item.quantity
      };
    });

    setOrderItems(loadedItems);

    apiService.updateCustomerRequestStatus(request._id, 'approved')
      .then(() => {
        fetchClientRequests();
      })
      .catch(err => console.error('Error approving request:', err));

    setShowClientRequestsModal(false);
    showAlert({ message: `Loaded request ${request.requestNumber} for ${request.customerName} into checkout cart!`, type: 'success' });
  };

  const rejectClientRequest = async (id: string) => {
    try {
      const res = await apiService.updateCustomerRequestStatus(id, 'rejected');
      if (res && res.success) {
        showAlert({ message: 'Request rejected successfully', type: 'success' });
        fetchClientRequests();
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  useEffect(() => {
    setBillNumber(`GZ${Date.now().toString().slice(-6)}`);
    loadShopConfig();
    fetchClientRequests();

    const interval = setInterval(fetchClientRequests, 30000);

    if (itemInputRef.current) {
      itemInputRef.current.focus();
    }

    return () => clearInterval(interval);
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

  // Trigger offline sync on load, on network status change, and periodically
  useEffect(() => {
    // Initial sync
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      syncOfflineBills();
    }

    const handleOnline = () => {
      console.log('🌐 Internet connection restored. Triggering sync...');
      setIsOnline(true);
      syncOfflineBills();
    };

    const handleOffline = () => {
      console.log('🔌 Internet connection lost.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Periodically sync every 30 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncOfflineBills();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
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

      // Load system preferences for thank you message, terms & conditions, and logo print setting
      const savedPrefs = localStorage.getItem('genz_system_prefs');
      let thankYou = 'Thank you for choosing Gen-z laundry!';
      let terms = '';
      let printLogo = true;
      if (savedPrefs) {
        try {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.thankYouMessage) thankYou = prefs.thankYouMessage;
          if (prefs.termsAndConditions) terms = prefs.termsAndConditions;
          if (prefs.printLogo !== undefined) printLogo = prefs.printLogo;
        } catch (e) {}
      }

      const taxableSubtotal = currentOrderSubtotal + pendingBillsSubtotal + previousBalance - discount;
      const calculatedGst = enableGST && shopConfig.gstNumber && taxableSubtotal > 0
        ? Math.round((taxableSubtotal - (taxableSubtotal / 1.18)) * 100) / 100
        : undefined;

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
        gstNumber: enableGST ? shopConfig.gstNumber : undefined,
        gst: enableGST ? calculatedGst : undefined,
        grandTotal: calculateTotal(),
        status: 'completed',
        thankYouMessage: thankYou,
        termsAndConditions: terms || undefined,
        printLogo: printLogo
      };

      console.log('🧾 Processing bill:', billData);

      // Online requirement check
      if (!navigator.onLine) {
        showAlert({ message: '⚠️ Internet connection required! You cannot generate or print bills while offline.', type: 'error' });
        setIsProcessing(false);
        return;
      }

      // Save to database first
      let databaseSaveSuccess = false;
      let serverBillId = '';
      try {
        console.log('💾 Saving bill to database...');
        const response = await apiService.createBill(billData);
        if (response.success) {
          console.log('✅ Bill saved to database:', response.data);
          databaseSaveSuccess = true;
          serverBillId = (response.data as any)?._id || (response.data as any)?.id;
          
          // Save to local storage history only after database save success
          try {
            const existingHistory = JSON.parse(localStorage.getItem('laundry_bill_history') || '[]');
            const billForHistory = {
              ...billData,
              id: serverBillId,
              _id: serverBillId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              _syncedToDb: true
            };
            existingHistory.unshift(billForHistory);
            if (existingHistory.length > 500) existingHistory.splice(500);
            localStorage.setItem('laundry_bill_history', JSON.stringify(existingHistory));
            console.log('✅ Bill saved to localStorage history');
          } catch (localError) {
            console.error('❌ localStorage save error:', localError);
          }

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
          showAlert({ message: `❌ Failed to save bill to server: ${response.message}`, type: 'error' });
          setIsProcessing(false);
          return;
        }
      } catch (apiError) {
        console.warn('⚠️ Database unavailable:', apiError);
        showAlert({ message: '⚠️ Connection error! Could not connect to the server to generate this bill.', type: 'error' });
        setIsProcessing(false);
        return;
      }

      // Remove selected pending bills from storage (they're now completed)
      if (selectedPendingBills.length > 0) {
        console.log('🔄 Updating pending bills status...');
        const historyRaw = localStorage.getItem('laundry_bill_history');
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        
        for (const bill of selectedPendingBills) {
          const billId = bill.id || bill._id;
          let isSynced = false;
          try {
            const response = await apiService.updateBillStatus(billId, 'completed');
            if (response.success) {
              console.log(`✅ Updated bill ${bill.billNumber} status to completed`);
              isSynced = true;
            }
          } catch (error) {
            console.warn('⚠️ Could not update bill status via API, setting dirty for sync:', error);
          }
          
          // Mark as completed locally and update/add to history
          const hIdx = history.findIndex((b: any) => b.billNumber === bill.billNumber);
          if (hIdx !== -1) {
            history[hIdx] = {
              ...history[hIdx],
              status: 'completed',
              _syncedToDb: isSynced,
              _dirty: !isSynced
            };
          } else {
            // It was not in history (because it was generated as pending). Add it now as completed!
            history.unshift({
              ...bill,
              status: 'completed',
              _syncedToDb: isSynced,
              _dirty: !isSynced
            });
          }
        }
        localStorage.setItem('laundry_bill_history', JSON.stringify(history));
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
        gstNumber: billData.gstNumber,
        gst: billData.gst,
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

  const processOrderReceipt = async () => {
    if (!customer.name || orderItems.length === 0) {
      showAlert({ message: 'Please enter customer name and add items', type: 'warning' });
      return;
    }

    setIsProcessing(true);
    setShowOrderReceiptModal(false);

    try {
      const finalServiceType = receiptServiceType === 'Custom' ? receiptCustomServiceType : receiptServiceType;
      const advancePaidNum = parseFloat(receiptAdvancePaid) || 0;
      const total = calculateTotal();
      const currentOrderSubtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
      const pendingBillsSubtotal = selectedPendingBills.reduce((sum, bill) => sum + bill.grandTotal, 0);

      // Load logo preference
      const savedPrefs = localStorage.getItem('genz_system_prefs');
      let thankYou = 'Please keep this receipt for collection.';
      let printLogo = true;
      if (savedPrefs) {
        try {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.thankYouMessage) thankYou = prefs.thankYouMessage;
          if (prefs.printLogo !== undefined) printLogo = prefs.printLogo;
        } catch (e) {}
      }

      const receiptTaxableSubtotal = currentOrderSubtotal + pendingBillsSubtotal + previousBalance - discount;
      const receiptCalculatedGst = enableGST && shopConfig.gstNumber && receiptTaxableSubtotal > 0
        ? Math.round((receiptTaxableSubtotal - (receiptTaxableSubtotal / 1.18)) * 100) / 100
        : undefined;

      const billData: PendingBill = {
        id: `local_${Date.now()}`,
        businessName: shopConfig.shopName,
        address: shopConfig.address,
        phone: shopConfig.contact,
        billNumber,
        billDate,
        customerName: customer.name,
        customerPhone: customer.phone ? `${countryCode}${customer.phone}` : '',
        items: orderItems.map(item => ({
          name: `${item.name} (${item.washType})`,
          quantity: item.quantity,
          rate: item.price,
          amount: item.total
        })),
        subtotal: currentOrderSubtotal + pendingBillsSubtotal + previousBalance,
        discount,
        deliveryCharge,
        previousBalance,
        gstNumber: enableGST ? shopConfig.gstNumber : undefined,
        gst: enableGST ? receiptCalculatedGst : undefined,
        grandTotal: total,
        status: 'pending',
        paymentStatus: advancePaidNum === 0 ? 'unpaid' : (advancePaidNum >= total ? 'paid' : 'partial'),
        amountPaid: advancePaidNum,
        amountDue: total - advancePaidNum,
        paymentHistory: advancePaidNum > 0 ? [{ amount: advancePaidNum, date: new Date().toISOString(), note: 'Advance: ' + receiptPaymentMethod }] : [],
        deliveryDate: receiptDeliveryDate,
        serviceType: finalServiceType,
        thankYouMessage: thankYou,
        printLogo: printLogo,
        receiptMode,
        totalClothes: receiptTotalClothes ? parseInt(receiptTotalClothes, 10) : undefined,
        totalWeight: receiptTotalWeight ? parseFloat(receiptTotalWeight) : undefined,
        createdAt: new Date().toISOString()
      };

      console.log('🧾 Processing order receipt:', billData);

      // Online requirement check
      if (!navigator.onLine) {
        showAlert({ message: '⚠️ Internet connection required! You cannot generate or print receipts while offline.', type: 'error' });
        setIsProcessing(false);
        return;
      }

      // Save to database first
      let databaseSaveSuccess = false;
      let serverBillId = '';
      try {
        console.log('💾 Saving pending order to database...');
        // Strip out the client-side ID since it is temporary
        const { id, ...cleanBillData } = billData;
        const response = await apiService.createBill(cleanBillData);
        if (response.success) {
          console.log('✅ Pending order saved to database:', response.data);
          databaseSaveSuccess = true;
          serverBillId = (response.data as any)?._id || (response.data as any)?.id;

          // Save to local storage only after database save success
          try {
            const finalBillData = {
              ...billData,
              id: serverBillId,
              _id: serverBillId,
              _syncedToDb: true
            };
            
            // Save to pending bills local storage
            const existingPending = JSON.parse(localStorage.getItem('laundry_pending_bills') || '[]');
            existingPending.unshift(finalBillData);
            if (existingPending.length > 500) existingPending.splice(500);
            localStorage.setItem('laundry_pending_bills', JSON.stringify(existingPending));

            console.log('✅ Order receipt saved to localStorage');

            // Automatically create a manual entry for this generated receipt
            try {
              const manualEntryItems = billData.items.map(item => {
                const match = item.name.match(/^(.*?)\s*\((.*?)\)$/);
                const itemName = match ? match[1].trim() : item.name;
                const washTypeRaw = match ? match[2].trim().toUpperCase() : 'WASH';
                
                let serviceType: 'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN' = 'WASH';
                if (washTypeRaw.includes('WASH') && washTypeRaw.includes('IRON')) {
                  serviceType = 'WASH+IRON';
                } else if (washTypeRaw.includes('IRON')) {
                  serviceType = 'IRON';
                } else if (washTypeRaw.includes('DRY')) {
                  serviceType = 'DRY CLEAN';
                }
                
                let unit: 'pcs' | 'kg' = 'pcs';
                if (item.name.toLowerCase().includes('kg')) {
                  unit = 'kg';
                }
                return {
                  serviceType,
                  quantity: item.quantity,
                  unit,
                  itemName
                };
              });

              const manualEntryData = {
                customerName: billData.customerName,
                phone: billData.customerPhone,
                pickupDate: new Date().toISOString().split('T')[0],
                pickupTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
                deliveryDate: billData.deliveryDate || new Date().toISOString().split('T')[0],
                deliveryTime: '',
                items: manualEntryItems,
                paymentStatus: billData.paymentStatus,
                partialAmount: billData.paymentStatus === 'partial' ? billData.amountPaid : undefined,
                status: 'completed',
                remark: `Auto-generated from Order Receipt #${billData.billNumber}`
              };
              console.log('💾 Auto-creating manual entry:', manualEntryData);
              apiService.createManualEntry(manualEntryData).catch(err => console.error('⚠️ Failed to auto-create manual entry:', err));
            } catch (meErr) {
              console.error('⚠️ Failed to map manual entry:', meErr);
            }
          } catch (localError) {
            console.error('❌ localStorage save error:', localError);
          }

          // AUTOMATICALLY SEND BACKGROUND SMS
          if (billData.customerPhone && billData.customerPhone.length >= 10) {
            try {
              console.log('📱 Automatically triggering background SMS for pending order...');
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
          showAlert({ message: `❌ Failed to save receipt to server: ${response.message}`, type: 'error' });
          setIsProcessing(false);
          return;
        }
      } catch (apiError) {
        console.warn('⚠️ Database unavailable:', apiError);
        showAlert({ message: '⚠️ Connection error! Could not connect to the server to generate this receipt.', type: 'error' });
        setIsProcessing(false);
        return;
      }

      // Print the Order Receipt using premium thermal layout
      console.log('🖨️ Printing order receipt...');
      await printCleanThermalOrderReceipt(billData, (message) => showAlert({ message, type: 'error' }));

      // Print clothing tags if option is selected
      if (receiptPrintTags) {
        const tagsCustomer = { ...customer };
        const tagsItems = [...orderItems];
        const tagsBillNumber = billNumber;
        setTimeout(async () => {
          console.log('🖨️ Triggering clothing tags print...');
          await printClothingTags(tagsCustomer, tagsItems, tagsBillNumber);
        }, 1000);
      }

      showAlert({ 
        message: `✅ Order receipt generated successfully! Saved to receipt history.\nOrder Number: ${billData.billNumber}`, 
        type: 'success' 
      });

      // Reset cart and customer data
      setOrderItems([]);
      setCustomer({ name: '', phone: '' });
      setSelectedPendingBills([]);
      setDiscount(0);
      setDeliveryCharge(0);
      setPreviousBalance(0);
      setReceiptAdvancePaid('0');
      
      // Generate next bill number
      setBillNumber(`GZ${Date.now().toString().slice(-6)}`);
    } catch (error) {
      console.error('❌ Order receipt processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showAlert({ message: `Order receipt processing failed: ${errorMessage}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const printClothingTags = async (
    customCustomer?: { name: string; phone: string },
    customItems?: any[],
    customBillNumber?: string
  ) => {
    // If called from onClick directly, customCustomer might be a React MouseEvent
    const isCustomerObject = customCustomer && typeof customCustomer === 'object' && 'name' in customCustomer;
    const activeCustomer = isCustomerObject ? customCustomer : customer;
    const activeItems = Array.isArray(customItems) ? customItems : orderItems;
    const activeBillNumber = typeof customBillNumber === 'string' ? customBillNumber : billNumber;

    if (!activeCustomer.name || activeItems.length === 0) {
      showAlert({ message: 'Please add items and customer name first', type: 'warning' });
      return;
    }

    const tags: any[] = [];
    let tagCounter = 1;
    const totalTags = activeItems.reduce((sum, item) => sum + item.quantity, 0);
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    activeItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        tags.push({
          businessName: shopConfig.shopName,
          billNumber: activeBillNumber,
          customerName: activeCustomer.name,
          customerPhone: activeCustomer.phone ? `${countryCode}${activeCustomer.phone}` : '',
          itemName: item.name.toUpperCase(),
          washType: item.washType,
          tagIndex: tagCounter,
          totalTags: totalTags,
          date: currentDate,
          barcode: `GZ${activeBillNumber}${tagCounter.toString().padStart(3, '0')}`,
          qrCode: `GZ${activeBillNumber}${tagCounter.toString().padStart(3, '0')}`,
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
      } else {
        throw new Error(response.message || 'API responded with success: false');
      }
    } catch (error) {
      console.error('❌ Failed to save tag history, caching offline:', error);
      try {
        const unsyncedTags = JSON.parse(localStorage.getItem('laundry_unsynced_tags') || '[]');
        unsyncedTags.push({ tags, timestamp: new Date().toISOString() });
        localStorage.setItem('laundry_unsynced_tags', JSON.stringify(unsyncedTags));
        console.log('📦 Saved tag history to offline cache');
      } catch (localErr) {
        console.error('❌ Failed to cache tag history offline:', localErr);
      }
    }

    // Try TSPL direct print via thermal server (TSC TL240)
    try {
      const tsplResponse = await fetch('http://localhost:3001/api/print/tspl-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags, printerName: 'TSC TL240', shiftDots: tagPrintOffset })
      });
      const tsplResult = await tsplResponse.json();
      if (tsplResult.success) {
        showAlert({ message: `✅ ${tags.length} tags sent to TSC TL240`, type: 'success' });
        return; // Done — no browser print needed
      }
      console.warn('TSPL print failed, falling back to browser print:', tsplResult.message);
    } catch (tsplError) {
      console.warn('Thermal server not running, using browser print fallback:', tsplError);
    }

    // Fallback: browser print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showAlert({ message: 'Please allow popups for tag printing', type: 'warning' });
      return;
    }

    const tagHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Clothing Tags - TSC TL240</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* TSC TL240 — 37mm wide roll, 40mm height */
    @page {
      size: 37mm 40mm;
      margin: 0 !important;
    }

    @media print {
      html, body {
        width: 37mm !important;
        height: 40mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .tag {
        page-break-after: always;
        page-break-inside: avoid;
      }
      .tag:last-child {
        page-break-after: avoid;
      }
    }

    body {
      font-family: 'Outfit', 'Arial Black', 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      width: 37mm;
      height: 40mm;
    }

    .tag {
      width: 37mm;
      height: 38mm;
      margin: 1mm auto;
      padding: 1mm 1.5mm;
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }

    .top-header {
      text-align: center;
      padding-bottom: 0.8mm;
      border-bottom: 1.2px dashed #000;
    }
    .brand-line1 {
      font-size: 11pt;
      font-weight: 900;
      display: block;
      letter-spacing: 0.3px;
      line-height: 1.1;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .brand-line2 {
      font-size: 6.5pt;
      font-weight: 800;
      display: block;
      line-height: 1.1;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-top: 0.2mm;
      white-space: nowrap;
    }

    .tag-date {
      font-size: 7.5pt;
      font-weight: 700;
      text-align: center;
      line-height: 1;
      margin: 0.3mm 0;
      color: #000;
      letter-spacing: 0.8px;
      white-space: nowrap;
    }

    .customer-name {
      text-align: center;
      font-size: 13pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      padding: 0.8mm 0;
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      margin: 0.2mm 0;
    }

    .service-type {
      text-align: center;
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0.2mm 0;
      white-space: nowrap;
    }

    .bill-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0.2mm 0;
    }

    .bill-no {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      font-weight: bold;
    }

    .tag-number {
      font-size: 9pt;
      font-weight: 800;
      border: 1px solid #000;
      color: #000;
      padding: 0.3mm 1.5mm;
      border-radius: 3px;
      white-space: nowrap;
    }

    .website {
      text-align: center;
      font-size: 7pt;
      font-weight: 500;
      padding-top: 0.5mm;
      border-top: 1px dashed #000;
      letter-spacing: 1.2px;
      text-transform: lowercase;
      white-space: nowrap;
    }
  </style>
</head>
<body>

  ${tags.map((tag, index) => {
    const nameLen = (tag.customerName || '').length;
    let fontSize = '13pt';
    if (nameLen > 15) fontSize = '8pt';
    else if (nameLen > 11) fontSize = '9.5pt';
    else if (nameLen > 7) fontSize = '11pt';

    // Normalize washType
    const rawType = (tag.washType || '').toUpperCase().trim();
    let serviceLabel = rawType;
    if (rawType === 'WASH') serviceLabel = 'WASH ONLY';
    else if (rawType === 'IRON') serviceLabel = 'IRON ONLY';
    else if (rawType === 'WASH+IRON') serviceLabel = 'WASH + IRON';
    else if (rawType === 'DRY CLEAN') serviceLabel = 'DRY CLEAN';

    return `
    <div class="tag">
      <div class="top-header">
        <span class="brand-line1">Gen-Z Laundry</span>
        <span class="brand-line2">&amp; Dry Cleaners</span>
      </div>

      <div class="tag-date">&bull; ${tag.date} &bull;</div>

      <div class="customer-name" style="font-size: ${fontSize}">${tag.customerName}</div>

      <div class="service-type">${serviceLabel}</div>

      <div class="bill-info">
        <span class="bill-no">${tag.billNumber}</span>
        <span class="tag-number">${tag.tagIndex} / ${tag.totalTags}</span>
      </div>

      <div class="website">www.genzlaundry.com</div>
    </div>
  `;
  }).join('')}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 1500);
      }, 600);
    }
  </script>
</body>
</html>
    `;

    printWindow.document.write(tagHTML);
    printWindow.document.close();
  };

  const getFlattenedStickerLogo = (): Promise<string> => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.src = '/sticker.png';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          try {
            resolve(canvas.toDataURL('image/jpeg', 0.95));
          } catch (e) {
            resolve('/sticker.png');
          }
        } else {
          resolve('/sticker.png');
        }
      };
      img.onerror = () => {
        resolve('/sticker.png');
      };
    });
  };

  const printPackStickers = () => {
    setStickerPrintCopies('1');
    setShowStickerPrintModal(true);
  };

  const executeStickerPrint = async (copies: number) => {
    const logoDataUrl = await getFlattenedStickerLogo();

    // Fallback: browser print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showAlert({ message: 'Please allow popups for sticker printing', type: 'warning' });
      return;
    }

    let rowsHTML = '';
    const numRows = Math.ceil(copies / 2);
    for (let r = 0; r < numRows; r++) {
      const leftIndex = r * 2;
      const rightIndex = r * 2 + 1;
      
      const leftSticker = `
        <div class="sticker">
          <!-- Top Row: Flanking side texts and center logo -->
          <div class="top-side-text left">
            PREMIUM<br/>CARE
            <div class="side-divider"><span>✦</span></div>
          </div>
          
          <div class="logo-container">
            <img src="${logoDataUrl}" alt="Gen-Z Logo" onerror="this.style.display='none'; document.getElementById('text-logo-l-${r}').style.display='block';" />
            <div id="text-logo-l-${r}" class="text-logo" style="display: none;">
              <div class="glow-text">Gen-Z</div>
            </div>
          </div>

          <div class="top-side-text right">
            QUALITY<br/>YOU TRUST
            <div class="side-divider"><span>✦</span></div>
          </div>

          <!-- Brand Name Text -->
          <div class="brand-title">GEN-Z</div>
          <div class="brand-subtitle">LAUNDRY & DRY CLEANERS</div>



          <!-- Black Chevron Ribbon Tagline Banner -->
          <div class="black-banner">
            &bigstar; CLEANED WITH CARE &bull; DELIVERED WITH TRUST &bigstar;
          </div>

          <!-- Website Contrast Capsule Footer -->
          <div class="website-capsule">
            <svg class="globe-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span class="website-text">www.genzlaundry.com</span>
          </div>
        </div>
      `;

      let rightSticker = '';
      if (rightIndex < copies) {
        rightSticker = `
        <div class="sticker">
          <!-- Top Row: Flanking side texts and center logo -->
          <div class="top-side-text left">
            PREMIUM<br/>CARE
            <div class="side-divider"><span>✦</span></div>
          </div>
          
          <div class="logo-container">
            <img src="${logoDataUrl}" alt="Gen-Z Logo" onerror="this.style.display='none'; document.getElementById('text-logo-r-${r}').style.display='block';" />
            <div id="text-logo-r-${r}" class="text-logo" style="display: none;">
              <div class="glow-text">Gen-Z</div>
            </div>
          </div>

          <div class="top-side-text right">
            QUALITY<br/>YOU TRUST
            <div class="side-divider"><span>✦</span></div>
          </div>

          <!-- Brand Name Text -->
          <div class="brand-title">GEN-Z</div>
          <div class="brand-subtitle">LAUNDRY & DRY CLEANERS</div>



          <!-- Black Chevron Ribbon Tagline Banner -->
          <div class="black-banner">
            &bigstar; CLEANED WITH CARE &bull; DELIVERED WITH TRUST &bigstar;
          </div>

          <!-- Website Contrast Capsule Footer -->
          <div class="website-capsule">
            <svg class="globe-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span class="website-text">www.genzlaundry.com</span>
          </div>
        </div>
        `;
      } else {
        rightSticker = `<div class="sticker blank"></div>`;
      }

      rowsHTML += `
        <div class="print-row">
          ${leftSticker}
          ${rightSticker}
        </div>
      `;
    }

    const stickerHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Packaging Stickers - Gen-Z Laundry</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: 105mm 50mm;
      margin: 0 !important;
    }

    @media print {
      html, body {
        width: 105mm !important;
        height: 50mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-row {
        page-break-after: always;
        page-break-inside: avoid;
      }
      .print-row:last-child {
        page-break-after: avoid;
      }
    }

    body {
      font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      width: 105mm;
      height: 50mm;
      overflow: hidden;
    }

    .print-row {
      display: flex;
      justify-content: flex-start;
      width: 105mm;
      height: 50mm;
      padding: 0.5mm 0 0 1mm;
      box-sizing: border-box;
      align-items: flex-start;
    }

    .sticker {
      width: 48mm;
      height: 47mm;
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      box-sizing: border-box;
      border: none;
      padding: 1.5mm 1mm 1.5mm 1mm;
      position: relative;
      overflow: hidden;
    }

    .sticker + .sticker {
      margin-left: 5mm;
    }

    .sticker.blank {
      border: none;
      visibility: hidden;
    }

    .logo-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 50%;
      height: 13mm;
      z-index: 2;
    }

    .brand-title {
      font-size: 18pt;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #000;
      text-align: center;
      line-height: 1;
      margin-top: 2.2mm;
      margin-bottom: 0.5mm;
      z-index: 2;
    }

    .brand-subtitle {
      font-size: 6.5pt;
      font-weight: 900;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #000;
      text-align: center;
      line-height: 1;
      margin-bottom: 1.5mm;
      z-index: 2;
    }

    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .text-logo {
      text-align: center;
    }

    .glow-text {
      font-size: 16pt;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      line-height: 1;
      color: #000;
    }

    .top-side-text {
      position: absolute;
      top: 5mm;
      font-size: 5.2pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-align: center;
      color: #000;
      width: 13mm;
      z-index: 2;
      line-height: 1.15;
    }

    .top-side-text.left {
      left: 1.5mm;
    }

    .top-side-text.right {
      right: 1.5mm;
    }

    .side-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin-top: 1mm;
      position: relative;
    }

    .side-divider::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 0.5px;
      background: #000;
    }

    .side-divider span {
      background: #fff;
      font-size: 5pt;
      padding: 0 0.8mm;
      z-index: 3;
      color: #000;
      position: relative;
      line-height: 1;
    }

    .subheader-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      gap: 1.5mm;
      z-index: 2;
    }

    .sub-line {
      flex: 1;
      height: 0.8px;
      background: #000;
    }

    .subheader-text {
      font-size: 5.5pt;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      white-space: nowrap;
      color: #000;
    }

    .icons-row {
      display: flex;
      align-items: center;
      justify-content: space-around;
      width: 100%;
      padding: 0;
      z-index: 2;
    }

    .icon-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1mm;
      width: 12mm;
    }

    .circle-icon {
      width: 7.5mm;
      height: 7.5mm;
      border: 1px solid #000;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5mm;
      background: #fff;
    }

    .circle-icon svg {
      width: 100%;
      height: 100%;
      color: #000;
    }

    .icon-label {
      font-size: 4.5pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #000;
    }

    .row-divider {
      height: 8mm;
      width: 1px;
      background: #000;
      position: relative;
      margin-bottom: 3.5mm;
    }

    .row-divider::after {
      content: '✦';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      font-size: 6pt;
      padding: 0.5mm 0;
      color: #000;
    }

    .black-banner {
      background: #000;
      color: #fff;
      padding: 1.2mm 1.5mm;
      width: 100%;
      text-align: center;
      font-size: 4.5pt;
      font-weight: 900;
      letter-spacing: 0.2px;
      text-transform: uppercase;
      z-index: 2;
      position: relative;
      clip-path: polygon(2% 0%, 98% 0%, 96% 50%, 98% 100%, 2% 100%, 4% 50%);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      white-space: nowrap;
    }

    .website-capsule {
      background: #000;
      color: #fff;
      border-radius: 50px;
      width: 100%;
      height: 7.2mm;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5mm;
      position: relative;
      z-index: 2;
      border: 1px solid #000;
      box-shadow: inset 0 0 0 1px #fff;
    }



    .globe-icon {
      width: 3.2mm;
      height: 3.2mm;
      color: #fff;
    }

    .website-text {
      font-size: 9.5pt;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #fff;
      text-align: center;
      text-transform: lowercase;
      line-height: 1;
    }
  </style>
</head>
<body>
  ${rowsHTML}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 1500);
      }, 600);
    }
  <\/script>
</body>
</html>
    `;

    printWindow.document.write(stickerHTML);
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

      {!isOnline && (
        <div style={{
          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          color: '#ffffff',
          padding: '10px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '700',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          letterSpacing: '0.5px',
          zIndex: 999
        }}>
          <i className="fas fa-wifi-slash"></i>
          Offline Mode: Internet connection required to generate or print bills and receipts.
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
              {onOpenReceiptPortal && (
                <button
                  onClick={onOpenReceiptPortal}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#10b981' }}
                >
                  <i className="fas fa-receipt"></i> Receipt Portal
                </button>
              )}
              {onOpenCustomerPortal && (
                <button
                  onClick={onOpenCustomerPortal}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#38bdf8' }}
                >
                  <i className="fas fa-file-signature"></i> Customer Portal
                </button>
              )}
              <button
                onClick={() => setShowClientRequestsModal(true)}
                className="btn btn-ghost btn-sm"
                style={{ position: 'relative' }}
              >
                <i className="fas fa-inbox"></i> Requests
                {clientRequests.length > 0 && (
                  <span style={{
                    position: 'absolute', top: '-6px', right: '-4px',
                    background: '#ef4444', color: 'white', borderRadius: '50%',
                    width: '18px', height: '18px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '10px',
                    fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}>{clientRequests.length}</span>
                )}
              </button>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '4px' }}>
                      <input
                        type="number"
                        value={currentKg}
                        onChange={(e) => setCurrentKg(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Weight (kg)"
                        step="0.1"
                        min="0"
                        className="professional-input"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '0 0 0 8px',
                          fontSize: '15px',
                          fontWeight: '600',
                          textAlign: 'center',
                          border: '1px solid #4b5563',
                          borderTop: '1px solid #10b981',
                          borderRight: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <input
                        type="number"
                        value={currentKgPcs}
                        onChange={(e) => setCurrentKgPcs(e.target.value.replace(/[^0-9]/g, ''))}
                        onFocus={(e) => e.target.select()}
                        placeholder="Pcs"
                        min="1"
                        className="professional-input"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '0 0 8px 0',
                          fontSize: '15px',
                          fontWeight: '600',
                          textAlign: 'center',
                          border: '1px solid #4b5563',
                          borderTop: '1px solid #10b981',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
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
                Manage ({orderItems.length} {orderItems.length === 1 ? 'Item' : 'Items'} / {orderItems.reduce((sum, item) => {
                  const pcsMatch = item.name.match(/\((\d+)\s*pcs\)/i);
                  if (pcsMatch) return sum + parseInt(pcsMatch[1], 10);
                  const kgMatch = item.name.match(/\((\d+\.?\d*)\s*kg/i);
                  return sum + (kgMatch ? 0 : item.quantity);
                }, 0)} Pcs)
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
                onClick={printPackStickers}
                className="professional-btn"
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer'
                }}
                title="Print packaging brand sticker"
              >
                <i className="fas fa-box" style={{ marginRight: '4px' }}></i> Sticker
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

              {/* GST Toggle */}
              <button
                onClick={() => setEnableGST(prev => !prev)}
                className="professional-btn"
                style={{
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: enableGST ? '#e74c3c' : 'rgba(255,255,255,0.1)',
                  color: enableGST ? 'white' : 'rgba(255,255,255,0.6)',
                  fontSize: '11px',
                  fontWeight: '600',
                  border: enableGST ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.2s'
                }}
                title={enableGST ? 'GST enabled — click to disable' : 'Click to enable GST (18%)'}
              >
                GST {enableGST ? 'ON' : 'OFF'}
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
              {/* Tag offset settings button */}
              <button
                onClick={() => setShowTagOffsetSettings(true)}
                className="btn btn-ghost"
                style={{ padding: '14px', borderRadius: '12px', fontSize: '13px' }}
                title="Adjust tag print position"
              >
                <i className="fas fa-sliders-h"></i>
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

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                onClick={processOrder}
                disabled={!customer.name || (orderItems.length === 0 && selectedPendingBills.length === 0 && previousBalance === 0) || isProcessing || !isOnline}
                className="btn btn-success"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  letterSpacing: '1px',
                  fontWeight: '800',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
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
      </div>

      {/* Order Receipt Configuration Modal */}
      {showOrderReceiptModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            width: '420px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-file-invoice" style={{ color: '#3b82f6' }}></i>
              Order Deposit Receipt
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Confirm laundry deposit settings for <strong>{customer.name}</strong> ({orderItems.reduce((s, i) => s + i.quantity, 0)} items).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* Delivery Date */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Delivery / Pickup Date
                </label>
                <input
                  type="date"
                  value={receiptDeliveryDate}
                  onChange={(e) => setReceiptDeliveryDate(e.target.value)}
                  className="professional-input"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                />
                {/* Quick Date Presets */}
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
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: isSelected ? '#3b82f6' : 'var(--bg-base)',
                          color: isSelected ? 'white' : 'var(--text-secondary)'
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
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Service Type
                </label>
                <select
                  value={receiptServiceType}
                  onChange={(e) => setReceiptServiceType(e.target.value)}
                  className="professional-input"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
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
                    placeholder="Enter custom service type (e.g. Wash & Hang)"
                    value={receiptCustomServiceType}
                    onChange={(e) => setReceiptCustomServiceType(e.target.value)}
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      marginTop: '8px'
                    }}
                  />
                )}
              </div>

              {/* Advance Payment Details */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Advance Paid (Optional)
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ position: 'relative', flex: 1.2 }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-muted)' }}>₹</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={receiptAdvancePaid}
                      onChange={(e) => {
                        const val = e.target.value;
                        const maxVal = calculateTotal();
                        if (parseFloat(val) > maxVal) {
                          setReceiptAdvancePaid(maxVal.toString());
                        } else {
                          setReceiptAdvancePaid(val);
                        }
                      }}
                      className="professional-input"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 24px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <select
                    value={receiptPaymentMethod}
                    onChange={(e) => setReceiptPaymentMethod(e.target.value as any)}
                    className="professional-input"
                    disabled={parseFloat(receiptAdvancePaid) <= 0}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      cursor: parseFloat(receiptAdvancePaid) <= 0 ? 'not-allowed' : 'pointer',
                      opacity: parseFloat(receiptAdvancePaid) <= 0 ? 0.5 : 1
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                {parseFloat(receiptAdvancePaid) > 0 && (
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '6px', fontWeight: '600' }}>
                    Balance Due: ₹{calculateTotal() - (parseFloat(receiptAdvancePaid) || 0)}
                  </div>
                )}
              </div>

              {/* Receipt Formatting Mode */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Receipt Billing Mode
                </label>
                <select
                  value={receiptMode}
                  onChange={(e) => setReceiptMode(e.target.value as any)}
                  className="professional-input"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="qty">By Quantity (Pcs only)</option>
                  <option value="weight">By Weight (Kg only)</option>
                  <option value="combined">Combined (Pcs & Weight)</option>
                </select>
              </div>

              {/* Custom Overrides for Pcs / Weight */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Override Total Pcs
                  </label>
                  <input
                    type="number"
                    placeholder={`Auto (${orderItems.reduce((sum, item) => {
                      const pcsMatch = item.name.match(/\((\d+)\s*pcs\)/i);
                      if (pcsMatch) return sum + parseInt(pcsMatch[1], 10);
                      const kgMatch = item.name.match(/\((\d+\.?\d*)\s*kg/i);
                      return sum + (kgMatch ? 0 : item.quantity);
                    }, 0)} pcs)`}
                    value={receiptTotalClothes}
                    onChange={(e) => setReceiptTotalClothes(e.target.value)}
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Override Total Kg
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Auto (${orderItems.reduce((sum, item) => {
                      const kgMatch = item.name.match(/\((\d+\.?\d*)\s*kg/i);
                      return sum + (kgMatch ? parseFloat(kgMatch[1]) : 0);
                    }, 0).toFixed(2)} kg)`}
                    value={receiptTotalWeight}
                    onChange={(e) => setReceiptTotalWeight(e.target.value)}
                    className="professional-input"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Print Tags Option */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={receiptPrintTags}
                  onChange={(e) => setReceiptPrintTags(e.target.checked)}
                  style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                />
                Print clothing tag stickers too
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={processOrderReceipt}
                disabled={!isOnline}
                className="btn btn-success"
                style={{ flex: 1.5, background: !isOnline ? 'var(--border-subtle)' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: !isOnline ? 'var(--text-secondary)' : 'white', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: !isOnline ? 'not-allowed' : 'pointer' }}
              >
                <i className="fas fa-print"></i> {!isOnline ? 'Offline' : 'Generate & Print'}
              </button>
              <button
                type="button"
                onClick={() => setShowOrderReceiptModal(false)}
                className="btn btn-ghost"
                style={{ flex: 1, padding: '12px', borderRadius: '8px', fontWeight: '600' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Tag Print Offset Settings */}
      {showTagOffsetSettings && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)',
            padding: '28px', width: '340px', border: '1px solid var(--border-subtle)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>
              <i className="fas fa-sliders-h" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
              Tag Print Position
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Fine-tune tag position. Base offset (43mm) is auto-calculated from your roll position. Use this slider only if still misaligned. Current fine-tune: <strong style={{ color: 'var(--accent)' }}>{tagPrintOffset} dots</strong> ({tagPrintOffset > 0 ? '+' : ''}{Math.round(tagPrintOffset * 25.4 / 203 * 10) / 10}mm)
            </p>

            {/* Visual slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>← Left (0)</span>
                <span>Right (400) →</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="4"
                value={tagPrintOffset}
                onChange={(e) => setTagPrintOffset(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {tagPrintOffset} dots = {Math.round(tagPrintOffset * 25.4 / 203 * 10) / 10} mm
              </div>
            </div>

            {/* Quick presets */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[0, 24, 48, 72, 96, 120, 150, 200, 250, 300].map(v => (
                <button key={v} onClick={() => setTagPrintOffset(v)} style={{
                  padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: tagPrintOffset === v ? 'var(--accent)' : 'var(--bg-base)',
                  color: tagPrintOffset === v ? 'white' : 'var(--text-secondary)',
                  fontSize: '11px', fontWeight: '600'
                }}>
                  {v === 0 ? 'None' : `${Math.round(v * 25.4 / 203 * 10) / 10}mm`}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  localStorage.setItem('tag_print_offset', tagPrintOffset.toString());
                  setShowTagOffsetSettings(false);
                  showAlert({ message: `Tag offset saved: ${tagPrintOffset} dots (${Math.round(tagPrintOffset * 25.4 / 203 * 10) / 10}mm)`, type: 'success' });
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <i className="fas fa-save" style={{ marginRight: '6px' }}></i>Save
              </button>
              <button onClick={() => setShowTagOffsetSettings(false)} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticker Print Modal */}
      {showStickerPrintModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)',
            padding: '24px', width: '320px', border: '1px solid var(--border-subtle)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div className="alert-icon alert-icon-info" style={{
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#a855f7',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                <i className="fas fa-box"></i>
              </div>
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>
              Sticker Print
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Enter the number of stickers to print:
            </p>
            <div style={{ marginBottom: '24px' }}>
              <input
                type="number"
                min="1"
                max="100"
                value={stickerPrintCopies}
                onChange={(e) => setStickerPrintCopies(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt(stickerPrintCopies, 10);
                    if (!isNaN(val) && val > 0) {
                      setShowStickerPrintModal(false);
                      executeStickerPrint(val);
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowStickerPrintModal(false)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const val = parseInt(stickerPrintCopies, 10);
                  if (!isNaN(val) && val > 0) {
                    setShowStickerPrintModal(false);
                    executeStickerPrint(val);
                  } else {
                    showAlert({ message: 'Please enter a valid number of copies', type: 'warning' });
                  }
                }}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  border: 'none',
                  color: 'white'
                }}
              >
                Print
              </button>
            </div>
          </div>
        </div>
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

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flex: 1, gap: '6px', alignItems: 'center' }}>
                {/* Segmented type selector */}
                <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(9,9,11,0.2)' }}>
                  <button
                    type="button"
                    onClick={() => setCustomDiscountType('fixed')}
                    style={{
                      padding: '10px 14px',
                      background: customDiscountType === 'fixed' ? '#3b82f6' : 'transparent',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    ₹
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomDiscountType('percentage')}
                    style={{
                      padding: '10px 14px',
                      background: customDiscountType === 'percentage' ? '#3b82f6' : 'transparent',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    %
                  </button>
                </div>
                
                {/* Input field */}
                <input
                  type="text"
                  id="custom-discount-input"
                  placeholder={customDiscountType === 'fixed' ? "Custom ₹" : "Custom %"}
                  className="professional-input"
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
                    background: 'rgba(9,9,11,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.08)',
                    outline: 'none'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyCustomDiscount((e.target as HTMLInputElement).value);
                    }
                  }}
                />
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => {
                  const input = document.getElementById('custom-discount-input') as HTMLInputElement;
                  if (input) {
                    handleApplyCustomDiscount(input.value);
                  }
                }}
                style={{
                  background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '10px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget as HTMLElement).style.background = '#2563eb'}
                onMouseOut={(e) => (e.currentTarget as HTMLElement).style.background = '#3b82f6'}
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setDiscount(0);
                  setShowQuickDiscount(false);
                }}
                style={{
                  background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '10px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget as HTMLElement).style.background = '#dc2626'}
                onMouseOut={(e) => (e.currentTarget as HTMLElement).style.background = '#ef4444'}
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

      {/* Client Intake Requests Modal */}
      {showClientRequestsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999, backdropFilter: 'blur(16px)', padding: '20px'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.85)', borderRadius: '24px', padding: '28px',
            width: '850px', maxWidth: '100%', maxHeight: '90vh', overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', fontSize: '18px' }}>🧺</span>
                Pending Client Intake Requests
              </h3>
              <button
                onClick={() => setShowClientRequestsModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {clientRequests.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '48px', opacity: 0.3 }}>📥</div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>No Pending Requests</div>
                  <div style={{ fontSize: '13px', opacity: 0.7 }}>When customers make online bookings, they will show up here in real-time.</div>
                </div>
              ) : (
                clientRequests.map((request) => (
                  <div
                    key={request._id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', padding: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '16px',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    {/* Top row Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
                            {request.requestNumber}
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
                            {request.customerName}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span><i className="fas fa-phone" style={{ marginRight: '6px' }}></i> {request.customerPhone}</span>
                          <span><i className="fas fa-calendar-alt" style={{ marginRight: '6px' }}></i> {request.pickupDate} ({request.pickupTime})</span>
                        </div>
                        {request.address && (
                          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-map-marker-alt" style={{ color: '#ef4444' }}></i>
                            <span>{request.address}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => loadClientRequest(request)}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none',
                            borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <i className="fas fa-cart-plus"></i> Load & Approve
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to reject and delete request ${request.requestNumber}?`)) {
                              rejectClientRequest(request._id);
                            }
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* Requested items list */}
                    <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Requested Items ({request.items.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {request.items.map((item: any, idx: number) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '600', color: '#0ea5e9' }}>{item.itemName}</span>
                            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>{item.serviceType}</span>
                            <span style={{ fontWeight: '700', color: '#f8fafc' }}>{item.quantity} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Remark */}
                    {request.remark && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px' }}>
                        <i className="fas fa-comment-alt" style={{ opacity: 0.6 }}></i>
                        <span>Note: "{request.remark}"</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
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
