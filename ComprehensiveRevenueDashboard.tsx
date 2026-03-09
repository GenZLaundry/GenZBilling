import React, { useState, useEffect } from 'react';

interface ComprehensiveRevenueDashboardProps {
  onClose: () => void;
  bills: any[];
}

const ComprehensiveRevenueDashboard: React.FC<ComprehensiveRevenueDashboardProps> = ({ onClose, bills }) => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{ date: string; revenue: number } | null>(null);

  // Get available years from bills
  const availableYears = Array.from(new Set(bills.map(bill => new Date(bill.createdAt).getFullYear()))).sort((a, b) => b - a);
  if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

  // Filter bills based on view mode and selected date
  const getFilteredBills = () => {
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      
      if (viewMode === 'yearly') {
        return billDate.getFullYear() === selectedYear;
      } else if (viewMode === 'monthly') {
        return billDate.getFullYear() === selectedYear && billDate.getMonth() === selectedMonth;
      } else if (viewMode === 'daily') {
        return bill.createdAt.startsWith(selectedDate);
      }
      return true;
    });
  };

  const filteredBills = getFilteredBills();

  // Calculate metrics from filtered bills
  const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
  const totalBills = filteredBills.length;
  const avgBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;
  const completedBills = filteredBills.filter(b => b.status === 'completed' || b.status === 'delivered').length;
  const paidRate = totalBills > 0 ? (completedBills / totalBills) * 100 : 0;
  const totalItems = filteredBills.reduce((sum, bill) => sum + (bill.items?.length || 0), 0);

  // Get top customer
  const customerRevenue = filteredBills.reduce((acc, bill) => {
    acc[bill.customerName] = (acc[bill.customerName] || 0) + bill.grandTotal;
    return acc;
  }, {} as Record<string, number>);
  const topCustomer = Object.entries(customerRevenue).sort(([, a], [, b]) => b - a)[0];

  // Revenue over time data (based on view mode)
  const getRevenueData = () => {
    const data: { date: string; revenue: number }[] = [];
    
    if (viewMode === 'daily') {
      // Daily view - show all days in selected month
      const year = selectedYear;
      const month = selectedMonth;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const dayRevenue = bills
          .filter(bill => bill.createdAt.startsWith(dateStr))
          .reduce((sum, bill) => sum + bill.grandTotal, 0);
        data.push({ 
          date: `${day}`, 
          revenue: dayRevenue 
        });
      }
    } else if (viewMode === 'monthly') {
      // Monthly view - show all 12 months for selected year
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let month = 0; month < 12; month++) {
        const monthRevenue = bills
          .filter(bill => {
            const billDate = new Date(bill.createdAt);
            return billDate.getMonth() === month && billDate.getFullYear() === selectedYear;
          })
          .reduce((sum, bill) => sum + bill.grandTotal, 0);
        data.push({ 
          date: months[month], 
          revenue: monthRevenue 
        });
      }
    } else if (viewMode === 'yearly') {
      // Yearly view - show available years
      availableYears.forEach(year => {
        const yearRevenue = bills
          .filter(bill => {
            const billDate = new Date(bill.createdAt);
            return billDate.getFullYear() === year;
          })
          .reduce((sum, bill) => sum + bill.grandTotal, 0);
        data.push({ date: year.toString(), revenue: yearRevenue });
      });
    }
    
    return data;
  };

  const revenueData = getRevenueData();
  const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 1);

  // Item categories (mock data - you can enhance this)
  const itemCategories = [
    { name: 'dress pieces', value: 35, color: '#8b5cf6' },
    { name: 'Shirt', value: 20, color: '#3b82f6' },
    { name: 'Jeans', value: 15, color: '#10b981' },
    { name: 'Shirt(labal)', value: 12, color: '#f59e0b' },
    { name: 'T-Shirt', value: 10, color: '#ef4444' },
    { name: 'coat pant', value: 5, color: '#ec4899' },
    { name: 'clothes', value: 2, color: '#14b8a6' },
    { name: 'Jacket', value: 1, color: '#6366f1' }
  ];

  const totalCategoryValue = itemCategories.reduce((sum, cat) => sum + cat.value, 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a2e 50%, #16213e 100%)',
      zIndex: 999999,
      overflow: 'auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stat-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.5s;
        }
        .stat-card:hover::before {
          left: 100%;
        }
        .stat-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .chart-bar {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .chart-bar:hover {
          opacity: 0.8;
          transform: scaleY(1.05);
        }
        .filter-btn {
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .filter-btn::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          transform: translate(-50%, -50%);
          transition: width 0.3s, height 0.3s;
        }
        .filter-btn:hover::after {
          width: 200px;
          height: 200px;
        }
        .date-selector {
          transition: all 0.3s ease;
        }
        .date-selector:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 15px rgba(139, 92, 246, 0.3);
        }
        .date-selector:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.5);
        }
        .category-item {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .category-item:hover {
          transform: translateX(10px);
          background: rgba(255,255,255,0.05);
        }
        .revenue-number {
          animation: countUp 0.6s ease-out;
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        padding: '20px 30px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ 
            color: 'white', 
            margin: 0, 
            fontSize: '32px', 
            fontWeight: '700',
            background: 'linear-gradient(135deg, #fff, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'fadeIn 0.6s ease-out'
          }}>
            💰 Revenue Dashboard
          </h1>
          <p style={{ 
            color: 'rgba(255,255,255,0.7)', 
            margin: '8px 0 0 0', 
            fontSize: '15px',
            fontWeight: '500',
            animation: 'fadeIn 0.8s ease-out'
          }}>
            {viewMode === 'yearly' && `📅 Showing data for ${selectedYear}`}
            {viewMode === 'monthly' && `📅 ${new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
            {viewMode === 'daily' && `📅 ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            background: 'rgba(139, 92, 246, 0.15)', 
            borderRadius: '10px',
            padding: '4px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)'
          }}>
            {[
              { label: 'Daily', icon: '📅' },
              { label: 'Monthly', icon: '📆' },
              { label: 'Yearly', icon: '🗓️' }
            ].map((item, i) => {
              const modeValue = ['daily', 'monthly', 'yearly'][i] as any;
              const isActive = viewMode === modeValue;
              return (
                <button
                  key={item.label}
                  onClick={() => setViewMode(modeValue)}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: isActive ? '0 4px 12px rgba(139, 92, 246, 0.4)' : 'none',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  {item.icon} {item.label}
                </button>
              );
            })}
          </div>

          {/* Date Selectors based on view mode */}
          {viewMode === 'yearly' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="date-selector"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
                border: '2px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '10px',
                padding: '10px 16px',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
              }}
            >
              {availableYears.map(year => (
                <option key={year} value={year} style={{ background: '#1a1a2e', color: 'white' }}>
                  📅 {year}
                </option>
              ))}
            </select>
          )}

          {viewMode === 'monthly' && (
            <>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="date-selector"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
                  border: '2px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
                }}
              >
                {availableYears.map(year => (
                  <option key={year} value={year} style={{ background: '#1a1a2e', color: 'white' }}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="date-selector"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
                  border: '2px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
                }}
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
                  <option key={i} value={i} style={{ background: '#1a1a2e', color: 'white' }}>
                    {month}
                  </option>
                ))}
              </select>
            </>
          )}

          {viewMode === 'daily' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-selector"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
                border: '2px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '10px',
                padding: '10px 16px',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600',
                colorScheme: 'dark',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
              }}
            />
          )}

          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      <div style={{ padding: '25px' }}>
        {/* Top Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '25px'
        }}>
          {[
            {
              title: 'TOTAL REVENUE',
              value: `₹${totalRevenue.toLocaleString()}`,
              change: '+ 12.5% vs last month',
              icon: '💰',
              color: '#8b5cf6',
              chartData: [20, 35, 25, 40, 30, 45, 35, 50]
            },
            {
              title: 'TOTAL BILLS',
              value: totalBills,
              change: `${totalBills} bills in period`,
              icon: '📋',
              color: '#3b82f6',
              chartData: [30, 25, 35, 40, 35, 45, 40, 50]
            },
            {
              title: 'AVG BILL VALUE',
              value: `₹${Math.round(avgBillValue)}`,
              change: 'Average per bill',
              icon: '📊',
              color: '#f59e0b',
              chartData: [35, 35, 36, 35, 36, 37, 36, 37]
            },
            {
              title: 'PAID RATE',
              value: `${paidRate.toFixed(1)}%`,
              change: `${completedBills} completed`,
              icon: '✅',
              color: '#10b981',
              chartData: [80, 82, 85, 87, 90, 92, 95, 100]
            },
            {
              title: 'ITEMS PROCESSED',
              value: totalItems,
              change: 'Total items',
              icon: '👕',
              color: '#ec4899',
              chartData: [100, 120, 110, 130, 125, 140, 135, 150]
            },
            {
              title: 'TOP CUSTOMER',
              value: `₹${topCustomer ? topCustomer[1].toLocaleString() : 0}`,
              change: topCustomer ? topCustomer[0] : 'N/A',
              icon: '👑',
              color: '#f97316',
              chartData: [50, 55, 60, 65, 70, 75, 80, 85]
            }
          ].map((stat, i) => (
            <div 
              key={i} 
              className="stat-card"
              onMouseEnter={() => setHoveredStat(i)}
              onMouseLeave={() => setHoveredStat(null)}
              style={{
                background: hoveredStat === i 
                  ? `linear-gradient(135deg, ${stat.color}30, ${stat.color}15)` 
                  : 'linear-gradient(135deg, rgba(30, 27, 75, 0.8), rgba(49, 46, 129, 0.8))',
                border: hoveredStat === i ? `2px solid ${stat.color}` : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                animation: `fadeIn 0.6s ease ${i * 0.1}s both`,
                boxShadow: hoveredStat === i ? `0 10px 30px ${stat.color}40` : '0 4px 15px rgba(0,0,0,0.2)'
              }}>
              {/* Animated background gradient */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-50%',
                width: '200%',
                height: '200%',
                background: `radial-gradient(circle, ${stat.color}20 0%, transparent 70%)`,
                opacity: hoveredStat === i ? 1 : 0,
                transition: 'opacity 0.5s ease',
                pointerEvents: 'none'
              }}></div>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <div style={{ 
                      color: 'rgba(255,255,255,0.6)', 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      letterSpacing: '1px', 
                      marginBottom: '10px',
                      textTransform: 'uppercase'
                    }}>
                      {stat.title}
                    </div>
                    <div className="revenue-number" style={{ 
                      fontSize: '32px', 
                      fontWeight: '800', 
                      color: 'white', 
                      marginBottom: '6px',
                      textShadow: hoveredStat === i ? `0 0 20px ${stat.color}` : 'none'
                    }}>
                      {stat.value}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#10b981',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>↗</span> {stat.change}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '40px',
                    opacity: hoveredStat === i ? 0.8 : 0.3,
                    transition: 'all 0.3s ease',
                    transform: hoveredStat === i ? 'scale(1.2) rotate(10deg)' : 'scale(1)',
                    filter: hoveredStat === i ? `drop-shadow(0 0 10px ${stat.color})` : 'none'
                  }}>
                    {stat.icon}
                  </div>
                </div>
                {/* Mini chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '50px', marginTop: '15px' }}>
                  {stat.chartData.map((height, idx) => (
                    <div 
                      key={idx} 
                      className="chart-bar"
                      style={{
                        flex: 1,
                        height: `${height}%`,
                        background: hoveredStat === i 
                          ? `linear-gradient(to top, ${stat.color}, ${stat.color}80)` 
                          : `linear-gradient(to top, ${stat.color}60, ${stat.color}30)`,
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.3s ease',
                        boxShadow: hoveredStat === i ? `0 0 10px ${stat.color}` : 'none'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Revenue Over Time Chart */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '25px'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>
              📈 Revenue Over Time
              {hoveredDataPoint && (
                <span style={{ 
                  marginLeft: '15px', 
                  fontSize: '13px', 
                  color: '#8b5cf6',
                  background: 'rgba(139, 92, 246, 0.2)',
                  padding: '4px 12px',
                  borderRadius: '6px'
                }}>
                  {new Date(hoveredDataPoint.date).toLocaleDateString()}: ₹{hoveredDataPoint.revenue.toLocaleString()}
                </span>
              )}
            </h3>
            <div style={{ position: 'relative', height: '250px' }}>
              {/* Y-axis labels */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                <div>₹{(maxRevenue).toLocaleString()}</div>
                <div>₹{(maxRevenue * 0.75).toLocaleString()}</div>
                <div>₹{(maxRevenue * 0.5).toLocaleString()}</div>
                <div>₹{(maxRevenue * 0.25).toLocaleString()}</div>
                <div>₹0</div>
              </div>
              {/* Chart area */}
              <svg 
                style={{ position: 'absolute', left: '50px', right: 0, top: 0, bottom: '30px', width: 'calc(100% - 50px)', height: 'calc(100% - 30px)' }}
                onMouseLeave={() => setHoveredDataPoint(null)}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area */}
                <path
                  d={`M 0 ${250 - 30} ${revenueData.map((d, i) => {
                    const x = (i / (revenueData.length - 1)) * 100;
                    const y = 250 - 30 - ((d.revenue / maxRevenue) * (250 - 30));
                    return `L ${x}% ${y}`;
                  }).join(' ')} L 100% ${250 - 30} Z`}
                  fill="url(#areaGradient)"
                />
                {/* Line */}
                <path
                  d={`M ${revenueData.map((d, i) => {
                    const x = (i / (revenueData.length - 1)) * 100;
                    const y = ((1 - (d.revenue / maxRevenue)) * 100);
                    return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                  }).join(' ')}`}
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Interactive points */}
                {revenueData.map((d, i) => {
                  const x = (i / (revenueData.length - 1)) * 100;
                  const y = ((1 - (d.revenue / maxRevenue)) * 100);
                  return (
                    <circle
                      key={i}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="4"
                      fill="#8b5cf6"
                      stroke="white"
                      strokeWidth="2"
                      style={{ cursor: 'pointer', opacity: hoveredDataPoint?.date === d.date ? 1 : 0.7 }}
                      onMouseEnter={() => setHoveredDataPoint(d)}
                    />
                  );
                })}
              </svg>
              {/* X-axis labels */}
              <div style={{ position: 'absolute', left: '50px', right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                {revenueData.filter((_, i) => i % 5 === 0).map((d, i) => (
                  <div key={i}>{new Date(d.date).getDate()} {new Date(d.date).toLocaleString('default', { month: 'short' })}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Item Categories Donut Chart */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '25px'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>
              🎨 Item Categories
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Donut Chart */}
              <svg width="200" height="200" viewBox="0 0 200 200">
                {itemCategories.reduce((acc, cat, i) => {
                  const prevTotal = itemCategories.slice(0, i).reduce((sum, c) => sum + c.value, 0);
                  const startAngle = (prevTotal / totalCategoryValue) * 360;
                  const endAngle = ((prevTotal + cat.value) / totalCategoryValue) * 360;
                  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                  
                  const startRad = (startAngle - 90) * Math.PI / 180;
                  const endRad = (endAngle - 90) * Math.PI / 180;
                  
                  const x1 = 100 + 80 * Math.cos(startRad);
                  const y1 = 100 + 80 * Math.sin(startRad);
                  const x2 = 100 + 80 * Math.cos(endRad);
                  const y2 = 100 + 80 * Math.sin(endRad);
                  
                  const x3 = 100 + 50 * Math.cos(endRad);
                  const y3 = 100 + 50 * Math.sin(endRad);
                  const x4 = 100 + 50 * Math.cos(startRad);
                  const y4 = 100 + 50 * Math.sin(startRad);
                  
                  acc.push(
                    <path
                      key={i}
                      d={`M ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 50 50 0 ${largeArc} 0 ${x4} ${y4} Z`}
                      fill={cat.color}
                    />
                  );
                  return acc;
                }, [] as JSX.Element[])}
              </svg>
              {/* Legend */}
              <div style={{ marginTop: '20px', width: '100%' }}>
                {itemCategories.map((cat, i) => (
                  <div 
                    key={i} 
                    className="category-item"
                    onClick={() => {
                      setSelectedCategory(selectedCategory === cat.name ? null : cat.name);
                      alert(`${cat.name}: ${cat.value}% of items`);
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      marginBottom: '8px',
                      padding: '8px',
                      borderRadius: '6px',
                      background: selectedCategory === cat.name ? 'rgba(255,255,255,0.1)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: cat.color }}></div>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'white', fontWeight: '600' }}>{cat.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Order Status & Payment Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Order Status */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '25px'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>
              📦 Order Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {[
                { label: 'Completed', count: filteredBills.filter(b => b.status === 'completed').length, color: '#10b981' },
                { label: 'Pending', count: filteredBills.filter(b => b.status === 'pending').length, color: '#f59e0b' },
                { label: 'Processing', count: filteredBills.filter(b => b.status === 'in-process').length, color: '#3b82f6' }
              ].map((status, i) => (
                <div key={i} style={{ cursor: 'pointer' }} onClick={() => alert(`${status.label}: ${status.count} bills`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{status.label}</span>
                    <span style={{ fontSize: '13px', color: 'white', fontWeight: '600' }}>{status.count}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      className="chart-bar"
                      style={{
                        height: '100%',
                        width: `${(status.count / totalBills) * 100}%`,
                        background: status.color,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Status */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '25px'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>
              💳 Payment Status
            </h3>
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '40px', justifyContent: 'center' }}>
              {[
                { label: 'Paid', count: completedBills, color: '#10b981' },
                { label: 'Unpaid', count: totalBills - completedBills, color: '#ef4444' }
              ].map((payment, i) => (
                <div 
                  key={i} 
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => alert(`${payment.label}: ${payment.count} bills (${((payment.count / totalBills) * 100).toFixed(1)}%)`)}
                >
                  <div 
                    className="chart-bar"
                    style={{
                      width: '100%',
                      height: `${(payment.count / totalBills) * 180}px`,
                      background: payment.color,
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: 'white',
                      minHeight: '40px',
                      transition: 'all 0.5s ease'
                    }}
                  >
                    {payment.count}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    {payment.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveRevenueDashboard;
