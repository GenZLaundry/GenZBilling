import React, { useState, useEffect } from 'react';
import { ShopConfig, PendingBill, BillData } from './types';
import { printThermalBill } from './ThermalPrintManager';
import AddPreviousBill from './AddPreviousBill';
import AnalyticsDashboard from './AnalyticsDashboard';
import ExpenseManager from './ExpenseManager';
import BillManager from './BillManager';
import apiService from './api';
import { useAlert } from './GlobalAlert';

interface AdminDashboardProps {
  onBackToBilling: () => void;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToBilling, onLogout }) => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'pending' | 'history' | 'analytics' | 'expenses' | 'manage'>('dashboard');
  const [shopConfig, setShopConfig] = useState<ShopConfig>({
    shopName: 'GenZ Laundry',
    address: 'Sabji Mandi Circle,Ratanada, Jodhpur (342011)',
    contact: '+91 9256930727',
    gstNumber: ''
  });
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [billHistory, setBillHistory] = useState<PendingBill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPreviousBill, setShowAddPreviousBill] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showExpenseManager, setShowExpenseManager] = useState(false);
  const [showBillManager, setShowBillManager] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadShopConfig();
    loadPendingBills();
    loadBillHistory();
  }, []);

  const loadShopConfig = async () => {
    try {
      const response = await apiService.getShopConfig();
      if (response.success && response.data) {
        setShopConfig(response.data);
      }
    } catch (error) {
      console.error('Error loading shop config:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('laundry_shop_config');
      if (saved) {
        setShopConfig(JSON.parse(saved));
      }
    }
  };

  const saveShopConfig = async () => {
    try {
      setLoading(true);
      const response = await apiService.updateShopConfig(shopConfig);
      if (response.success) {
        // Also save to localStorage as backup
        localStorage.setItem('laundry_shop_config', JSON.stringify(shopConfig));
        showAlert({ message: 'Shop settings saved successfully!', type: 'success' });
      } else {
        showAlert({ message: 'Error saving shop settings: ' + response.message, type: 'error' });
      }
    } catch (error) {
      console.error('Error saving shop config:', error);
      // Fallback to localStorage
      localStorage.setItem('laundry_shop_config', JSON.stringify(shopConfig));
      showAlert({ message: 'Settings saved locally (database connection failed)', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingBills = async () => {
    try {
      console.log('🔄 Loading pending bills from database...');
      const response = await apiService.getPendingBills();
      console.log('📋 Pending bills response:', response);
      
      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} pending bills from database`);
        setPendingBills(response.data);
      } else {
        console.warn('⚠️ No pending bills data in response');
        setPendingBills([]);
      }
    } catch (error) {
      console.error('❌ Error loading pending bills from database:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('laundry_pending_bills');
      if (saved) {
        const localBills = JSON.parse(saved);
        console.log(`📱 Loaded ${localBills.length} pending bills from localStorage`);
        setPendingBills(localBills);
      } else {
        console.log('📭 No pending bills found in localStorage');
        setPendingBills([]);
      }
    }
  };

  const loadBillHistory = async () => {
    try {
      const response = await apiService.getBills({
        status: 'completed,delivered',
        limit: 100
      });
      if (response.success && response.data) {
        // Handle both array and paginated response
        const bills = Array.isArray(response.data) ? response.data : response.data.bills || response.data;
        setBillHistory(bills);
      }
    } catch (error) {
      console.error('Error loading bill history:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('laundry_bill_history');
      if (saved) {
        setBillHistory(JSON.parse(saved));
      }
    }
  };

  const savePendingBills = (bills: PendingBill[]) => {
    localStorage.setItem('laundry_pending_bills', JSON.stringify(bills));
    setPendingBills(bills);
  };

  const saveBillHistory = (bills: PendingBill[]) => {
    localStorage.setItem('laundry_bill_history', JSON.stringify(bills));
    setBillHistory(bills);
  };

  const markBillAsCompleted = async (billId: string) => {
    try {
      console.log('🔄 Marking bill as completed:', billId);
      const response = await apiService.updateBillStatus(billId, 'completed');
      console.log('📊 Update response:', response);
      
      if (response.success) {
        console.log('✅ Bill status updated successfully');
        loadPendingBills();
        loadBillHistory();
      } else {
        console.error('❌ API error:', response.message);
        showAlert({ message: 'Error updating bill status: ' + response.message, type: 'error' });
      }
    } catch (error) {
      console.error('❌ Error updating bill status:', error);
      // Fallback to localStorage logic
      const bill = pendingBills.find(b => (b.id || b._id) === billId);
      if (bill) {
        console.log('📱 Using localStorage fallback for bill:', bill.billNumber);
        const updatedBill = { ...bill, status: 'completed' as const };
        const remainingPending = pendingBills.filter(b => (b.id || b._id) !== billId);
        const updatedHistory = [...billHistory, updatedBill];
        
        savePendingBills(remainingPending);
        saveBillHistory(updatedHistory);
      } else {
        console.error('❌ Bill not found in pending bills:', billId);
        showAlert({ message: 'Error: Bill not found', type: 'error' });
      }
    }
  };

  const markBillAsDelivered = async (billId: string) => {
    try {
      console.log('🚚 Marking bill as delivered:', billId);
      const response = await apiService.updateBillStatus(billId, 'delivered');
      console.log('📊 Update response:', response);
      
      if (response.success) {
        console.log('✅ Bill status updated to delivered');
        loadPendingBills();
        loadBillHistory();
      } else {
        console.error('❌ API error:', response.message);
        showAlert({ message: 'Error updating bill status: ' + response.message, type: 'error' });
      }
    } catch (error) {
      console.error('❌ Error updating bill status:', error);
      // Fallback to localStorage logic
      const bill = pendingBills.find(b => (b.id || b._id) === billId) || billHistory.find(b => (b.id || b._id) === billId);
      if (bill) {
        console.log('📱 Using localStorage fallback for bill:', bill.billNumber);
        const updatedBill = { 
          ...bill, 
          status: 'delivered' as const, 
          deliveredAt: new Date().toISOString() 
        };
        
        const remainingPending = pendingBills.filter(b => (b.id || b._id) !== billId);
        const updatedHistory = billHistory.filter(b => (b.id || b._id) !== billId);
        updatedHistory.push(updatedBill);
        
        savePendingBills(remainingPending);
        saveBillHistory(updatedHistory);
      } else {
        console.error('❌ Bill not found:', billId);
        showAlert({ message: 'Error: Bill not found', type: 'error' });
      }
    }
  };

  const reprintBill = (bill: PendingBill) => {
    const billData: BillData = {
      businessName: shopConfig.shopName,
      address: shopConfig.address,
      phone: shopConfig.contact,
      billNumber: bill.billNumber,
      customerName: bill.customerName,
      items: bill.items,
      subtotal: bill.subtotal,
      discount: bill.discount,
      deliveryCharge: bill.deliveryCharge,
      grandTotal: bill.grandTotal,
      thankYouMessage: 'Thank you for choosing us!'
    };
    
    printThermalBill(billData, (message) => showAlert({ message, type: 'error' }));
  };

  const filteredPendingBills = pendingBills.filter(bill =>
    bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBillHistory = billHistory.filter(bill =>
    bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 25%, #3b82f6 50%, #6366f1 75%, #8b5cf6 100%)',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
      padding: '5px'
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)
        `,
        animation: 'float 8s ease-in-out infinite'
      }}></div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(0.5deg); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }
        .glass-button {
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-button:hover {
          background: rgba(255, 255, 255, 0.28);
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
        }
        .glass-button.active {
          background: rgba(255, 255, 255, 0.35);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          background-size: 200px 100%;
          animation: shimmer 2.5s infinite;
        }
        .tab-content {
          animation: slideIn 0.4s ease-out;
        }
      `}</style>

      {/* Header */}
      <div className="glass-card" style={{
        color: 'white', 
        padding: '8px 15px', 
        margin: '5px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        animation: 'fadeIn 0.8s ease-out',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            padding: '12px',
            borderRadius: '18px',
            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.25)',
            animation: 'pulse 3s infinite'
          }}>
            <img src="/logo.png" alt="Logo" style={{
              height: '35px', 
              width: '35px', 
              borderRadius: '10px',
              filter: 'brightness(1.1) contrast(1.1)'
            }} />
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '28px', 
              fontWeight: '800', 
              letterSpacing: '-1px',
              background: 'linear-gradient(135deg, #ffffff, #e0e7ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 15px rgba(0,0,0,0.1)'
            }}>
              Admin Dashboard
            </h1>
            <p style={{ 
              margin: '5px 0 0 0', 
              fontSize: '14px', 
              opacity: 0.95,
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.9)'
            }}>
              ✨ Manage your laundry business with modern tools
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="glass-card" style={{ 
            padding: '10px 15px', 
            textAlign: 'center',
            minWidth: '100px'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '3px' }}>Today's Date</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {new Date().toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
          </div>
          
          {onBackToBilling && (
            <button 
              onClick={onBackToBilling} 
              className="glass-button"
              style={{
                padding: '10px 20px', 
                borderRadius: '12px', 
                fontSize: '13px',
                color: 'white', 
                cursor: 'pointer',
                border: 'none',
                fontWeight: '600'
              }}
            >
              🏠 Back to Billing
            </button>
          )}
          
          {onLogout && (
            <button 
              onClick={onLogout} 
              className="glass-button"
              style={{
                padding: '10px 20px', 
                borderRadius: '12px', 
                fontSize: '13px',
                background: 'linear-gradient(135deg, #e74c3c, #c0392b)', 
                color: 'white', 
                cursor: 'pointer',
                border: 'none',
                fontWeight: '600'
              }}
            >
              🚪 Logout
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-card" style={{
        margin: '0 5px 8px 5px',
        padding: '10px',
        animation: 'slideIn 0.6s ease-out 0.2s both',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '6px'
        }}>
          {[
            { key: 'dashboard', label: '🏠 Dashboard', icon: '🏠', color: '#3498db', description: 'Overview & Stats' },
            { key: 'analytics', label: '📊 Analytics', icon: '📊', color: '#9b59b6', description: 'Business Reports' },
            { key: 'manage', label: '🛠️ Data Manager', icon: '🛠️', color: '#27ae60', description: 'Edit & Delete' },
            { key: 'expenses', label: '💸 Expenses', icon: '💸', color: '#e74c3c', description: 'Track Costs' },
            { key: 'pending', label: '📋 Pending', icon: '📋', color: '#f39c12', description: 'Active Bills' },
            { key: 'history', label: '📚 History', icon: '📚', color: '#1abc9c', description: 'Completed Bills' },
            { key: 'settings', label: '⚙️ Settings', icon: '⚙️', color: '#34495e', description: 'Store Config' }
          ].map((tab, index) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`glass-button ${activeTab === tab.key ? 'active' : ''}`}
              style={{
                padding: '10px',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? 'bold' : '600',
                textAlign: 'center',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
                animation: `slideIn 0.5s ease-out ${0.1 * index}s both`
              }}
            >
              <div style={{ 
                fontSize: '20px', 
                marginBottom: '4px',
                filter: activeTab === tab.key ? 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none'
              }}>
                {tab.icon}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                {tab.label.replace(/^[^\s]+ /, '')}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>
                {tab.description}
              </div>
              {activeTab === tab.key && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, ${tab.color}, ${tab.color}aa)`,
                  borderRadius: '0 0 15px 15px'
                }}></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass-card tab-content" style={{
        margin: '0 5px 8px 5px',
        padding: '15px',
        minHeight: '200px',
        position: 'relative',
        zIndex: 1
      }}>
        {activeTab === 'dashboard' && (
          <div style={{ animation: 'slideIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>🏠 Business Dashboard</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0 0', fontSize: '14px' }}>
                  Complete overview of your laundry business performance
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '15px', 
              marginBottom: '25px' 
            }}>
              {[
                { 
                  title: 'Total Revenue', 
                  value: `₹${(pendingBills.reduce((sum, bill) => sum + bill.grandTotal, 0) + billHistory.reduce((sum, bill) => sum + bill.grandTotal, 0)).toLocaleString()}`, 
                  icon: '💰', 
                  color: '#27ae60'
                },
                { 
                  title: 'Today Revenue', 
                  value: `₹${[...pendingBills, ...billHistory]
                    .filter(bill => new Date(bill.createdAt).toDateString() === new Date().toDateString())
                    .reduce((sum, bill) => sum + bill.grandTotal, 0).toLocaleString()}`, 
                  icon: '📈', 
                  color: '#3498db'
                },
                { 
                  title: 'Total Bills', 
                  value: (pendingBills.length + billHistory.length).toString(), 
                  icon: '🧾', 
                  color: '#9b59b6'
                },
                { 
                  title: 'Pending Bills', 
                  value: pendingBills.length.toString(), 
                  icon: '⏳', 
                  color: '#f39c12'
                },
                { 
                  title: 'Customers', 
                  value: new Set([...pendingBills, ...billHistory].map(bill => bill.customerName.toLowerCase())).size.toString(), 
                  icon: '👥', 
                  color: '#e74c3c'
                }
              ].map((stat, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(15px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    fontSize: '32px',
                    background: stat.color,
                    padding: '12px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    marginBottom: '12px',
                    boxShadow: `0 8px 20px ${stat.color}40`
                  }}>
                    {stat.icon}
                  </div>
                  <h3 style={{ 
                    color: 'white', 
                    margin: '0 0 8px 0', 
                    fontSize: '20px', 
                    fontWeight: 'bold'
                  }}>
                    {stat.value}
                  </h3>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    margin: 0, 
                    fontSize: '12px'
                  }}>
                    {stat.title}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
                ⚡ Quick Actions
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '12px' 
              }}>
                {[
                  { title: 'New Bill', icon: '🧾', color: '#3498db', action: onBackToBilling },
                  { title: 'Analytics', icon: '📊', color: '#9b59b6', action: () => setShowAnalytics(true) },
                  { title: 'Expenses', icon: '💸', color: '#e74c3c', action: () => setShowExpenseManager(true) },
                  { title: 'Edit Bills', icon: '✏️', color: '#27ae60', action: () => setShowBillManager(true) },
                  { title: 'Add Previous', icon: '📋', color: '#e67e22', action: () => setShowAddPreviousBill(true) },
                  { title: 'Test Print', icon: '🖨️', color: '#34495e', action: () => {
                    const testBill: BillData = {
                      businessName: shopConfig.shopName,
                      address: shopConfig.address,
                      phone: shopConfig.contact,
                      billNumber: 'TEST-' + Date.now(),
                      customerName: 'Test Customer',
                      items: [{ name: 'Test Item', quantity: 1, rate: 100, amount: 100 }],
                      subtotal: 100,
                      grandTotal: 100
                    };
                    printThermalBill(testBill);
                  }}
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(15px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '15px',
                      color: 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    <div style={{ 
                      fontSize: '24px', 
                      marginBottom: '8px',
                      background: action.color,
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px'
                    }}>
                      {action.icon}
                    </div>
                    {action.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
                📋 Recent Activity
              </h3>
              <div style={{ 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '15px', 
                padding: '20px' 
              }}>
                {[...pendingBills, ...billHistory]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((bill, index) => (
                    <div key={index} style={{
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      padding: '15px',
                      marginBottom: index < 4 ? '10px' : '0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '16px' }}>
                          Bill {bill.billNumber}
                        </h4>
                        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '14px' }}>
                          {bill.customerName} - ₹{bill.grandTotal}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          background: bill.status === 'completed' || bill.status === 'delivered' ? '#27ae60' : '#f39c12',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginBottom: '5px'
                        }}>
                          {bill.status.toUpperCase()}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                {[...pendingBills, ...billHistory].length === 0 && (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ animation: 'slideIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h2 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>📊 Analytics & Reports</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '2px 0 0 0', fontSize: '11px' }}>
                  Business insights and performance metrics
                </p>
              </div>
              <button
                onClick={() => setShowAnalytics(true)}
                className="glass-button"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: 'white',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3498db, #2980b9)'
                }}
              >
                📈 View Analytics
              </button>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              color: 'white', 
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ 
                fontSize: '30px', 
                marginBottom: '8px', 
                opacity: 0.8
              }}>📊</div>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                marginBottom: '6px',
                background: 'linear-gradient(135deg, #ffffff, #e8f4fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Income & Performance Analytics
              </h3>
              <p style={{ 
                opacity: 0.9, 
                marginBottom: '15px', 
                fontSize: '13px', 
                lineHeight: '1.4'
              }}>
                View detailed reports of daily, weekly, and monthly income.<br/>
                Track business performance, customer insights, and profit analysis.
              </p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '8px', 
                marginBottom: '15px'
              }}>
                {[
                  { icon: '💰', title: 'Revenue', desc: 'Daily/Monthly' },
                  { icon: '📈', title: 'Growth', desc: 'Trends' },
                  { icon: '👥', title: 'Customers', desc: 'Insights' },
                  { icon: '📊', title: 'Profit', desc: 'Analysis' }
                ].map((feature, index) => (
                  <div key={index} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '8px 4px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <div style={{ fontSize: '16px', marginBottom: '3px' }}>{feature.icon}</div>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '10px' }}>{feature.title}</div>
                    <div style={{ fontSize: '9px', opacity: 0.8 }}>{feature.desc}</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowAnalytics(true)}
                className="glass-button"
                style={{
                  background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                🚀 Open Analytics Dashboard
              </button>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div style={{ animation: 'slideIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h2 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>💸 Expense Management</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '2px 0 0 0', fontSize: '11px' }}>
                  Track and manage business expenses
                </p>
              </div>
              <button
                onClick={() => setShowExpenseManager(true)}
                className="glass-button"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: 'white',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #e74c3c, #c0392b)'
                }}
              >
                💰 Manage Expenses
              </button>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              color: 'white', 
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ 
                fontSize: '30px', 
                marginBottom: '8px', 
                opacity: 0.8
              }}>💸</div>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                marginBottom: '6px',
                background: 'linear-gradient(135deg, #ffffff, #fde8e8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Track Business Expenses
              </h3>
              <p style={{ 
                opacity: 0.9, 
                marginBottom: '15px', 
                fontSize: '13px', 
                lineHeight: '1.4'
              }}>
                Add and manage all business expenses including rent, utilities, supplies.<br/>
                Calculate profit by tracking income vs expenses.
              </p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '10px', 
                marginBottom: '15px'
              }}>
                {[
                  { icon: '🏠', title: 'Rent & Utilities', desc: 'Fixed costs', color: '#e74c3c' },
                  { icon: '📦', title: 'Supplies', desc: 'Materials', color: '#f39c12' },
                  { icon: '💰', title: 'Profit Analysis', desc: 'Income - Expenses', color: '#27ae60' }
                ].map((item, index) => (
                  <div key={index} style={{
                    background: `linear-gradient(135deg, ${item.color}20, ${item.color}10)`,
                    padding: '12px 8px',
                    borderRadius: '8px',
                    border: `1px solid ${item.color}30`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px', position: 'relative', zIndex: 1 }}>{item.icon}</div>
                    <div style={{ fontWeight: 'bold', marginBottom: '3px', fontSize: '11px', position: 'relative', zIndex: 1 }}>{item.title}</div>
                    <div style={{ fontSize: '10px', opacity: 0.8, position: 'relative', zIndex: 1 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowExpenseManager(true)}
                className="glass-button"
                style={{
                  background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                🚀 Open Expense Manager
              </button>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div style={{ animation: 'slideIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 'bold' }}>🛠️ Data Management</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '3px 0 0 0', fontSize: '12px' }}>
                  Edit and delete database records with full control
                </p>
              </div>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              color: 'white', 
              padding: '40px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ 
                fontSize: '80px', 
                marginBottom: '25px', 
                opacity: 0.8,
                animation: 'pulse 2s infinite'
              }}>🛠️</div>
              <h3 style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                marginBottom: '15px',
                background: 'linear-gradient(135deg, #ffffff, #f0e6ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Edit & Delete Database Records
              </h3>
              <p style={{ 
                opacity: 0.9, 
                marginBottom: '50px', 
                fontSize: '18px', 
                lineHeight: '1.6',
                maxWidth: '700px',
                margin: '0 auto 50px'
              }}>
                Manage bills and expenses with full edit/delete capabilities.<br/>
                All changes are automatically synchronized across the system.
              </p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                gap: '30px', 
                maxWidth: '1000px', 
                margin: '0 auto 50px'
              }}>
                {/* Bill Management */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(52, 152, 219, 0.1))',
                  borderRadius: '25px',
                  padding: '40px 35px',
                  border: '2px solid rgba(52, 152, 219, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: 'slideIn 0.5s ease-out 0.1s both'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-30px',
                    width: '120px',
                    height: '120px',
                    background: 'rgba(52, 152, 219, 0.1)',
                    borderRadius: '50%'
                  }}></div>
                  <div style={{ fontSize: '60px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>🧾</div>
                  <h4 style={{ color: '#3498db', margin: '0 0 20px 0', fontSize: '24px', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                    Bill Management
                  </h4>
                  <p style={{ opacity: 0.9, marginBottom: '25px', fontSize: '16px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                    Edit customer details, amounts, discounts, delivery charges, and bill status.
                    Delete bills created by mistake.
                  </p>
                  <div style={{ textAlign: 'left', marginBottom: '30px', position: 'relative', zIndex: 1 }}>
                    {[
                      '✏️ Edit customer information',
                      '💰 Modify amounts and charges',
                      '📊 Change bill status',
                      '🗑️ Delete incorrect bills',
                      '🔍 Search and filter bills'
                    ].map((feature, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px',
                        fontSize: '14px',
                        opacity: 0.9,
                        animation: `slideIn 0.3s ease-out ${0.1 * index}s both`
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          background: '#3498db',
                          borderRadius: '50%',
                          marginRight: '12px'
                        }}></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowBillManager(true)}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #3498db, #2980b9)',
                      border: 'none',
                      borderRadius: '15px',
                      padding: '15px 30px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      width: '100%',
                      boxShadow: '0 10px 25px rgba(52, 152, 219, 0.3)',
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    🚀 Manage Bills
                  </button>
                </div>

                {/* Expense Management */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.2), rgba(231, 76, 60, 0.1))',
                  borderRadius: '25px',
                  padding: '40px 35px',
                  border: '2px solid rgba(231, 76, 60, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: 'slideIn 0.5s ease-out 0.2s both'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-30px',
                    width: '120px',
                    height: '120px',
                    background: 'rgba(231, 76, 60, 0.1)',
                    borderRadius: '50%'
                  }}></div>
                  <div style={{ fontSize: '60px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>💸</div>
                  <h4 style={{ color: '#e74c3c', margin: '0 0 20px 0', fontSize: '24px', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                    Expense Management
                  </h4>
                  <p style={{ opacity: 0.9, marginBottom: '25px', fontSize: '16px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                    Edit expense details, amounts, categories, and dates.
                    Delete expenses added by mistake.
                  </p>
                  <div style={{ textAlign: 'left', marginBottom: '30px', position: 'relative', zIndex: 1 }}>
                    {[
                      '✏️ Edit expense details',
                      '💰 Modify amounts and categories',
                      '📅 Change expense dates',
                      '🗑️ Delete incorrect expenses',
                      '📊 Filter by category'
                    ].map((feature, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px',
                        fontSize: '14px',
                        opacity: 0.9,
                        animation: `slideIn 0.3s ease-out ${0.1 * index}s both`
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          background: '#e74c3c',
                          borderRadius: '50%',
                          marginRight: '12px'
                        }}></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowExpenseManager(true)}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                      border: 'none',
                      borderRadius: '15px',
                      padding: '15px 30px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      width: '100%',
                      boxShadow: '0 10px 25px rgba(231, 76, 60, 0.3)',
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    🚀 Manage Expenses
                  </button>
                </div>
              </div>

              {/* Important Notes */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.15), rgba(243, 156, 18, 0.05))',
                borderRadius: '20px',
                padding: '30px',
                maxWidth: '800px',
                margin: '0 auto',
                border: '2px solid rgba(243, 156, 18, 0.2)',
                animation: 'slideIn 0.5s ease-out 0.3s both'
              }}>
                <h4 style={{ color: '#f39c12', margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>
                  ⚠️ Important Safety Notes
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', textAlign: 'left' }}>
                  {[
                    '🔄 All changes are automatically synchronized',
                    '📊 Analytics update in real-time',
                    '💾 Saved to database and local storage',
                    '🚨 Deleted records cannot be recovered',
                    '✅ Edit operations are safer than deletes'
                  ].map((note, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '14px',
                      opacity: 0.9,
                      animation: `slideIn 0.3s ease-out ${0.1 * index}s both`
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: '#f39c12',
                        borderRadius: '50%',
                        marginRight: '12px'
                      }}></div>
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 style={{ color: 'white', marginBottom: '12px', fontSize: '18px' }}>🏪 Store Configuration</h2>
            <div style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                  Store Name
                </label>
                <input
                  type="text"
                  value={shopConfig.shopName}
                  onChange={(e) => setShopConfig({...shopConfig, shopName: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                  Address
                </label>
                <textarea
                  value={shopConfig.address}
                  onChange={(e) => setShopConfig({...shopConfig, address: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '16px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                  Contact Number
                </label>
                <input
                  type="text"
                  value={shopConfig.contact}
                  onChange={(e) => setShopConfig({...shopConfig, contact: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                  GST Number (Optional)
                </label>
                <input
                  type="text"
                  value={shopConfig.gstNumber || ''}
                  onChange={(e) => setShopConfig({...shopConfig, gstNumber: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <button
                onClick={saveShopConfig}
                disabled={loading}
                style={{
                  background: loading ? 'rgba(189, 195, 199, 0.5)' : 'linear-gradient(45deg, #4CAF50, #45a049)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '15px 30px',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginTop: '20px'
                }}
              >
                {loading ? '💾 Saving...' : '💾 Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ color: 'white', margin: 0, fontSize: '18px' }}>📋 Pending Bills ({pendingBills.length})</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={loadPendingBills}
                  style={{
                    background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => setShowAddPreviousBill(true)}
                  style={{
                    background: 'linear-gradient(135deg, #3498db, #2980b9)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  ➕ Add Previous Bill
                </button>
                <input
                  type="text"
                  placeholder="Search by customer name or bill number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)',
                    width: '300px'
                  }}
                />
              </div>
            </div>
            
            {filteredPendingBills.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'white', padding: '50px' }}>
                <h3>No pending bills found</h3>
                <p>All bills are completed or no bills match your search.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {filteredPendingBills.map(bill => (
                  <div key={bill.id} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ color: 'white' }}>
                      <h4 style={{ margin: '0 0 3px 0', fontSize: '14px' }}>{bill.customerName}</h4>
                      <p style={{ margin: '0 0 2px 0', opacity: 0.8, fontSize: '11px' }}>Bill: {bill.billNumber}</p>
                      <p style={{ margin: '0 0 2px 0', opacity: 0.8, fontSize: '11px' }}>
                        Items: {bill.items.length} | Total: ₹{bill.grandTotal}
                      </p>
                      <p style={{ margin: 0, opacity: 0.6, fontSize: '10px' }}>
                        Created: {new Date(bill.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => reprintBill(bill)}
                        style={{
                          background: 'rgba(0, 123, 255, 0.8)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 15px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🖨️ Reprint
                      </button>
                      <button
                        onClick={() => markBillAsCompleted(bill.id || bill._id)}
                        style={{
                          background: 'rgba(40, 167, 69, 0.8)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 15px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✅ Complete
                      </button>
                      <button
                        onClick={() => markBillAsDelivered(bill.id || bill._id)}
                        style={{
                          background: 'rgba(255, 193, 7, 0.8)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 15px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🚚 Deliver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: 'white', margin: 0 }}>📊 Bill History ({billHistory.length})</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={loadBillHistory}
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 15px',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? '⏳' : '🔄'} Refresh
                </button>
                <button
                  onClick={() => {
                    const localData = localStorage.getItem('laundry_bill_history');
                    const count = localData ? JSON.parse(localData).length : 0;
                    showAlert({ message: `localStorage has ${count} bills`, type: 'info' });
                    console.log('📚 localStorage bill history:', localData ? JSON.parse(localData) : 'No data');
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #3498db, #2980b9)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 15px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  🔍 Debug
                </button>
                <input
                  type="text"
                  placeholder="Search by customer name or bill number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)',
                    width: '300px'
                  }}
                />
              </div>
            </div>
            
            {filteredBillHistory.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'white', padding: '50px' }}>
                <h3>No bill history found</h3>
                <p>No completed bills or no bills match your search.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {filteredBillHistory.map(bill => (
                  <div key={bill.id} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ color: 'white' }}>
                      <h4 style={{ margin: '0 0 5px 0' }}>{bill.customerName}</h4>
                      <p style={{ margin: '0 0 5px 0', opacity: 0.8 }}>Bill: {bill.billNumber}</p>
                      <p style={{ margin: '0 0 5px 0', opacity: 0.8 }}>
                        Items: {bill.items.length} | Total: ₹{bill.grandTotal}
                      </p>
                      <p style={{ margin: 0, opacity: 0.6, fontSize: '12px' }}>
                        Status: <span style={{ 
                          background: bill.status === 'delivered' ? '#28a745' : '#ffc107',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          color: 'white',
                          fontSize: '11px'
                        }}>
                          {bill.status.toUpperCase()}
                        </span>
                      </p>
                      {bill.deliveredAt && (
                        <p style={{ margin: 0, opacity: 0.6, fontSize: '12px' }}>
                          Delivered: {new Date(bill.deliveredAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => reprintBill(bill)}
                        style={{
                          background: 'rgba(0, 123, 255, 0.8)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 15px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🖨️ Reprint
                      </button>
                      {bill.status !== 'delivered' && (
                        <button
                          onClick={() => markBillAsDelivered(bill.id || bill._id)}
                          style={{
                            background: 'rgba(255, 193, 7, 0.8)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 15px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🚚 Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analytics Modal */}
      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}

      {/* Expense Manager Modal */}
      {showExpenseManager && (
        <ExpenseManager onClose={() => setShowExpenseManager(false)} />
      )}

      {/* Bill Manager Modal */}
      {showBillManager && (
        <BillManager onClose={() => {
          setShowBillManager(false);
          // Refresh pending bills and bill history after closing BillManager
          loadPendingBills();
          loadBillHistory();
        }} />
      )}

      {/* Add Previous Bill Modal */}
      {showAddPreviousBill && (
        <AddPreviousBill
          onClose={() => setShowAddPreviousBill(false)}
          onBillAdded={() => {
            loadPendingBills();
            setActiveTab('pending');
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;