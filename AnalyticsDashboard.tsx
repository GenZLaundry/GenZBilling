import React, { useState, useEffect } from 'react';
import apiService from './api';

interface DashboardData {
  today: {
    totalIncome: number;
    totalBills: number;
    totalItems: number;
    avgBillAmount: number;
  };
  week: {
    totalIncome: number;
    totalBills: number;
    totalItems: number;
  };
  month: {
    totalIncome: number;
    totalBills: number;
    totalItems: number;
  };
  pendingCount: number;
  recentBills: Array<{
    _id: string;
    billNumber: string;
    customerName: string;
    grandTotal: number;
    status: string;
    createdAt: string;
  }>;
  topCustomers: Array<{
    _id: string;
    totalSpent: number;
    totalBills: number;
  }>;
}

interface AnalyticsDashboardProps {
  onClose: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [profitData, setProfitData] = useState<any>(null);
  const [activeView, setActiveView] = useState<'overview' | 'profit'>('overview');

  useEffect(() => {
    loadDashboardData();
    loadComparisonData();
    loadProfitData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading analytics dashboard data...');
      
      // Use the new MongoDB analytics endpoints
      const [overviewResponse, statsResponse] = await Promise.all([
        apiService.getDashboardOverview(),
        apiService.getStats()
      ]);
      
      console.log('📊 Overview response:', overviewResponse);
      console.log('📈 Stats response:', statsResponse);
      
      if (overviewResponse.success && overviewResponse.data) {
        // Transform the new API data to match the expected format
        const transformedData: DashboardData = {
          today: {
            totalIncome: overviewResponse.data.today?.revenue || 0,
            totalBills: overviewResponse.data.today?.bills || 0,
            totalItems: overviewResponse.data.today?.items || 0,
            avgBillAmount: overviewResponse.data.today?.avgBillValue || 0
          },
          week: {
            totalIncome: overviewResponse.data.week?.revenue || 0,
            totalBills: overviewResponse.data.week?.bills || 0,
            totalItems: overviewResponse.data.week?.items || 0
          },
          month: {
            totalIncome: overviewResponse.data.month?.revenue || 0,
            totalBills: overviewResponse.data.month?.bills || 0,
            totalItems: overviewResponse.data.month?.items || 0
          },
          pendingCount: overviewResponse.data.pendingBills || 0,
          recentBills: overviewResponse.data.recentActivity || [],
          topCustomers: overviewResponse.data.topCustomers || []
        };
        
        setDashboardData(transformedData);
        console.log('✅ Analytics dashboard data loaded successfully');
      } else {
        const errorMsg = overviewResponse.message || 'Failed to load analytics data';
        console.error('❌ Analytics API error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error loading analytics data';
      console.error('❌ Analytics error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = async () => {
    try {
      console.log('🔄 Loading comparison data...');
      const response = await apiService.getBusinessReports({ period: selectedPeriod });
      console.log('📊 Comparison response:', response);
      
      if (response.success && response.data) {
        // Calculate comparison data from business reports
        const comparisonData = {
          changes: {
            incomeChange: 0 // We'll calculate this based on trends
          }
        };
        setComparisonData(comparisonData);
        console.log('✅ Comparison data loaded');
      }
    } catch (err) {
      console.error('❌ Comparison data error:', err);
    }
  };

  const loadProfitData = async () => {
    try {
      console.log('🔄 Loading profit data...');
      const [reportsResponse, expensesResponse] = await Promise.all([
        apiService.getBusinessReports({ period: selectedPeriod }),
        apiService.getExpenseSummary(selectedPeriod === 'day' ? 'day' : selectedPeriod)
      ]);
      
      console.log('📊 Reports response:', reportsResponse);
      console.log('💸 Expenses response:', expensesResponse);
      
      if (reportsResponse.success && expensesResponse.success) {
        const income = reportsResponse.data?.summary?.totalRevenue || 0;
        const expenses = expensesResponse.data?.totalExpenses || 0;
        const profit = income - expenses;
        const profitMargin = income > 0 ? (profit / income) * 100 : 0;
        
        const profitData = {
          income,
          expenses,
          profit,
          profitMargin,
          totalBills: reportsResponse.data?.summary?.totalBills || 0,
          totalExpenseCount: expensesResponse.data?.expensesByCategory?.reduce((sum: number, cat: any) => sum + (cat.count || 0), 0) || 0,
          expensesByCategory: expensesResponse.data?.expensesByCategory || [],
          dateRange: {
            start: expensesResponse.data?.dateRange?.start,
            end: expensesResponse.data?.dateRange?.end
          }
        };
        
        setProfitData(profitData);
        console.log('✅ Profit data loaded:', profitData);
      }
    } catch (err) {
      console.error('❌ Profit data error:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return '#27ae60';
    if (change < 0) return '#e74c3c';
    return '#95a5a6';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➖';
  };

  if (loading) {
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
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <div>Loading Analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
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
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h3 style={{ color: '#e74c3c', marginBottom: '10px' }}>Error Loading Analytics</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setError(null);
                setTimeout(() => loadDashboardData(), 100);
              }}
              style={{
                background: '#3498db',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#95a5a6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        width: '95%',
        maxWidth: '1200px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        <style>{`
          .analytics-amount {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
            font-feature-settings: "kern" 1, "liga" 1 !important;
            letter-spacing: -0.5px !important;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4) !important;
            font-weight: 700 !important;
          }
        `}</style>
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
              📊 Analytics Dashboard
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '5px 0 0 0', fontSize: '14px' }}>
              Income and performance insights
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Refresh Button */}
            <button
              onClick={() => {
                console.log('🧪 Testing analytics endpoints...');
                loadDashboardData();
                loadComparisonData();
                loadProfitData();
              }}
              style={{
                background: 'rgba(46, 204, 113, 0.3)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              🔄 Refresh Data
            </button>
            
            {/* View Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '5px' }}>
              <button
                onClick={() => setActiveView('overview')}
                style={{
                  background: activeView === 'overview' ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeView === 'overview' ? 'bold' : 'normal'
                }}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveView('profit')}
                style={{
                  background: activeView === 'profit' ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeView === 'profit' ? 'bold' : 'normal'
                }}
              >
                💰 Profit
              </button>
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
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {dashboardData && (
            <>
              {/* Period Selector */}
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '5px' }}>
                  {(['day', 'week', 'month'] as const).map(period => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      style={{
                        background: selectedPeriod === period ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: selectedPeriod === period ? 'bold' : 'normal',
                        textTransform: 'capitalize'
                      }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overview View */}
              {activeView === 'overview' && (
                <div>

              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {/* Today's Stats */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📅</div>
                  <h3 style={{ color: 'white', margin: '0 0 10px 0' }}>Today</h3>
                  <div 
                    className="analytics-amount"
                    style={{ 
                      color: '#3498db', 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      marginBottom: '5px'
                    }}>
                    {formatCurrency(dashboardData.today.totalIncome)}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                    {dashboardData.today.totalBills} bills • {dashboardData.today.totalItems} items
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginTop: '5px' }}>
                    Avg: {formatCurrency(dashboardData.today.avgBillAmount)}
                  </div>
                </div>

                {/* This Week */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
                  <h3 style={{ color: 'white', margin: '0 0 10px 0' }}>This Week</h3>
                  <div 
                    className="analytics-amount"
                    style={{ 
                      color: '#27ae60', 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      marginBottom: '5px'
                    }}>
                    {formatCurrency(dashboardData.week.totalIncome)}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                    {dashboardData.week.totalBills} bills • {dashboardData.week.totalItems} items
                  </div>
                  {comparisonData && (
                    <div style={{ 
                      color: getChangeColor(comparisonData.changes.incomeChange), 
                      fontSize: '12px', 
                      marginTop: '5px',
                      fontWeight: 'bold'
                    }}>
                      {getChangeIcon(comparisonData.changes.incomeChange)} {Math.abs(comparisonData.changes.incomeChange).toFixed(1)}%
                    </div>
                  )}
                </div>

                {/* This Month */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📈</div>
                  <h3 style={{ color: 'white', margin: '0 0 10px 0' }}>This Month</h3>
                  <div 
                    className="analytics-amount"
                    style={{ 
                      color: '#f39c12', 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      marginBottom: '5px'
                    }}>
                    {formatCurrency(dashboardData.month.totalIncome)}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                    {dashboardData.month.totalBills} bills • {dashboardData.month.totalItems} items
                  </div>
                </div>

                {/* Pending Bills */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
                  <h3 style={{ color: 'white', margin: '0 0 10px 0' }}>Pending Bills</h3>
                  <div 
                    className="analytics-amount"
                    style={{ 
                      color: '#e67e22', 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      marginBottom: '5px'
                    }}>
                    {dashboardData.pendingCount}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                    Bills awaiting completion
                  </div>
                </div>
              </div>

              {/* Recent Bills and Top Customers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Recent Bills */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '15px',
                  padding: '20px'
                }}>
                  <h3 style={{ color: 'white', margin: '0 0 15px 0' }}>🕒 Recent Bills</h3>
                  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {dashboardData.recentBills.map((bill) => (
                      <div key={bill._id} style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ color: 'white' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{bill.billNumber}</div>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>
                            {bill.customerName} • {formatDate(bill.createdAt)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#3498db', fontWeight: 'bold' }}>
                            {formatCurrency(bill.grandTotal)}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: bill.status === 'completed' ? '#27ae60' : 
                                       bill.status === 'delivered' ? '#3498db' : '#e67e22',
                            color: 'white'
                          }}>
                            {bill.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Customers */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '15px',
                  padding: '20px'
                }}>
                  <h3 style={{ color: 'white', margin: '0 0 15px 0' }}>👑 Top Customers (This Month)</h3>
                  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {dashboardData.topCustomers.map((customer, index) => (
                      <div key={customer._id} style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: index === 0 ? '#f39c12' : index === 1 ? '#95a5a6' : index === 2 ? '#cd7f32' : '#3498db',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white'
                          }}>
                            {index + 1}
                          </div>
                          <div style={{ color: 'white' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{customer._id}</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>
                              {customer.totalBills} bills
                            </div>
                          </div>
                        </div>
                        <div style={{ color: '#27ae60', fontWeight: 'bold' }}>
                          {formatCurrency(customer.totalSpent)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
                </div>
              )}

              {/* Profit Analysis View */}
              {activeView === 'profit' && profitData && (
                <div>
                  {/* Profit Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <div style={{
                      background: 'rgba(46, 204, 113, 0.2)',
                      borderRadius: '15px',
                      padding: '20px',
                      textAlign: 'center',
                      border: '2px solid rgba(46, 204, 113, 0.3)'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>💰</div>
                      <h3 style={{ color: '#2ecc71', margin: '0 0 10px 0' }}>Total Income</h3>
                      <div style={{ color: '#2ecc71', fontSize: '24px', fontWeight: 'bold' }}>
                        ₹{profitData.income?.toLocaleString() || 0}
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(231, 76, 60, 0.2)',
                      borderRadius: '15px',
                      padding: '20px',
                      textAlign: 'center',
                      border: '2px solid rgba(231, 76, 60, 0.3)'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>💸</div>
                      <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Total Expenses</h3>
                      <div style={{ color: '#e74c3c', fontSize: '24px', fontWeight: 'bold' }}>
                        ₹{profitData.expenses?.toLocaleString() || 0}
                      </div>
                    </div>

                    <div style={{
                      background: profitData.profit >= 0 ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                      borderRadius: '15px',
                      padding: '20px',
                      textAlign: 'center',
                      border: `2px solid ${profitData.profit >= 0 ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>
                        {profitData.profit >= 0 ? '📈' : '📉'}
                      </div>
                      <h3 style={{ color: profitData.profit >= 0 ? '#2ecc71' : '#e74c3c', margin: '0 0 10px 0' }}>
                        Net Profit
                      </h3>
                      <div style={{ 
                        color: profitData.profit >= 0 ? '#2ecc71' : '#e74c3c', 
                        fontSize: '24px', 
                        fontWeight: 'bold' 
                      }}>
                        ₹{profitData.profit?.toLocaleString() || 0}
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(52, 152, 219, 0.2)',
                      borderRadius: '15px',
                      padding: '20px',
                      textAlign: 'center',
                      border: '2px solid rgba(52, 152, 219, 0.3)'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
                      <h3 style={{ color: '#3498db', margin: '0 0 10px 0' }}>Profit Margin</h3>
                      <div style={{ color: '#3498db', fontSize: '24px', fontWeight: 'bold' }}>
                        {profitData.profitMargin?.toFixed(1) || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Expense Breakdown */}
                  {profitData.expensesByCategory && profitData.expensesByCategory.length > 0 && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '15px',
                      padding: '20px',
                      marginBottom: '20px'
                    }}>
                      <h3 style={{ color: 'white', marginBottom: '20px', textAlign: 'center' }}>
                        💸 Expense Breakdown by Category
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        {profitData.expensesByCategory.map((category: any, index: number) => {
                          const categoryColors = [
                            '#e74c3c', '#f39c12', '#3498db', '#9b59b6', 
                            '#27ae60', '#e67e22', '#95a5a6'
                          ];
                          const color = categoryColors[index % categoryColors.length];
                          
                          return (
                            <div key={category._id} style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '10px',
                              padding: '15px',
                              textAlign: 'center',
                              borderLeft: `4px solid ${color}`
                            }}>
                              <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '5px' }}>
                                {category._id}
                              </div>
                              <div style={{ color: color, fontSize: '18px', fontWeight: 'bold' }}>
                                ₹{category.total?.toLocaleString() || 0}
                              </div>
                              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                                {category.count} expense{category.count !== 1 ? 's' : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Profit Analysis Summary */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '15px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ color: 'white', marginBottom: '15px' }}>
                      📈 Profit Analysis Summary ({selectedPeriod.toUpperCase()})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                      <div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Total Bills</div>
                        <div style={{ color: '#3498db', fontSize: '20px', fontWeight: 'bold' }}>
                          {profitData.totalBills || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Total Expenses</div>
                        <div style={{ color: '#e74c3c', fontSize: '20px', fontWeight: 'bold' }}>
                          {profitData.totalExpenseCount || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>Period</div>
                        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                          {new Date(profitData.dateRange?.start).toLocaleDateString('en-IN')} - {new Date(profitData.dateRange?.end).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;