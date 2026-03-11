import React, { useState, useMemo, useEffect, useRef } from 'react';

interface ComprehensiveRevenueDashboardProps {
  onClose: () => void;
  bills: any[];
}

// Animated number counter hook
const useAnimatedNumber = (target: number, duration = 800) => {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setValue(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = target;
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
};

// Mini sparkline component
const Sparkline: React.FC<{ data: number[]; color?: string; width?: number; height?: number }> = ({
  data, color = 'var(--accent)', width = 80, height = 28
}) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const fillPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} style={{ display: 'block', opacity: 0.8 }}>
      <polyline points={fillPoints} fill={color} fillOpacity="0.12" stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ComprehensiveRevenueDashboard: React.FC<ComprehensiveRevenueDashboardProps> = ({ onClose, bills }) => {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [drillDownIndex, setDrillDownIndex] = useState<number | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [hoveredDonut, setHoveredDonut] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [drillDownSort, setDrillDownSort] = useState<'date' | 'amount' | 'status'>('date');
  const [drillDownSortDir, setDrillDownSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(bills.map(b => new Date(b.createdAt).getFullYear()))).sort((a, b) => b - a);
    return years.length ? years : [new Date().getFullYear()];
  }, [bills]);

  // Quick date presets
  const applyPreset = (preset: string) => {
    const now = new Date();
    setViewMode('daily');
    switch (preset) {
      case 'today': setSelectedDate(now.toISOString().split('T')[0]); break;
      case 'yesterday': { const d = new Date(now); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); break; }
      case 'thisWeek': setViewMode('daily'); setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); setSelectedDate(now.toISOString().split('T')[0]); break;
      case 'thisMonth': setViewMode('monthly'); setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); break;
      case 'last30': setViewMode('monthly'); setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); break;
      case 'thisYear': setViewMode('yearly'); setSelectedYear(now.getFullYear()); break;
    }
  };

  // Filtered bills
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const d = new Date(bill.createdAt);
      if (viewMode === 'yearly') return d.getFullYear() === selectedYear;
      if (viewMode === 'monthly') return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      return bill.createdAt?.startsWith(selectedDate);
    });
  }, [bills, viewMode, selectedYear, selectedMonth, selectedDate]);

  // Previous period bills for comparison
  const prevPeriodBills = useMemo(() => {
    return bills.filter(bill => {
      const d = new Date(bill.createdAt);
      if (viewMode === 'yearly') return d.getFullYear() === selectedYear - 1;
      if (viewMode === 'monthly') {
        const pm = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const py = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        return d.getFullYear() === py && d.getMonth() === pm;
      }
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      return bill.createdAt?.startsWith(prevDate.toISOString().split('T')[0]);
    });
  }, [bills, viewMode, selectedYear, selectedMonth, selectedDate]);

  // Metrics
  const totalRevenue = filteredBills.reduce((s: number, b: any) => s + (b.grandTotal || 0), 0);
  const prevRevenue = prevPeriodBills.reduce((s: number, b: any) => s + (b.grandTotal || 0), 0);
  const totalBills = filteredBills.length;
  const prevBills = prevPeriodBills.length;
  const avgBill = totalBills > 0 ? totalRevenue / totalBills : 0;
  const prevAvgBill = prevBills > 0 ? prevRevenue / prevBills : 0;
  const completedBills = filteredBills.filter((b: any) => b.status === 'completed' || b.status === 'delivered').length;
  const paidRate = totalBills > 0 ? (completedBills / totalBills) * 100 : 0;
  const prevCompleted = prevPeriodBills.filter((b: any) => b.status === 'completed' || b.status === 'delivered').length;
  const prevPaidRate = prevBills > 0 ? (prevCompleted / prevBills) * 100 : 0;
  const totalItems = filteredBills.reduce((s: number, b: any) => s + (b.items?.length || 0), 0);
  const prevItems = prevPeriodBills.reduce((s: number, b: any) => s + (b.items?.length || 0), 0);

  // Customer data
  const customerRevenue: Record<string, { revenue: number; bills: number; billList: any[] }> = {};
  filteredBills.forEach((bill: any) => {
    if (!customerRevenue[bill.customerName]) customerRevenue[bill.customerName] = { revenue: 0, bills: 0, billList: [] };
    customerRevenue[bill.customerName].revenue += bill.grandTotal;
    customerRevenue[bill.customerName].bills += 1;
    customerRevenue[bill.customerName].billList.push(bill);
  });
  const topCustomers = Object.entries(customerRevenue).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 8);
  const uniqueCustomers = Object.keys(customerRevenue).length;

  // Item categories
  const itemCounts: Record<string, { count: number; revenue: number }> = {};
  filteredBills.forEach((b: any) => b.items?.forEach((item: any) => {
    const name = item.name || 'Other';
    if (!itemCounts[name]) itemCounts[name] = { count: 0, revenue: 0 };
    itemCounts[name].count += item.quantity || 1;
    itemCounts[name].revenue += item.amount || 0;
  }));
  const itemCategories = Object.entries(itemCounts).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 8);
  const totalItemRevenue = itemCategories.reduce((s, [, d]) => s + d.revenue, 0);

  // Sparkline data (last 7 days/months)
  const sparklineData = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      if (viewMode === 'daily' || viewMode === 'monthly') {
        const d = new Date(selectedDate || new Date());
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        data.push(bills.filter(b => b.createdAt?.startsWith(ds)).reduce((s: number, b: any) => s + (b.grandTotal || 0), 0));
      } else {
        const m = selectedMonth - i;
        const adjustedM = ((m % 12) + 12) % 12;
        const adjustedY = selectedYear + Math.floor(m / 12);
        data.push(bills.filter(b => { const bd = new Date(b.createdAt); return bd.getMonth() === adjustedM && bd.getFullYear() === adjustedY; }).reduce((s: number, b: any) => s + (b.grandTotal || 0), 0));
      }
    }
    return data;
  }, [bills, viewMode, selectedDate, selectedMonth, selectedYear]);

  // Revenue chart data
  const revenueData = useMemo(() => {
    const data: { label: string; revenue: number; prevRevenue: number; bills: any[] }[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (viewMode === 'daily') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const ds = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const pm = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const py = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        const pds = `${py}-${String(pm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayBills = bills.filter((b: any) => b.createdAt?.startsWith(ds));
        data.push({
          label: `${day}`, revenue: dayBills.reduce((s: number, b: any) => s + b.grandTotal, 0),
          prevRevenue: bills.filter((b: any) => b.createdAt?.startsWith(pds)).reduce((s: number, b: any) => s + b.grandTotal, 0),
          bills: dayBills
        });
      }
    } else if (viewMode === 'monthly') {
      for (let m = 0; m < 12; m++) {
        const mBills = bills.filter((b: any) => { const d = new Date(b.createdAt); return d.getMonth() === m && d.getFullYear() === selectedYear; });
        const pBills = bills.filter((b: any) => { const d = new Date(b.createdAt); return d.getMonth() === m && d.getFullYear() === selectedYear - 1; });
        data.push({ label: months[m], revenue: mBills.reduce((s: number, b: any) => s + b.grandTotal, 0), prevRevenue: pBills.reduce((s: number, b: any) => s + b.grandTotal, 0), bills: mBills });
      }
    } else {
      availableYears.forEach(y => {
        const yBills = bills.filter((b: any) => new Date(b.createdAt).getFullYear() === y);
        data.push({ label: y.toString(), revenue: yBills.reduce((s: number, b: any) => s + b.grandTotal, 0), prevRevenue: 0, bills: yBills });
      });
    }
    return data;
  }, [bills, viewMode, selectedYear, selectedMonth, availableYears]);

  const maxRevenue = Math.max(...revenueData.map(d => Math.max(d.revenue, d.prevRevenue)), 1);

  // Hourly heatmap (daily view)
  const hourlyData = useMemo(() => {
    if (viewMode !== 'daily') return [];
    const hours = Array(24).fill(0);
    filteredBills.forEach((b: any) => { const h = new Date(b.createdAt).getHours(); hours[h] += b.grandTotal; });
    return hours;
  }, [filteredBills, viewMode]);
  const maxHourly = Math.max(...hourlyData, 1);

  // Status breakdown
  const statusBreakdown = [
    { label: 'Completed', count: filteredBills.filter((b: any) => b.status === 'completed' || b.status === 'delivered').length, color: 'var(--success)' },
    { label: 'Pending', count: filteredBills.filter((b: any) => b.status === 'pending').length, color: 'var(--warning)' },
    { label: 'Processing', count: filteredBills.filter((b: any) => b.status === 'in-process').length, color: 'var(--accent)' }
  ];

  const getPeriodLabel = () => {
    if (viewMode === 'yearly') return `${selectedYear}`;
    if (viewMode === 'monthly') return new Date(selectedYear, selectedMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const trendPct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev * 100) : cur > 0 ? 100 : 0;
  const TrendBadge: React.FC<{ current: number; previous: number; suffix?: string }> = ({ current, previous, suffix = '' }) => {
    const pct = trendPct(current, previous);
    if (pct === 0 && current === 0) return <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>—</span>;
    const up = pct >= 0;
    return (
      <span style={{ fontSize: '10px', fontWeight: 600, color: up ? 'var(--success)' : 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        <i className={`fas fa-arrow-${up ? 'up' : 'down'}`} style={{ fontSize: '8px' }} />
        {Math.abs(pct).toFixed(0)}%{suffix}
      </span>
    );
  };

  const animatedRevenue = useAnimatedNumber(totalRevenue);
  const animatedAvg = useAnimatedNumber(Math.round(avgBill));
  const animatedPaidRate = useAnimatedNumber(Math.round(paidRate));

  // Drill-down bills
  const drillDownBills = useMemo(() => {
    if (drillDownIndex === null || !revenueData[drillDownIndex]) return [];
    let sorted = [...revenueData[drillDownIndex].bills];
    sorted.sort((a, b) => {
      if (drillDownSort === 'date') return drillDownSortDir === 'desc' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (drillDownSort === 'amount') return drillDownSortDir === 'desc' ? b.grandTotal - a.grandTotal : a.grandTotal - b.grandTotal;
      return drillDownSortDir === 'desc' ? b.status.localeCompare(a.status) : a.status.localeCompare(b.status);
    });
    return sorted;
  }, [drillDownIndex, revenueData, drillDownSort, drillDownSortDir]);

  const exportCSV = () => {
    const headers = ['Bill Number', 'Customer', 'Date', 'Items', 'Total', 'Status'];
    const rows = filteredBills.map((b: any) => [b.billNumber, b.customerName, new Date(b.createdAt).toLocaleDateString('en-IN'), b.items?.length || 0, b.grandTotal, b.status]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `revenue_${getPeriodLabel().replace(/\s/g, '_')}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const catColors = ['#2dd4bf', '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#34d399', '#fbbf24', '#818cf8'];

  const card: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', transition: 'all 0.2s ease' };
  const sTitle: React.CSSProperties = { color: 'var(--text-primary)', margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600 };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.4s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px', fontWeight: 700 }}>
            <i className="fas fa-chart-line" style={{ marginRight: '8px', color: 'var(--accent)' }} />Revenue Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '12px' }}>
            <i className="fas fa-calendar-alt" style={{ marginRight: '4px' }} />{getPeriodLabel()} · {totalBills} bills · ₹{totalRevenue.toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--border-subtle)' }}>
            {(['daily', 'monthly', 'yearly'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={viewMode === m ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ fontSize: '11px', textTransform: 'capitalize', borderRadius: '6px' }}>{m}</button>
            ))}
          </div>
          {viewMode === 'yearly' && <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '11px', width: 'auto' }}>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>}
          {viewMode === 'monthly' && <>
            <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '11px', width: 'auto' }}>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
            <select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '11px', width: 'auto' }}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => <option key={i} value={i}>{m}</option>)}</select>
          </>}
          {viewMode === 'daily' && <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '11px', colorScheme: 'dark', width: 'auto' }} />}
          <button onClick={exportCSV} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}><i className="fas fa-download" style={{ marginRight: '4px' }} />Export</button>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}><i className="fas fa-times" style={{ marginRight: '4px' }} />Close</button>
        </div>
      </div>

      {/* Quick Presets */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[{ label: '📅 Today', key: 'today' }, { label: '⏪ Yesterday', key: 'yesterday' }, { label: '📆 This Month', key: 'thisMonth' }, { label: '📊 This Year', key: 'thisYear' }].map(p => (
          <button key={p.key} onClick={() => applyPreset(p.key)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '5px 14px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; (e.target as HTMLElement).style.color = 'var(--accent-text)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)'; }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          { title: 'Total Revenue', value: `₹${animatedRevenue.toLocaleString()}`, icon: 'fa-rupee-sign', prev: prevRevenue, cur: totalRevenue, spark: sparklineData, color: 'var(--accent)' },
          { title: 'Avg Bill Value', value: `₹${animatedAvg.toLocaleString()}`, icon: 'fa-receipt', prev: prevAvgBill, cur: avgBill, spark: sparklineData.map((v, i) => v / Math.max(i + 1, 1)), color: '#38bdf8' },
          { title: 'Paid Rate', value: `${animatedPaidRate}%`, icon: 'fa-check-circle', prev: prevPaidRate, cur: paidRate, spark: [], color: 'var(--success)' },
          { title: 'Items Processed', value: totalItems.toString(), icon: 'fa-tshirt', prev: prevItems, cur: totalItems, spark: [], color: '#fb923c' },
          { title: 'Customers', value: uniqueCustomers.toString(), icon: 'fa-users', prev: 0, cur: uniqueCustomers, spark: [], color: '#a78bfa' },
          { title: 'Top Customer', value: topCustomers[0] ? `₹${topCustomers[0][1].revenue.toLocaleString()}` : '—', icon: 'fa-crown', prev: 0, cur: 0, spark: [], color: '#fbbf24', sub: topCustomers[0]?.[0] || 'N/A' }
        ].map((s, i) => (
          <div key={i} style={{ ...card, cursor: 'default', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: `all 0.4s ease ${i * 0.06}s` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = s.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${s.color}22`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: '11px' }}>
                  <i className={`fas ${s.icon}`} />
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>{s.title}</span>
              </div>
              {s.prev !== undefined && s.cur !== undefined && s.prev !== 0 && <TrendBadge current={s.cur} previous={s.prev} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub || (s.title === 'Paid Rate' ? `${completedBills} completed` : `${totalBills} bills`)}</div>
              </div>
              {s.spark.length > 0 && <Sparkline data={s.spark} color={s.color} width={60} height={24} />}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {/* Bar Chart */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={sTitle}><i className="fas fa-chart-bar" style={{ marginRight: '6px', color: 'var(--accent)' }} />Revenue Over Time</h3>
            {hoveredBar !== null && revenueData[hoveredBar] && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                <span><strong style={{ color: 'var(--accent)' }}>₹{revenueData[hoveredBar].revenue.toLocaleString()}</strong></span>
                <span>{revenueData[hoveredBar].bills.length} bills</span>
                {revenueData[hoveredBar].bills.length > 0 && <span>Avg ₹{Math.round(revenueData[hoveredBar].revenue / revenueData[hoveredBar].bills.length).toLocaleString()}</span>}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            {/* Y-axis labels */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 20, width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {[maxRevenue, maxRevenue * 0.5, 0].map((v, i) => (
                <span key={i} style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', width: '100%' }}>₹{Math.round(v / 1000)}k</span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '200px', marginLeft: '44px' }} onMouseLeave={() => setHoveredBar(null)}>
              {revenueData.map((d, i) => {
                const barH = maxRevenue > 0 ? (d.revenue / maxRevenue) * 180 : 0;
                const prevH = maxRevenue > 0 ? (d.prevRevenue / maxRevenue) * 180 : 0;
                const isHovered = hoveredBar === i;
                const isDrilled = drillDownIndex === i;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'pointer', position: 'relative' }}
                    onMouseEnter={() => setHoveredBar(i)}
                    onClick={() => { setDrillDownIndex(drillDownIndex === i ? null : i); setDrillDownSort('date'); setDrillDownSortDir('desc'); }}>
                    {/* Previous period ghost bar */}
                    {d.prevRevenue > 0 && <div style={{ position: 'absolute', bottom: 20, width: '100%', maxWidth: '20px', height: `${Math.max(prevH, 1)}px`, background: 'var(--text-muted)', opacity: 0.15, borderRadius: '2px 2px 0 0' }} />}
                    <div style={{
                      width: '100%', maxWidth: '22px',
                      height: `${mounted ? Math.max(barH, 2) : 0}px`,
                      background: isDrilled ? 'var(--accent-hover)' : isHovered ? 'var(--accent)' : 'var(--accent-muted)',
                      borderRadius: '3px 3px 0 0',
                      transition: `height 0.5s ease ${i * 0.015}s, background 0.15s ease`,
                      position: 'relative', zIndex: 2
                    }} />
                    {(revenueData.length <= 12 || i % 5 === 0) && <div style={{ fontSize: '9px', color: isDrilled ? 'var(--accent)' : 'var(--text-muted)', marginTop: '4px', fontWeight: isDrilled ? 600 : 400 }}>{d.label}</div>}
                  </div>
                );
              })}
            </div>
            {viewMode !== 'yearly' && <div style={{ display: 'flex', gap: '12px', marginTop: '8px', marginLeft: '44px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '3px', background: 'var(--accent)', borderRadius: '1px', display: 'inline-block' }} />Current</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '3px', background: 'var(--text-muted)', opacity: 0.3, borderRadius: '1px', display: 'inline-block' }} />Previous</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Click bar to drill down</span>
            </div>}
          </div>
        </div>

        {/* Donut Chart */}
        <div style={card}>
          <h3 style={sTitle}><i className="fas fa-chart-pie" style={{ marginRight: '6px', color: 'var(--accent)' }} />Revenue by Item</h3>
          {itemCategories.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: mounted ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.8s ease' }}>
                {(() => {
                  let cumAngle = 0;
                  return itemCategories.map(([, data], i) => {
                    const pct = totalItemRevenue > 0 ? data.revenue / totalItemRevenue : 0;
                    const angle = pct * 360;
                    const startAngle = cumAngle;
                    cumAngle += angle;
                    const r = 55, cx = 70, cy = 70;
                    const startRad = (startAngle - 90) * Math.PI / 180;
                    const endRad = (startAngle + angle - 90) * Math.PI / 180;
                    const largeArc = angle > 180 ? 1 : 0;
                    const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
                    const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
                    const ir = 35;
                    const ix1 = cx + ir * Math.cos(endRad), iy1 = cy + ir * Math.sin(endRad);
                    const ix2 = cx + ir * Math.cos(startRad), iy2 = cy + ir * Math.sin(startRad);
                    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
                    return <path key={i} d={path} fill={catColors[i % catColors.length]} stroke="var(--bg-elevated)" strokeWidth="1.5"
                      opacity={hoveredDonut === null || hoveredDonut === i ? 1 : 0.4}
                      style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredDonut(i)} onMouseLeave={() => setHoveredDonut(null)} />;
                  });
                })()}
                <text x="70" y="66" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="700">₹{(totalItemRevenue / 1000).toFixed(1)}k</text>
                <text x="70" y="80" textAnchor="middle" fill="var(--text-muted)" fontSize="9">Total</text>
              </svg>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {itemCategories.map(([name, data], i) => {
                  const pct = totalItemRevenue > 0 ? Math.round((data.revenue / totalItemRevenue) * 100) : 0;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', opacity: hoveredDonut === null || hoveredDonut === i ? 1 : 0.5, transition: 'opacity 0.2s', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredDonut(i)} onMouseLeave={() => setHoveredDonut(null)}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: catColors[i % catColors.length], flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '12px' }}><i className="fas fa-inbox" style={{ fontSize: '18px', opacity: 0.4, display: 'block', marginBottom: '6px' }} />No data</div>}
        </div>
      </div>

      {/* Drill-Down Panel */}
      {drillDownIndex !== null && revenueData[drillDownIndex] && (
        <div style={{ ...card, marginBottom: '16px', animation: 'slideIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={sTitle}>
              <i className="fas fa-search-plus" style={{ marginRight: '6px', color: 'var(--accent)' }} />
              Bills for {revenueData[drillDownIndex].label} — ₹{revenueData[drillDownIndex].revenue.toLocaleString()} ({revenueData[drillDownIndex].bills.length} bills)
            </h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['date', 'amount', 'status'] as const).map(s => (
                <button key={s} onClick={() => { if (drillDownSort === s) setDrillDownSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setDrillDownSort(s); setDrillDownSortDir('desc'); } }}
                  style={{ background: drillDownSort === s ? 'var(--accent-muted)' : 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '3px 8px', color: drillDownSort === s ? 'var(--accent)' : 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: 'capitalize' }}>
                  {s} {drillDownSort === s && (drillDownSortDir === 'desc' ? '↓' : '↑')}
                </button>
              ))}
              <button onClick={() => setDrillDownIndex(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>✕</button>
            </div>
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {drillDownBills.length > 0 ? drillDownBills.map((b: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < drillDownBills.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '50px' }}>#{b.billNumber}</span>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{b.customerName}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {b.items?.length || 0} items</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>₹{b.grandTotal?.toLocaleString()}</div>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: b.status === 'completed' || b.status === 'delivered' ? 'var(--success-muted)' : b.status === 'pending' ? 'var(--warning-muted)' : 'var(--accent-muted)', color: b.status === 'completed' || b.status === 'delivered' ? 'var(--success)' : b.status === 'pending' ? 'var(--warning)' : 'var(--accent)' }}>{b.status}</span>
                </div>
              </div>
            )) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '12px' }}>No bills</div>}
          </div>
        </div>
      )}

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'daily' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '10px' }}>
        {/* Hourly Heatmap - daily view only */}
        {viewMode === 'daily' && (
          <div style={card}>
            <h3 style={sTitle}><i className="fas fa-clock" style={{ marginRight: '6px', color: 'var(--accent)' }} />Peak Hours</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '3px' }}>
              {hourlyData.map((v, h) => {
                const intensity = maxHourly > 0 ? v / maxHourly : 0;
                return (
                  <div key={h} title={`${h}:00 — ₹${v.toLocaleString()}`} style={{
                    aspectRatio: '1', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: intensity > 0.5 ? 'white' : 'var(--text-muted)',
                    background: intensity > 0 ? `rgba(6, 182, 212, ${0.15 + intensity * 0.85})` : 'var(--bg-hover)', cursor: 'default', transition: 'all 0.2s'
                  }}>{h}</div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Low</span>
              <div style={{ display: 'flex', gap: '2px' }}>{[0.2, 0.4, 0.6, 0.8, 1].map((v, i) => <span key={i} style={{ width: '12px', height: '4px', borderRadius: '1px', background: `rgba(6, 182, 212, ${v})` }} />)}</div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>High</span>
            </div>
          </div>
        )}

        {/* Order Status */}
        <div style={card}>
          <h3 style={sTitle}><i className="fas fa-tasks" style={{ marginRight: '6px', color: 'var(--accent)' }} />Order Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {statusBreakdown.map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>{s.count}</span>
                </div>
                <div style={{ height: '5px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: mounted ? `${totalBills > 0 ? (s.count / totalBills) * 100 : 0}%` : '0%', background: s.color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment */}
        <div style={card}>
          <h3 style={sTitle}><i className="fas fa-credit-card" style={{ marginRight: '6px', color: 'var(--accent)' }} />Payment Split</h3>
          <div style={{ display: 'flex', gap: '16px', height: '100px', alignItems: 'flex-end', justifyContent: 'center' }}>
            {[{ label: 'Paid', count: completedBills, color: 'var(--success)' }, { label: 'Unpaid', count: totalBills - completedBills, color: 'var(--danger)' }].map((p, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: '100%', maxWidth: '40px', height: mounted ? `${totalBills > 0 ? Math.max((p.count / totalBills) * 80, 8) : 8}px` : '0px',
                  background: p.color, borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: 'white', minHeight: '24px', transition: 'height 0.6s ease'
                }}>{p.count}</div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div style={card}>
          <h3 style={sTitle}><i className="fas fa-users" style={{ marginRight: '6px', color: 'var(--accent)' }} />Top Customers</h3>
          {topCustomers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: '200px', overflowY: 'auto' }}>
              {topCustomers.map(([name, data], i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    onClick={() => setExpandedCustomer(expandedCustomer === name ? null : name)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '9px', color: i < 3 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: i < 3 ? 700 : 400, width: '12px' }}>#{i + 1}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>₹{data.revenue.toLocaleString()}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{data.bills} bills</div>
                      </div>
                      <i className={`fas fa-chevron-${expandedCustomer === name ? 'up' : 'down'}`} style={{ fontSize: '8px', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                  {expandedCustomer === name && (
                    <div style={{ padding: '6px 0 6px 18px', background: 'var(--bg-hover)', borderRadius: '4px', margin: '4px 0' }}>
                      {data.billList.slice(0, 5).map((b: any, j: number) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                          <span>#{b.billNumber} · {new Date(b.createdAt).toLocaleDateString('en-IN')}</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>₹{b.grandTotal?.toLocaleString()}</span>
                        </div>
                      ))}
                      {data.billList.length > 5 && <div style={{ fontSize: '9px', color: 'var(--text-muted)', padding: '2px 6px' }}>+{data.billList.length - 5} more</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '12px' }}>No data</div>}
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveRevenueDashboard;
