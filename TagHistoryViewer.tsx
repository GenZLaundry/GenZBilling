import React, { useState, useEffect, useMemo } from 'react';
import apiService from './api';
import { useAlert } from './GlobalAlert';

interface TagHistoryEvent {
  status: string;
  timestamp: string;
  note?: string;
}

interface TagHistory {
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  itemName: string;
  washType: string;
  tagIndex: number;
  totalTags: number;
  status: string;
  qrCode?: string;
  barcode?: string;
  events: TagHistoryEvent[];
  createdAt: string;
  updatedAt: string;
}

interface GroupedBill {
  billNumber: string;
  customerName: string;
  customerPhone: string;
  totalTags: number;
  status: string;
  createdAt: string;
  tags: TagHistory[];
}

interface TagStats {
  totalTags: number;
  byStatus: Record<string, number>;
  byWashType: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  'created':    { label: 'Created',    bg: 'var(--bg-elevated)',   color: 'var(--text-secondary)', icon: 'fa-plus-circle' },
  'printed':    { label: 'Printed',    bg: 'var(--info-muted)',    color: 'var(--info)',            icon: 'fa-print' },
  'in-process': { label: 'In Process', bg: 'var(--warning-muted)', color: 'var(--warning)',         icon: 'fa-spinner' },
  'completed':  { label: 'Completed',  bg: 'var(--success-muted)', color: 'var(--success)',         icon: 'fa-check-circle' },
  'delivered':  { label: 'Delivered',  bg: 'var(--accent-muted)',  color: 'var(--accent)',          icon: 'fa-truck' },
};

