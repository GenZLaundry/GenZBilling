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
  const [allBills, setAllBills]           = useState<PendingBill[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(
    new Set(initialSelected.map(b => b.id || b._id))
  );
  const [searchTerm, setSearchTerm]       = useState(customerName || '');
  const [statusFilter, setStatusFilter]   = useState<'all' | 'pending' | 'completed' | 'delivered'>('all');
  const [viewMode, setViewMode]           = useState<'all' | 'selected'>('all');
  const [loading, setLoading]             = useState(true);

  // Sync selection back to parent then close
  const handleClose = () => {
    const selected = allBills.filter(b => selectedBillIds.has(b.id || b._id));
    onSelectBills(selected);
    onClose();
  };

  useEffect(() => { loadAllBills(); }, []);

  const loadAllBills = async () => {
    setLoading(true);
    // Step 1 — localStorage instantly
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
    // Step 2 — API in background
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
    } catch { setLoading(false); }
  };

  const getFilteredBills = () => allBills.filter(bill => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      bill.customerName?.toLowerCase().includes(q) ||
      bill.billNumber?.toLowerCase().includes(q) ||
      bill.customerPhone?.includes(q);
    const matchStatus = statusFilter === 'all' || (bill.status || '').toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const getSelectedBills = () => allBills.filter(b => selectedBillIds.has(b.id || b._id));

  const toggleBillSelection = (billId: string) => {
    const next = new Set(selectedBillIds);
    next.has(billId) ? next.delete(billId) : next.add(billId);
    setSelectedBillIds(next);
  };

  const handleSelectAll = () => {
    const filtered = getFilteredBills();
    const filteredIds = filtered.map(b => b.id || b._id);
    const allSelected = filteredIds.every(id => selectedBillIds.has(id));
    const next = new Set(selectedBillIds);
    allSelected ? filteredIds.forEach(id => next.delete(id)) : filteredIds.forEach(id => next.add(id));
    setSelectedBillIds(next);
  };

  const handleConfirmSelection = () => {
    const selected = allBills.filter(b => selectedBillIds.has(b.id || b._id));
    onSelectBills(selected);
    onClose();
  };

  const calculateSelectedTotal = () =>
    allBills.filter(b => selectedBillIds.has(b.id || b._id)).reduce((s, b) => s + b.grandTotal, 0);

  const filteredBills   = getFilteredBills();
  const selectedBills   = getSelectedBills();
  const displayBills    = viewMode === 'selected' ? selectedBills : filteredBills;
  const allFilteredSel  = filteredBills.length > 0 && filteredBills.every(b => selectedBillIds.has(b.id || b._id));

  const statusStyle = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':   return { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  color: '#fbbf24' };
      case 'completed': return { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.35)',  color: '#818cf8' };
      case 'delivered': return { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   color: '#4ade80' };
      default:          return { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)',  color: '#a1a1aa' };
    }
  };

  const BillCard: React.FC<{ bill: PendingBill }> = ({ bill }) => {
    const billId     = bill.id || bill._id;
    const isSelected = selectedBillIds.has(billId);
    const ss         = statusStyle(bill.status);
    return (
      <div
        onClick={() => toggleBillSelection(billId)}
        style={{
          background: isSelected
            ? 'rgba(99,102,241,0.1)'
            : 'var(--bg-elevated)',
          border: `1px solid ${isSelected ? 'rgba(99,102,241,0.5)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: isSelected ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none'
        }}
        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; }}
      >
        {/* Checkbox */}
        <div style={{
          width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
          background: isSelected ? 'var(--accent)' : 'transparent',
          border: `2px solid ${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', fontSize: '11px', color: 'white', fontWeight: 'bold'
        }}>
          {isSelected && <i className="fas fa-check"></i>}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
              {bill.customerName}
            </span>
            <span style={{
              background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color,
              padding: '1px 7px', borderRadius: '4px', fontSize: '10px',
              fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em'
            }}>
              {bill.status || 'unknown'}
            </span>
          </div>
          <div style={{
            color: 'var(--text-muted)', fontSize: '12px',
            display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center'
          }}>
            <span style={{
              fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)',
              padding: '1px 6px', borderRadius: '4px', fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              #{bill.billNumber}
            </span>
            <span><i className="fas fa-box" style={{ marginRight: '4px', fontSize: '10px' }}></i>{bill.items?.length || 0} items</span>
            <span><i className="far fa-calendar-alt" style={{ marginRight: '4px', fontSize: '10px' }}></i>
              {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {bill.customerPhone && (
              <span><i className="fas fa-phone" style={{ marginRight: '4px', fontSize: '10px' }}></i>{bill.customerPhone}</span>
            )}
          </div>
        </div>

        {/* Amount */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: '16px', fontWeight: '700',
            color: isSelected ? 'var(--accent-text)' : 'var(--text-primary)'
          }}>
            ₹{bill.grandTotal?.toLocaleString('en-IN')}
          </div>
          {isSelected && (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              click to remove
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, backdropFilter: 'blur(12px)'
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        width: '92%', maxWidth: '820px',
        height: '88vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-elevated)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'var(--accent-muted)', border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', fontSize: '16px'
            }}>
              <i className="fas fa-layer-group"></i>
            </div>
            <div>
              <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '17px', fontWeight: '700' }}>
                Select Bills to Add
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: '2px 0 0 0', fontSize: '12px' }}>
                All bills — pending, completed, delivered
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* ── View Mode Tabs ── */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {[
            { key: 'all',      label: `All Bills`,  count: filteredBills.length,    icon: 'fa-list' },
            { key: 'selected', label: `Selected`,   count: selectedBillIds.size,    icon: 'fa-check-square' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key as any)}
              style={{
                flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
                background: viewMode === tab.key ? 'var(--bg-elevated)' : 'transparent',
                color: viewMode === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: viewMode === tab.key ? '600' : '400',
                fontSize: '13px',
                borderBottom: viewMode === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <i className={`fas ${tab.icon}`} style={{ fontSize: '12px' }}></i>
              {tab.label}
              <span style={{
                background: viewMode === tab.key ? 'var(--accent-muted)' : 'rgba(255,255,255,0.06)',
                color: viewMode === tab.key ? 'var(--accent-text)' : 'var(--text-muted)',
                border: viewMode === tab.key ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: '700'
              }}>
                {tab.count}
              </span>
              {tab.key === 'selected' && selectedBillIds.size > 0 && (
                <span style={{
                  background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: '700'
                }}>
                  ₹{calculateSelectedTotal().toLocaleString('en-IN')}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Search + Filter (All tab only) ── */}
        {viewMode === 'all' && (
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
            background: 'var(--bg-elevated)'
          }}>
            {/* Search */}
            <div style={{ flex: 1, position: 'relative', minWidth: '180px' }}>
              <i className="fas fa-search" style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', fontSize: '12px', pointerEvents: 'none'
              }}></i>
              <input
                type="text"
                placeholder="Search name, bill no, phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="professional-input"
                style={{ width: '100%', padding: '8px 32px 8px 34px', fontSize: '13px', boxSizing: 'border-box' }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '11px', padding: '2px'
                }}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            {/* Status pills */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['all', 'pending', 'completed', 'delivered'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: '6px 12px', borderRadius: 'var(--radius-full)',
                  background: statusFilter === s ? 'var(--accent-muted)' : 'rgba(255,255,255,0.05)',
                  color: statusFilter === s ? 'var(--accent-text)' : 'var(--text-secondary)',
                  fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                  textTransform: 'capitalize',
                  border: statusFilter === s ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent'
                } as React.CSSProperties}>{s}</button>
              ))}
            </div>

            {/* Select All */}
            <button onClick={handleSelectAll} className="btn btn-ghost btn-sm" style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
              <i className={`fas ${allFilteredSel ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ marginRight: '6px' }}></i>
              {allFilteredSel ? 'Deselect All' : 'Select All'}
            </button>

            <span style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
              {filteredBills.length} shown
            </span>
          </div>
        )}

        {/* ── Selected tab info bar ── */}
        {viewMode === 'selected' && selectedBillIds.size > 0 && (
          <div style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(99,102,241,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              <i className="fas fa-info-circle" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>
              Click any bill to <strong style={{ color: '#f87171' }}>remove</strong> it from selection
            </span>
            <button
              onClick={() => setSelectedBillIds(new Set())}
              className="btn btn-ghost btn-sm"
              style={{ color: '#f87171', fontSize: '12px' }}
            >
              <i className="fas fa-trash" style={{ marginRight: '6px' }}></i>Clear All
            </button>
          </div>
        )}

        {/* ── Bills List ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }} className="custom-scrollbar">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '60px' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
              <p style={{ margin: 0, fontSize: '14px' }}>Loading bills...</p>
            </div>
          ) : viewMode === 'selected' && selectedBillIds.size === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px' }}>
              <i className="fas fa-inbox" style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.3, display: 'block' }}></i>
              <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '16px' }}>No bills selected</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px' }}>Go to All Bills tab and select bills to add</p>
              <button onClick={() => setViewMode('all')} className="btn btn-primary btn-sm">
                <i className="fas fa-list" style={{ marginRight: '6px' }}></i>Browse All Bills
              </button>
            </div>
          ) : displayBills.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px' }}>
              <i className="fas fa-search" style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3, display: 'block' }}></i>
              <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '15px' }}>No bills found</h3>
              <p style={{ margin: 0, fontSize: '13px' }}>Try a different search or filter</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayBills.map(bill => <BillCard key={bill.id || bill._id} bill={bill} />)}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {selectedBillIds.size} bill{selectedBillIds.size !== 1 ? 's' : ''} selected
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Total: <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                ₹{calculateSelectedTotal().toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleClose} className="btn btn-ghost">
              Cancel
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={selectedBillIds.size === 0}
              className="btn btn-primary"
              style={{ opacity: selectedBillIds.size === 0 ? 0.4 : 1 }}
            >
              <i className="fas fa-check" style={{ marginRight: '8px' }}></i>
              Add {selectedBillIds.size > 0 ? `${selectedBillIds.size} ` : ''}Bills
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingBillSelector;
