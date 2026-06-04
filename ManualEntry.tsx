import React, { useState, useEffect, useRef } from 'react';
import { useAlert } from './GlobalAlert';
import apiService from './api';
import CountryCodePicker from './CountryCodePicker';
import { printCleanThermalOrderReceipt } from './CleanThermalPrint';

interface ManualEntryItem {
  serviceType: 'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN';
  quantity: number;
  unit: 'pcs' | 'kg';
  itemName?: string;
}

interface ManualEntryData {
  id: string;
  customerName: string;
  phone: string;
  pickupDate: string;
  pickupTime: string;
  deliveryDate: string;
  deliveryTime: string;
  serviceType: string;
  quantity: number;
  items: ManualEntryItem[];
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  partialAmount?: number;
  status: 'pending' | 'completed' | 'delivered';
  remark: string;
  createdAt: string;
}

interface ManualEntryProps {
  onClose: () => void;
}

const STORAGE_KEY = 'laundry_manual_entries';

const ManualEntry: React.FC<ManualEntryProps> = ({ onClose }) => {
  const { showAlert, showConfirm } = useAlert();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

  const [entries, setEntries] = useState<ManualEntryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLegacyLocalData, setHasLegacyLocalData] = useState(false);
  const [legacyCount, setLegacyCount] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [pickupDate, setPickupDate] = useState(today);
  const [pickupTime, setPickupTime] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  
  // States for adding items to the current manual entry
  const [serviceType, setServiceType] = useState<ManualEntryItem['serviceType']>('WASH');
  const [quantity, setQuantity] = useState<string | number>(1);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState<ManualEntryItem['unit']>('pcs');
  const [items, setItems] = useState<ManualEntryItem[]>([]);

  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('unpaid');
  const [partialAmount, setPartialAmount] = useState('');
  const [status, setStatus] = useState<ManualEntryData['status']>('pending');
  const [remark, setRemark] = useState('');
  
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'receipts'>('form');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<Array<{ name: string; phone: string; lastBill?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Order Receipt states
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');

  const searchCustomers = async (query: string) => {
    if (!query || query.trim().length < 1) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = query.toLowerCase().trim();
    const customerMap = new Map<string, { name: string; phone: string; lastBill?: string; count: number }>();

    // 1. Gather suggestions from local storage
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
      console.error('Error parsing local history:', e);
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
      console.error('Error parsing local manual entries:', e);
    }

    let suggestions = Array.from(customerMap.values())
      .sort((a, b) => b.count - a.count)
      .map(c => ({ name: c.name, phone: c.phone, lastBill: c.lastBill }));

    setCustomerSuggestions(suggestions.slice(0, 6));
    setShowSuggestions(suggestions.length > 0);

    // 2. Fetch from CRM API
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
      console.log('Customer API search failed:', apiError);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await apiService.getManualEntries();
      if (response && response.success && Array.isArray(response.data)) {
        setEntries(response.data);
      } else {
        showAlert({ message: response?.message || 'Failed to load entries from server', type: 'error' });
      }
    } catch (error: any) {
      console.error(error);
      showAlert({ message: error.message || 'Server connection error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchReceipts = async () => {
    setLoadingReceipts(true);
    try {
      console.log('🔄 Fetching pending order receipts...');
      const response = await apiService.getPendingBills();
      if (response && response.success && Array.isArray(response.data)) {
        setReceipts(response.data);
      } else {
        const savedPending = JSON.parse(localStorage.getItem('laundry_pending_bills') || '[]');
        setReceipts(savedPending);
      }
    } catch (error) {
      console.warn('⚠️ Server offline, falling back to local pending bills:', error);
      const savedPending = JSON.parse(localStorage.getItem('laundry_pending_bills') || '[]');
      setReceipts(savedPending);
    } finally {
      setLoadingReceipts(false);
    }
  };

  const handleDeleteReceipt = (billId: string, billNumber: string) => {
    showConfirm(`Are you sure you want to delete Order Receipt #${billNumber}? This will permanently remove it.`, async () => {
      setLoadingReceipts(true);
      try {
        console.log(`🗑️ Deleting pending receipt id: ${billId}, number: ${billNumber}`);
        // 1. Delete from database
        const res = await apiService.deleteBill(billId);
        if (res && res.success) {
          showAlert({ message: 'Order receipt deleted successfully!', type: 'success' });
        } else {
          console.warn('⚠️ Database delete failed, removing locally:', res?.message);
        }

        // 2. Synchronize deletions offline in localStorage
        const localPending = JSON.parse(localStorage.getItem('laundry_pending_bills') || '[]');
        const updatedPending = localPending.filter((b: any) => b.billNumber !== billNumber && b.id !== billId && b._id !== billId);
        localStorage.setItem('laundry_pending_bills', JSON.stringify(updatedPending));

        const localHistory = JSON.parse(localStorage.getItem('laundry_bill_history') || '[]');
        const updatedHistory = localHistory.filter((b: any) => b.billNumber !== billNumber && b.id !== billId && b._id !== billId);
        localStorage.setItem('laundry_bill_history', JSON.stringify(updatedHistory));

        // Refresh list
        fetchReceipts();
      } catch (error: any) {
        console.error('Delete failed:', error);
        showAlert({ message: `Error deleting order receipt: ${error.message || 'Unknown error'}`, type: 'error' });
      } finally {
        setLoadingReceipts(false);
      }
    });
  };

  useEffect(() => {
    fetchEntries();
    fetchReceipts();
    
    // Check for legacy offline data
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(local) && local.length > 0) {
        setHasLegacyLocalData(true);
        setLegacyCount(local.length);
      }
    } catch (e) {
      console.error('Error parsing local storage manual entries:', e);
    }
  }, []);

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const local: any[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      let successCount = 0;
      for (const entry of local) {
        const { id, createdAt, ...entryData } = entry;
        const res = await apiService.createManualEntry(entryData);
        if (res && res.success) {
          successCount++;
        }
      }
      showAlert({ message: `Successfully migrated ${successCount} entries to MongoDB!`, type: 'success' });
      localStorage.removeItem(STORAGE_KEY);
      setHasLegacyLocalData(false);
      fetchEntries();
    } catch (error: any) {
      showAlert({ message: error.message || 'Error migrating entries', type: 'error' });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismissMigration = () => {
    showConfirm(
      'Are you sure you want to dismiss? This will permanently clear the offline copy without saving it to the database.',
      () => {
        localStorage.removeItem(STORAGE_KEY);
        setHasLegacyLocalData(false);
        showAlert({ message: 'Offline copy cleared', type: 'info' });
      }
    );
  };

  const resetForm = () => {
    setCustomerName('');
    setPhone('');
    setCountryCode('+91');
    setPickupDate(today);
    setPickupTime('');
    setDeliveryDate('');
    setDeliveryTime('');
    setServiceType('WASH');
    setQuantity(1);
    setItemName('');
    setUnit('pcs');
    setItems([]);
    setPaymentStatus('unpaid');
    setPartialAmount('');
    setStatus('pending');
    setRemark('');
    setEditingId(null);
  };

  const addItem = () => {
    const qty = parseFloat(String(quantity));
    if (isNaN(qty) || qty <= 0) {
      showAlert({ message: 'Please enter a valid quantity or weight greater than 0', type: 'warning' });
      return;
    }
    
    // Check duplicate serviceType, unit and itemName to merge them
    const existingIndex = items.findIndex(item =>
      item.serviceType === serviceType &&
      item.unit === unit &&
      (item.itemName || '') === (itemName.trim() || '')
    );

    if (existingIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity = parseFloat((updatedItems[existingIndex].quantity + qty).toFixed(2));
      setItems(updatedItems);
    } else {
      setItems([...items, { serviceType, quantity: qty, unit, itemName: itemName.trim() || undefined }]);
    }
    
    setQuantity(1);
    setItemName('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!customerName.trim()) {
      showAlert({ message: 'Customer name is required', type: 'warning' });
      return;
    }
    if (!pickupDate) {
      showAlert({ message: 'Pickup date is required', type: 'warning' });
      return;
    }
    if (!deliveryDate) {
      showAlert({ message: 'Delivery date is required', type: 'warning' });
      return;
    }

    // For single-item entries (which covers 99% of entries and the initial edit mode),
    // we use the current input field values as the source of truth for the item.
    let finalItems = [...items];
    if (finalItems.length <= 1) {
      const qty = parseFloat(String(quantity));
      if (isNaN(qty) || qty <= 0) {
        showAlert({ message: 'Please enter a valid quantity or weight greater than 0', type: 'warning' });
        return;
      }
      finalItems = [{ serviceType, quantity: qty, unit }];
    }

    if (paymentStatus === 'partial') {
      const parsedAmount = parseFloat(partialAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        showAlert({ message: 'Please enter a valid partial payment amount greater than 0', type: 'warning' });
        return;
      }
    }

    const entryData = {
      customerName: customerName.trim(),
      phone: phone.trim() ? `${countryCode}${phone.trim()}` : '',
      pickupDate,
      pickupTime: pickupTime || '',
      deliveryDate,
      deliveryTime: deliveryTime || '',
      items: finalItems,
      // Backward compatibility root fields for older/uncached backend validation
      serviceType: finalItems[0]?.serviceType || 'WASH',
      quantity: finalItems.reduce((sum, item) => sum + (parseFloat(String(item.quantity)) || 0), 0),
      paymentStatus,
      partialAmount: paymentStatus === 'partial' ? parseFloat(partialAmount) : undefined,
      status,
      remark: remark.trim()
    };

    setLoading(true);
    try {
      if (editingId) {
        const res = await apiService.updateManualEntry(editingId, entryData);
        if (res && res.success) {
          showAlert({ message: 'Entry updated successfully!', type: 'success' });
          resetForm();
          fetchEntries();
          setActiveTab('list');
        } else {
          showAlert({ message: res.message || 'Failed to update entry', type: 'error' });
        }
      } else {
        const res = await apiService.createManualEntry(entryData);
        if (res && res.success) {
          showAlert({ message: 'Entry saved successfully!', type: 'success' });
          resetForm();
          fetchEntries();
          setActiveTab('list');
        } else {
          showAlert({ message: res.message || 'Failed to save entry', type: 'error' });
        }
      }
    } catch (error: any) {
      showAlert({ message: error.message || 'Failed to save/update entry', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: ManualEntryData) => {
    setCustomerName(entry.customerName);
    // Parse stored phone to restore country code
    const stored = entry.phone || '';
    if (stored.startsWith('+')) {
      const match = ['+91','+1','+44','+971','+966','+61','+65','+880','+977','+94','+968','+965','+974','+92','+86','+81','+49','+33','+55','+7']
        .sort((a,b) => b.length - a.length)
        .find(c => stored.startsWith(c));
      if (match) { setCountryCode(match); setPhone(stored.slice(match.length)); }
      else { setCountryCode('+91'); setPhone(stored); }
    } else {
      setCountryCode('+91');
      setPhone(stored);
    }
    setPickupDate(entry.pickupDate);
    setPickupTime(entry.pickupTime || '');
    setDeliveryDate(entry.deliveryDate);
    setDeliveryTime(entry.deliveryTime || '');
    
    // Map items or construct fallback single item from legacy root values
    let editItems: ManualEntryItem[] = [];
    if (entry.items && entry.items.length > 0) {
      editItems = entry.items;
    } else {
      editItems = [{
        serviceType: (entry.serviceType as any) || 'WASH',
        quantity: entry.quantity || 1,
        unit: 'pcs'
      }];
    }
    
    setItems(editItems);
    
    // Populate the form inputs with the first item's details
    if (editItems.length > 0) {
      setServiceType(editItems[0].serviceType);
      setQuantity(editItems[0].quantity);
      setUnit(editItems[0].unit || 'pcs');
    } else {
      setServiceType('WASH');
      setQuantity(1);
      setUnit('pcs');
    }
    
    setPaymentStatus(entry.paymentStatus || 'unpaid');
    setPartialAmount(entry.partialAmount !== undefined ? String(entry.partialAmount) : '');
    setStatus(entry.status || 'pending');
    setRemark(entry.remark || '');
    setEditingId(entry.id);
    setActiveTab('form');

    // Scroll the tab contents container to the top
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }, 100);
  };

  const handleDelete = (id: string) => {
    showConfirm('Are you sure you want to delete this entry?', async () => {
      setLoading(true);
      try {
        const res = await apiService.deleteManualEntry(id);
        if (res && res.success) {
          showAlert({ message: 'Entry deleted', type: 'success' });
          fetchEntries();
        } else {
          showAlert({ message: res.message || 'Failed to delete entry', type: 'error' });
        }
      } catch (error: any) {
        showAlert({ message: error.message || 'Failed to delete entry', type: 'error' });
      } finally {
        setLoading(false);
      }
    });
  };

  const cyclePaidStatus = async (id: string) => {
    const statusOrder: Array<'unpaid' | 'partial' | 'paid'> = ['unpaid', 'partial', 'paid'];
    const currentEntry = entries.find(e => e.id === id);
    if (!currentEntry) return;

    const current = currentEntry.paymentStatus || 'unpaid';
    const nextIdx = (statusOrder.indexOf(current) + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIdx];

    let nextAmount = currentEntry.partialAmount;
    if (nextStatus === 'partial') {
      const val = window.prompt('Enter partial payment amount:', String(currentEntry.partialAmount || ''));
      if (val === null) {
        return;
      }
      const parsed = parseFloat(val);
      if (isNaN(parsed) || parsed <= 0) {
        showAlert({ message: 'Invalid amount. Status set to unpaid.', type: 'warning' });
        try {
          const res = await apiService.updateManualEntryPaymentStatus(id, 'unpaid', undefined);
          if (res && res.success) {
            fetchEntries();
          }
        } catch (error: any) {
          showAlert({ message: error.message || 'Failed to update payment status', type: 'error' });
        }
        return;
      }
      nextAmount = parsed;
    }

    try {
      const res = await apiService.updateManualEntryPaymentStatus(id, nextStatus, nextAmount);
      if (res && res.success) {
        showAlert({ message: `Payment status updated to ${nextStatus}`, type: 'success' });
        fetchEntries();
      } else {
        showAlert({ message: res.message || 'Failed to update payment status', type: 'error' });
      }
    } catch (error: any) {
      showAlert({ message: error.message || 'Failed to update payment status', type: 'error' });
    }
  };

  const cycleStatus = async (id: string) => {
    const statusOrder: Array<'pending' | 'completed' | 'delivered'> = ['pending', 'completed', 'delivered'];
    const currentEntry = entries.find(e => e.id === id);
    if (!currentEntry) return;

    const current = currentEntry.status || 'pending';
    const nextIdx = (statusOrder.indexOf(current) + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIdx];

    try {
      const res = await apiService.updateManualEntryStatus(id, nextStatus);
      if (res && res.success) {
        showAlert({ message: `Status updated to ${nextStatus}`, type: 'success' });
        fetchEntries();
      } else {
        showAlert({ message: res.message || 'Failed to update status', type: 'error' });
      }
    } catch (error: any) {
      showAlert({ message: error.message || 'Failed to update status', type: 'error' });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredEntries = entries.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    
    // Check if name/phone matches
    const basicMatch = e.customerName.toLowerCase().includes(q) || e.phone.includes(q);
    if (basicMatch) return true;
    
    // Check if any items match
    if (e.items && e.items.length > 0) {
      return e.items.some(item => item.serviceType.toLowerCase().includes(q));
    }
    
    return e.serviceType.toLowerCase().includes(q);
  });

  const serviceTypeColors: Record<string, string> = {
    'WASH': '#3b82f6',
    'IRON': '#f59e0b',
    'WASH+IRON': '#8b5cf6',
    'DRY CLEAN': '#ec4899'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, padding: '16px'
    }}>
      <div style={{
        background: '#1f2937',
        borderRadius: '16px',
        width: '95%',
        maxWidth: '680px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.03)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
            }}>📋</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f9fafb' }}>
                Manual Entry
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} recorded
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeTab === 'list' && (
              <button
                onClick={() => { setActiveTab('form'); resetForm(); }}
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600', transition: 'all 0.2s ease'
                }}
              >
                + New Entry
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px',
                width: '36px', height: '36px', color: '#9ca3af', fontSize: '18px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; (e.target as HTMLElement).style.color = '#f87171'; }}
              onMouseOut={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.target as HTMLElement).style.color = '#9ca3af'; }}
            >×</button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.15)',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: activeTab === 'form' ? 'rgba(14, 165, 233, 0.06)' : 'transparent',
              color: activeTab === 'form' ? '#0ea5e9' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === 'form' ? '2px solid #0ea5e9' : '2px solid transparent',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
          >
            {editingId ? '✏️ Edit Entry' : '📝 Entry Form'}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('list'); fetchEntries(); }}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: activeTab === 'list' ? 'rgba(14, 165, 233, 0.06)' : 'transparent',
              color: activeTab === 'list' ? '#0ea5e9' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === 'list' ? '2px solid #0ea5e9' : '2px solid transparent',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
          >
            📋 Entered Data ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('receipts'); fetchReceipts(); }}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: activeTab === 'receipts' ? 'rgba(14, 165, 233, 0.06)' : 'transparent',
              color: activeTab === 'receipts' ? '#0ea5e9' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === 'receipts' ? '2px solid #0ea5e9' : '2px solid transparent',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
          >
            🧾 Order Receipts ({receipts.length})
          </button>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Entry Form */}
          {activeTab === 'form' && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h4 style={{
                margin: '0 0 16px 0', fontSize: '15px', fontWeight: '600',
                color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {editingId ? '✏️ Edit Entry' : '📝 New Entry'}
              </h4>

              {/* Row 1: Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                    Customer Name <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        searchCustomers(e.target.value);
                      }}
                      placeholder="Full name"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: showSuggestions && customerSuggestions.length > 0 ? '8px 8px 0 0' : '8px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                        background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0ea5e9';
                        if (customerName.trim().length >= 1) {
                          searchCustomers(customerName);
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                    />
                    {showSuggestions && customerSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#18181b',
                        border: '1px solid #0ea5e9',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        zIndex: 1000,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {customerSuggestions.map((s, i) => (
                          <div
                            key={i}
                            onMouseDown={() => {
                              setCustomerName(s.name);
                              if (s.phone) setPhone(s.phone);
                              setShowSuggestions(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: i < customerSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div>
                              <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>
                                👤 {s.name}
                              </div>
                              {s.phone && (
                                <div style={{ color: '#a1a1aa', fontSize: '11px', marginTop: '2px' }}>
                                  📞 {s.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                    Phone Number <span style={{ color: '#71717a', fontWeight: '400' }}>(Optional)</span>
                  </label>
                  <div style={{ display: 'flex' }}>
                    <CountryCodePicker value={countryCode} onChange={setCountryCode} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Phone number"
                      style={{
                        flex: 1, padding: '10px 12px',
                        borderRadius: '0 8px 8px 0',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '14px',
                        background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Pickup & Delivery Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                    Pickup Date & Time <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      style={{
                        flex: 1.3, padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                        background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                        outline: 'none', colorScheme: 'dark'
                      }}
                    />
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      style={{
                        flex: 0.7, padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                        background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                        outline: 'none', colorScheme: 'dark'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                    Delivery Date & Time <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      style={{
                        flex: 1.3, padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                        background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                        outline: 'none', colorScheme: 'dark'
                      }}
                    />
                    <input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      style={{
                        flex: 0.7, padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                        background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                        outline: 'none', colorScheme: 'dark'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Item Entry Section */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '14px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#e5e7eb' }}>
                  🧺 Add Items to Order
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr 0.7fr auto', gap: '8px', alignItems: 'end' }}>
                  {/* Item Name — optional */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#9ca3af' }}>
                      Item Name <span style={{ color: '#6b7280' }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Shirt, Jeans..."
                      style={{
                        width: '100%', padding: '8px', borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px',
                        background: 'rgba(9,9,11,0.8)', color: '#fff', outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  {/* Service Type */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#9ca3af' }}>Service Type</label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value as any)}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px',
                        background: 'rgba(9,9,11,0.8)', color: '#fff', outline: 'none'
                      }}
                    >
                      <option value="WASH">🧺 Wash</option>
                      <option value="IRON">🔥 Iron</option>
                      <option value="WASH+IRON">🧺🔥 Wash+Iron</option>
                      <option value="DRY CLEAN">✨ Dry Clean</option>
                    </select>
                  </div>
                  {/* Qty */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#9ca3af' }}>Qty</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px',
                        background: 'rgba(9,9,11,0.8)', color: '#fff', textAlign: 'center', outline: 'none'
                      }}
                    />
                  </div>
                  {/* Unit */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#9ca3af' }}>Unit</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as any)}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px',
                        background: 'rgba(9,9,11,0.8)', color: '#fff', outline: 'none'
                      }}
                    >
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    style={{
                      background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8',
                      border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: '6px',
                      padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + Add
                  </button>
                </div>

                {/* Added items list */}
                {items.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {items.length === 1 ? (
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                        padding: '6px 10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.03)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>#1</span>
                          <span style={{ color: '#fff', fontWeight: '500' }}>
                            {serviceType}
                          </span>
                          <span style={{ color: '#9ca3af' }}>
                            — {quantity} {unit}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(0)}
                          style={{
                            background: 'transparent', border: 'none', color: '#f87171',
                            fontSize: '14px', cursor: 'pointer', padding: '0 4px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      items.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                          padding: '6px 10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.03)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>#{idx + 1}</span>
                            {item.itemName && (
                              <span style={{ color: '#e5e7eb', fontWeight: '600' }}>{item.itemName}</span>
                            )}
                            <span style={{ color: '#fff', fontWeight: '500' }}>
                              {item.serviceType}
                            </span>
                            <span style={{ color: '#9ca3af' }}>
                              — {item.quantity} {item.unit}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            style={{
                              background: 'transparent', border: 'none', color: '#f87171',
                              fontSize: '14px', cursor: 'pointer', padding: '0 4px'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Status Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                    Order Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                      background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                      outline: 'none', boxSizing: 'border-box', cursor: 'pointer'
                    }}
                  >
                    <option value="pending">◐ Pending</option>
                    <option value="completed">✓ Completed</option>
                    <option value="delivered">🚚 Delivered</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                    Payment Status
                  </label>
                  <div style={{
                    display: 'flex', borderRadius: '8px', overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)', height: '40px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('unpaid')}
                      style={{
                        flex: 1, border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                        background: paymentStatus === 'unpaid' ? '#ef4444' : 'rgba(9,9,11,0.6)',
                        color: paymentStatus === 'unpaid' ? '#fff' : '#9ca3af',
                        transition: 'all 0.15s ease'
                      }}
                    >Unpaid</button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('partial')}
                      style={{
                        flex: 1, border: 'none',
                        borderLeft: '1px solid rgba(255,255,255,0.1)',
                        borderRight: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                        background: paymentStatus === 'partial' ? '#f59e0b' : 'rgba(9,9,11,0.6)',
                        color: paymentStatus === 'partial' ? '#fff' : '#9ca3af',
                        transition: 'all 0.15s ease'
                      }}
                    >Partial</button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('paid')}
                      style={{
                        flex: 1, border: 'none',
                        cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                        background: paymentStatus === 'paid' ? '#10b981' : 'rgba(9,9,11,0.6)',
                        color: paymentStatus === 'paid' ? '#fff' : '#9ca3af',
                        transition: 'all 0.15s ease'
                      }}
                    >Paid</button>
                  </div>
                </div>
              </div>

              {paymentStatus === 'partial' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                    Partial Paid Amount (₹) <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Enter amount paid (e.g. 150)"
                    min="1"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                      background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '600',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#0ea5e9'; e.target.select(); }}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              )}

              {/* Row 4: Remark */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                  Remark <span style={{ color: '#71717a', fontWeight: '400' }}>(Optional)</span>
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Any special instructions or notes..."
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                    background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                    outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                    fontFamily: 'inherit', transition: 'border-color 0.15s ease',
                    minHeight: '48px'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              {/* Save / Cancel */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                    background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                    color: loading ? '#6b7280' : '#fff', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(14, 165, 233, 0.3)', transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { if (!loading) { (e.target as HTMLElement).style.transform = 'translateY(-1px)'; (e.target as HTMLElement).style.boxShadow = '0 6px 16px rgba(14, 165, 233, 0.4)'; } }}
                  onMouseOut={(e) => { if (!loading) { (e.target as HTMLElement).style.transform = 'translateY(0)'; (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.3)'; } }}
                >
                  {loading ? 'Saving...' : editingId ? 'Update Entry' : 'Save Entry'}
                </button>
                {editingId && (
                  <button
                    onClick={() => { resetForm(); setActiveTab('list'); }}
                    style={{
                      padding: '12px 20px', borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)', color: '#9ca3af',
                      fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Entries List Tab */}
          {activeTab === 'list' && (
            <>
              {/* Legacy data migration banner */}
              {hasLegacyLocalData && (
                <div style={{
                  background: 'rgba(14, 165, 233, 0.08)',
                  border: '1px solid rgba(14, 165, 233, 0.2)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🚀</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#0ea5e9' }}>
                        Offline Local Data Found
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                        You have {legacyCount} entry/entries saved on this browser. Would you like to migrate them to your cloud MongoDB database?
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleMigration}
                      disabled={isMigrating}
                      style={{
                        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isMigrating ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(14, 165, 233, 0.2)'
                      }}
                    >
                      {isMigrating ? 'Migrating...' : 'Migrate to Cloud'}
                    </button>
                    <button
                      onClick={handleDismissMigration}
                      disabled={isMigrating}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#9ca3af',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isMigrating ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Dismiss & Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Search Bar (only if entries exist) */}
              {entries.length > 0 && (
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    color: '#6b7280', fontSize: '14px', pointerEvents: 'none'
                  }}>
                    <i className="fas fa-search"></i>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, or service..."
                    style={{
                      width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px',
                      background: 'rgba(9,9,11,0.4)', color: '#fff', fontWeight: '500',
                      outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
              )}

              {/* Loading spinner */}
              {loading && entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>Loading entries from MongoDB...</span>
                </div>
              ) : filteredEntries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                    >
                      {/* Top row: Name, phone, status badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#f9fafb' }}>
                            {entry.customerName}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {entry.phone || 'No phone'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => cycleStatus(entry.id)}
                            style={{
                              background: (entry.status || 'pending') === 'completed' ? 'rgba(16,185,129,0.15)'
                                : (entry.status || 'pending') === 'delivered' ? 'rgba(59,130,246,0.15)'
                                : 'rgba(245,158,11,0.15)',
                              color: (entry.status || 'pending') === 'completed' ? '#34d399'
                                : (entry.status || 'pending') === 'delivered' ? '#60a5fa'
                                : '#fbbf24',
                              border: `1px solid ${(entry.status || 'pending') === 'completed' ? 'rgba(16,185,129,0.25)'
                                : (entry.status || 'pending') === 'delivered' ? 'rgba(59,130,246,0.25)'
                                : 'rgba(245,158,11,0.25)'}`,
                              borderRadius: '6px', padding: '3px 8px', fontSize: '10px',
                              fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s ease',
                              textTransform: 'uppercase', letterSpacing: '0.5px'
                            }}
                          >
                            {(entry.status || 'pending') === 'completed' ? '✓ Completed'
                              : (entry.status || 'pending') === 'delivered' ? '🚚 Delivered'
                              : '◐ Pending'}
                          </button>
                          <button
                            onClick={() => cyclePaidStatus(entry.id)}
                            style={{
                              background: (entry.paymentStatus || 'unpaid') === 'paid' ? 'rgba(16,185,129,0.15)'
                                : (entry.paymentStatus || 'unpaid') === 'partial' ? 'rgba(245,158,11,0.15)'
                                : 'rgba(239,68,68,0.15)',
                              color: (entry.paymentStatus || 'unpaid') === 'paid' ? '#34d399'
                                : (entry.paymentStatus || 'unpaid') === 'partial' ? '#fbbf24'
                                : '#f87171',
                              border: `1px solid ${(entry.paymentStatus || 'unpaid') === 'paid' ? 'rgba(16,185,129,0.25)'
                                : (entry.paymentStatus || 'unpaid') === 'partial' ? 'rgba(245,158,11,0.25)'
                                : 'rgba(239,68,68,0.25)'}`,
                              borderRadius: '6px', padding: '3px 8px', fontSize: '10px',
                              fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s ease',
                              textTransform: 'uppercase', letterSpacing: '0.5px'
                            }}
                          >
                            {(entry.paymentStatus || 'unpaid') === 'paid' ? '✓ Paid'
                              : (entry.paymentStatus || 'unpaid') === 'partial' ? `◐ Partial (₹${entry.partialAmount || 0})`
                              : '✕ Unpaid'}
                          </button>
                        </div>
                      </div>

                      {/* Items list badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {entry.items && entry.items.map((item, idx) => (
                          <span key={idx} style={{
                            background: `${serviceTypeColors[item.serviceType] || '#9ca3af'}15`,
                            color: serviceTypeColors[item.serviceType] || '#9ca3af',
                            border: `1px solid ${serviceTypeColors[item.serviceType] || '#9ca3af'}25`,
                            padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '600'
                          }}>
                            {item.itemName ? `${item.itemName} · ` : ''}{item.serviceType}: {item.quantity} {item.unit || 'pcs'}
                          </span>
                        ))}
                      </div>

                      {/* Dates row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <span style={{
                          background: 'rgba(255,255,255,0.04)', color: '#d1d5db',
                          padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '500'
                        }}>
                          📅 Pickup: {formatDate(entry.pickupDate)} {entry.pickupTime ? `@ ${entry.pickupTime}` : ''}
                        </span>
                        <span style={{
                          background: 'rgba(255,255,255,0.04)', color: '#d1d5db',
                          padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '500'
                        }}>
                          📅 Delivery: {formatDate(entry.deliveryDate)} {entry.deliveryTime ? `@ ${entry.deliveryTime}` : ''}
                        </span>
                      </div>

                      {/* Remark (if exists) */}
                      {entry.remark && (
                        <div style={{
                          fontSize: '12px', color: '#6b7280', fontStyle: 'italic',
                          marginBottom: '8px', paddingLeft: '2px'
                        }}>
                          💬 {entry.remark}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                        {entry.phone && (
                          <button
                            onClick={() => {
                              showAlert({ message: 'WhatsApp Receipt is disabled for now. You can enable it in the future once your Dev API gateway is configured.', type: 'info' });
                            }}
                            style={{
                              background: 'rgba(16,185,129,0.12)', color: '#34d399',
                              border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px',
                              padding: '4px 10px', fontSize: '11px', fontWeight: '600',
                              cursor: 'pointer', transition: 'all 0.15s ease',
                              marginRight: 'auto'
                            }}
                            onMouseOver={(e) => (e.target as HTMLElement).style.background = 'rgba(16,185,129,0.2)'}
                            onMouseOut={(e) => (e.target as HTMLElement).style.background = 'rgba(16,185,129,0.12)'}
                          >
                            <i className="fab fa-whatsapp" style={{ marginRight: '4px' }}></i> WhatsApp Receipt
                          </button>
                        )}
                        {entry.status !== 'delivered' && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await apiService.updateManualEntryStatus(entry.id, 'delivered');
                                if (res && res.success) {
                                  showAlert({ message: 'Entry marked as Done. Reminders stopped.', type: 'success' });
                                  fetchEntries(); // Refresh entries list
                                } else {
                                  showAlert({ message: res?.message || 'Failed to update entry status', type: 'error' });
                                }
                              } catch (err: any) {
                                showAlert({ message: err.message || 'Error updating status', type: 'error' });
                              }
                            }}
                            style={{
                              background: 'rgba(16,185,129,0.15)', color: '#34d399',
                              border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px',
                              padding: '4px 10px', fontSize: '11px', fontWeight: '700',
                              cursor: 'pointer', transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => (e.target as HTMLElement).style.background = 'rgba(16,185,129,0.25)'}
                            onMouseOut={(e) => (e.target as HTMLElement).style.background = 'rgba(16,185,129,0.15)'}
                          >
                            ✓ Mark Done
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(entry)}
                          style={{
                            background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
                            border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px',
                            padding: '4px 10px', fontSize: '11px', fontWeight: '600',
                            cursor: 'pointer', transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.2)'}
                          onMouseOut={(e) => (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.12)'}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          style={{
                            background: 'rgba(239,68,68,0.12)', color: '#f87171',
                            border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px',
                            padding: '4px 10px', fontSize: '11px', fontWeight: '600',
                            cursor: 'pointer', transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.2)'}
                          onMouseOut={(e) => (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.12)'}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center', padding: '40px 20px', color: '#6b7280'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>📋</div>
                  <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px', color: '#9ca3af' }}>
                    {searchQuery ? 'No matching entries found' : 'No entries yet'}
                  </div>
                  <div style={{ fontSize: '13px', marginBottom: searchQuery ? 0 : '16px' }}>
                    {searchQuery ? 'Try a different search term' : 'No manual entries recorded. Switch to the Entry Form tab to create one.'}
                  </div>
                  {!searchQuery && (
                    <button
                      onClick={() => setActiveTab('form')}
                      style={{
                        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: '600', transition: 'all 0.2s ease'
                      }}
                    >
                      Go to Entry Form
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Order Receipts Tab */}
          {activeTab === 'receipts' && (
            <>
              {/* Search Bar for Receipts */}
              {receipts.length > 0 && (
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    color: '#6b7280', fontSize: '14px', pointerEvents: 'none'
                  }}>
                    <i className="fas fa-search"></i>
                  </div>
                  <input
                    type="text"
                    value={receiptSearchQuery}
                    onChange={(e) => setReceiptSearchQuery(e.target.value)}
                    placeholder="Search receipts by name, phone, or order ID..."
                    style={{
                      width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px',
                      background: 'rgba(9,9,11,0.4)', color: '#fff', fontWeight: '500',
                      outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
              )}

              {/* Loading spinner */}
              {loadingReceipts && receipts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>Loading pending receipts...</span>
                </div>
              ) : (() => {
                const filteredReceipts = receipts.filter(r => {
                  if (!receiptSearchQuery.trim()) return true;
                  const q = receiptSearchQuery.toLowerCase();
                  return (
                    (r.customerName || '').toLowerCase().includes(q) ||
                    (r.customerPhone || '').includes(q) ||
                    (r.billNumber || '').toLowerCase().includes(q)
                  );
                });

                if (filteredReceipts.length > 0) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {filteredReceipts.map((receipt) => {
                        const totalQty = receipt.items.reduce((s: number, i: any) => s + i.quantity, 0);
                        const isPartial = receipt.paymentStatus === 'partial';
                        const isPaid = receipt.paymentStatus === 'paid';
                        
                        return (
                          <div key={receipt.id || receipt._id} style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            transition: 'border-color 0.15s ease'
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                          onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                          >
                            {/* Top row: Name, phone, status badges */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '15px', fontWeight: '600', color: '#f9fafb' }}>
                                  {receipt.customerName || 'Walk-in Customer'}
                                </span>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {receipt.customerPhone || 'No phone'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{
                                  background: 'rgba(245,158,11,0.15)',
                                  color: '#fbbf24',
                                  border: '1px solid rgba(245,158,11,0.25)',
                                  borderRadius: '6px', padding: '3px 8px', fontSize: '10px',
                                  fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'
                                }}>
                                  Order ID: {receipt.billNumber}
                                </span>
                                <span style={{
                                  background: isPaid ? 'rgba(16,185,129,0.15)'
                                    : isPartial ? 'rgba(245,158,11,0.15)'
                                    : 'rgba(239,68,68,0.15)',
                                  color: isPaid ? '#34d399'
                                    : isPartial ? '#fbbf24'
                                    : '#f87171',
                                  border: `1px solid ${isPaid ? 'rgba(16,185,129,0.25)'
                                    : isPartial ? 'rgba(245,158,11,0.25)'
                                    : 'rgba(239,68,68,0.25)'}`,
                                  borderRadius: '6px', padding: '3px 8px', fontSize: '10px',
                                  fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'
                                }}>
                                  {isPaid ? '✓ Paid'
                                    : isPartial ? `◐ Partial (₹${receipt.amountPaid || 0})`
                                    : '✕ Unpaid'}
                                </span>
                              </div>
                            </div>

                            {/* Items list badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                              {receipt.items && receipt.items.map((item: any, idx: number) => {
                                const cleanName = item.name.split('(')[0].trim();
                                return (
                                  <span key={idx} style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#d1d5db',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '600'
                                  }}>
                                    {cleanName}: {item.quantity}
                                  </span>
                                );
                              })}
                            </div>

                            {/* Dates row */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                              <span style={{
                                background: 'rgba(255,255,255,0.04)', color: '#d1d5db',
                                padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '500'
                              }}>
                                📅 Service: {receipt.serviceType || 'Wash & Iron'}
                              </span>
                              <span style={{
                                background: 'rgba(255,255,255,0.04)', color: '#d1d5db',
                                padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '500'
                              }}>
                                📅 Delivery Due: {receipt.deliveryDate ? receipt.deliveryDate.split('-').reverse().join('/') : '—'}
                              </span>
                            </div>

                            {/* Payment details row */}
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af', marginBottom: '12px', paddingLeft: '2px' }}>
                              <span>Total: <strong>₹{receipt.grandTotal}</strong></span>
                              {receipt.amountPaid > 0 && <span>Paid: <strong style={{ color: '#34d399' }}>₹{receipt.amountPaid}</strong></span>}
                              <span>Due: <strong style={{ color: '#fbbf24' }}>₹{receipt.amountDue}</strong></span>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  printCleanThermalOrderReceipt(receipt, (msg) => showAlert({ message: msg, type: 'error' }));
                                }}
                                style={{
                                  background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
                                  border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px',
                                  padding: '5px 12px', fontSize: '11px', fontWeight: '700',
                                  cursor: 'pointer', transition: 'all 0.15s ease',
                                  display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                                onMouseOver={(e) => (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.2)'}
                                onMouseOut={(e) => (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.12)'}
                              >
                                <i className="fas fa-print"></i> Print Receipt
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReceipt(receipt._id || receipt.id, receipt.billNumber)}
                                style={{
                                  background: 'rgba(239,68,68,0.12)', color: '#f87171',
                                  border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px',
                                  padding: '5px 12px', fontSize: '11px', fontWeight: '700',
                                  cursor: 'pointer', transition: 'all 0.15s ease',
                                  display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                                onMouseOver={(e) => (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.2)'}
                                onMouseOut={(e) => (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.12)'}
                              >
                                <i className="fas fa-trash-alt"></i> Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                } else {
                  return (
                    <div style={{
                      textAlign: 'center', padding: '40px 20px', color: '#6b7280'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>🧾</div>
                      <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px', color: '#9ca3af' }}>
                        {receiptSearchQuery ? 'No matching receipts found' : 'No order receipts yet'}
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        {receiptSearchQuery ? 'Try a different search term' : 'Order receipts generated during checkout will be displayed here.'}
                      </div>
                    </div>
                  );
                }
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualEntry;