const TagHistoryViewer: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();
  const [tags, setTags] = useState<TagHistory[]>([]);
  const [groupedBills, setGroupedBills] = useState<GroupedBill[]>([]);
  const [stats, setStats] = useState<TagStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [filters, setFilters] = useState({
    billNumber: '', customerName: '', customerPhone: '',
    status: '', startDate: '', endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [selectedBill, setSelectedBill] = useState<GroupedBill | null>(null);

  useEffect(() => { fetchTags(); fetchStats(); }, [filters]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: '1', limit: '1000',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });
      const response = await apiService.get(`/tag-history?${queryParams}`);
      if (response.success && response.data) {
        setTags(response.data);
        groupTagsByBill(response.data);
      }
    } catch (error) { console.error('Error fetching tags:', error); }
    finally { setLoading(false); }
  };

  const groupTagsByBill = (allTags: TagHistory[]) => {
    const grouped = allTags.reduce((acc, tag) => {
      if (!acc[tag.billNumber]) {
        acc[tag.billNumber] = {
          billNumber: tag.billNumber, customerName: tag.customerName,
          customerPhone: tag.customerPhone, totalTags: tag.totalTags,
          status: tag.status, createdAt: tag.createdAt, tags: []
        };
      }
      acc[tag.billNumber].tags.push(tag);
      return acc;
    }, {} as Record<string, GroupedBill>);
    setGroupedBills(Object.values(grouped).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  };

  const fetchStats = async () => {
    try {
      const queryParams = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([k, v]) =>
          (k === 'startDate' || k === 'endDate') && v !== ''
        ))
      );
      const response = await apiService.get(`/tag-history/stats/overview?${queryParams}`);
      if (response.success && response.data) setStats(response.data);
    } catch (error) { console.error('Error fetching stats:', error); }
  };

  const filteredBills = useMemo(() => {
    if (!quickSearch.trim()) return groupedBills;
    const q = quickSearch.toLowerCase();
    return groupedBills.filter(b =>
      b.billNumber.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.customerPhone.toLowerCase().includes(q)
    );
  }, [groupedBills, quickSearch]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ billNumber: '', customerName: '', customerPhone: '', status: '', startDate: '', endDate: '' });
  };

  const handleBulkStatusUpdate = async (billNumber: string, newStatus: string) => {
    try {
      const response = await apiService.patch(`/tag-history/bill/${billNumber}/status`, {
        status: newStatus, note: `Bulk status update to ${newStatus}`
      });
      if (response.success) {
        showAlert({ message: `All tags marked as ${newStatus}`, type: 'success' });
        fetchTags(); fetchStats(); setSelectedBill(null);
      }
    } catch (error) {
      showAlert({ message: 'Failed to update status', type: 'error' });
    }
  };

  const handleDeleteTag = (tagId: string, tagInfo: string) => {
    showConfirm(`Delete tag ${tagInfo}? This cannot be undone.`, async () => {
      try {
        const response = await apiService.delete(`/tag-history/${tagId}`);
        if (response.success) {
          showAlert({ message: 'Tag deleted', type: 'success' });
          fetchTags(); fetchStats(); setSelectedBill(null);
        }
      } catch (error) { showAlert({ message: 'Failed to delete tag', type: 'error' }); }
    });
  };

  const handleDeleteAllBillTags = (billNumber: string, customerName: string) => {
    showConfirm(`Delete ALL tags for bill ${billNumber} (${customerName})? This cannot be undone.`, async () => {
      try {
        const response = await apiService.delete(`/tag-history/bill/${billNumber}`);
        if (response.success) {
          showAlert({ message: 'All tags deleted', type: 'success' });
          fetchTags(); fetchStats(); setSelectedBill(null);
        }
      } catch (error) { showAlert({ message: 'Failed to delete tags', type: 'error' }); }
    });
  };

  const handleEditTag = async (tag: TagHistory) => {
    const newItemName = prompt('Edit Item Name:', tag.itemName);
    if (!newItemName || newItemName === tag.itemName) return;
    try {
      const response = await apiService.patch(`/tag-history/${tag._id}`, { itemName: newItemName.toUpperCase() });
      if (response.success) { showAlert({ message: 'Tag updated', type: 'success' }); fetchTags(); }
    } catch (error) { showAlert({ message: 'Failed to update tag', type: 'error' }); }
  };

  const toggleBillExpansion = (billNumber: string) => {
    const next = new Set(expandedBills);
    next.has(billNumber) ? next.delete(billNumber) : next.add(billNumber);
    setExpandedBills(next);
  };

  const exportCSV = () => {
    const rows = tags.map(t => [t.billNumber, t.customerName, t.customerPhone, t.itemName, t.washType, t.tagIndex, t.totalTags, t.status, new Date(t.createdAt).toLocaleDateString()]);
    const csv = ['Bill#,Customer,Phone,Item,WashType,Tag#,TotalTags,Status,Date', ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `tag_history_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    showAlert({ message: 'CSV exported successfully', type: 'success' });
  };

  const reprintBillTags = (bill: GroupedBill) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { showAlert({ message: 'Please allow popups for printing', type: 'warning' }); return; }
    const tagHTML = `<!DOCTYPE html><html><head><title>Reprint Tags - ${bill.billNumber}</title>
    <style>@page{size:2in auto;margin:0}@media print{body{margin:0;padding:0}.tag{page-break-after:avoid}}
    body{font-family:Arial,sans-serif;margin:0;padding:0;background:white;width:2in}
    .tag{width:44mm;height:35mm;border:1.5px solid #000;margin:0 auto;padding:1.5mm;background:white;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;overflow:hidden}
    .tag-sep{height:10mm;width:100%;position:relative;display:flex;align-items:center;justify-content:center}
    .tag-sep::before{content:'';position:absolute;left:0;right:0;top:50%;border-top:1px dotted #666}
    .tag-sep::after{content:'✂';position:relative;font-size:14px;color:#666;background:white;padding:0 5px;z-index:2}
    .top-row{display:flex;justify-content:space-between;align-items:center;font-size:6px;font-weight:bold;padding-bottom:1mm;border-bottom:1px solid #000}
    .name{text-align:center;font-size:12px;font-weight:900;text-transform:uppercase;margin:1.5mm 0;line-height:1.1}
    .info{display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:bold;font-family:'Courier New',monospace;margin:1mm 0}
    .tnum{font-size:9px;font-weight:900;border:1.5px solid #000;padding:1px 4px;border-radius:2px}
    .web{text-align:center;font-size:6px;font-weight:bold;margin-top:1mm;padding-top:1mm;border-top:1px solid #000}</style></head>
    <body>${bill.tags.map((tag, i) => `<div class="tag"><div class="top-row"><span>GenZ Laundry</span><span>${new Date(tag.createdAt).toLocaleDateString('en-GB')}</span></div><div class="name">${tag.customerName}</div><div class="info"><span>${tag.billNumber}</span><span class="tnum">${tag.tagIndex} / ${tag.totalTags}</span></div><div class="web">www.genzlaundry.com</div></div>${i < bill.tags.length - 1 ? '<div class="tag-sep"></div>' : ''}`).join('')}
    <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},1000)},500)}</script></body></html>`;
    printWindow.document.write(tagHTML); printWindow.document.close();
  };

  const reprintSingleTag = (tag: TagHistory) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { showAlert({ message: 'Please allow popups for printing', type: 'warning' }); return; }
    const tagHTML = `<!DOCTYPE html><html><head><title>Reprint Tag - ${tag.billNumber}</title>
    <style>@page{size:2in auto;margin:0}@media print{body{margin:0;padding:0}}
    body{font-family:Arial,sans-serif;margin:0;padding:0;background:white;width:2in}
    .tag{width:44mm;height:35mm;border:1.5px solid #000;margin:0 auto;padding:1.5mm;background:white;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;overflow:hidden}
    .top-row{display:flex;justify-content:space-between;align-items:center;font-size:6px;font-weight:bold;padding-bottom:1mm;border-bottom:1px solid #000}
    .name{text-align:center;font-size:12px;font-weight:900;text-transform:uppercase;margin:1.5mm 0;line-height:1.1}
    .info{display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:bold;font-family:'Courier New',monospace;margin:1mm 0}
    .tnum{font-size:9px;font-weight:900;border:1.5px solid #000;padding:1px 4px;border-radius:2px}
    .web{text-align:center;font-size:6px;font-weight:bold;margin-top:1mm;padding-top:1mm;border-top:1px solid #000}</style></head>
    <body><div class="tag"><div class="top-row"><span>GenZ Laundry</span><span>${new Date(tag.createdAt).toLocaleDateString('en-GB')}</span></div><div class="name">${tag.customerName}</div><div class="info"><span>${tag.billNumber}</span><span class="tnum">${tag.tagIndex} / ${tag.totalTags}</span></div><div class="web">www.genzlaundry.com</div></div>
    <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},1000)},500)}</script></body></html>`;
    printWindow.document.write(tagHTML); printWindow.document.close();
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['created'];
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
        <i className={`fas ${cfg.icon}`} style={{ fontSize: '9px' }}></i>
        {cfg.label}
      </span>
    );
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // ─── RENDER ───
  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <i className="fas fa-tags" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
            Tag History
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track and manage all laundry tags
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
            <i className="fas fa-download"></i> Export CSV
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { fetchTags(); fetchStats(); }}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Total Tags</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-text)' }}>{stats.totalTags}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>By Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  {getStatusBadge(status)}
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>By Wash Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(stats.byWashType).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{type}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}></i>
          <input
            type="text"
            placeholder="Quick search by name, phone, or bill number..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>
        <button
          className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <i className="fas fa-filter"></i> Filters
          {hasActiveFilters && <span style={{ marginLeft: '4px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '6px', height: '6px', display: 'inline-block' }}></span>}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <i className="fas fa-sliders-h" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>Advanced Filters
            </span>
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ fontSize: '12px' }}>
                <i className="fas fa-times"></i> Clear All
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <input type="text" placeholder="Bill Number" value={filters.billNumber} onChange={(e) => handleFilterChange('billNumber', e.target.value)} />
            <input type="text" placeholder="Customer Name" value={filters.customerName} onChange={(e) => handleFilterChange('customerName', e.target.value)} />
            <input type="text" placeholder="Phone Number" value={filters.customerPhone} onChange={(e) => handleFilterChange('customerPhone', e.target.value)} />
            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="">All Status</option>
              <option value="created">Created</option>
              <option value="printed">Printed</option>
              <option value="in-process">In Process</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
            <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
            <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
          </div>
        </div>
      )}

      {/* Bills Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Table Header Bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <i className="fas fa-list" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>
            {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} · {tags.length} tag{tags.length !== 1 ? 's' : ''}
          </span>
          {hasActiveFilters && (
            <span className="badge badge-accent">
              <i className="fas fa-filter" style={{ fontSize: '9px' }}></i> Filtered
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
            <div>Loading tags...</div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <i className="fas fa-tags" style={{ fontSize: '24px', marginBottom: '12px', opacity: 0.3 }}></i>
            <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 4px' }}>No bills found</h3>
            <p style={{ fontSize: '13px', margin: 0 }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredBills.map((bill, billIndex) => (
              <div key={bill.billNumber}>
                {/* Bill Row */}
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 1fr auto auto auto',
                    alignItems: 'center', gap: '12px', padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer', transition: 'background 0.15s ease'
                  }}
                  onClick={() => toggleBillExpansion(bill.billNumber)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                    {billIndex + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{bill.billNumber}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(bill.createdAt)}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{bill.customerName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <i className="fas fa-phone" style={{ fontSize: '9px', marginRight: '4px' }}></i>{bill.customerPhone || '—'}
                    </div>
                  </div>
                  <span className="badge badge-accent">{bill.totalTags} tags</span>
                  {getStatusBadge(bill.status)}
                  <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => reprintBillTags(bill)} title="Reprint tags" style={{ padding: '6px' }}>
                      <i className="fas fa-print" style={{ fontSize: '12px' }}></i>
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBill(bill)} title="Manage" style={{ padding: '6px' }}>
                      <i className="fas fa-cog" style={{ fontSize: '12px' }}></i>
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteAllBillTags(bill.billNumber, bill.customerName)} title="Delete all" style={{ padding: '6px', color: 'var(--danger)' }}>
                      <i className="fas fa-trash" style={{ fontSize: '12px' }}></i>
                    </button>
                    <i className={`fas fa-chevron-${expandedBills.has(bill.billNumber) ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '6px', cursor: 'pointer' }} onClick={() => toggleBillExpansion(bill.billNumber)}></i>
                  </div>
                </div>

                {/* Expanded Tag Details */}
                {expandedBills.has(bill.billNumber) && (
                  <div style={{ padding: '12px 16px 16px 60px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                      Individual Tags
                    </div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {bill.tags.sort((a, b) => a.tagIndex - b.tagIndex).map((tag) => (
                        <div key={tag._id} style={{
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                          background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)', fontSize: '13px'
                        }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-text)', minWidth: '40px' }}>
                            {tag.tagIndex}/{tag.totalTags}
                          </span>
                          <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500 }}>{tag.itemName}</span>
                          <span style={{ color: 'var(--text-secondary)', minWidth: '80px' }}>{tag.washType}</span>
                          {getStatusBadge(tag.status)}
                          {(tag.qrCode || tag.barcode) && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {tag.qrCode || tag.barcode}
                            </span>
                          )}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => reprintSingleTag(tag)} title="Reprint" style={{ padding: '4px 6px' }}>
                              <i className="fas fa-print" style={{ fontSize: '11px' }}></i>
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleEditTag(tag)} title="Edit" style={{ padding: '4px 6px' }}>
                              <i className="fas fa-pen" style={{ fontSize: '11px' }}></i>
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTag(tag._id, `${tag.tagIndex}/${tag.totalTags} - ${tag.itemName}`)} title="Delete" style={{ padding: '4px 6px', color: 'var(--danger)' }}>
                              <i className="fas fa-trash" style={{ fontSize: '11px' }}></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MANAGE MODAL ─── */}
      {selectedBill && (
        <div className="modal-overlay" onClick={() => setSelectedBill(null)}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)', maxWidth: '860px', width: '95%',
            maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--shadow-xl)', animation: 'modalSlideIn 0.2s ease-out'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <i className="fas fa-cog" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                  Manage Bill · {selectedBill.billNumber}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedBill.customerName} · {selectedBill.customerPhone}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBill(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Quick Actions */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => reprintBillTags(selectedBill)}>
                <i className="fas fa-print"></i> Reprint All
              </button>
              <button className="btn btn-sm" style={{ background: 'var(--warning)', color: 'var(--text-inverse)' }} onClick={() => handleBulkStatusUpdate(selectedBill.billNumber, 'in-process')}>
                <i className="fas fa-spinner"></i> In-Process
              </button>
              <button className="btn btn-success btn-sm" onClick={() => handleBulkStatusUpdate(selectedBill.billNumber, 'completed')}>
                <i className="fas fa-check"></i> Completed
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => handleBulkStatusUpdate(selectedBill.billNumber, 'delivered')}>
                <i className="fas fa-truck"></i> Delivered
              </button>
              <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={() => handleDeleteAllBillTags(selectedBill.billNumber, selectedBill.customerName)}>
                <i className="fas fa-trash"></i> Delete All
              </button>
            </div>

            {/* Bill Summary */}
            <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Total Tags</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-text)' }}>{selectedBill.totalTags}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Customer</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedBill.customerName}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Status</div>
                {getStatusBadge(selectedBill.status)}
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Created</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{formatDate(selectedBill.createdAt)}</div>
              </div>
            </div>

            {/* Modal Body - scrollable */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              {/* Tags Table */}
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Individual Tags</div>
              <div style={{ display: 'grid', gap: '6px', marginBottom: '20px' }}>
                {selectedBill.tags.sort((a, b) => a.tagIndex - b.tagIndex).map((tag) => (
                  <div key={tag._id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)', fontSize: '13px'
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-text)', minWidth: '40px' }}>{tag.tagIndex}/{tag.totalTags}</span>
                    <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500 }}>{tag.itemName}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{tag.washType}</span>
                    {getStatusBadge(tag.status)}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(tag.updatedAt)}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => reprintSingleTag(tag)} style={{ padding: '4px 6px' }}><i className="fas fa-print" style={{ fontSize: '11px' }}></i></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEditTag(tag)} style={{ padding: '4px 6px' }}><i className="fas fa-pen" style={{ fontSize: '11px' }}></i></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTag(tag._id, `${tag.tagIndex}/${tag.totalTags}`)} style={{ padding: '4px 6px', color: 'var(--danger)' }}><i className="fas fa-trash" style={{ fontSize: '11px' }}></i></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Event Timeline */}
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Event Timeline</div>
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                <div style={{ position: 'absolute', left: '7px', top: '4px', bottom: '4px', width: '2px', background: 'var(--border-subtle)' }}></div>
                {selectedBill.tags[0]?.events.map((event, index) => {
                  const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG['created'];
                  return (
                    <div key={index} style={{ position: 'relative', marginBottom: '12px', paddingLeft: '16px' }}>
                      <div style={{ position: 'absolute', left: '-2px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: cfg.color, border: '2px solid var(--bg-surface)' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {getStatusBadge(event.status)}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(event.timestamp)}</span>
                      </div>
                      {event.note && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>{event.note}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagHistoryViewer;
