import React, { useState, useEffect } from 'react';
import { PendingBill } from './types';
import apiService from './api';

interface PendingBillSelectorProps {
  customerName: string;
  initialSelected?: PendingBill[];
  onClose: () => void;
  onSelectBills: (selectedBills: PendingBill[]) => void;
}

const PendingBillSelector: React.FC<PendingBillSelectorProps> = ({
  customerName,
  initialSelected = [],
  onClose,
  onSelectBills
}) => {
  const [allBills, setAllBills] = useState<PendingBill[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(
    new Set(initialSelected.map(b => b.id || b._id))
  );
  const [searchTerm, setSearchTerm] = useState(customerName || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'delivered'>('all');
  // 'all' = browse all bills | 'selected' = show only selected
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAllBills(); }, []);

  const loadAllBills = async () => {
    setLoading(true);

    // Step 1: Show localStorage instantly
    const historyRaw = localStorage.getItem('laundry_bill_history');
    const pendingRaw  = localStorage.getItem('laundry_pending_bills');
    const history: PendingBill[] = historyRaw ? JSON.parse(historyRaw) : [];
    const pending: PendingBill[] = pendingRaw  ? JSON.parse(pendingRaw)  : [];

    const seen = new Set<string>();
    const merged: PendingBill[] = [];
    [...history, ...pending].forEach(b => {
      if (!seen.has(b.billNumber)) { seen.add(b.billNumber); merged.push(b); }
    });
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (merged.length > 0) {
      setAllBills(merged);
      setLoading(false);
      if (customerName && initialSelected.length === 0) {
        const matched = merged
          .filter(b => b.customerName?.toLowerCase().includes(customerName.toLowerCase()))
          .map(b => b.id || b._id);
        setSelectedBillIds(new Set(matched));
      }
    }

    // Step 2: Refresh from API in background
    try {
      const response = await apiService.getBills({ limit: 1000 } as any);
      if (response.success && response.data) {
        const bills = Array.isArray(response.data)
          ? response.data
          : (response.data as any).bills || response.data;
        bills.sort((a: PendingBill, b: PendingBill) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllBills(bills);
        setLoading(false);
        if (customerName && merged.length === 0 && initialSelected.length === 0) {
          const matched = bills
            .filter((b: PendingBill) => b.customerName?.toLowerCase().includes(customerName.toLowerCase()))
            .map((b: PendingBill) => b.id || b._id);
          setSelectedBillIds(new Set(matched));
        }
      }
    } catch {
      setLoading(false);
    }
  };

  // Bills shown in "All" tab — filtered by search + status
  const getFilteredBills = () => allBills.filter(bill => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      bill.customerName?.toLowerCase().includes(q) ||
      bill.billNumber?.toLowerCase().includes(q) ||
      bill.customerPhone?.includes(q);
    const matchStatus = statusFilter === 'all' || (bill.status || '').toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  // Bills shown in "Selected" tab
  const getSelectedBills = () => allBills.filter(b => selectedBillIds.has(b.id || b._id));

  const toggleBillSelection = (billId: string) => {
    const next = new Set(selectedBillIds);
    if (next.has(billId)) {
      next.delete(billId);
    } else {
      next.add(billId);
    }
    setSelectedBillIds(next);
  };

  const handleSelectAll = () => {
    const filtered = getFilteredBills();
    const filteredIds = filtered.map(b => b.id || b._id);
    const allSelected = filteredIds.every(id => selectedBillIds.has(id));
    const next = new Set(selectedBillIds);
    if (allSelected) {
      filteredIds.forEach(id => next.delete(id));
    } else {
      filteredIds.forEach(id => next.add(id));
    }
    setSelectedBillIds(next);
  };

  const handleConfirmSelection = () => {
    const selected = allBills.filter(b => selectedBillIds.has(b.id || b._id));
    onSelectBills(selected);
  };

  const calculateSelectedTotal = () =>
    allBills.filter(b => selectedBillIds.has(b.id || b._id)).reduce((s, b) => s + b.grandTotal, 0);

  const filteredBills  = getFilteredBills();
  const selectedBills  = getSelectedBills();
  const displayBills   = viewMode === 'selected' ? selectedBills : filteredBills;
  const allFilteredSelected = filteredBills.length > 0 && filteredBills.every(b => selectedBillIds.has(b.id || b._id));

  const statusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':   return { bg: 'rgba(243,156,18,0.2)',  border: '#f39c12', text: '#f39c12' };
      case 'completed': return { bg: 'rgba(52,152,219,0.2)',  border: '#3498db', text: '#3498db' };
      case 'delivered': return { bg: 'rgba(39,174,96,0.2)',   border: '#27ae60', text: '#27ae60' };
      default:          return { bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.3)', text: 'white' };
    }
  };

  const BillCard = ({ bill }: { bill: PendingBill }) => {
    const billId    = bill.id || bill._id;
    const isSelected = selectedBillIds.has(billId);
    const sc        = statusColor(bill.status);
    return (
      <div
        onClick={() => toggleBillSelection(billId)}
        style={{
          background: isSelected ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.08)',
          border: `2px solid ${isSelected ? '#2ecc71' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '12px', padding: '14px 18px', cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px'
        }}
      >
        {/* Checkbox circle */}
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
          background: isSelected ? '#2ecc71' : 'rgba(255,255,255,0.2)',
          border: `2px solid ${isSelected ? '#2ecc71' : 'rgba(255,255,255,0.4)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 'bold', color: 'white', transition: 'all 0.2s'
        }}>
          {isSelected ? '✓' : ''}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>{bill.customerName}</span>
            <span style={{
              background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
              padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase'
            }}>
              {bill.status || 'unknown'}
            </span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span>#{bill.billNumber}</span>
            <span>📦 {bill.items?.length || 0} items</span>
            <span>📅 {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            {bill.customerPhone && <span>📞 {bill.customerPhone}</span>}
          </div>
        </div>

        {/* Amount + deselect hint */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f39c12' }}>
            ₹{bill.grandTotal?.toLocaleString('en-IN')}
          </div>
          {isSelected && (
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
              tap to remove
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3b82f6 100%)',
        borderRadius: '20px', width: '92%', maxWidth: '860px',
        height: '85vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          padding: '18px 24px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '700' }}>
              📋 Select Bills to Add
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0 0', fontSize: '13px' }}>
              All bills — pending, completed, delivered. Select any to merge into current bill.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,0,0,0.3)', border: 'none', borderRadius: '8px',
            padding: '8px 14px', color: 'white', cursor: 'pointer', fontSize: '14px'
          }}>✕ Close</button>
        </div>

        {/* ── View Mode Tabs ── */}
        <div style={{
          display: 'flex', gap: '0', background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            onClick={() => setViewMode('all')}
            style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
              background: viewMode === 'all' ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: viewMode === 'all' ? 'white' : 'rgba(255,255,255,0.5)',
              fontWeight: viewMode === 'all' ? '700' : '400',
              fontSize: '14px', borderBottom: viewMode === 'all' ? '3px solid #2ecc71' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            🔍 All Bills ({filteredBills.length})
          </button>
          <button
            onClick={() => setViewMode('selected')}
            style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
              background: viewMode === 'selected' ? 'rgba(46,204,113,0.2)' : 'transparent',
              color: viewMode === 'selected' ? '#2ecc71' : 'rgba(255,255,255,0.5)',
              fontWeight: viewMode === 'selected' ? '700' : '400',
              fontSize: '14px', borderBottom: viewMode === 'selected' ? '3px solid #2ecc71' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            ✅ Selected ({selectedBillIds.size})
            {selectedBillIds.size > 0 && (
              <span style={{
                marginLeft: '8px', background: '#2ecc71', color: '#1e3c72',
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '800'
              }}>
                ₹{calculateSelectedTotal().toLocaleString('en-IN')}
              </span>
            )}
          </button>
        </div>

        {/* ── Search + Filter (only in All tab) ── */}
        {viewMode === 'all' && (
          <div style={{
            padding: '12px 24px', background: 'rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, position: 'relative', minWidth: '180px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>🔍</span>
              <input
                type="text"
                placeholder="Search name, bill no, phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 34px',
                  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.15)', color: 'white',
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '12px'
                }}>✕</button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '5px' }}>
              {(['all', 'pending', 'completed', 'delivered'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: '7px 12px', borderRadius: '20px', border: 'none',
                  background: statusFilter === s ? 'white' : 'rgba(255,255,255,0.15)',
                  color: statusFilter === s ? '#1e3c72' : 'white',
                  fontSize: '11px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize'
                }}>{s}</button>
              ))}
            </div>

            <button onClick={handleSelectAll} style={{
              background: 'rgba(52,152,219,0.7)', border: 'none', borderRadius: '8px',
              padding: '9px 14px', color: 'white', cursor: 'pointer',
              fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap'
            }}>
              {allFilteredSelected ? '❌ Deselect All' : '✅ Select All'}
            </button>
          </div>
        )}

        {/* ── Selected tab header ── */}
        {viewMode === 'selected' && selectedBillIds.size > 0 && (
          <div style={{
            padding: '10px 24px', background: 'rgba(46,204,113,0.1)',
            borderBottom: '1px solid rgba(46,204,113,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
              Click any bill below to <strong style={{ color: '#e74c3c' }}>remove</strong> it from selection
            </span>
            <button
              onClick={() => setSelectedBillIds(new Set())}
              style={{
                background: 'rgba(231,76,60,0.3)', border: '1px solid rgba(231,76,60,0.5)',
                borderRadius: '6px', padding: '5px 12px', color: '#e74c3c',
                cursor: 'pointer', fontSize: '12px', fontWeight: '600'
              }}
            >
              🗑 Clear All
            </button>
          </div>
        )}

        {/* ── Bills List ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '60px' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ marginBottom: '16px' }}></i>
              <p>Loading bills...</p>
            </div>
          ) : viewMode === 'selected' && selectedBillIds.size === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '60px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <h3 style={{ margin: '0 0 8px 0', color: 'white' }}>No bills selected yet</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Go to "All Bills" tab and select bills to add</p>
              <button onClick={() => setViewMode('all')} style={{
                marginTop: '16px', background: 'rgba(52,152,219,0.7)', border: 'none',
                borderRadius: '8px', padding: '10px 20px', color: 'white',
                cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'
              }}>
                🔍 Browse All Bills
              </button>
            </div>
          ) : displayBills.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', padding: '60px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <h3 style={{ margin: '0 0 8px 0' }}>No bills found</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Try a different search or filter</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {displayBills.map(bill => <BillCard key={bill.id || bill._id} bill={bill} />)}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 24px', background: 'rgba(255,255,255,0.1)',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px'
        }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
              {selectedBillIds.size} bill{selectedBillIds.size !== 1 ? 's' : ''} selected
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              Total: ₹{calculateSelectedTotal().toLocaleString('en-IN')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{
              background: 'rgba(149,165,166,0.6)', border: 'none', borderRadius: '8px',
              padding: '10px 20px', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'
            }}>Cancel</button>
            <button onClick={handleConfirmSelection} disabled={selectedBillIds.size === 0} style={{
              background: selectedBillIds.size === 0
                ? 'rgba(189,195,199,0.4)'
                : 'linear-gradient(135deg, #27ae60, #2ecc71)',
              border: 'none', borderRadius: '8px', padding: '10px 24px',
              color: 'white', cursor: selectedBillIds.size === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 'bold'
            }}>
              ✅ Add {selectedBillIds.size > 0 ? `${selectedBillIds.size} ` : ''}Selected Bills
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingBillSelector;
