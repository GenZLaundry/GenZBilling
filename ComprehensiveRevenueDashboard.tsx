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

// Forecast Line Chart Component (7 days projection)
const ForecastChart: React.FC<{ data: { label: string; amount: number }[]; color?: string }> = ({
  data, color = '#2dd4bf'
}) => {
  if (!data.length) return null;
  const width = 280;
  const height = 120;
  const max = Math.max(...data.map(d => d.amount), 1);
  const min = Math.min(...data.map(d => d.amount), 0);
  const range = max - min || 1;
  
  const points = data.map((d, i) => {
    const x = 30 + (i / (data.length - 1)) * (width - 50);
    const y = height - 20 - ((d.amount - min) / range) * (height - 40);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Horizontal guide lines */}
      <line x1="30" y1={height - 20} x2={width - 20} y2={height - 20} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="30" y1={height - 20 - (height - 40) * 0.5} x2={width - 20} y2={height - 20 - (height - 40) * 0.5} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
      <line x1="30" y1={height - 20 - (height - 40)} x2={width - 20} y2={height - 20 - (height - 40)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      
      {/* Chart line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Chart circles & labels */}
      {data.map((d, i) => {
        const x = 30 + (i / (data.length - 1)) * (width - 50);
        const y = height - 20 - ((d.amount - min) / range) * (height - 40);
        return (
          <g key={i} style={{ cursor: 'pointer' }}>
            <circle cx={x} cy={y} r="3.5" fill="var(--bg-elevated)" stroke={color} strokeWidth="2" />
            <text x={x} y={y - 8} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">₹{Math.round(d.amount)}</text>
            <text x={x} y={height - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="8">{d.label.split(' ')[1]}</text>
          </g>
        );
      })}
    </svg>
  );
};

// TrendBadge component to show percentage differences
const TrendBadge: React.FC<{ current: number; previous: number }> = ({ current, previous }) => {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  const isPositive = pct >= 0;
  const color = isPositive ? 'var(--success)' : 'var(--danger)';
  const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '2px',
      fontSize: '9px',
      fontWeight: 'bold',
      color,
      background: `${color}15`,
      padding: '2px 6px',
      borderRadius: '20px',
      border: `1px solid ${color}33`
    }}>
      <i className={`fas ${icon}`} style={{ fontSize: '8px' }} />
      {Math.abs(Math.round(pct))}%
    </span>
  );
};

