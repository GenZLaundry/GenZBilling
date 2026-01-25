import React, { useState, useEffect } from 'react';
import { PendingBill } from './types';
import apiService from './api';

interface PendingBillSelectorProps {
  customerName: string;
  onClose: () => void;
  onSelectBills: (selectedBills: PendingBill[]) => void;
}

const PendingBillSelector: React.FC<PendingBillSelectorProps> = ({ 
  customerName, 
  onClose, 
  onSelectBills 
}) => {
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPendingBills();
  }, []);

  const loadPendingBills = async () => {
    try {
      // First try to load from database
      const response = await apiService.getPendingBills();
      if (response.success && response.data) {
        console.log('✅ Loaded pending bills from database:', response.data.length);
        setPendingBills(response.data);
        
        // Auto-select bills for the current customer
        if (customerName) {
          const customerBills = response.data
            .filter((bill: PendingBill) => bill.customerName.toLowerCase().includes(customerName.toLowerCase()))
            .map((bill: PendingBill) => bill.id || bill._id);
          setSelectedBillIds(new Set(customerBills));
        }
        return;
      }
    } catch (error) {
      console.warn('⚠️ Database unavailable, loading from localStorage:', error);
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem('laundry_pending_bills');
    if (saved) {
      const bills = JSON.parse(saved) as PendingBill[];
      console.log('📱 Loaded pending bills from localStorage:', bills.length);
      setPendingBills(bills);
      
      // Auto-select bills for the current customer
      if (customerName) {
        const customerBills = bills
          .filter(bill => bill.customerName.toLowerCase().includes(customerName.toLowerCase()))
          .map(bill => bill.id);
        setSelectedBillIds(new Set(customerBills));
      }
    } else {
      console.log('📭 No pending bills found');
      setPendingBills([]);
    }
  };

  const toggleBillSelection = (billId: string) => {
    const newSelected = new Set(selectedBillIds);
    if (newSelected.has(billId)) {
      newSelected.delete(billId);
    } else {
      newSelected.add(billId);
    }
    setSelectedBillIds(newSelected);
  };

  const handleSelectAll = () => {
    const filteredBills = getFilteredBills();
    if (selectedBillIds.size === filteredBills.length) {
      setSelectedBillIds(new Set());
    } else {
      setSelectedBillIds(new Set(filteredBills.map(bill => bill.id || bill._id)));
    }
  };

  const getFilteredBills = () => {
    return pendingBills.filter(bill =>
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleConfirmSelection = () => {
    const selectedBills = pendingBills.filter(bill => selectedBillIds.has(bill.id || bill._id));
    onSelectBills(selectedBills);
  };

  const calculateSelectedTotal = () => {
    return pendingBills
      .filter(bill => selectedBillIds.has(bill.id || bill._id))
      .reduce((sum, bill) => sum + bill.grandTotal, 0);
  };

  const filteredBills = getFilteredBills();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3b82f6 100%)',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '800px',
        height: '80%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '24px' }}>
              📋 Select Previous Pending Bills
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '5px 0 0 0', fontSize: '14px' }}>
              Choose previous bills to include with current order
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 0, 0, 0.3)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 15px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Search and Controls */}
        <div style={{
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Search by customer name or bill number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.9)',
                fontSize: '16px'
              }}
            />
            <button
              onClick={handleSelectAll}
              style={{
                background: 'rgba(52, 152, 219, 0.8)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {selectedBillIds.size === filteredBills.length ? '❌ Deselect All' : '✅ Select All'}
            </button>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'white', fontSize: '14px' }}>
              {filteredBills.length} bills found • {selectedBillIds.size} selected
            </div>
            <div style={{ color: '#f39c12', fontSize: '16px', fontWeight: 'bold' }}>
              Selected Total: ₹{calculateSelectedTotal()}
            </div>
          </div>
        </div>

        {/* Bills List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {filteredBills.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '50px' }}>
              <h3>No pending bills found</h3>
              <p>No bills match your search criteria.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {filteredBills.map(bill => {
                const billId = bill.id || bill._id;
                return (
                <div
                  key={billId}
                  onClick={() => toggleBillSelection(billId)}
                  style={{
                    background: selectedBillIds.has(billId) 
                      ? 'rgba(46, 204, 113, 0.3)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    border: selectedBillIds.has(billId) 
                      ? '2px solid #2ecc71' 
                      : '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: selectedBillIds.has(billId) ? '#2ecc71' : 'rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {selectedBillIds.has(billId) ? '✓' : ''}
                      </div>
                      <h4 style={{ margin: 0, fontSize: '18px' }}>{bill.customerName}</h4>
                    </div>
                    <p style={{ margin: '0 0 5px 30px', opacity: 0.8, fontSize: '14px' }}>
                      Bill: {bill.billNumber}
                    </p>
                    <p style={{ margin: '0 0 5px 30px', opacity: 0.8, fontSize: '14px' }}>
                      Items: {bill.items.length} | Total: ₹{bill.grandTotal}
                    </p>
                    <p style={{ margin: '0 0 0 30px', opacity: 0.6, fontSize: '12px' }}>
                      Created: {new Date(bill.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: 'bold', 
                      color: '#f39c12',
                      marginBottom: '5px'
                    }}>
                      ₹{bill.grandTotal}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'rgba(255, 255, 255, 0.7)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {bill.items.length} item{bill.items.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {selectedBillIds.size} bill{selectedBillIds.size !== 1 ? 's' : ''} selected
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              Total Amount: ₹{calculateSelectedTotal()}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(149, 165, 166, 0.8)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={selectedBillIds.size === 0}
              style={{
                background: selectedBillIds.size === 0 
                  ? 'rgba(189, 195, 199, 0.5)' 
                  : 'linear-gradient(135deg, #27ae60, #2ecc71)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                color: 'white',
                cursor: selectedBillIds.size === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ✅ Add Selected Bills ({selectedBillIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingBillSelector;