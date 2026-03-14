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
  washTypes: string[];
  itemNames: string[];
}

interface TagStats {
  totalTags: number;
  byStatus: Record<string, number>;
  byWashType: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  'printed':    { label: 'Printed',    bg: 'var(--info-muted)',    color: 'var(--info)',            icon: 'fa-print' },
  'created':    { label: 'Printed',    bg: 'var(--info-muted)',    color: 'var(--info)',            icon: 'fa-print' },
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
  const [viewMode, setViewMode] = useState<'bills' | 'timeline'>('bills');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'tags'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);
  useEffect(() => { fetchTags(); fetchStats(); }, [filters]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const activeFilters: Record<string, string> = {};
      (Object.entries(filters) as [string, string][]).forEach(([k, v]) => { if (v !== '') activeFilters[k] = v; });
      const queryParams = new URLSearchParams({
        page: '1', limit: '1000',
        ...activeFilters
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
          status: tag.status, createdAt: tag.createdAt, tags: [],
          washTypes: [], itemNames: []
        };
      }
      acc[tag.billNumber].tags.push(tag);
      if (!acc[tag.billNumber].washTypes.includes(tag.washType)) acc[tag.billNumber].washTypes.push(tag.washType);
      if (tag.itemName && !acc[tag.billNumber].itemNames.includes(tag.itemName)) acc[tag.billNumber].itemNames.push(tag.itemName);
      return acc;
    }, {} as Record<string, GroupedBill>);
    setGroupedBills(Object.values(grouped).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  };

  const fetchStats = async () => {
    try {
      const dateFilters: Record<string, string> = {};
      (Object.entries(filters) as [string, string][]).forEach(([k, v]) => {
        if ((k === 'startDate' || k === 'endDate') && v !== '') dateFilters[k] = v;
      });
      const queryParams = new URLSearchParams(dateFilters);
      const response = await apiService.get(`/tag-history/stats/overview?${queryParams}`);
      if (response.success && response.data) setStats(response.data);
    } catch (error) { console.error('Error fetching stats:', error); }
  };

  const filteredBills = useMemo(() => {
    let bills = groupedBills;
    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      bills = bills.filter(b =>
        b.billNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.toLowerCase().includes(q) ||
        b.itemNames.some(n => n.toLowerCase().includes(q))
      );
    }
    // Sort
    bills = [...bills].sort((a, b) => {
      if (sortBy === 'date') return sortDir === 'desc' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'name') return sortDir === 'desc' ? b.customerName.localeCompare(a.customerName) : a.customerName.localeCompare(b.customerName);
      if (sortBy === 'tags') return sortDir === 'desc' ? b.tags.length - a.tags.length : a.tags.length - b.tags.length;
      return 0;
    });
    return bills;
  }, [groupedBills, quickSearch, sortBy, sortDir]);

  // Timeline data
  const timelineData = useMemo(() => {
    const byDate: Record<string, GroupedBill[]> = {};
    filteredBills.forEach(b => {
      const d = new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(b);
    });
    return Object.entries(byDate);
  }, [filteredBills]);

  const handleFilterChange = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters({ billNumber: '', customerName: '', customerPhone: '', status: '', startDate: '', endDate: '' });

  const handleBulkStatusUpdate = async (billNumber: string, newStatus: string) => {
    try {
      const response = await apiService.patch(`/tag-history/bill/${billNumber}/status`, {
        status: newStatus, note: `Status updated to ${newStatus}`
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
    showConfirm(`Delete tag ${tagInfo}?`, async () => {
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
    showConfirm(`Delete ALL tags for bill ${billNumber} (${customerName})?`, async () => {
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
    showAlert({ message: 'CSV exported', type: 'success' });
  };

  const reprintBillTags = (bill: GroupedBill) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { showAlert({ message: 'Please allow popups', type: 'warning' }); return; }
    const tagHTML = `<!DOCTYPE html><html><head><title>Tags - ${bill.billNumber}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}@page{size:20mm auto;margin:0!important}@media print{html,body{width:20mm!important;margin:0!important;padding:0!important}.tag{page-break-after:avoid}}
    body{font-family:Arial,sans-serif;margin:0;padding:0;background:white;width:20mm}
    .tag{width:19mm;margin:1.5mm auto;padding:0.8mm;background:white;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;overflow:hidden;border:0.5px solid #000}
    .top-header{text-align:center;padding-bottom:0.3mm;border-bottom:0.3px solid #000;line-height:1.15}
    .brand-line1{font-size:4px;font-weight:900;display:block}
    .brand-line2{font-size:3px;font-weight:700;display:block}
    .tag-date{font-size:3.5px;font-weight:bold;text-align:center;margin-top:0.8mm;line-height:1}
    .name{text-align:center;font-size:6px;font-weight:900;text-transform:uppercase;margin:0.5mm 0;line-height:1.1}
    .info{display:flex;justify-content:space-between;align-items:center;font-size:4.5px;font-weight:bold;font-family:'Courier New',monospace;margin:0.3mm 0}
    .tnum{font-size:4.5px;font-weight:900;border:0.5px solid #000;padding:0px 1px}
    .web{text-align:center;font-size:3px;font-weight:bold;margin-top:0.3mm;padding-top:0.3mm;border-top:0.3px solid #000}</style></head>
    <body>${bill.tags.map((tag, i) => `<div class="tag"><div class="top-header"><span class="brand-line1">Gen-Z Laundry</span><span class="brand-line2">&amp; Dry Cleaners</span></div><div class="tag-date">${new Date(tag.createdAt).toLocaleDateString('en-GB')}</div><div class="name">${tag.customerName}</div><div class="info"><span>${tag.billNumber}</span><span class="tnum">${tag.tagIndex} / ${tag.totalTags}</span></div><div class="web">www.genzlaundry.com</div></div>`).join('')}
    <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},1000)},500)}</script></body></html>`;
    printWindow.document.write(tagHTML); printWindow.document.close();
  };

  const reprintSingleTag = (tag: TagHistory) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { showAlert({ message: 'Please allow popups', type: 'warning' }); return; }
    const tagHTML = `<!DOCTYPE html><html><head><title>Tag - ${tag.billNumber}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}@page{size:20mm auto;margin:0!important}@media print{html,body{width:20mm!important;margin:0!important;padding:0!important}}
    body{font-family:Arial,sans-serif;margin:0;padding:0;background:white;width:20mm}
    .tag{width:19mm;margin:1.5mm auto;padding:0.8mm;background:white;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;overflow:hidden;border:0.5px solid #000}
    .top-header{text-align:center;padding-bottom:0.3mm;border-bottom:0.3px solid #000;line-height:1.15}
    .brand-line1{font-size:4px;font-weight:900;display:block}
    .brand-line2{font-size:3px;font-weight:700;display:block}
    .tag-date{font-size:3.5px;font-weight:bold;text-align:center;margin-top:0.8mm;line-height:1}
    .name{text-align:center;font-size:6px;font-weight:900;text-transform:uppercase;margin:0.5mm 0;line-height:1.1}
    .info{display:flex;justify-content:space-between;align-items:center;font-size:4.5px;font-weight:bold;font-family:'Courier New',monospace;margin:0.3mm 0}
    .tnum{font-size:4.5px;font-weight:900;border:0.5px solid #000;padding:0px 1px}
    .web{text-align:center;font-size:3px;font-weight:bold;margin-top:0.3mm;padding-top:0.3mm;border-top:0.3px solid #000}</style></head>
    <body><div class="tag"><div class="top-header"><span class="brand-line1">Gen-Z Laundry</span><span class="brand-line2">&amp; Dry Cleaners</span></div><div class="tag-date">${new Date(tag.createdAt).toLocaleDateString('en-GB')}</div><div class="name">${tag.customerName}</div><div class="info"><span>${tag.billNumber}</span><span class="tnum">${tag.tagIndex} / ${tag.totalTags}</span></div><div class="web">www.genzlaundry.com</div></div>
    <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},1000)},500)}</script></body></html>`;
    printWindow.document.write(tagHTML); printWindow.document.close();
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const formatDateShort = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short'
  });

  const getStatusBadge = (status: string, size: 'sm' | 'md' = 'md') => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['printed'];
    const padding = size === 'sm' ? '1px 8px' : '3px 10px';
    const fontSize = size === 'sm' ? '10px' : '11px';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding, borderRadius: '9999px', fontSize, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
        <i className={`fas ${cfg.icon}`} style={{ fontSize: '9px' }} />
        {cfg.label}
      </span>
    );
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Stats computed
  const totalBillsCount = filteredBills.length;
  const totalTagsCount = filteredBills.reduce((s, b) => s + b.tags.length, 0);
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBills.forEach(b => b.tags.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; }));
    return counts;
  }, [filteredBills]);
  const washTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBills.forEach(b => b.tags.forEach(t => { counts[t.washType] = (counts[t.washType] || 0) + 1; }));
    return counts;
  }, [filteredBills]);

  const card: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', transition: 'all 0.2s' };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  return (
    <div style={{ padding: '20px', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <i className="fas fa-tags" style={{ marginRight: '8px', color: 'var(--accent)' }} />
            Tag History
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            {totalBillsCount} bills · {totalTagsCount} tags tracked
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-elevated)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
            {[{ key: 'bills', icon: 'fa-list', label: 'Bills' }, { key: 'timeline', icon: 'fa-clock', label: 'Timeline' }].map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key as any)}
                className={viewMode === v.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                style={{ fontSize: '11px', borderRadius: '5px', gap: '4px' }}>
                <i className={`fas ${v.icon}`} style={{ fontSize: '10px' }} />{v.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV} style={{ fontSize: '11px' }}>
            <i className="fas fa-download" style={{ fontSize: '10px' }} />Export
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { fetchTags(); fetchStats(); }} style={{ fontSize: '11px' }}>
            <i className="fas fa-sync-alt" style={{ fontSize: '10px' }} />Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <div style={card}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Total Tags</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-text)' }}>{totalTagsCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{totalBillsCount} bills</div>
        </div>
        {Object.entries(statusCounts).filter(([k]) => k !== 'created').map(([status, count]) => {
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['printed'];
          return (
            <div key={status} style={card}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{cfg.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: cfg.color }}>{count}</div>
              <div style={{ height: '3px', background: 'var(--bg-hover)', borderRadius: '2px', marginTop: '6px' }}>
                <div style={{ height: '100%', width: `${totalTagsCount > 0 ? (count / totalTagsCount) * 100 : 0}%`, background: cfg.color, borderRadius: '2px', transition: 'width 0.4s' }} />
              </div>
            </div>
          );
        })}
        {Object.entries(washTypeCounts).map(([type, count]) => (
          <div key={type} style={card}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{type}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>tags</div>
          </div>
        ))}
      </div>

      {/* Search + Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }} />
          <input type="text" placeholder="Search by name, phone, bill number, or item..." value={quickSearch} onChange={e => setQuickSearch(e.target.value)}
            style={{ paddingLeft: '34px', width: '100%', fontSize: '13px' }} />
        </div>
        {/* Sort buttons */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-elevated)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
          {[{ key: 'date', label: 'Date' }, { key: 'name', label: 'Name' }, { key: 'tags', label: 'Tags' }].map(s => (
            <button key={s.key} onClick={() => toggleSort(s.key as any)}
              style={{ background: sortBy === s.key ? 'var(--accent-muted)' : 'transparent', border: 'none', borderRadius: '4px', padding: '4px 10px', color: sortBy === s.key ? 'var(--accent)' : 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: sortBy === s.key ? 600 : 400, display: 'flex', alignItems: 'center', gap: '3px' }}>
              {s.label}{sortBy === s.key && <span style={{ fontSize: '9px' }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
            </button>
          ))}
        </div>
        <button className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowFilters(!showFilters)} style={{ fontSize: '11px' }}>
          <i className="fas fa-filter" style={{ fontSize: '10px' }} />Filters
          {hasActiveFilters && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <i className="fas fa-sliders-h" style={{ marginRight: '6px', color: 'var(--accent)' }} />Advanced Filters
            </span>
            {hasActiveFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ fontSize: '11px' }}><i className="fas fa-times" /> Clear</button>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
            <input type="text" placeholder="Bill Number" value={filters.billNumber} onChange={e => handleFilterChange('billNumber', e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
            <input type="text" placeholder="Customer Name" value={filters.customerName} onChange={e => handleFilterChange('customerName', e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
            <input type="text" placeholder="Phone" value={filters.customerPhone} onChange={e => handleFilterChange('customerPhone', e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
            <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }}>
              <option value="">All Status</option>
              <option value="printed">Printed</option>
              <option value="in-process">In Process</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
            <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
            <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} style={{ fontSize: '12px', padding: '8px 10px' }} />
          </div>
        </div>
      )}

      {/* Bills List / Timeline */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '20px', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px' }}>Loading tags...</div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <i className="fas fa-tags" style={{ fontSize: '24px', marginBottom: '12px', opacity: 0.3 }} />
            <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 4px', fontSize: '15px' }}>No tags found</h3>
            <p style={{ fontSize: '12px', margin: 0 }}>Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'timeline' ? (
          /* ─── Timeline View ─── */
          <div style={{ maxHeight: '600px', overflowY: 'auto', padding: '16px' }}>
            {timelineData.map(([date, bills], di) => (
              <div key={date} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-muted)', padding: '3px 12px', borderRadius: '12px' }}>{date}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bills.length} bills · {bills.reduce((s, b) => s + b.tags.length, 0)} tags</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                </div>
                <div style={{ display: 'grid', gap: '6px', paddingLeft: '12px', borderLeft: '2px solid var(--border-subtle)' }}>
                  {bills.map(bill => (
                    <div key={bill.billNumber} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onClick={() => setSelectedBill(bill)}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)', e.currentTarget.style.border = '1px solid var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.border = '1px solid transparent')}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                        {bill.tags.length}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{bill.customerName}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{bill.billNumber}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {bill.itemNames.join(', ') || 'No items'} · {bill.washTypes.join(', ')}
                        </div>
                      </div>
                      {getStatusBadge(bill.status, 'sm')}
                      <i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--text-muted)' }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ─── Bills View ─── */
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredBills.map((bill, idx) => (
              <div key={bill.billNumber} style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(6px)', transition: `all 0.3s ease ${Math.min(idx * 0.03, 0.3)}s` }}>
                {/* Bill Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onClick={() => toggleBillExpansion(bill.billNumber)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Tag count badge */}
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                    {bill.tags.length}
                  </div>

                  {/* Bill info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{bill.customerName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{bill.billNumber}</span>
                      {bill.customerPhone && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}><i className="fas fa-phone" style={{ fontSize: '8px', marginRight: '3px' }} />{bill.customerPhone}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bill.itemNames.join(', ') || '—'} · {bill.washTypes.join(', ')} · {formatDateShort(bill.createdAt)}
                    </div>
                  </div>

                  {/* Status + Actions */}
                  {getStatusBadge(bill.status, 'sm')}
                  <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => reprintBillTags(bill)} title="Reprint" style={{ padding: '5px', width: '28px', height: '28px' }}>
                      <i className="fas fa-print" style={{ fontSize: '11px' }} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBill(bill)} title="Manage" style={{ padding: '5px', width: '28px', height: '28px' }}>
                      <i className="fas fa-cog" style={{ fontSize: '11px' }} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteAllBillTags(bill.billNumber, bill.customerName)} title="Delete" style={{ padding: '5px', width: '28px', height: '28px', color: 'var(--danger)' }}>
                      <i className="fas fa-trash" style={{ fontSize: '11px' }} />
                    </button>
                  </div>
                  <i className={`fas fa-chevron-${expandedBills.has(bill.billNumber) ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: '10px' }} />
                </div>

                {/* Expanded Tags */}
                {expandedBills.has(bill.billNumber) && (
                  <div style={{ padding: '8px 16px 12px 62px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'grid', gap: '4px' }}>
                      {bill.tags.sort((a, b) => a.tagIndex - b.tagIndex).map(tag => (
                        <div key={tag._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-text)', minWidth: '36px', fontSize: '13px' }}>
                            {tag.tagIndex}/{tag.totalTags}
                          </span>
                          <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500 }}>{tag.itemName}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{tag.washType}</span>
                          {getStatusBadge(tag.status, 'sm')}
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => reprintSingleTag(tag)} title="Reprint" style={{ padding: '3px', width: '24px', height: '24px' }}>
                              <i className="fas fa-print" style={{ fontSize: '10px' }} />
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleEditTag(tag)} title="Edit" style={{ padding: '3px', width: '24px', height: '24px' }}>
                              <i className="fas fa-pen" style={{ fontSize: '10px' }} />
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTag(tag._id, `${tag.tagIndex}/${tag.totalTags}`)} title="Delete" style={{ padding: '3px', width: '24px', height: '24px', color: 'var(--danger)' }}>
                              <i className="fas fa-trash" style={{ fontSize: '10px' }} />
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
            borderRadius: 'var(--radius-xl)', maxWidth: '800px', width: '95%',
            maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--shadow-xl)', animation: 'modalSlideIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <i className="fas fa-tag" style={{ marginRight: '8px', color: 'var(--accent)' }} />
                  {selectedBill.billNumber}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {selectedBill.customerName} · {selectedBill.customerPhone || 'No phone'} · {formatDate(selectedBill.createdAt)}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBill(null)}><i className="fas fa-times" /></button>
            </div>

            {/* Quick Actions */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Update Status:</span>
              <button className="btn btn-ghost btn-sm" onClick={() => reprintBillTags(selectedBill)} style={{ fontSize: '11px' }}>
                <i className="fas fa-print" /> Reprint
              </button>
              <button className="btn btn-sm" style={{ background: 'var(--warning)', color: 'var(--text-inverse)', fontSize: '11px' }} onClick={() => handleBulkStatusUpdate(selectedBill.billNumber, 'in-process')}>
                <i className="fas fa-spinner" /> In Process
              </button>
              <button className="btn btn-success btn-sm" style={{ fontSize: '11px' }} onClick={() => handleBulkStatusUpdate(selectedBill.billNumber, 'completed')}>
                <i className="fas fa-check" /> Completed
              </button>
              <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={() => handleBulkStatusUpdate(selectedBill.billNumber, 'delivered')}>
                <i className="fas fa-truck" /> Delivered
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-danger btn-sm" style={{ fontSize: '11px' }} onClick={() => handleDeleteAllBillTags(selectedBill.billNumber, selectedBill.customerName)}>
                <i className="fas fa-trash" /> Delete All
              </button>
            </div>

            {/* Summary row */}
            <div style={{ padding: '10px 20px', display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              {[
                { label: 'Tags', value: selectedBill.tags.length, color: 'var(--accent-text)' },
                { label: 'Items', value: selectedBill.itemNames.join(', ') || '—', color: 'var(--text-primary)' },
                { label: 'Wash', value: selectedBill.washTypes.join(', '), color: 'var(--text-primary)' },
                { label: 'Status', value: '', color: '' }
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-elevated)', padding: '8px 14px', borderRadius: '6px', flex: i === 1 ? 2 : 1 }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>{s.label}</div>
                  {s.label === 'Status' ? getStatusBadge(selectedBill.status, 'sm') :
                    <div style={{ fontSize: '13px', fontWeight: 600, color: s.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</div>}
                </div>
              ))}
            </div>

            {/* Tags List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Tags ({selectedBill.tags.length})
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                {selectedBill.tags.sort((a, b) => a.tagIndex - b.tagIndex).map(tag => (
                  <div key={tag._id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                    background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '12px'
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-text)', minWidth: '36px', fontSize: '14px' }}>{tag.tagIndex}/{tag.totalTags}</span>
                    <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500 }}>{tag.itemName}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{tag.washType}</span>
                    {getStatusBadge(tag.status, 'sm')}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatDateShort(tag.updatedAt)}</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => reprintSingleTag(tag)} style={{ padding: '3px', width: '24px', height: '24px' }}><i className="fas fa-print" style={{ fontSize: '10px' }} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEditTag(tag)} style={{ padding: '3px', width: '24px', height: '24px' }}><i className="fas fa-pen" style={{ fontSize: '10px' }} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTag(tag._id, `${tag.tagIndex}/${tag.totalTags}`)} style={{ padding: '3px', width: '24px', height: '24px', color: 'var(--danger)' }}><i className="fas fa-trash" style={{ fontSize: '10px' }} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Event Timeline */}
              {selectedBill.tags[0]?.events?.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '16px 0 8px' }}>Activity Timeline</div>
                  <div style={{ position: 'relative', paddingLeft: '20px' }}>
                    <div style={{ position: 'absolute', left: '7px', top: '4px', bottom: '4px', width: '2px', background: 'var(--border-subtle)' }} />
                    {selectedBill.tags[0].events.map((event, index) => {
                      const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG['printed'];
                      return (
                        <div key={index} style={{ position: 'relative', marginBottom: '10px', paddingLeft: '16px' }}>
                          <div style={{ position: 'absolute', left: '-2px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: cfg.color, border: '2px solid var(--bg-surface)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {getStatusBadge(event.status, 'sm')}
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatDate(event.timestamp)}</span>
                          </div>
                          {event.note && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{event.note}</p>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagHistoryViewer;
