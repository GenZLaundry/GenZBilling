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

const AnalyticsDashboard: React.FC = () => {
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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-circle-notch fa-spin fa-3x" style={{ color: 'var(--accent)', marginBottom: '16px' }}></i>
          <div>Loading Analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px'
      }}>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          padding: '40px',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <i className="fas fa-exclamation-circle fa-3x" style={{ color: 'var(--error)', marginBottom: '20px' }}></i>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Error Loading Analytics</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setError(null);
              setTimeout(() => loadDashboardData(), 100);
            }}
          >
            <i className="fas fa-redo"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'transparent',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              <i className="fas fa-chart-pie" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
              Analytics Dashboard
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '13px' }}>
              Income and performance insights
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Refresh Button */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                loadDashboardData();
                loadComparisonData();
                loadProfitData();
              }}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            
            {/* View Toggle */}
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-elevated)', 
              borderRadius: 'var(--radius-md)', 
              padding: '4px',
              border: '1px solid var(--border-subtle)'
            }}>
              <button
                onClick={() => setActiveView('overview')}
                style={{
                  background: activeView === 'overview' ? 'var(--bg-base)' : 'transparent',
                  border: activeView === 'overview' ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  color: activeView === 'overview' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeView === 'overview' ? '600' : 'normal',
                  transition: 'all 0.2s',
                  boxShadow: activeView === 'overview' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <i className="fas fa-chart-bar" style={{ marginRight: '6px' }}></i> Overview
              </button>
              <button
                onClick={() => setActiveView('profit')}
                style={{
                  background: activeView === 'profit' ? 'var(--bg-base)' : 'transparent',
                  border: activeView === 'profit' ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  color: activeView === 'profit' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeView === 'profit' ? '600' : 'normal',
                  transition: 'all 0.2s',
                  boxShadow: activeView === 'profit' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <i className="fas fa-money-bill-wave" style={{ marginRight: '6px' }}></i> Profit
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {dashboardData && (
            <>
              {/* Period Selector */}
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ 
                  display: 'inline-flex', 
                  background: 'var(--bg-elevated)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '4px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {(['day', 'week', 'month'] as const).map(period => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      style={{
                        background: selectedPeriod === period ? 'var(--bg-base)' : 'transparent',
                        border: selectedPeriod === period ? '1px solid var(--border-subtle)' : '1px solid transparent',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 24px',
                        color: selectedPeriod === period ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: selectedPeriod === period ? '600' : 'normal',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s',
                        boxShadow: selectedPeriod === period ? 'var(--shadow-sm)' : 'none'
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {/* Today's Stats */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '500' }}>Today's Revenue</h3>
                    <div style={{ background: 'rgba(52, 152, 219, 0.1)', padding: '8px', borderRadius: '8px', color: '#3498db' }}>
                      <i className="fas fa-calendar-day"></i>
                    </div>
                  </div>
                  <div 
                    style={{ 
                      color: 'var(--text-primary)', 
                      fontSize: '28px', 
                      fontWeight: '700'
                    }}>
                    {formatCurrency(dashboardData.today.totalIncome)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <span>{dashboardData.today.totalBills} bills • {dashboardData.today.totalItems} items</span>
                    <span style={{ color: 'var(--accent)' }}>Avg: {formatCurrency(dashboardData.today.avgBillAmount)}</span>
                  </div>
                </div>

                {/* This Week */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '500' }}>This Week</h3>
                    <div style={{ background: 'rgba(39, 174, 96, 0.1)', padding: '8px', borderRadius: '8px', color: '#27ae60' }}>
                      <i className="fas fa-calendar-week"></i>
                    </div>
                  </div>
                  <div 
                    style={{ 
                      color: 'var(--text-primary)', 
                      fontSize: '28px', 
                      fontWeight: '700'
                    }}>
                    {formatCurrency(dashboardData.week.totalIncome)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <span>{dashboardData.week.totalBills} bills • {dashboardData.week.totalItems} items</span>
                    {comparisonData && (
                      <span style={{ 
                        color: getChangeColor(comparisonData.changes.incomeChange),
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: `${getChangeColor(comparisonData.changes.incomeChange)}15`,
                        padding: '2px 6px', borderRadius: '4px', fontWeight: '600'
                      }}>
                        <i className={`fas fa-caret-${comparisonData.changes.incomeChange >= 0 ? 'up' : 'down'}`}></i>
                        {Math.abs(comparisonData.changes.incomeChange).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* This Month */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '500' }}>This Month</h3>
                    <div style={{ background: 'rgba(243, 156, 18, 0.1)', padding: '8px', borderRadius: '8px', color: '#f39c12' }}>
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                  </div>
                  <div 
                    style={{ 
                      color: 'var(--text-primary)', 
                      fontSize: '28px', 
                      fontWeight: '700'
                    }}>
                    {formatCurrency(dashboardData.month.totalIncome)}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {dashboardData.month.totalBills} bills • {dashboardData.month.totalItems} items
                  </div>
                </div>

                {/* Pending Bills */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '500' }}>Pending Bills</h3>
                    <div style={{ background: 'rgba(230, 126, 34, 0.1)', padding: '8px', borderRadius: '8px', color: '#e67e22' }}>
                      <i className="fas fa-hourglass-half"></i>
                    </div>
                  </div>
                  <div 
                    style={{ 
                      color: 'var(--text-primary)', 
                      fontSize: '28px', 
                      fontWeight: '700'
                    }}>
                    {dashboardData.pendingCount}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Bills currently awaiting completion
                  </div>
                </div>
              </div>

              {/* Recent Bills and Top Customers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Recent Bills */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px'
                }}>
                  <h3 style={{ color: 'var(--text-primary)', margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-history" style={{ color: 'var(--accent)' }}></i> Recent Bills
                  </h3>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                    {dashboardData.recentBills.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No recent bills</div>
                    ) : (
                      dashboardData.recentBills.map((bill) => (
                        <div key={bill._id} style={{
                          background: 'var(--bg-base)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          marginBottom: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}>
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                              {bill.billNumber}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-user" style={{ fontSize: '10px' }}></i> {bill.customerName}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '15px', marginBottom: '6px' }}>
                              {formatCurrency(bill.grandTotal)}
                            </div>
                            <span className={`badge ${
                              bill.status === 'completed' ? 'badge-success' : 
                              bill.status === 'delivered' ? 'badge-info' : 
                              bill.status === 'pending' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {bill.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Top Customers */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px'
                }}>
                  <h3 style={{ color: 'var(--text-primary)', margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-crown" style={{ color: '#f1c40f' }}></i> Top Customers (This Month)
                  </h3>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                    {dashboardData.topCustomers.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>No customer data</div>
                    ) : (
                      dashboardData.topCustomers.map((customer, index) => (
                        <div key={customer._id} style={{
                          background: 'var(--bg-base)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          marginBottom: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: index === 0 ? 'rgba(241, 196, 15, 0.1)' : 
                                         index === 1 ? 'rgba(189, 195, 199, 0.1)' : 
                                         index === 2 ? 'rgba(211, 84, 0, 0.1)' : 
                                         'var(--bg-surface)',
                              color: index === 0 ? '#f1c40f' : 
                                     index === 1 ? '#bdc3c7' : 
                                     index === 2 ? '#d35400' : 
                                     'var(--text-secondary)',
                              border: `1px solid ${
                                index === 0 ? 'rgba(241, 196, 15, 0.3)' : 
                                index === 1 ? 'rgba(189, 195, 199, 0.3)' : 
                                index === 2 ? 'rgba(211, 84, 0, 0.3)' : 
                                'var(--border-subtle)'
                              }`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              {index + 1}
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                                {customer._id || 'Unknown'}
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fas fa-receipt" style={{ fontSize: '10px' }}></i> {customer.totalBills} bills
                              </div>
                            </div>
                          </div>
                          <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '15px' }}>
                            {formatCurrency(customer.totalSpent)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
                </div>
              )}

              {/* Profit Analysis View */}
              {activeView === 'profit' && profitData && (
                <div>
                  {/* Profit Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div style={{
                      background: 'rgba(39, 174, 96, 0.05)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      border: '1px solid rgba(39, 174, 96, 0.2)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '500' }}>Total Income</h3>
                        <div style={{ background: 'rgba(39, 174, 96, 0.1)', padding: '8px', borderRadius: '8px', color: '#27ae60' }}>
                          <i className="fas fa-hand-holding-usd"></i>
                        </div>
                      </div>
                      <div style={{ color: '#27ae60', fontSize: '28px', fontWeight: 'bold' }}>
                        ₹{profitData.income?.toLocaleString() || 0}
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(231, 76, 60, 0.05)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      border: '1px solid rgba(231, 76, 60, 0.2)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '500' }}>Total Expenses</h3>
                        <div style={{ background: 'rgba(231, 76, 60, 0.1)', padding: '8px', borderRadius: '8px', color: '#e74c3c' }}>
                          <i className="fas fa-file-invoice-dollar"></i>
                        </div>
                      </div>
                      <div style={{ color: '#e74c3c', fontSize: '28px', fontWeight: 'bold' }}>
                        ₹{profitData.expenses?.toLocaleString() || 0}
                      </div>
                    </div>

                    <div style={{
                      background: profitData.profit >= 0 ? 'rgba(39, 174, 96, 0.05)' : 'rgba(231, 76, 60, 0.05)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      border: `1px solid ${profitData.profit >= 0 ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '500' }}>Net Profit</h3>
                        <div style={{ background: profitData.profit >= 0 ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)', padding: '8px', borderRadius: '8px', color: profitData.profit >= 0 ? '#27ae60' : '#e74c3c' }}>
                          <i className={`fas fa-chart-${profitData.profit >= 0 ? 'line' : 'pie'}`}></i>
                        </div>
                      </div>
                      <div style={{ 
                        color: profitData.profit >= 0 ? '#27ae60' : '#e74c3c', 
                        fontSize: '28px', 
                        fontWeight: 'bold' 
                      }}>
                        ₹{profitData.profit?.toLocaleString() || 0}
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(52, 152, 219, 0.05)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      border: '1px solid rgba(52, 152, 219, 0.2)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '500' }}>Profit Margin</h3>
                        <div style={{ background: 'rgba(52, 152, 219, 0.1)', padding: '8px', borderRadius: '8px', color: '#3498db' }}>
                          <i className="fas fa-percentage"></i>
                        </div>
                      </div>
                      <div style={{ color: '#3498db', fontSize: '28px', fontWeight: 'bold' }}>
                        {profitData.profitMargin?.toFixed(1) || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Expense Breakdown */}
                  {profitData.expensesByCategory && profitData.expensesByCategory.length > 0 && (
                    <div style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      marginBottom: '24px'
                    }}>
                      <h3 style={{ color: 'var(--text-primary)', margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-tags" style={{ color: 'var(--accent)' }}></i> Expense Breakdown by Category
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {profitData.expensesByCategory.map((category: any, index: number) => {
                          const categoryColors = [
                            '#e74c3c', '#f39c12', '#3498db', '#9b59b6', 
                            '#27ae60', '#e67e22', '#1abc9c'
                          ];
                          const color = categoryColors[index % categoryColors.length];
                          
                          return (
                            <div key={category._id} style={{
                              background: 'var(--bg-base)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-md)',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              borderLeft: `4px solid ${color}`
                            }}>
                              <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                                {category._id}
                              </div>
                              <div style={{ color: color, fontSize: '20px', fontWeight: 'bold' }}>
                                ₹{category.total?.toLocaleString() || 0}
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fas fa-receipt"></i> {category.count} transactions
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Profit Analysis Summary */}
                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px'
                  }}>
                    <h3 style={{ color: 'var(--text-primary)', margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fas fa-chart-area" style={{ color: 'var(--accent)' }}></i> Profit Analysis Summary ({selectedPeriod.toUpperCase()})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                      <div style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Total Bills Processed</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 'bold' }}>
                          <i className="fas fa-file-invoice" style={{ color: 'var(--accent)', fontSize: '16px', marginRight: '8px' }}></i>
                          {profitData.totalBills || 0}
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Total Expenses Recorded</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 'bold' }}>
                          <i className="fas fa-wallet" style={{ color: '#e74c3c', fontSize: '16px', marginRight: '8px' }}></i>
                          {profitData.totalExpenseCount || 0}
                        </div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Date Range</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', marginTop: '6px' }}>
                          {new Date(profitData.dateRange?.start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(profitData.dateRange?.end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
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