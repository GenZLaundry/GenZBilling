import React, { useState, useEffect } from 'react';
import apiService from './api';
import { useAlert } from './GlobalAlert';
import ExpenseManager from './ExpenseManager';
import IncomeManager from './IncomeManager';
import AdvanceManager from './AdvanceManager';

interface FinanceManagerProps {
  onClose: () => void;
}

const FinanceManager: React.FC<FinanceManagerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'loans'>('overview');
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();

  // Overview Data State
  const [overviewData, setOverviewData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalOutstandingLoans: 0,
    netBalance: 0,
    totalRevenue: 0,
    recentActivity: [] as any[]
  });

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      const [incomeResult, expenseResult, advanceResult, statsResult] = await Promise.allSettled([
        apiService.getIncomes(),
        apiService.getExpenses({ limit: 1000 }), // Get a good chunk for total calculation if no summary exists, but we can also use expense summary
        apiService.getAdvances(),
        apiService.getStats()
      ]);

      const incomeRes = incomeResult.status === 'fulfilled' ? incomeResult.value : { success: false, data: [] };
      const expenseRes = expenseResult.status === 'fulfilled' ? expenseResult.value : { success: false, data: { expenses: [] } };
      const advanceRes = advanceResult.status === 'fulfilled' ? advanceResult.value : { success: false, data: [] };
      const statsRes = statsResult.status === 'fulfilled' ? statsResult.value : { success: false, data: null };

      let tIncome = 0;
      let tExpenses = 0;
      let tOutstanding = 0;
      let tRevenue = 0;
      let activity: any[] = [];

      if (incomeRes.success && incomeRes.data) {
        tIncome = incomeRes.data.reduce((sum: number, inc: any) => sum + inc.amount, 0);
        const mappedIncomes = incomeRes.data.map((inc: any) => ({
          id: inc._id,
          type: 'INCOME',
          title: inc.source,
          amount: inc.amount,
          date: new Date(inc.date),
          color: '#27ae60',
          icon: 'fa-piggy-bank'
        }));
        activity = [...activity, ...mappedIncomes];
      }

      if (expenseRes.success && expenseRes.data && Array.isArray(expenseRes.data.expenses)) {
        const expensesList = expenseRes.data.expenses;
        tExpenses = expensesList.reduce((sum: number, exp: any) => sum + exp.amount, 0);
        const mappedExpenses = expensesList.map((exp: any) => ({
          id: exp._id,
          type: 'EXPENSE',
          title: exp.title,
          amount: exp.amount,
          date: new Date(exp.date),
          color: '#e74c3c',
          icon: 'fa-wallet'
        }));
        activity = [...activity, ...mappedExpenses];
      }

      if (advanceRes.success && advanceRes.data) {
        tOutstanding = advanceRes.data.reduce((sum: number, adv: any) => {
          const remaining = adv.amountGiven - adv.amountReturned;
          return sum + (remaining > 0 ? remaining : 0);
        }, 0);

        // Map advance history to activity
        advanceRes.data.forEach((adv: any) => {
          if (adv.history && adv.history.length > 0) {
            adv.history.forEach((hist: any) => {
              activity.push({
                id: hist._id || Math.random().toString(),
                type: hist.type === 'GIVEN' ? 'MONEY GIVEN' : 'MONEY RETURNED',
                title: `${hist.type === 'GIVEN' ? 'Given to:' : 'Returned from:'} ${adv.personName}`,
                amount: hist.amount,
                date: new Date(hist.date),
                color: hist.type === 'GIVEN' ? '#f39c12' : '#2980b9',
                icon: 'fa-hand-holding-usd'
              });
            });
          }
        });
      }

      if (statsRes.success && statsRes.data) {
        tRevenue = statsRes.data.total?.revenue || 0;
      }

      // Sort activity by date descending
      activity.sort((a, b) => b.date.getTime() - a.date.getTime());

      setOverviewData({
        totalIncome: tIncome,
        totalExpenses: tExpenses,
        totalOutstandingLoans: tOutstanding,
        totalRevenue: tRevenue,
        netBalance: tIncome + tRevenue - tExpenses,
        recentActivity: activity.slice(0, 15) // Top 15 recent transactions
      });

    } catch (error) {
      console.error('Failed to load finance overview:', error);
      showAlert({ message: 'Failed to load overview data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewData();
    }
  }, [activeTab]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--bg-base)',
      zIndex: 1000,
      display: 'flex',
      animation: 'slideIn 0.3s ease'
    }}>
      {/* Sidebar */}
      <div style={{
        width: '260px',
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            background: 'var(--accent)',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            <i className="fas fa-landmark"></i>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Finance Center</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ledger & Accounts</div>
          </div>
        </div>

        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[
            { id: 'overview', label: 'Overview Dashboard', icon: 'fa-chart-pie' },
            { id: 'income', label: 'Capital Invested', icon: 'fa-piggy-bank' },
            { id: 'expenses', label: 'Expense Tracker', icon: 'fa-wallet' },
            { id: 'loans', label: 'Money Given Out', icon: 'fa-hand-holding-usd' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? 'var(--accent-muted)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                fontSize: '14px'
              }}
            >
              <i className={`fas ${tab.icon}`} style={{ width: '20px', textAlign: 'center' }}></i>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <i className="fas fa-arrow-left"></i> Back to Admin
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-surface)' }}>
        {/* Top Header for Context */}
        <div style={{
          padding: '20px 32px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {activeTab === 'overview' ? 'Overview Dashboard' :
             activeTab === 'income' ? 'Capital Invested' :
             activeTab === 'expenses' ? 'Expense Tracker' :
             activeTab === 'loans' ? 'Money Given Out' : activeTab}
          </h2>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Dynamic Content */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          
          {activeTab === 'overview' && (
            <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ marginBottom: '16px' }}></i>
                  <div>Analyzing financial data...</div>
                </div>
              ) : (
                <>
                  {/* Key Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                    
                    {/* Total Revenue */}
                    <div style={{
                      background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)', borderTop: '4px solid #3498db',
                      display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Revenue</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#3498db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatCurrency(overviewData.totalRevenue)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Business Revenue</div>
                    </div>

                    {/* Capital */}
                    <div style={{
                      background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)', borderTop: '4px solid #27ae60',
                      display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Capital Invested</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#27ae60', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatCurrency(overviewData.totalIncome)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Your invested funds</div>
                    </div>

                    {/* Net Balance */}
                    <div style={{
                      background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)', borderTop: '4px solid #8e44ad',
                      display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Net Balance</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: overviewData.netBalance >= 0 ? '#8e44ad' : '#e74c3c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatCurrency(overviewData.netBalance)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Revenue + Capital - Expenses</div>
                    </div>

                    {/* Total Expenses */}
                    <div style={{
                      background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)', borderTop: '4px solid #e74c3c',
                      display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Expenses</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#e74c3c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatCurrency(overviewData.totalExpenses)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Operational Costs</div>
                    </div>

                    {/* Outstanding Loans */}
                    <div style={{
                      background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)', borderTop: '4px solid #f39c12',
                      display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Money Given Out</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f39c12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatCurrency(overviewData.totalOutstandingLoans)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Not yet returned</div>
                    </div>
                  </div>

                  {/* Unified Activity Feed */}
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                        <i className="fas fa-list-ul" style={{ marginRight: '8px', color: 'var(--text-secondary)' }}></i>
                        Recent Financial Activity
                      </h3>
                    </div>
                    
                    {overviewData.recentActivity.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No recent activity found across accounts.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {overviewData.recentActivity.map((item, idx) => (
                          <div key={item.id + idx} style={{
                            padding: '16px 24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            borderBottom: idx < overviewData.recentActivity.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                          }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '50%',
                              background: `${item.color}20`, color: item.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                            }}>
                              <i className={`fas ${item.icon}`}></i>
                            </div>
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>{item.title}</span>
                                <span style={{
                                  fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                                  background: 'var(--bg-base)', border: `1px solid ${item.color}40`, color: item.color, fontWeight: 'bold'
                                }}>
                                  {item.type}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {item.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                            </div>

                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: item.color }}>
                              {item.type === 'EXPENSE' || item.type === 'MONEY GIVEN' ? '-' : '+'}{formatCurrency(item.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mount the sub-components depending on tab. We pass empty onClose because FinanceManager handles closing */}
          <div style={{ display: activeTab === 'income' ? 'block' : 'none', height: '100%' }}>
            <IncomeManager onClose={() => {}} />
          </div>
          <div style={{ display: activeTab === 'expenses' ? 'block' : 'none', height: '100%' }}>
            <ExpenseManager onClose={() => {}} />
          </div>
          <div style={{ display: activeTab === 'loans' ? 'block' : 'none', height: '100%' }}>
            <AdvanceManager onClose={() => {}} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default FinanceManager;
