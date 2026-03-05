import React, { useState, useEffect } from 'react';

interface ComprehensiveRevenueDashboardProps {
  onClose: () => void;
  bills: any[];
}

const ComprehensiveRevenueDashboard: React.FC<ComprehensiveRevenueDashboardProps> = ({ onClose, bills }) => {
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{ date: string; revenue: number } | null>(null);

  // Filter bills based on time filter
  const getFilteredBills = () => {
    const now = new Date();
    const filtered = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      const daysDiff = Math.floor((now.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (timeFilter) {
        case '7days': return daysDiff <= 7;
        case '30days': return daysDiff <= 30;
        case '90days': return daysDiff <= 90;
        case 'all': return true;
        default: return true;
      }
    });
    return filtered;
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

  // Revenue over time data (based on time filter)
  const getRevenueData = () => {
    const data: { date: string; revenue: number }[] = [];
    const days = timeFilter === '7days' ? 7 : timeFilter === '30days' ? 30 : timeFilter === '90days' ? 90 : 365;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayRevenue = filteredBills
        .filter(bill => bill.createdAt.startsWith(dateStr))
        .reduce((sum, bill) => sum + bill.grandTotal, 0);
      data.push({ date: dateStr, revenue: dayRevenue });
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
      background: '#0a0e27',
      zIndex: 999999,
      overflow: 'auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .stat-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .stat-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
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
          transition: all 0.2s ease;
        }
        .filter-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 15px rgba(99, 102, 241, 0.4);
        }
        .category-item {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .category-item:hover {
          background: rgba(255,255,255,0.1);
          transform: translateX(5px);
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
          <h1 style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: '600' }}>
            Dashboard Overview
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '5px 0 0 0', fontSize: '14px' }}>
            Real-time laundry business analytics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {['7 Days', '30 Days', '90 Days', 'All Time'].map((label, i) => {
            const filterValue = ['7days', '30days', '90days', 'all'][i] as any;
            const isActive = timeFilter === filterValue;
            return (
              <button
                key={label}
                onClick={() => setTimeFilter(filterValue)}
                className="filter-btn"
                style={{
                  background: isActive ? '#6366f1' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  color: 'white',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  boxShadow: isActive ? '0 5px 15px rgba(99, 102, 241, 0.4)' : 'none'
                }}
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              color: 'white',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '600',
              marginLeft: '10px'
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
              onClick={() => alert(`${stat.title}: ${stat.value}`)}
              style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                border: hoveredStat === i ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
                animation: `fadeIn 0.5s ease ${i * 0.1}s both`
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    {stat.title}
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10b981' }}>
                    {stat.change}
                  </div>
                </div>
                <div style={{
                  fontSize: '32px',
                  opacity: 0.3
                }}>
                  {stat.icon}
                </div>
              </div>
              {/* Mini chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '40px' }}>
                {stat.chartData.map((height, idx) => (
                  <div 
                    key={idx} 
                    className="chart-bar"
                    style={{
                      flex: 1,
                      height: `${height}%`,
                      background: stat.color,
                      borderRadius: '2px 2px 0 0',
                      opacity: hoveredStat === i ? 0.8 : 0.6
                    }}
                  ></div>
                ))}
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