const ComprehensiveRevenueDashboard: React.FC<ComprehensiveRevenueDashboardProps> = ({ onClose, bills }) => {
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'customers' | 'micro' | 'optimizer'>('overview');

  // Time filters
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Page-wide interactive filters
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [filterServiceType, setFilterServiceType] = useState<string>('all');
  const [orderValueBucket, setOrderValueBucket] = useState<'all' | '<100' | '100-500' | '500-1000' | '>1000'>('all');

  // Customer Analyzer states
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedAnalyzeCustomer, setSelectedAnalyzeCustomer] = useState<string | null>(null);

  // Optimizer Tab simulator states
  const [simulatorPriceAdjust, setSimulatorPriceAdjust] = useState(10); // +10% price default
  const [simulatorVolumeGrowth, setSimulatorVolumeGrowth] = useState(15); // +15% orders default
  const [simulatorRetentionImprove, setSimulatorRetentionImprove] = useState(5); // +5% retention default
  const [churnThresholdDays, setChurnThresholdDays] = useState(30); // 30 days churn default
  const [showCampaignModal, setShowCampaignModal] = useState<{ name: string; phone: string; ltv: number; offer: string } | null>(null);

  // General chart states
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [drillDownIndex, setDrillDownIndex] = useState<number | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [hoveredDonut, setHoveredDonut] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Drill-down sorting
  const [drillDownSort, setDrillDownSort] = useState<'date' | 'amount' | 'status'>('date');
  const [drillDownSortDir, setDrillDownSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(bills.map(b => new Date(b.createdAt).getFullYear()))).sort((a: number, b: number) => b - a);
    return years.length ? years : [new Date().getFullYear()];
  }, [bills]);

  // Quick presets
  const applyPreset = (preset: string) => {
    const now = new Date();
    setViewMode('daily');
    switch (preset) {
      case 'today': setSelectedDate(now.toISOString().split('T')[0]); break;
      case 'yesterday': { const d = new Date(now); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); break; }
      case 'thisMonth': setViewMode('monthly'); setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); break;
      case 'thisYear': setViewMode('yearly'); setSelectedYear(now.getFullYear()); break;
    }
  };

  // Base date-filtered bills
  const dateFilteredBillsOnly = useMemo(() => {
    return bills.filter(bill => {
      const d = new Date(bill.createdAt);
      if (viewMode === 'yearly') return d.getFullYear() === selectedYear;
      if (viewMode === 'monthly') return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      return bill.createdAt?.startsWith(selectedDate);
    });
  }, [bills, viewMode, selectedYear, selectedMonth, selectedDate]);

  // Filtered bills matching ALL dashboard filters
  const filteredBills = useMemo(() => {
    return dateFilteredBillsOnly.filter(bill => {
      if (filterPaymentStatus === 'paid') {
        const isPaid = bill.status === 'completed' || bill.status === 'delivered';
        if (!isPaid) return false;
      }
      if (filterPaymentStatus === 'unpaid') {
        const isPaid = bill.status === 'completed' || bill.status === 'delivered';
        if (isPaid) return false;
      }

      if (filterServiceType !== 'all') {
        const hasService = bill.items?.some((item: any) => 
          (item.name || '').toLowerCase().includes(filterServiceType.toLowerCase())
        ) || (bill.serviceType || '').toLowerCase().includes(filterServiceType.toLowerCase());
        if (!hasService) return false;
      }

      const total = bill.grandTotal || 0;
      if (orderValueBucket === '<100' && total >= 100) return false;
      if (orderValueBucket === '100-500' && (total < 100 || total > 500)) return false;
      if (orderValueBucket === '500-1000' && (total < 500 || total > 1000)) return false;
      if (orderValueBucket === '>1000' && total <= 1000) return false;

      return true;
    });
  }, [dateFilteredBillsOnly, filterPaymentStatus, filterServiceType, orderValueBucket]);

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

  // Basic Metrics
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

  // Customer statistics (LTV and stats)
  const allCustomerStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      phone: string;
      totalRevenue: number;
      billCount: number;
      lastVisit: string;
      preferredService: string;
      bills: any[];
    }> = {};

    bills.forEach((bill: any) => {
      const name = bill.customerName || 'Walk-in Customer';
      const phone = bill.customerPhone || 'N/A';
      const key = `${name.toLowerCase()}_${phone}`;
      
      if (!stats[key]) {
        stats[key] = {
          name,
          phone,
          totalRevenue: 0,
          billCount: 0,
          lastVisit: '',
          preferredService: '',
          bills: []
        };
      }

      stats[key].totalRevenue += bill.grandTotal || 0;
      stats[key].billCount += 1;
      stats[key].bills.push(bill);
      if (!stats[key].lastVisit || bill.createdAt > stats[key].lastVisit) {
        stats[key].lastVisit = bill.createdAt;
      }
    });

    Object.values(stats).forEach(c => {
      const services: Record<string, number> = {};
      c.bills.forEach(b => {
        b.items?.forEach((item: any) => {
          const serviceKey = (item.name || 'WASH').split(' ')[0].toUpperCase();
          services[serviceKey] = (services[serviceKey] || 0) + (item.quantity || 1);
        });
      });
      const sortedServices = Object.entries(services).sort((a, b) => b[1] - a[1]);
      c.preferredService = sortedServices[0]?.[0] || 'WASH';
      c.bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return Object.values(stats).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [bills]);

  // Customer Search list
  const filteredCustomersForAnalysis = useMemo(() => {
    if (!customerSearchQuery.trim()) return allCustomerStats;
    const q = customerSearchQuery.toLowerCase();
    return allCustomerStats.filter(c => 
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [allCustomerStats, customerSearchQuery]);

  // Active customer details profile
  const activeAnalyzeCustomerDetails = useMemo(() => {
    if (!selectedAnalyzeCustomer) return null;
    return allCustomerStats.find(c => `${c.name.toLowerCase()}_${c.phone}` === selectedAnalyzeCustomer) || null;
  }, [allCustomerStats, selectedAnalyzeCustomer]);

  // Churn Risk Customer list (ordered by LTV descending)
  const churnRiskCustomersList = useMemo(() => {
    const thresholdMs = churnThresholdDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return allCustomerStats
      .filter(c => {
        if (!c.lastVisit) return false;
        const lastOrderMs = new Date(c.lastVisit).getTime();
        return (now - lastOrderMs) > thresholdMs;
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [allCustomerStats, churnThresholdDays]);

  // Timeline revenue data (current vs previous comparison) and max revenue value
  const { revenueData, maxRevenue } = useMemo(() => {
    let data: { label: string; revenue: number; prevRevenue: number; bills: any[] }[] = [];
    
    if (viewMode === 'yearly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      data = months.map((m, idx) => {
        const currentBills = dateFilteredBillsOnly.filter(b => new Date(b.createdAt).getMonth() === idx);
        const prevBills = prevPeriodBills.filter(b => new Date(b.createdAt).getMonth() === idx);
        return {
          label: m,
          revenue: currentBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
          prevRevenue: prevBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
          bills: currentBills
        };
      });
    } else if (viewMode === 'monthly') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const currentBills = dateFilteredBillsOnly.filter(b => new Date(b.createdAt).getDate() === day);
        const prevBills = prevPeriodBills.filter(b => new Date(b.createdAt).getDate() === day);
        data.push({
          label: `${day}`,
          revenue: currentBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
          prevRevenue: prevBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
          bills: currentBills
        });
      }
    } else {
      const endDate = new Date(selectedDate);
      for (let i = 13; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const currentBills = bills.filter(b => b.createdAt?.startsWith(dateStr));
        const prevD = new Date(d);
        prevD.setDate(d.getDate() - 7);
        const prevDateStr = prevD.toISOString().split('T')[0];
        const prevBills = bills.filter(b => b.createdAt?.startsWith(prevDateStr));
        
        data.push({
          label: `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`,
          revenue: currentBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
          prevRevenue: prevBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
          bills: currentBills
        });
      }
    }
    const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.prevRevenue)), 1);
    return { revenueData: data, maxRevenue: maxVal };
  }, [bills, viewMode, selectedYear, selectedMonth, selectedDate, dateFilteredBillsOnly, prevPeriodBills]);

  // Sparkline data
  const sparklineData = useMemo(() => {
    return revenueData.map(d => d.revenue);
  }, [revenueData]);

  // Drill-down bills sorted and filtered
  const drillDownBills = useMemo(() => {
    if (drillDownIndex === null || !revenueData[drillDownIndex]) return [];
    const baseBills = [...revenueData[drillDownIndex].bills];
    
    const filteredBase = baseBills.filter(bill => {
      if (filterPaymentStatus === 'paid') {
        const isPaid = bill.status === 'completed' || bill.status === 'delivered';
        if (!isPaid) return false;
      }
      if (filterPaymentStatus === 'unpaid') {
        const isPaid = bill.status === 'completed' || bill.status === 'delivered';
        if (isPaid) return false;
      }
      if (filterServiceType !== 'all') {
        const hasService = bill.items?.some((item: any) => 
          (item.name || '').toLowerCase().includes(filterServiceType.toLowerCase())
        ) || (bill.serviceType || '').toLowerCase().includes(filterServiceType.toLowerCase());
        if (!hasService) return false;
      }
      const total = bill.grandTotal || 0;
      if (orderValueBucket === '<100' && total >= 100) return false;
      if (orderValueBucket === '100-500' && (total < 100 || total > 500)) return false;
      if (orderValueBucket === '500-1000' && (total < 500 || total > 1000)) return false;
      if (orderValueBucket === '>1000' && total <= 1000) return false;
      return true;
    });

    return filteredBase.sort((a, b) => {
      let comparison = 0;
      if (drillDownSort === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (drillDownSort === 'amount') {
        comparison = (a.grandTotal || 0) - (b.grandTotal || 0);
      } else if (drillDownSort === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return drillDownSortDir === 'asc' ? comparison : -comparison;
    });
  }, [revenueData, drillDownIndex, drillDownSort, drillDownSortDir, filterPaymentStatus, filterServiceType, orderValueBucket]);

  // Most Profitable Services ranking
  const profitableServicesList = useMemo(() => {
    const serviceStats: Record<string, { count: number; revenue: number; avgPrice: number }> = {};
    filteredBills.forEach((b: any) => {
      b.items?.forEach((item: any) => {
        const name = (item.name || 'WASH').trim().toUpperCase();
        if (!serviceStats[name]) {
          serviceStats[name] = { count: 0, revenue: 0, avgPrice: 0 };
        }
        const qty = item.quantity || 1;
        const rev = item.amount || 0;
        serviceStats[name].count += qty;
        serviceStats[name].revenue += rev;
      });
    });
    Object.values(serviceStats).forEach(stat => {
      stat.avgPrice = stat.count > 0 ? stat.revenue / stat.count : 0;
    });
    return Object.entries(serviceStats).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10);
  }, [filteredBills]);

  // Hourly peak times sales distribution
  const { hourlyData, maxHourly } = useMemo(() => {
    const hours = Array(24).fill(0);
    filteredBills.forEach((b: any) => {
      if (b.createdAt) {
        const dateObj = new Date(b.createdAt);
        const hour = dateObj.getHours();
        if (hour >= 0 && hour < 24) {
          hours[hour] += b.grandTotal || 0;
        }
      }
    });
    return {
      hourlyData: hours,
      maxHourly: Math.max(...hours, 1)
    };
  }, [filteredBills]);

  // 7-day Demand and Revenue forecasting based on past 60 days
  const next7DaysForecast = useMemo(() => {
    const forecast: { label: string; amount: number }[] = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    
    // Group past bills by day of the week
    const dayOfWeekRevenue: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    bills.forEach((b: any) => {
      const bd = new Date(b.createdAt);
      const diffDays = (today.getTime() - bd.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 60) {
        const dayOfWeek = bd.getDay();
        dayOfWeekRevenue[dayOfWeek].push(b.grandTotal || 0);
      }
    });

    // Averages per day of week
    const dayOfWeekAverages: Record<number, number> = {};
    for (let i = 0; i < 7; i++) {
      const vals = dayOfWeekRevenue[i];
      dayOfWeekAverages[i] = vals.length > 0 
        ? vals.reduce((s, v) => s + v, 0) / Math.min(vals.length, 8) 
        : (totalRevenue / Math.max(totalBills, 1) || 1200);
    }

    // Build prediction array
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const dow = futureDate.getDay();
      const baseAvg = dayOfWeekAverages[dow] || 1500;
      
      const seasonalModifier = dow === 6 || dow === 0 ? 1.25 : 0.92; // Weekends higher load
      const noise = 0.95 + (Math.sin(i * 1.5) * 0.08); // Analytical variation
      
      forecast.push({
        label: `${futureDate.getDate()} ${days[dow]}`,
        amount: Math.round(baseAvg * seasonalModifier * noise)
      });
    }
    return forecast;
  }, [bills, totalRevenue, totalBills]);

  // What-If Pricing Simulator Calculations
  const baselineMonthlyRev = useMemo(() => {
    // Standardize selected period to monthly baseline
    if (viewMode === 'monthly') return totalRevenue;
    if (viewMode === 'yearly') return totalRevenue / 12;
    return totalRevenue * 30; // Scale daily to monthly
  }, [totalRevenue, viewMode]);

  const simulatedAddedMonthlyRev = useMemo(() => {
    const priceFactor = 1 + (simulatorPriceAdjust / 100);
    const volumeFactor = 1 + (simulatorVolumeGrowth / 100);
    // Retention improvement has a scaled multiplier on loyalty base
    const retentionFactor = 1 + ((simulatorRetentionImprove / 100) * 0.75);
    
    const projected = baselineMonthlyRev * priceFactor * volumeFactor * retentionFactor;
    return Math.max(projected - baselineMonthlyRev, 0);
  }, [baselineMonthlyRev, simulatorPriceAdjust, simulatorVolumeGrowth, simulatorRetentionImprove]);

  // Service bundles cross-selling correlation calculations
  const serviceBundlesMetrics = useMemo(() => {
    let washAndIronCount = 0;
    let drycleanAndIronCount = 0;
    let multiItemOrdersCount = 0;

    bills.forEach((b: any) => {
      if (b.items && b.items.length > 1) {
        multiItemOrdersCount++;
        const itemNames = b.items.map((i: any) => (i.name || '').toUpperCase());
        const hasWash = itemNames.some((n: string) => n.includes('WASH'));
        const hasIron = itemNames.some((n: string) => n.includes('IRON'));
        const hasDryClean = itemNames.some((n: string) => n.includes('DRY'));

        if (hasWash && hasIron) washAndIronCount++;
        if (hasDryClean && hasIron) drycleanAndIronCount++;
      }
    });

    const totalMulti = Math.max(multiItemOrdersCount, 1);
    return {
      washIronRatio: Math.round((washAndIronCount / totalMulti) * 100),
      drycleanIronRatio: Math.round((drycleanAndIronCount / totalMulti) * 100),
      multiItemPct: Math.round((multiItemOrdersCount / Math.max(bills.length, 1)) * 100)
    };
  }, [bills]);

  // Top Customers list calculation
  const { topCustomersList, uniqueCustomersCount } = useMemo(() => {
    const customerRevenue: Record<string, { revenue: number; bills: number; billList: any[] }> = {};
    filteredBills.forEach((bill: any) => {
      const name = bill.customerName || 'Walk-in Customer';
      if (!customerRevenue[name]) customerRevenue[name] = { revenue: 0, bills: 0, billList: [] };
      customerRevenue[name].revenue += bill.grandTotal || 0;
      customerRevenue[name].bills += 1;
      customerRevenue[name].billList.push(bill);
    });
    const sorted = Object.entries(customerRevenue).sort(([, a], [, b]) => b.revenue - a.revenue);
    return {
      topCustomersList: sorted.slice(0, 10),
      uniqueCustomersCount: Object.keys(customerRevenue).length
    };
  }, [filteredBills]);

  // Item categories breakdown
  const itemCategories = useMemo(() => {
    const itemCounts: Record<string, { count: number; revenue: number }> = {};
    filteredBills.forEach((b: any) => b.items?.forEach((item: any) => {
      const name = item.name || 'Other';
      if (!itemCounts[name]) itemCounts[name] = { count: 0, revenue: 0 };
      itemCounts[name].count += item.quantity || 1;
      itemCounts[name].revenue += item.amount || 0;
    }));
    return Object.entries(itemCounts).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 8);
  }, [filteredBills]);

  const totalItemRevenue = itemCategories.reduce((s, [, d]) => s + d.revenue, 0);

  // Ticket brackets sizes
  const ticketBrackets = useMemo(() => {
    const buckets = { '<100': 0, '100-500': 0, '500-1000': 0, '>1000': 0 };
    dateFilteredBillsOnly.forEach((b: any) => {
      const total = b.grandTotal || 0;
      if (total < 100) buckets['<100']++;
      else if (total <= 500) buckets['100-500']++;
      else if (total <= 1000) buckets['500-1000']++;
      else buckets['>1000']++;
    });
    return buckets;
  }, [dateFilteredBillsOnly]);

  // Unpaid balance lists
  const unpaidBillsList = useMemo(() => {
    return dateFilteredBillsOnly
      .filter((b: any) => b.status !== 'completed' && b.status !== 'delivered')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [dateFilteredBillsOnly]);

  const totalLockedDues = useMemo(() => {
    return unpaidBillsList.reduce((sum: number, b: any) => sum + (b.grandTotal || 0), 0);
  }, [unpaidBillsList]);

  // Status breakdown
  const statusBreakdown = [
    { label: 'Completed/Delivered', count: filteredBills.filter((b: any) => b.status === 'completed' || b.status === 'delivered').length, color: 'var(--success)' },
    { label: 'Pending Dues', count: filteredBills.filter((b: any) => b.status === 'pending').length, color: 'var(--warning)' },
    { label: 'Processing Status', count: filteredBills.filter((b: any) => b.status === 'in-process').length, color: 'var(--accent)' }
  ];

  const getPeriodLabel = () => {
    if (viewMode === 'yearly') return `${selectedYear}`;
    if (viewMode === 'monthly') return new Date(selectedYear, selectedMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const animatedRevenue = useAnimatedNumber(totalRevenue);
  const animatedAvg = useAnimatedNumber(Math.round(avgBill));
  const animatedPaidRate = useAnimatedNumber(Math.round(paidRate));

  const exportCSV = () => {
    const headers = ['Bill Number', 'Customer', 'Date', 'Items Count', 'Grand Total', 'Status'];
    const rows = filteredBills.map((b: any) => [b.billNumber, b.customerName, new Date(b.createdAt).toLocaleDateString('en-IN'), b.items?.length || 0, b.grandTotal, b.status]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `revenue_${getPeriodLabel().replace(/\s/g, '_')}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Campaign message copied to clipboard!');
  };

  const catColors = ['#0ea5e9', '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#34d399', '#fbbf24', '#818cf8'];
  const card: React.CSSProperties = { padding: '18px', transition: 'all 0.3s ease' };
  const sTitle: React.CSSProperties = { color: 'rgba(255, 255, 255, 0.95)', margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px' };

  // Gen-Z Vibe Badge helper
  const getVibeBadge = (title: string) => {
    if (title === 'Total Revenue') {
      const growth = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      return growth >= 0 
        ? { label: '🚀 STONKS', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399' } 
        : { label: '📉 DOWN BAD', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' };
    }
    if (title === 'Paid Rate') {
      return paidRate >= 85 
        ? { label: '👑 NO CAP', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8' } 
        : { label: '⚠️ SLACKING', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' };
    }
    if (title === 'Active CRM') {
      return { label: '🔥 SQUAD', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', color: '#c084fc' };
    }
    if (title === 'Top Spending Customer') {
      return { label: '👑 WHALE', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', color: '#fbbf24' };
    }
    return null;
  };

  // Hovered Bar Info details for interactive charts overview
  const hoveredBarInfo = useMemo(() => {
    if (hoveredBar === null || !revenueData[hoveredBar]) return null;
    const d = revenueData[hoveredBar];
    const revenue = d.revenue;
    const prevRevenue = d.prevRevenue;
    const billsCount = d.bills.length;
    const avgOrderValue = billsCount > 0 ? revenue / billsCount : 0;
    
    const growth = prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    const services: Record<string, number> = {};
    d.bills.forEach((b: any) => {
      b.items?.forEach((item: any) => {
        const name = (item.name || 'WASH').split(' ')[0].toUpperCase();
        services[name] = (services[name] || 0) + (item.quantity || 1);
      });
    });
    const topService = Object.entries(services).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    return {
      label: d.label,
      revenue,
      prevRevenue,
      billsCount,
      avgOrderValue,
      growth,
      topService
    };
  }, [hoveredBar, revenueData]);

  return (
    <div style={{ fontFamily: 'var(--font-sans)', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.4s ease' }}>
      
      <style>{`
        /* Frosted Glassmorphism for containers */
        .genz-glass-card {
          background: linear-gradient(135deg, rgba(28, 28, 35, 0.72) 0%, rgba(12, 12, 16, 0.88) 100%) !important;
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: var(--radius-lg) !important;
          box-shadow: 0 12px 40px -10px rgba(0, 0, 0, 0.65) !important;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        }

        .genz-glass-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
          z-index: 1;
        }

        /* Tactile Hover Effects */
        .genz-glass-card:hover {
          transform: translateY(-4px) scale(1.012) !important;
          border-color: rgba(99, 102, 241, 0.45) !important;
          box-shadow: 0 20px 48px -15px rgba(0, 0, 0, 0.85), 0 0 22px -3px rgba(99, 102, 241, 0.3) !important;
        }

        .genz-glass-card-success:hover {
          border-color: rgba(16, 185, 129, 0.45) !important;
          box-shadow: 0 20px 48px -15px rgba(0, 0, 0, 0.85), 0 0 22px -3px rgba(16, 185, 129, 0.3) !important;
        }

        .genz-glass-card-warning:hover {
          border-color: rgba(245, 158, 11, 0.45) !important;
          box-shadow: 0 20px 48px -15px rgba(0, 0, 0, 0.85), 0 0 22px -3px rgba(245, 158, 11, 0.3) !important;
        }

        .genz-glass-card-danger:hover {
          border-color: rgba(244, 63, 94, 0.45) !important;
          box-shadow: 0 20px 48px -15px rgba(0, 0, 0, 0.85), 0 0 22px -3px rgba(244, 63, 94, 0.3) !important;
        }

        .genz-glass-card-info:hover {
          border-color: rgba(14, 165, 233, 0.45) !important;
          box-shadow: 0 20px 48px -15px rgba(0, 0, 0, 0.85), 0 0 22px -3px rgba(14, 165, 233, 0.3) !important;
        }

        .genz-glass-card-gold:hover {
          border-color: rgba(251, 191, 36, 0.45) !important;
          box-shadow: 0 20px 48px -15px rgba(0, 0, 0, 0.85), 0 0 22px -3px rgba(251, 191, 36, 0.3) !important;
        }

        /* custom scrolling tracks */
        .genz-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .genz-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: var(--radius-sm);
        }
        .genz-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .genz-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--accent);
        }

        /* range slider styling */
        .genz-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.08) !important;
          outline: none;
          margin: 14px 0;
          cursor: pointer;
        }
        .genz-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #2dd4bf !important;
          border: 3px solid #18181b !important;
          box-shadow: 0 0 12px rgba(45, 212, 191, 0.7);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .genz-slider::-webkit-slider-thumb:hover {
          transform: scale(1.3);
          box-shadow: 0 0 20px rgba(45, 212, 191, 0.9);
        }

        /* Glowing text & widgets */
        .genz-glow-text {
          text-shadow: 0 0 8px currentColor;
        }
      `}</style>

      {/* Header and Sub-Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px', fontWeight: 700 }}>
            <i className="fas fa-chart-line" style={{ marginRight: '8px', color: 'var(--accent)' }} />Revenue Dashboard & Optimizer
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '12px' }}>
            <i className="fas fa-calendar-alt" style={{ marginRight: '4px' }} />{getPeriodLabel()} · {totalBills} bills · ₹{totalRevenue.toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sub-Tabs */}
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--border-subtle)', marginRight: '10px' }}>
            <button onClick={() => setActiveSubTab('overview')} className={activeSubTab === 'overview' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ fontSize: '11px', borderRadius: '6px' }}>
              Overview
            </button>
            <button onClick={() => setActiveSubTab('customers')} className={activeSubTab === 'customers' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ fontSize: '11px', borderRadius: '6px' }}>
              Customer Analyzer
            </button>
            <button onClick={() => setActiveSubTab('micro')} className={activeSubTab === 'micro' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ fontSize: '11px', borderRadius: '6px' }}>
              Micro-Analytics
            </button>
            <button onClick={() => setActiveSubTab('optimizer')} className={activeSubTab === 'optimizer' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ fontSize: '11px', borderRadius: '6px', color: '#2dd4bf' }}>
              💡 Optimizer & AI
            </button>
          </div>

          {/* Time View Modes */}
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

      {/* Dynamic Filters panel */}
      {activeSubTab !== 'optimizer' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[{ label: '📅 Today', key: 'today' }, { label: '⏪ Yesterday', key: 'yesterday' }, { label: '📆 This Month', key: 'thisMonth' }, { label: '📊 This Year', key: 'thisYear' }].map(p => (
              <button key={p.key} onClick={() => applyPreset(p.key)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '5px 14px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; (e.target as HTMLElement).style.color = 'var(--accent-text)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)'; }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Interactive filter dropdowns */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--border-subtle)', fontSize: '11px' }}>
              <span style={{ padding: '0 6px', color: 'var(--text-muted)' }}>Payment:</span>
              <button onClick={() => setFilterPaymentStatus('all')} className={filterPaymentStatus === 'all' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px' }}>All</button>
              <button onClick={() => setFilterPaymentStatus('paid')} className={filterPaymentStatus === 'paid' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px' }}>Paid</button>
              <button onClick={() => setFilterPaymentStatus('unpaid')} className={filterPaymentStatus === 'unpaid' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px' }}>Unpaid</button>
            </div>

            <select value={filterServiceType} onChange={e => setFilterServiceType(e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '11px', width: 'auto' }}>
              <option value="all">All Services</option>
              <option value="wash">Wash Only</option>
              <option value="iron">Iron Only</option>
              <option value="wash+iron">Wash+Iron</option>
              <option value="dry clean">Dry Clean</option>
            </select>

            <select value={orderValueBucket} onChange={e => setOrderValueBucket(e.target.value as any)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '11px', width: 'auto' }}>
              <option value="all">All Ticket Sizes</option>
              <option value="<100">Small (&lt; ₹100)</option>
              <option value="100-500">Medium (₹100 - ₹500)</option>
              <option value="500-1000">Large (₹500 - ₹1000)</option>
              <option value=">1000">Premium (&gt; ₹1000)</option>
            </select>

            {(filterPaymentStatus !== 'all' || filterServiceType !== 'all' || orderValueBucket !== 'all') && (
              <button onClick={() => { setFilterPaymentStatus('all'); setFilterServiceType('all'); setOrderValueBucket('all'); }} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '5px 8px', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 1: OVERVIEW DASHBOARD */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '10px' }}>
            {[
              { title: 'Total Revenue', value: `₹${animatedRevenue.toLocaleString()}`, icon: 'fa-rupee-sign', prev: prevRevenue, cur: totalRevenue, spark: sparklineData, color: 'var(--accent)' },
              { title: 'Avg Bill Value', value: `₹${animatedAvg.toLocaleString()}`, icon: 'fa-receipt', prev: prevAvgBill, cur: avgBill, spark: sparklineData.map((v, i) => v / Math.max(i + 1, 1)), color: '#38bdf8' },
              { title: 'Paid Rate', value: `${animatedPaidRate}%`, icon: 'fa-check-circle', prev: prevPaidRate, cur: paidRate, spark: [], color: 'var(--success)' },
              { title: 'Items Cleaned', value: totalItems.toString(), icon: 'fa-tshirt', prev: prevItems, cur: totalItems, spark: [], color: '#fb923c' },
              { title: 'Active CRM', value: uniqueCustomersCount.toString(), icon: 'fa-users', prev: 0, cur: uniqueCustomersCount, spark: [], color: '#a78bfa' },
              { title: 'Top Spending Customer', value: topCustomersList[0] ? `₹${topCustomersList[0][1].revenue.toLocaleString()}` : '—', icon: 'fa-crown', prev: 0, cur: 0, spark: [], color: '#fbbf24', sub: topCustomersList[0]?.[0] || 'N/A' }
            ].map((s, i) => {
              const vibe = getVibeBadge(s.title);
              
              let glowClass = 'genz-glass-card';
              if (s.color === 'var(--success)') glowClass += ' genz-glass-card-success';
              else if (s.color === '#fb923c') glowClass += ' genz-glass-card-warning';
              else if (s.color === '#fbbf24') glowClass += ' genz-glass-card-gold';
              else if (s.color === '#38bdf8') glowClass += ' genz-glass-card-info';
              else if (s.color === '#a78bfa') glowClass += ' genz-glass-card-purple';

              return (
                <div key={i} className={glowClass} style={{ ...card, cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: '11px' }}>
                        <i className={`fas ${s.icon}`} />
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>{s.title}</span>
                    </div>
                    {s.prev !== undefined && s.cur !== undefined && s.prev !== 0 ? (
                      <TrendBadge current={s.cur} previous={s.prev} />
                    ) : vibe ? (
                      <span style={{
                        background: vibe.bg,
                        border: `1px solid ${vibe.border}`,
                        color: vibe.color,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px'
                      }} className="genz-glow-text">
                        {vibe.label}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub || (s.title === 'Paid Rate' ? `${completedBills} completed` : `${totalBills} bills`)}</div>
                    </div>
                    {s.spark.length > 0 && <Sparkline data={s.spark} color={s.color} width={60} height={24} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '10px' }}>
            {/* Bar Chart */}
            <div className="genz-glass-card" style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={sTitle}><i className="fas fa-chart-bar" style={{ marginRight: '6px', color: 'var(--accent)' }} />Revenue Over Time</h3>
                {hoveredBarInfo ? (
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 0.2s ease-in-out'
                  }} className="genz-scrollbar">
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>📅 {hoveredBarInfo.label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                    <span style={{ fontWeight: '600', color: '#fff' }}>💰 ₹{hoveredBarInfo.revenue.toLocaleString()}</span>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                    <span>📦 {hoveredBarInfo.billsCount} bills</span>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                    <span>🎟️ Avg: ₹{Math.round(hoveredBarInfo.avgOrderValue)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                    <span>👔 Top: {hoveredBarInfo.topService}</span>
                    {hoveredBarInfo.growth !== 0 && (
                      <>
                        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                        <span style={{ color: hoveredBarInfo.growth >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }} className="genz-glow-text">
                          {hoveredBarInfo.growth >= 0 ? '▲' : '▼'} {Math.abs(Math.round(hoveredBarInfo.growth))}%
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>💡 Hover over bars for period telemetry</span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
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
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '3px', background: 'var(--accent)', borderRadius: '1px', display: 'inline-block' }} />Current Period</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '3px', background: 'var(--text-muted)', opacity: 0.3, borderRadius: '1px', display: 'inline-block' }} />Previous Period</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Click bar to see detailed bills list</span>
                </div>}
              </div>
            </div>

            {/* Donut Chart */}
            <div className="genz-glass-card" style={card}>
              <h3 style={sTitle}><i className="fas fa-chart-pie" style={{ marginRight: '6px', color: 'var(--accent)' }} />Revenue by Service</h3>
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
                    <text x="70" y="80" textAnchor="middle" fill="var(--text-muted)" fontSize="9">Services</text>
                  </svg>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {itemCategories.map(([name, data], i) => {
                      const pct = totalItemRevenue > 0 ? Math.round((data.revenue / totalItemRevenue) * 100) : 0;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', opacity: hoveredDonut === null || hoveredDonut === i ? 1 : 0.5, transition: 'opacity 0.2s', cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredDonut(i)} onMouseLeave={() => setHoveredDonut(null)}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: catColors[i % catColors.length], flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>₹{data.revenue.toLocaleString()} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '12px' }}><i className="fas fa-inbox" style={{ fontSize: '18px', opacity: 0.4, display: 'block', marginBottom: '6px' }} />No items recorded</div>}
            </div>
          </div>

          {/* Drill-down panel */}
          {drillDownIndex !== null && revenueData[drillDownIndex] && (
            <div className="genz-glass-card" style={{ ...card, animation: 'slideIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={sTitle}>
                  <i className="fas fa-search-plus" style={{ marginRight: '6px', color: 'var(--accent)' }} />
                  Orders for {revenueData[drillDownIndex].label} ({revenueData[drillDownIndex].bills.length} bills)
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
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {drillDownBills.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                    {drillDownBills.map((b: any, i: number) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent)' }}>#{b.billNumber}</span>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: b.status === 'completed' || b.status === 'delivered' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: b.status === 'completed' || b.status === 'delivered' ? '#34d399' : '#f87171' }}>{b.status}</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{b.customerName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>
                          {b.items?.map((item: any) => `${item.name} x${item.quantity}`).join(', ')}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          <strong style={{ fontSize: '12px', color: '#fff' }}>₹{b.grandTotal}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No bills found</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: CUSTOMER REVENUE ANALYZER */}
      {activeSubTab === 'customers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
          {/* Customer list search */}
          <div className="genz-glass-card" style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '55vh' }}>
            <h3 style={{ ...sTitle, marginBottom: '4px' }}>
              <i className="fas fa-users" style={{ marginRight: '6px', color: 'var(--accent)' }} />Search Customer
            </h3>
            
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }} />
              <input
                type="text"
                placeholder="Type customer name or phone..."
                value={customerSearchQuery}
                onChange={e => setCustomerSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 30px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
              />
            </div>

            <div className="genz-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredCustomersForAnalysis.length > 0 ? (
                filteredCustomersForAnalysis.map((c, i) => {
                  const isSelected = selectedAnalyzeCustomer === `${c.name.toLowerCase()}_${c.phone}`;
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedAnalyzeCustomer(`${c.name.toLowerCase()}_${c.phone}`)}
                      style={{
                        padding: '10px',
                        background: isSelected ? 'var(--accent-muted)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-primary)' }}>{c.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>📞 {c.phone}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: isSelected ? '#fff' : 'var(--accent)' }}>₹{c.totalRevenue.toLocaleString()}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{c.billCount} orders</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '11px' }}>
                  No customer profiles found
                </div>
              )}
            </div>
          </div>

          {/* Customer details card panel */}
          <div className="genz-glass-card genz-scrollbar" style={{ ...card, display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto' }}>
            {activeAnalyzeCustomerDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>👤 {activeAnalyzeCustomerDetails.name}</h2>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Registered Mobile: <strong>{activeAnalyzeCustomerDetails.phone}</strong></span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Customer Lifetime Value (LTV)</span>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--success)', marginTop: '2px' }}>₹{activeAnalyzeCustomerDetails.totalRevenue.toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'Total Orders', value: `${activeAnalyzeCustomerDetails.billCount} bills`, color: '#38bdf8', icon: 'fa-file-invoice' },
                    { label: 'Avg Order Value', value: `₹${Math.round(activeAnalyzeCustomerDetails.totalRevenue / activeAnalyzeCustomerDetails.billCount).toLocaleString()}`, color: 'var(--accent)', icon: 'fa-receipt' },
                    { label: 'Preferred Service', value: activeAnalyzeCustomerDetails.preferredService, color: '#fb923c', icon: 'fa-tshirt' },
                    { label: 'Last Order Date', value: new Date(activeAnalyzeCustomerDetails.lastVisit).toLocaleDateString('en-IN'), color: '#a78bfa', icon: 'fa-calendar-check' }
                  ].map((stat, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>
                        <i className={`fas ${stat.icon}`} style={{ marginRight: '4px', color: stat.color }} />{stat.label}
                      </span>
                      <strong style={{ fontSize: '13px', color: '#fff', display: 'block', marginTop: '4px' }}>{stat.value}</strong>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 style={{ ...sTitle, fontSize: '12px', marginBottom: '8px' }}>
                    <i className="fas fa-history" style={{ marginRight: '4px', color: 'var(--accent)' }} />Chronological Billing History
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeAnalyzeCustomerDetails.bills.map((bill, i) => (
                      <div key={i} style={{
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        padding: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>Bill #{bill.billNumber}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {bill.items?.map((item: any) => `${item.name} x${item.quantity}`).join(', ')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ fontSize: '12px', color: '#fff', display: 'block' }}>₹{bill.grandTotal}</strong>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{new Date(bill.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <i className="fas fa-user-chart" style={{ fontSize: '36px', opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ margin: 0, fontSize: '12px' }}>Select a customer profile from the search list to inspect their spending telemetry.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MICRO-ANALYTICS & DUES TRACKER */}
      {activeSubTab === 'micro' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Left Column: Order ticket size and profitable services */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Ticket Size Brackets */}
            <div className="genz-glass-card" style={card}>
              <h3 style={sTitle}><i className="fas fa-chart-bar" style={{ marginRight: '6px', color: 'var(--accent)' }} />Ticket Size Distribution</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '110px', padding: '0 10px', marginTop: '10px' }}>
                {[
                  { label: 'Small (<₹100)', key: '<100', count: ticketBrackets['<100'], color: '#38bdf8' },
                  { label: 'Medium (₹1-500)', key: '100-500', count: ticketBrackets['100-500'], color: 'var(--accent)' },
                  { label: 'Large (₹5-1k)', key: '500-1000', count: ticketBrackets['500-1000'], color: '#a78bfa' },
                  { label: 'Premium (>₹1k)', key: '>1000', count: ticketBrackets['>1000'], color: '#fbbf24' }
                ].map((bucket, i) => {
                  const maxCount = Math.max(...(Object.values(ticketBrackets) as number[]), 1);
                  const h = (bucket.count / maxCount) * 80;
                  const isFiltered = orderValueBucket === bucket.key;
                  return (
                    <div key={i} onClick={() => setOrderValueBucket(orderValueBucket === bucket.key ? 'all' : bucket.key as any)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, cursor: 'pointer' }}>
                      <span style={{ fontSize: '10px', color: isFiltered ? '#fff' : 'var(--text-muted)', marginBottom: '4px', fontWeight: isFiltered ? 700 : 400 }}>{bucket.count}</span>
                      <div style={{
                        width: '100%', maxWidth: '32px', height: `${mounted ? Math.max(h, 4) : 0}px`,
                        background: isFiltered ? bucket.color : `${bucket.color}44`,
                        border: `1.5px solid ${bucket.color}`,
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.6s ease'
                      }} />
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center', whiteSpace: 'nowrap' }}>{bucket.label}</span>
                    </div>
                  );
                })}
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '12px', textAlign: 'center' }}>Click bucket to filter entire dashboard</span>
            </div>

            {/* Most Profitable Services list */}
            <div className="genz-glass-card" style={card}>
              <h3 style={sTitle}><i className="fas fa-gem" style={{ marginRight: '6px', color: '#fbbf24' }} />Profitable Services Ranking</h3>
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '6px' }}>Service Name</th>
                      <th style={{ padding: '6px' }}>Items Cleaned</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Total Revenue</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitableServicesList.length > 0 ? (
                      profitableServicesList.map(([name, stat], i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '6px', color: '#fff', fontWeight: 500 }}>{name}</td>
                          <td style={{ padding: '6px', color: 'var(--text-secondary)' }}>{stat.count} items</td>
                          <td style={{ padding: '6px', color: 'var(--success)', fontWeight: 'bold', textAlign: 'right' }}>₹{stat.revenue.toLocaleString()}</td>
                          <td style={{ padding: '6px', color: 'var(--text-muted)', textAlign: 'right' }}>₹{Math.round(stat.avgPrice)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '10px' }}>No items</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Dues and Heatmap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Unpaid / Partial Dues Tracker */}
            <div className="genz-glass-card genz-glass-card-danger genz-scrollbar" style={{ ...card, flex: 1, maxHeight: '260px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={sTitle}><i className="fas fa-clock" style={{ marginRight: '6px', color: '#f87171' }} />Overdue Dues Tracker</h3>
                <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 'bold' }}>₹{totalLockedDues.toLocaleString()} locked</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {unpaidBillsList.length > 0 ? (
                  unpaidBillsList.map((b, i) => (
                    <div key={i} style={{
                      background: 'rgba(239, 68, 68, 0.04)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>{b.customerName}</div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Bill #{b.billNumber} · {new Date(b.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '12px', color: '#f87171' }}>₹{b.grandTotal}</strong>
                        <span style={{ fontSize: '9px', display: 'block', color: 'var(--text-muted)' }}>{b.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '11px' }}>
                    🎉 No pending dues for this period!
                  </div>
                )}
              </div>
            </div>

            {/* Peak Hours Heatmap */}
            {viewMode === 'daily' && (
              <div className="genz-glass-card" style={card}>
                <h3 style={sTitle}><i className="fas fa-clock" style={{ marginRight: '6px', color: 'var(--accent)' }} />Peak Sales Hour Distribution</h3>
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

            {/* General Status breakdowns when heatmap is not active */}
            {viewMode !== 'daily' && (
              <div className="genz-glass-card" style={card}>
                <h3 style={sTitle}><i className="fas fa-check-double" style={{ marginRight: '6px', color: 'var(--success)' }} />Overall Status Breakdown</h3>
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
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: REVENUE OPTIMIZER & AI INSIGHTS */}
      {activeSubTab === 'optimizer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          
          {/* Left Column: What-If Simulator & Demand Forecasting */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* "What-If" Revenue Optimization Simulator */}
            <div className="genz-glass-card genz-glass-card-success" style={card}>
              <h3 style={{ ...sTitle, color: '#2dd4bf' }}><i className="fas fa-sliders-h" style={{ marginRight: '6px' }} />"What-If" Revenue Optimization Simulator</h3>
              
              {/* Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Price Adjustment Strategy (Avg. ticket price)</span>
                    <strong style={{ color: '#fff' }}>{simulatorPriceAdjust > 0 ? '+' : ''}{simulatorPriceAdjust}%</strong>
                  </div>
                  <input type="range" min="-20" max="50" step="1" value={simulatorPriceAdjust} onChange={e => setSimulatorPriceAdjust(+e.target.value)} className="genz-slider" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Monthly Orders Growth (Acquisition/Marketing)</span>
                    <strong style={{ color: '#fff' }}>+{simulatorVolumeGrowth}%</strong>
                  </div>
                  <input type="range" min="0" max="100" step="1" value={simulatorVolumeGrowth} onChange={e => setSimulatorVolumeGrowth(+e.target.value)} className="genz-slider" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Customer Retention Rate Boost (Loyalty points impact)</span>
                    <strong style={{ color: '#fff' }}>+{simulatorRetentionImprove}%</strong>
                  </div>
                  <input type="range" min="0" max="30" step="1" value={simulatorRetentionImprove} onChange={e => setSimulatorRetentionImprove(+e.target.value)} className="genz-slider" />
                </div>
              </div>

              {/* Outputs display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Projected Monthly Boost</span>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2dd4bf', marginTop: '2px' }}>+₹{Math.round(simulatedAddedMonthlyRev).toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Incremental Annual Profit</span>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--success)', marginTop: '2px' }}>+₹{Math.round(simulatedAddedMonthlyRev * 12).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Smart Demand & Revenue Forecasting */}
            <div className="genz-glass-card genz-glass-card-success" style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={sTitle}><i className="fas fa-magic" style={{ marginRight: '6px', color: 'var(--accent)' }} />AI-Generated 7-Day Demand Forecast</h3>
                <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', fontWeight: 'bold' }}>SEASONAL ANALYSIS ACTIVE</span>
              </div>
              <div style={{ padding: '10px 0' }}>
                <ForecastChart data={next7DaysForecast} color="#2dd4bf" />
              </div>
              {/* Advisory note */}
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>💡</span>
                <span>
                  {next7DaysForecast[5] && next7DaysForecast[6] && next7DaysForecast[5].amount > next7DaysForecast[2].amount ? (
                    <strong>High volume peak expected this weekend. Staff up and prep folding tables!</strong>
                  ) : (
                    <strong>Demand forecast indicates stable, regular workflow volume. Maintain baseline operations.</strong>
                  )}
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Churn risk predictor & bundles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Churn Risk & Churn Mitigation Panel */}
            <div className="genz-glass-card genz-glass-card-danger" style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={sTitle}><i className="fas fa-user-shield" style={{ marginRight: '6px', color: '#f472b6' }} />Customer Churn Risk & Win-Back</h3>
                
                {/* Threshold selector */}
                <select value={churnThresholdDays} onChange={e => setChurnThresholdDays(+e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '2px 4px', color: 'var(--text-primary)', fontSize: '10px' }}>
                  <option value="15">15+ days inactive</option>
                  <option value="30">30+ days inactive</option>
                  <option value="45">45+ days inactive</option>
                  <option value="60">60+ days inactive</option>
                </select>
              </div>

              <div className="genz-scrollbar" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                {churnRiskCustomersList.length > 0 ? (
                  churnRiskCustomersList.slice(0, 10).map((c, i) => {
                    const lastOrderDate = new Date(c.lastVisit);
                    const daysAgo = Math.round((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>{c.name}</div>
                          <span style={{ fontSize: '9px', color: '#f472b6' }}>Last order: {daysAgo} days ago</span>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div>
                            <strong style={{ fontSize: '11px', color: '#fff', display: 'block' }}>₹{c.totalRevenue.toLocaleString()} LTV</strong>
                          </div>
                          <button onClick={() => setShowCampaignModal({
                            name: c.name,
                            phone: c.phone,
                            ltv: c.totalRevenue,
                            offer: `MISSYOU15`
                          })} style={{ background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.3)', color: '#f472b6', borderRadius: '4px', padding: '3px 8px', fontSize: '9px', cursor: 'pointer', fontWeight: 600 }}>
                            Win-Back
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '11px' }}>
                    No churn risk customers flagged. Outstanding retention rate!
                  </div>
                )}
              </div>
            </div>

            {/* Cross-selling service affinity insights */}
            <div className="genz-glass-card" style={card}>
              <h3 style={sTitle}><i className="fas fa-project-diagram" style={{ marginRight: '6px', color: 'var(--accent)' }} />Cross-Selling & Bundle Suggestions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: 500 }}>Wash + Iron Combo Affinity</span>
                    <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Customers commonly order both services together</span>
                  </div>
                  <strong style={{ fontSize: '13px', color: 'var(--accent)' }}>{serviceBundlesMetrics.washIronRatio}%</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: 500 }}>Dry Clean + Ironing Correlation</span>
                    <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Dry clean users requesting follow-up press service</span>
                  </div>
                  <strong style={{ fontSize: '13px', color: 'var(--accent)' }}>{serviceBundlesMetrics.drycleanIronRatio}%</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: 500 }}>Multi-Item Ticket Probability</span>
                    <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Percentage of orders with more than 1 service type</span>
                  </div>
                  <strong style={{ fontSize: '13px', color: 'var(--accent)' }}>{serviceBundlesMetrics.multiItemPct}%</strong>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Win-Back Campaign Modal Overlay */}
      {showCampaignModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1050
        }}>
          <div style={{
            background: '#1f2937', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', width: '90%', maxWidth: '450px', padding: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#f472b6' }}>📢 Win-Back Retention Campaign</h3>
              <button onClick={() => setShowCampaignModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>&times;</button>
            </div>
            
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Configure win-back campaign for <strong>{showCampaignModal.name}</strong> (LTV: ₹{showCampaignModal.ltv.toLocaleString()}).
            </div>

            {/* Campaign Template Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>WhatsApp Message template</span>
              <textarea
                readOnly
                value={`Hi ${showCampaignModal.name}, we miss you at Gen-Z Laundry! Get 15% OFF your next dry cleaning or washing order. Use code MISSYOU15 when you visit or book. Call us at +91 9256930727. Hope to see you soon!`}
                style={{
                  width: '100%', height: '90px', padding: '8px', background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#e5e7eb',
                  fontSize: '11px', outline: 'none', resize: 'none', fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button onClick={() => copyToClipboard(`Hi ${showCampaignModal.name}, we miss you at Gen-Z Laundry! Get 15% OFF your next dry cleaning or washing order. Use code MISSYOU15 when you visit or book. Call us at +91 9256930727. Hope to see you soon!`)}
                style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', border: 'none', color: '#fff', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                <i className="fas fa-copy" style={{ marginRight: '6px' }} />Copy Message
              </button>
              {showCampaignModal.phone !== 'N/A' && (
                <a
                  href={`https://wa.me/${showCampaignModal.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${showCampaignModal.name}, we miss you at Gen-Z Laundry! Get 15% OFF your next dry cleaning or washing order. Use code MISSYOU15 when you visit or book. Call us at +91 9256930727. Hope to see you soon!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}
                >
                  <i className="fab fa-whatsapp" style={{ marginRight: '6px' }} />Send WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ComprehensiveRevenueDashboard;
