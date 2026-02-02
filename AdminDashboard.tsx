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
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('testing');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showDataImport, setShowDataImport] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [showCustomerManager, setShowCustomerManager] = useState(false);
  const [showReportsGenerator, setShowReportsGenerator] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadShopConfig();
    loadPendingBills();
    loadBillHistory();
    testDatabaseConnection();
  }, []);

  // Update notifications when bill data changes
  useEffect(() => {
    loadNotifications();
  }, [pendingBills, billHistory]);

  // Load real business notifications
  const loadNotifications = () => {
    const today = new Date().toDateString();
    
    // Calculate metrics
    const totalPendingBills = pendingBills.length;
    const todayDeliveredBills = billHistory.filter(bill => 
      bill.status === 'delivered' && 
      new Date(bill.deliveredAt || bill.updatedAt || bill.createdAt).toDateString() === today
    ).length;
    const todayCompletedBills = billHistory.filter(bill => 
      bill.status === 'completed' && 
      new Date(bill.createdAt).toDateString() === today
    ).length;
    
    const businessNotifications = [];
    
    // Pending bills notification
    if (totalPendingBills > 0) {
      businessNotifications.push({
        id: 1,
        type: totalPendingBills > 5 ? 'warning' : 'info',
        message: `${totalPendingBills} bills pending (all days)`,
        time: new Date(),
        count: totalPendingBills
      });
    }
    
    // Today's delivered bills
    if (todayDeliveredBills > 0) {
      businessNotifications.push({
        id: 2,
        type: 'success',
        message: `${todayDeliveredBills} bills delivered today`,
        time: new Date(),
        count: todayDeliveredBills
      });
    }
    
    // Today's completed bills
    if (todayCompletedBills > 0) {
      businessNotifications.push({
        id: 3,
        type: 'info',
        message: `${todayCompletedBills} bills completed today`,
        time: new Date(),
        count: todayCompletedBills
      });
    }
    
    // If no activity, show a default message
    if (businessNotifications.length === 0) {
      businessNotifications.push({
        id: 4,
        type: 'info',
        message: 'No pending bills or today\'s activity',
        time: new Date(),
        count: 0
      });
    }
    
    setNotifications(businessNotifications);
  };

  // Load data on component mount
  useEffect(() => {
    loadShopConfig();
    loadPendingBills();
    loadBillHistory();
    testDatabaseConnection();
  }, []);

  // Test database connection and log results
  const testDatabaseConnection = async () => {
    try {
      setConnectionStatus('testing');
      console.log('🔍 Testing database connection...');
      const response = await apiService.testConnection();
      console.log('✅ Database connection successful:', response);
      setConnectionStatus('connected');
      showAlert({ message: 'Database connected successfully!', type: 'success' });
      
      // Load dashboard analytics data
      loadDashboardAnalytics();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      setConnectionStatus('disconnected');
      showAlert({ message: 'Database connection failed - using local storage', type: 'warning' });
    }
  };

  // Auto-refresh dashboard data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected' && activeTab === 'dashboard') {
        loadDashboardAnalytics();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [connectionStatus, activeTab]);

  // Bulk operations for bills
  const bulkMarkAsCompleted = async (billIds: string[]) => {
    try {
      setLoading(true);
      for (const billId of billIds) {
        await markBillAsCompleted(billId);
      }
      showAlert({ message: `${billIds.length} bills marked as completed`, type: 'success' });
    } catch (error) {
      showAlert({ message: 'Error in bulk operation', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const bulkMarkAsDelivered = async (billIds: string[]) => {
    try {
      setLoading(true);
      for (const billId of billIds) {
        await markBillAsDelivered(billId);
      }
      showAlert({ message: `${billIds.length} bills marked as delivered`, type: 'success' });
    } catch (error) {
      showAlert({ message: 'Error in bulk delivery operation', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: 'bills' | 'expenses') => {
    try {
      setLoading(true);
      let data;
      if (type === 'bills') {
        data = [...pendingBills, ...billHistory];
      } else {
        const response = await apiService.getExpenses({ limit: 1000 });
        data = response.success ? response.data : [];
      }
      
      const csvContent = convertToCSV(data, type);
      downloadCSV(csvContent, `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
      showAlert({ message: `${type} data exported successfully`, type: 'success' });
    } catch (error) {
      showAlert({ message: 'Export failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const convertToCSV = (data: any[], type: string) => {
    if (data.length === 0) return '';
    
    const headers = type === 'bills' 
      ? ['Bill Number', 'Customer Name', 'Phone', 'Amount', 'Status', 'Date']
      : ['Description', 'Amount', 'Category', 'Date'];
    
    const rows = data.map(item => {
      if (type === 'bills') {
        return [
          item.billNumber,
          item.customerName,
          item.customerPhone || '',
          item.grandTotal,
          item.status,
          new Date(item.createdAt).toLocaleDateString()
        ];
      } else {
        return [
          item.description,
          item.amount,
          item.category,
          new Date(item.date).toLocaleDateString()
        ];
      }
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Advanced Data Management Functions
  const backupAllData = async () => {
    try {
      setLoading(true);
      const backupData = {
        bills: [...pendingBills, ...billHistory],
        shopConfig,
        expenses: [], // Will be loaded from API
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      // Try to get expenses from API
      try {
        const expenseResponse = await apiService.getExpenses({ limit: 1000 });
        if (expenseResponse.success) {
          backupData.expenses = expenseResponse.data;
        }
      } catch (error) {
        console.warn('Could not load expenses for backup');
      }

      const backupJson = JSON.stringify(backupData, null, 2);
      const filename = `genz_laundry_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      // Save backup date
      localStorage.setItem('last_backup_date', new Date().toISOString());
      
      showAlert({ message: 'Data backup created successfully!', type: 'success' });
    } catch (error) {
      showAlert({ message: 'Backup failed: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const restoreFromBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string);
        
        showConfirm(
          `Restore data from backup? This will replace all current data. Backup contains ${backupData.bills?.length || 0} bills.`,
          async () => {
            try {
              setLoading(true);
              
              // Restore bills
              if (backupData.bills) {
                setBillHistory(backupData.bills);
                localStorage.setItem('laundry_bill_history', JSON.stringify(backupData.bills));
              }
              
              // Restore shop config
              if (backupData.shopConfig) {
                setShopConfig(backupData.shopConfig);
                localStorage.setItem('laundry_shop_config', JSON.stringify(backupData.shopConfig));
              }

              showAlert({ message: 'Data restored successfully!', type: 'success' });
              loadBillHistory();
              loadPendingBills();
            } catch (error) {
              showAlert({ message: 'Restore failed: ' + error.message, type: 'error' });
            } finally {
              setLoading(false);
            }
          }
        );
      } catch (error) {
        showAlert({ message: 'Invalid backup file format', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const generateCustomReport = async (reportType: string, dateRange: { start: string, end: string }) => {
    try {
      setLoading(true);
      const allBills = [...pendingBills, ...billHistory];
      
      const filteredBills = allBills.filter(bill => {
        const billDate = new Date(bill.createdAt);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return billDate >= startDate && billDate <= endDate;
      });

      let reportData = '';
      const filename = `${reportType}_report_${dateRange.start}_to_${dateRange.end}.csv`;

      switch (reportType) {
        case 'sales':
          reportData = generateSalesReport(filteredBills);
          break;
        case 'customer':
          reportData = generateCustomerReport(filteredBills);
          break;
        case 'items':
          reportData = generateItemsReport(filteredBills);
          break;
        default:
          reportData = convertToCSV(filteredBills, 'bills');
      }

      downloadCSV(reportData, filename);
      showAlert({ message: `${reportType} report generated successfully!`, type: 'success' });
    } catch (error) {
      showAlert({ message: 'Report generation failed: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const generateSalesReport = (bills: any[]) => {
    const headers = ['Date', 'Bills Count', 'Total Revenue', 'Average Bill', 'Status Breakdown'];
    const dailyData = bills.reduce((acc: any, bill) => {
      const date = new Date(bill.createdAt).toDateString();
      if (!acc[date]) {
        acc[date] = { count: 0, revenue: 0, statuses: {} };
      }
      acc[date].count++;
      acc[date].revenue += bill.grandTotal;
      acc[date].statuses[bill.status] = (acc[date].statuses[bill.status] || 0) + 1;
      return acc;
    }, {});

    const rows = Object.entries(dailyData).map(([date, data]: [string, any]) => [
      date,
      data.count,
      data.revenue,
      Math.round(data.revenue / data.count),
      Object.entries(data.statuses).map(([status, count]) => `${status}:${count}`).join(';')
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateCustomerReport = (bills: any[]) => {
    const headers = ['Customer Name', 'Phone', 'Total Bills', 'Total Spent', 'Average Bill', 'Last Visit'];
    const customerData = bills.reduce((acc: any, bill) => {
      const key = bill.customerName;
      if (!acc[key]) {
        acc[key] = { 
          phone: bill.customerPhone || 'N/A', 
          count: 0, 
          total: 0, 
          lastVisit: bill.createdAt 
        };
      }
      acc[key].count++;
      acc[key].total += bill.grandTotal;
      if (new Date(bill.createdAt) > new Date(acc[key].lastVisit)) {
        acc[key].lastVisit = bill.createdAt;
      }
      return acc;
    }, {});

    const rows = Object.entries(customerData).map(([name, data]: [string, any]) => [
      name,
      data.phone,
      data.count,
      data.total,
      Math.round(data.total / data.count),
      new Date(data.lastVisit).toLocaleDateString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateItemsReport = (bills: any[]) => {
    const headers = ['Item Name', 'Total Quantity', 'Total Revenue', 'Average Price', 'Frequency'];
    const itemData = bills.reduce((acc: any, bill) => {
      bill.items.forEach((item: any) => {
        if (!acc[item.name]) {
          acc[item.name] = { quantity: 0, revenue: 0, frequency: 0 };
        }
        acc[item.name].quantity += item.quantity;
        acc[item.name].revenue += item.amount;
        acc[item.name].frequency++;
      });
      return acc;
    }, {});

    const rows = Object.entries(itemData).map(([name, data]: [string, any]) => [
      name,
      data.quantity,
      data.revenue,
      Math.round(data.revenue / data.quantity),
      data.frequency
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // Load dashboard analytics from MongoDB
  const loadDashboardAnalytics = async () => {
    try {
      console.log('📊 Loading dashboard analytics...');
      const response = await apiService.getDashboardOverview();
      console.log('📈 Dashboard analytics response:', response);
      
      if (response.success && response.data) {
        setDashboardData(response.data);
        console.log('✅ Dashboard analytics loaded successfully');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard analytics:', error);
    }
  };

  // Load comprehensive analytics data
  const loadAnalyticsData = async () => {
    try {
      console.log('📊 Loading comprehensive analytics...');
      const response = await apiService.getAnalyticsData('month');
      console.log('📈 Analytics response:', response);
      
      if (response.success && response.data) {
        setAnalyticsData(response.data);
        console.log('✅ Analytics data loaded successfully');
      }
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
    }
  };

  // Comprehensive MongoDB integration test
  const testAllEndpoints = async () => {
    try {
      setLoading(true);
      console.log('🧪 Starting comprehensive MongoDB integration test...');
      
      const tests = [
        { name: 'Health Check', test: () => apiService.healthCheck() },
        { name: 'Dashboard Overview', test: () => apiService.getDashboardOverview() },
        { name: 'Business Reports', test: () => apiService.getBusinessReports() },
        { name: 'Stats', test: () => apiService.getStats() },
        { name: 'Revenue Chart', test: () => apiService.getRevenueChart() },
        { name: 'All Bills', test: () => apiService.getBills({ limit: 5 }) },
        { name: 'Pending Bills', test: () => apiService.getPendingBills() },
        { name: 'Completed Bills', test: () => apiService.getCompletedBills({ limit: 5 }) },
        { name: 'Expenses', test: () => apiService.getExpenses({ limit: 5 }) },
        { name: 'Expense Summary', test: () => apiService.getExpenseSummary() },
        { name: 'Shop Config', test: () => apiService.getShopConfig() }
      ];

      const results = [];
      for (const { name, test } of tests) {
        try {
          console.log(`🔍 Testing ${name}...`);
          const result = await test();
          console.log(`✅ ${name}: SUCCESS`, result);
          results.push({ name, status: 'SUCCESS', data: result });
        } catch (error) {
          console.error(`❌ ${name}: FAILED`, error);
          results.push({ name, status: 'FAILED', error: error.message });
        }
      }

      const successCount = results.filter(r => r.status === 'SUCCESS').length;
      const totalCount = results.length;
      
      console.log(`🎯 Test Results: ${successCount}/${totalCount} endpoints working`);
      console.table(results.map(r => ({ 
        Endpoint: r.name, 
        Status: r.status, 
        Error: r.error || 'None' 
      })));

      showAlert({ 
        message: `MongoDB Integration Test: ${successCount}/${totalCount} endpoints working`, 
        type: successCount === totalCount ? 'success' : 'warning' 
      });

      // If dashboard overview worked, update the dashboard data
      const dashboardResult = results.find(r => r.name === 'Dashboard Overview');
      if (dashboardResult?.status === 'SUCCESS' && dashboardResult.data?.success) {
        setDashboardData(dashboardResult.data.data);
      }

    } catch (error) {
      console.error('❌ Comprehensive test failed:', error);
      showAlert({ message: 'Test failed: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
      console.log('📚 Loading ALL bills for history...');
      // Load ALL bills, not just completed/delivered
      const response = await apiService.getBills({
        limit: 1000, // Get more bills
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length || 0} bills from database`);
        // Handle both array and paginated response
        const bills = Array.isArray(response.data) ? response.data : response.data.bills || response.data;
        setBillHistory(bills);
        
        // Also save to localStorage as backup
        localStorage.setItem('laundry_bill_history', JSON.stringify(bills));
      } else {
        console.warn('⚠️ No bills data in response, trying localStorage');
        throw new Error('No data from API');
      }
    } catch (error) {
      console.error('❌ Error loading bills from database:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('laundry_bill_history');
      if (saved) {
        const localBills = JSON.parse(saved);
        console.log(`📱 Loaded ${localBills.length} bills from localStorage`);
        setBillHistory(localBills);
      } else {
        console.log('📭 No bills found in localStorage either');
        setBillHistory([]);
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

  const filteredBillHistory = billHistory.filter(bill => {
    const matchesSearch = bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.customerPhone && bill.customerPhone.includes(searchTerm));
    
    const matchesStatus = statusFilter === '' || bill.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

      {/* Enhanced Header */}
      <div className="glass-card" style={{
        color: 'white', 
        padding: '12px 20px', 
        margin: '5px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        animation: 'fadeIn 0.8s ease-out',
        position: 'relative',
        zIndex: 1,
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            padding: '15px',
            borderRadius: '20px',
            boxShadow: '0 12px 30px rgba(245, 158, 11, 0.3)',
            animation: 'pulse 3s infinite',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 2s infinite'
            }}></div>
            <img src="/logo.png" alt="Logo" style={{
              height: '40px', 
              width: '40px', 
              borderRadius: '12px',
              filter: 'brightness(1.1) contrast(1.1)',
              position: 'relative',
              zIndex: 1
            }} />
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '32px', 
              fontWeight: '900', 
              letterSpacing: '-1.5px',
              background: 'linear-gradient(135deg, #ffffff, #e0e7ff, #c7d2fe)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 20px rgba(0,0,0,0.15)',
              position: 'relative'
            }}>
              Admin Dashboard
              <div style={{
                position: 'absolute',
                bottom: '-5px',
                left: 0,
                width: '100%',
                height: '3px',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                borderRadius: '2px',
                animation: 'shimmer 3s infinite'
              }}></div>
            </h1>
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '16px', 
              opacity: 0.95,
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ✨ Manage your laundry business with modern tools
              <span style={{
                background: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'disconnected' ? '#ef4444' : '#f59e0b',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                animation: connectionStatus === 'testing' ? 'pulse 1s infinite' : 'none'
              }}>
                {connectionStatus === 'connected' ? '🟢 ONLINE' : connectionStatus === 'disconnected' ? '🔴 OFFLINE' : '🟡 TESTING'}
              </span>
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Digital Watch Style Clock */}
          <div style={{ 
            background: 'linear-gradient(145deg, #2c3e50, #34495e)',
            border: '3px solid #1a252f',
            borderRadius: '15px',
            padding: '12px 16px',
            textAlign: 'center',
            minWidth: '160px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Digital Watch Screen Effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(0, 255, 0, 0.05), rgba(0, 200, 0, 0.02))',
              borderRadius: '12px'
            }}></div>
            
            {/* Day Display */}
            <div style={{ 
              fontSize: '11px', 
              color: '#00ff41', 
              marginBottom: '3px', 
              fontWeight: '600',
              fontFamily: 'monospace',
              textShadow: '0 0 8px rgba(0, 255, 65, 0.6)',
              position: 'relative',
              zIndex: 1
            }}>
              {currentTime.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}
            </div>
            
            {/* Date Display */}
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              marginBottom: '4px',
              color: '#ffffff',
              fontFamily: 'monospace',
              textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
              position: 'relative',
              zIndex: 1
            }}>
              {currentTime.toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
            
            {/* Time Display - Digital Watch Style */}
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: '#00ff41',
              fontFamily: 'monospace',
              textShadow: '0 0 15px rgba(0, 255, 65, 0.8)',
              letterSpacing: '1px',
              position: 'relative',
              zIndex: 1,
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(0, 255, 65, 0.3)'
            }}>
              {currentTime.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </div>
            
            {/* Digital Watch Brand Label */}
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '6px',
              fontSize: '8px',
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}>
              GENZ
            </div>
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="glass-button"
              style={{
                padding: '12px', 
                borderRadius: '12px', 
                fontSize: '16px',
                color: 'white', 
                cursor: 'pointer',
                border: 'none',
                fontWeight: '600',
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.15)',
                zIndex: 10000
              }}
            >
              🔔
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
          
          {onBackToBilling && (
            <button 
              onClick={onBackToBilling} 
              className="glass-button"
              style={{
                padding: '12px 24px', 
                borderRadius: '12px', 
                fontSize: '14px',
                color: 'white', 
                cursor: 'pointer',
                border: 'none',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
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
                padding: '12px 24px', 
                borderRadius: '12px', 
                fontSize: '14px',
                background: 'linear-gradient(135deg, #e74c3c, #c0392b)', 
                color: 'white', 
                cursor: 'pointer',
                border: 'none',
                fontWeight: '600',
                boxShadow: '0 8px 20px rgba(231, 76, 60, 0.3)'
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div>
                <h2 style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: 'bold' }}>🏠 Business Dashboard</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 0 0', fontSize: '16px' }}>
                  Complete overview of your laundry business performance
                  {dashboardData && <span style={{ color: '#27ae60', fontWeight: 'bold' }}> • Connected to Database</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={loadDashboardAnalytics}
                  disabled={loading}
                  className="glass-button"
                  style={{
                    background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 6px 15px rgba(39, 174, 96, 0.3)'
                  }}
                >
                  {loading ? '⏳' : '🔄'} Refresh Analytics
                </button>
                <button
                  onClick={() => exportData('bills')}
                  disabled={loading}
                  className="glass-button"
                  style={{
                    background: 'linear-gradient(135deg, #3498db, #2980b9)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 6px 15px rgba(52, 152, 219, 0.3)'
                  }}
                >
                  {loading ? '⏳' : '📊'} Export Bills
                </button>
                <button
                  onClick={testAllEndpoints}
                  disabled={loading}
                  className="glass-button"
                  style={{
                    background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 6px 15px rgba(155, 89, 182, 0.3)'
                  }}
                >
                  {loading ? '⏳' : '🧪'} Test All
                </button>
              </div>
            </div>
            
            {/* Enhanced Quick Stats - Smaller Size */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '15px', 
              marginBottom: '30px' 
            }}>
              {[
                { 
                  title: 'Total Revenue', 
                  value: dashboardData?.month?.revenue 
                    ? `₹${dashboardData.month.revenue.toLocaleString()}` 
                    : `₹${(pendingBills.reduce((sum, bill) => sum + bill.grandTotal, 0) + billHistory.reduce((sum, bill) => sum + bill.grandTotal, 0)).toLocaleString()}`, 
                  icon: '💰', 
                  color: '#02bc71ff',
                  subtitle: dashboardData ? 'This Month (DB)' : 'Local Data',
                  trend: '+12%',
                  trendColor: '#05db94ff'
                },
                { 
                  title: 'Today Revenue', 
                  value: dashboardData?.today?.revenue 
                    ? `₹${dashboardData.today.revenue.toLocaleString()}` 
                    : `₹${[...pendingBills, ...billHistory]
                      .filter(bill => new Date(bill.createdAt).toDateString() === new Date().toDateString())
                      .reduce((sum, bill) => sum + bill.grandTotal, 0).toLocaleString()}`, 
                  icon: '📈', 
                  color: '#3498db',
                  subtitle: dashboardData ? 'From Database' : 'Local Data',
                  trend: '+8%',
                  trendColor: '#3498db'
                },
                { 
                  title: 'Total Bills', 
                  value: dashboardData?.month?.bills 
                    ? dashboardData.month.bills.toString() 
                    : (pendingBills.length + billHistory.length).toString(), 
                  icon: '🧾', 
                  color: '#9b59b6',
                  subtitle: dashboardData ? 'This Month (DB)' : 'Local Data',
                  trend: '+15%',
                  trendColor: '#9b59b6'
                },
                { 
                  title: 'Pending Bills', 
                  value: dashboardData?.pendingBills !== undefined 
                    ? dashboardData.pendingBills.toString() 
                    : pendingBills.length.toString(), 
                  icon: '⏳', 
                  color: '#f39c12',
                  subtitle: dashboardData ? 'From Database' : 'Local Data',
                  trend: pendingBills.length > 5 ? 'HIGH' : 'NORMAL',
                  trendColor: pendingBills.length > 5 ? '#e74c3c' : '#27ae60'
                },
                { 
                  title: 'Today Profit', 
                  value: dashboardData?.today?.profit !== undefined 
                    ? `₹${dashboardData.today.profit.toLocaleString()}` 
                    : 'N/A', 
                  icon: '💎', 
                  color: '#e74c3c',
                  subtitle: dashboardData ? 'Revenue - Expenses' : 'Connect DB',
                  trend: '+5%',
                  trendColor: '#27ae60'
                }
              ].map((stat, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '18px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: `slideIn 0.5s ease-out ${index * 0.1}s both`,
                  minHeight: '140px'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-30%',
                    right: '-30%',
                    width: '80%',
                    height: '80%',
                    background: `radial-gradient(circle, ${stat.color}15 0%, transparent 70%)`,
                    pointerEvents: 'none'
                  }}></div>
                  <div style={{ 
                    fontSize: '28px',
                    background: `linear-gradient(135deg, ${stat.color}, ${stat.color}dd)`,
                    padding: '10px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    marginBottom: '12px',
                    boxShadow: `0 6px 15px ${stat.color}30`,
                    position: 'relative',
                    zIndex: 1
                  }}>
                    {stat.icon}
                  </div>
                  <h3 style={{ 
                    color: 'white', 
                    margin: '0 0 6px 0', 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    {stat.value}
                  </h3>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    margin: '0 0 6px 0', 
                    fontSize: '12px',
                    fontWeight: '500',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    {stat.title}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <p style={{ 
                      color: 'rgba(255,255,255,0.6)', 
                      margin: 0, 
                      fontSize: '10px'
                    }}>
                      {stat.subtitle}
                    </p>
                    <span style={{
                      background: stat.trendColor,
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '9px',
                      fontWeight: 'bold'
                    }}>
                      {stat.trend}
                    </span>
                  </div>
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
                  { title: 'Analytics', icon: '📊', color: '#9b59b6', action: () => {
                    loadAnalyticsData();
                    setShowAnalytics(true);
                  }},
                  { title: 'Expenses', icon: '💸', color: '#e74c3c', action: () => setShowExpenseManager(true) },
                  { title: 'Edit Bills', icon: '✏️', color: '#27ae60', action: () => setShowBillManager(true) },
                  { title: 'Add Previous', icon: '📋', color: '#e67e22', action: () => setShowAddPreviousBill(true) },
                  { title: 'Test QR Code', icon: '📱', color: '#9b59b6', action: () => {
                    // Import and use the test function
                    import('./ThermalPrintManager').then(module => {
                      module.testThermalQRCode(100);
                    });
                  }},
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
                  }},
                  { title: 'Data Backup', icon: '💾', color: '#16a085', action: backupAllData },
                  { title: 'System Report', icon: '📋', color: '#8e44ad', action: () => {
                    // Generate quick system report
                    const report = {
                      bills: pendingBills.length + billHistory.length,
                      revenue: [...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0),
                      customers: new Set([...pendingBills, ...billHistory].map(bill => bill.customerName)).size
                    };
                    showAlert({ 
                      message: `Quick Stats: ${report.bills} bills, ₹${report.revenue} revenue, ${report.customers} customers`, 
                      type: 'info' 
                    });
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
                {dashboardData?.recentActivity && (
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 'normal' }}>
                    {' '}(From Database)
                  </span>
                )}
              </h3>
              <div style={{ 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '15px', 
                padding: '20px' 
              }}>
                {(dashboardData?.recentActivity || 
                  [...pendingBills, ...billHistory]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                ).map((bill: any, index: number) => (
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
                {(!dashboardData?.recentActivity && [...pendingBills, ...billHistory].length === 0) && (
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
                onClick={() => {
                  loadAnalyticsData();
                  setShowAnalytics(true);
                }}
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
                onClick={() => {
                  loadAnalyticsData();
                  setShowAnalytics(true);
                }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div>
                <h2 style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: 'bold' }}>🛠️ Advanced Data Management</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 0 0', fontSize: '16px' }}>
                  Comprehensive tools for managing your business data
                </p>
              </div>
            </div>
            
            {/* Management Categories */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
              gap: '25px', 
              marginBottom: '30px'
            }}>
              
              {/* Data Operations */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(52, 152, 219, 0.1))',
                borderRadius: '20px',
                padding: '30px',
                border: '2px solid rgba(52, 152, 219, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-30px',
                  right: '-30px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(52, 152, 219, 0.1)',
                  borderRadius: '50%'
                }}></div>
                <div style={{ fontSize: '48px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>🗃️</div>
                <h3 style={{ color: '#3498db', margin: '0 0 15px 0', fontSize: '22px', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                  Data Operations
                </h3>
                <p style={{ opacity: 0.9, marginBottom: '20px', fontSize: '14px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                  Backup, restore, import, and export your business data safely.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
                  <button
                    onClick={backupAllData}
                    disabled={loading}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    {loading ? '⏳ Creating...' : '💾 Backup All Data'}
                  </button>
                  
                  <label style={{ width: '100%' }}>
                    <input
                      type="file"
                      accept=".json"
                      onChange={restoreFromBackup}
                      style={{ display: 'none' }}
                    />
                    <div
                      className="glass-button"
                      style={{
                        background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px 20px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        width: '100%',
                        textAlign: 'center',
                        display: 'block'
                      }}
                    >
                      � Restore from Backup
                    </div>
                  </label>
                  
                  <button
                    onClick={() => exportData('bills')}
                    disabled={loading}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    {loading ? '⏳ Exporting...' : '📊 Export to CSV'}
                  </button>
                  
                  <label style={{ width: '100%' }}>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const csvContent = event.target?.result as string;
                            const lines = csvContent.split('\n');
                            const headers = lines[0].split(',');
                            
                            if (headers.includes('Bill Number') && headers.includes('Customer Name')) {
                              showAlert({ 
                                message: `CSV file loaded with ${lines.length - 1} rows. Import functionality coming soon!`, 
                                type: 'info' 
                              });
                            } else {
                              showAlert({ 
                                message: 'Invalid CSV format. Please use exported CSV as template.', 
                                type: 'error' 
                              });
                            }
                          } catch (error) {
                            showAlert({ message: 'Error reading CSV file', type: 'error' });
                          }
                        };
                        reader.readAsText(file);
                      }}
                      style={{ display: 'none' }}
                    />
                    <div
                      className="glass-button"
                      style={{
                        background: 'linear-gradient(135deg, #34495e, #2c3e50)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '12px 20px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        width: '100%',
                        textAlign: 'center',
                        display: 'block'
                      }}
                    >
                      📥 Import from CSV
                    </div>
                  </label>
                </div>
              </div>

              {/* Bill Management */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.2), rgba(155, 89, 182, 0.1))',
                borderRadius: '20px',
                padding: '30px',
                border: '2px solid rgba(155, 89, 182, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-30px',
                  right: '-30px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(155, 89, 182, 0.1)',
                  borderRadius: '50%'
                }}></div>
                <div style={{ fontSize: '48px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>🧾</div>
                <h3 style={{ color: '#d4c8d9ff', margin: '0 0 15px 0', fontSize: '22px', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                  Bill Management
                </h3>
                <p style={{ opacity: 0.9, marginBottom: '20px', fontSize: '14px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                  Edit, delete, and manage all bills with advanced filtering and bulk operations.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
                  <button
                    onClick={() => setShowBillManager(true)}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #3498db, #2980b9)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    🛠️ Open Bill Manager
                  </button>
                  
                  <button
                    onClick={() => setShowBulkOperations(true)}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    ⚡ Bulk Operations
                  </button>
                  
                  <button
                    onClick={() => setShowCustomerManager(true)}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #1abc9c, #16a085)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    👥 Customer Manager
                  </button>
                </div>
              </div>

              {/* Reports & Analytics */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.2), rgba(231, 76, 60, 0.1))',
                borderRadius: '20px',
                padding: '30px',
                border: '2px solid rgba(231, 76, 60, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-30px',
                  right: '-30px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(231, 76, 60, 0.1)',
                  borderRadius: '50%'
                }}></div>
                <div style={{ fontSize: '48px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>📈</div>
                <h3 style={{ color: '#e74c3c', margin: '0 0 15px 0', fontSize: '22px', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                  Reports & Analytics
                </h3>
                <p style={{ opacity: 0.9, marginBottom: '20px', fontSize: '14px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                  Generate detailed reports and analyze business performance.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
                  <button
                    onClick={() => setShowReportsGenerator(true)}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    📊 Custom Reports
                  </button>
                  
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      generateCustomReport('sales', { start: lastWeek, end: today });
                    }}
                    disabled={loading}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    {loading ? '⏳ Generating...' : '📅 Weekly Sales Report'}
                  </button>
                  
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      generateCustomReport('customer', { start: lastMonth, end: today });
                    }}
                    disabled={loading}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    {loading ? '⏳ Generating...' : '👥 Customer Analysis'}
                  </button>
                </div>
              </div>

              {/* System Management */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.2), rgba(243, 156, 18, 0.1))',
                borderRadius: '20px',
                padding: '30px',
                border: '2px solid rgba(243, 156, 18, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-30px',
                  right: '-30px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(243, 156, 18, 0.1)',
                  borderRadius: '50%'
                }}></div>
                <div style={{ fontSize: '48px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>⚙️</div>
                <h3 style={{ color: '#f39c12', margin: '0 0 15px 0', fontSize: '22px', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                  System Management
                </h3>
                <p style={{ opacity: 0.9, marginBottom: '20px', fontSize: '14px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                  Advanced system operations and maintenance tools.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
                  <button
                    onClick={testAllEndpoints}
                    disabled={loading}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #3498db, #2980b9)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    {loading ? '⏳ Testing...' : '🧪 System Health Check'}
                  </button>
                  
                  <button
                    onClick={() => {
                      const stats = {
                        totalBills: pendingBills.length + billHistory.length,
                        totalRevenue: [...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0),
                        dbStatus: connectionStatus,
                        lastBackup: localStorage.getItem('last_backup_date') || 'Never'
                      };
                      showAlert({ 
                        message: `System Stats: ${stats.totalBills} bills, ₹${stats.totalRevenue} revenue, DB: ${stats.dbStatus}`, 
                        type: 'info' 
                      });
                    }}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #1abc9c, #16a085)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    📊 System Statistics
                  </button>
                  
                  <button
                    onClick={() => {
                      // Create a comprehensive system report
                      const systemReport = {
                        timestamp: new Date().toISOString(),
                        totalBills: pendingBills.length + billHistory.length,
                        pendingBills: pendingBills.length,
                        completedBills: billHistory.filter(b => b.status === 'completed').length,
                        deliveredBills: billHistory.filter(b => b.status === 'delivered').length,
                        totalRevenue: [...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0),
                        uniqueCustomers: new Set([...pendingBills, ...billHistory].map(bill => bill.customerName)).size,
                        databaseStatus: connectionStatus,
                        averageBillValue: Math.round([...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0) / (pendingBills.length + billHistory.length)) || 0,
                        todaysBills: [...pendingBills, ...billHistory].filter(bill => 
                          new Date(bill.createdAt).toDateString() === new Date().toDateString()
                        ).length,
                        thisMonthRevenue: [...pendingBills, ...billHistory]
                          .filter(bill => {
                            const billDate = new Date(bill.createdAt);
                            const now = new Date();
                            return billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear();
                          })
                          .reduce((sum, bill) => sum + bill.grandTotal, 0)
                      };
                      
                      const reportContent = `GenZ Laundry System Report
Generated: ${new Date().toLocaleString()}

=== BUSINESS OVERVIEW ===
Total Bills: ${systemReport.totalBills}
Pending Bills: ${systemReport.pendingBills}
Completed Bills: ${systemReport.completedBills}
Delivered Bills: ${systemReport.deliveredBills}

=== FINANCIAL SUMMARY ===
Total Revenue: ₹${systemReport.totalRevenue.toLocaleString()}
This Month Revenue: ₹${systemReport.thisMonthRevenue.toLocaleString()}
Average Bill Value: ₹${systemReport.averageBillValue}

=== CUSTOMER INSIGHTS ===
Unique Customers: ${systemReport.uniqueCustomers}
Today's Bills: ${systemReport.todaysBills}

=== SYSTEM STATUS ===
Database Connection: ${systemReport.databaseStatus}
Report Generated: ${systemReport.timestamp}

=== PERFORMANCE METRICS ===
Bills per Customer: ${Math.round(systemReport.totalBills / systemReport.uniqueCustomers) || 0}
Revenue per Customer: ₹${Math.round(systemReport.totalRevenue / systemReport.uniqueCustomers) || 0}
`;
                      
                      const blob = new Blob([reportContent], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `system_report_${new Date().toISOString().split('T')[0]}.txt`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      
                      showAlert({ message: 'System report generated successfully!', type: 'success' });
                    }}
                    className="glass-button"
                    style={{
                      background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    📋 Generate System Report
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '25px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                📊 Data Management Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffffff' }}>
                    {pendingBills.length + billHistory.length}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.8, color: 'white' }}>Total Bills in System</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#000000ff' }}>
                    ₹{[...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.8, color: 'white' }}>Total Revenue Tracked</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f39c12' }}>
                    {connectionStatus === 'connected' ? '🟢' : connectionStatus === 'disconnected' ? '🔴' : '🟡'}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.8, color: 'white' }}>Database Status</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9b59b6' }}>
                    {new Set([...pendingBills, ...billHistory].map(bill => bill.customerName)).size}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.8, color: 'white' }}>Unique Customers</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e74c3c' }}>
                    {localStorage.getItem('last_backup_date') 
                      ? new Date(localStorage.getItem('last_backup_date')!).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.8, color: 'white' }}>Last Backup</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#000000ff' }}>
                    {Math.round([...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0) / (pendingBills.length + billHistory.length)) || 0}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.8, color: 'white' }}>Average Bill Value</div>
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div style={{ 
                marginTop: '25px', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '12px' 
              }}>
                <button
                  onClick={() => setShowBulkOperations(true)}
                  className="glass-button"
                  style={{
                    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  ⚡ Bulk Operations
                </button>
                <button
                  onClick={() => setShowReportsGenerator(true)}
                  className="glass-button"
                  style={{
                    background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  📊 Custom Reports
                </button>
                <button
                  onClick={() => setShowCustomerManager(true)}
                  className="glass-button"
                  style={{
                    background: 'linear-gradient(135deg, #3498db, #2980b9)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  👥 Customer Manager
                </button>
                <button
                  onClick={testAllEndpoints}
                  disabled={loading}
                  className="glass-button"
                  style={{
                    background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #f39c12, #e67e22)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? '⏳ Testing...' : '🧪 System Test'}
                </button>
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
          <div style={{ animation: 'slideIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div>
                <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                  📚 Bill History ({billHistory.length})
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0 0', fontSize: '14px' }}>
                  View all completed and delivered bills • Use Bill Management for editing
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={loadBillHistory}
                  disabled={loading}
                  className="glass-button"
                  style={{
                    background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 18px',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 6px 15px rgba(39, 174, 96, 0.3)'
                  }}
                >
                  {loading ? '⏳' : '🔄'} Refresh History
                </button>
                <button
                  onClick={() => exportData('bills')}
                  disabled={loading}
                  className="glass-button"
                  style={{
                    background: 'linear-gradient(135deg, #3498db, #2980b9)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 18px',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 6px 15px rgba(52, 152, 219, 0.3)'
                  }}
                >
                  {loading ? '⏳' : '📊'} Export CSV
                </button>
                <button
                  onClick={() => setShowBillManager(true)}
                  className="glass-button"
                  style={{
                    background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 18px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 6px 15px rgba(155, 89, 182, 0.3)'
                  }}
                >
                  🛠️ Manage Bills
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '15px', 
              padding: '20px', 
              marginBottom: '25px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', alignItems: 'end' }}>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    🔍 Search Bills
                  </label>
                  <input
                    type="text"
                    placeholder="Search by customer name, bill number, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    📊 Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                <div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Clear Filters
                  </button>
                </div>
              </div>
            </div>
            
            {/* Bills Display */}
            {filteredBillHistory.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'white', 
                padding: '60px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ fontSize: '80px', marginBottom: '20px', opacity: 0.6 }}>📚</div>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
                  {searchTerm || statusFilter ? 'No bills match your filters' : 'No bills found'}
                </h3>
                <p style={{ fontSize: '16px', opacity: 0.8, marginBottom: '25px' }}>
                  {searchTerm || statusFilter
                    ? 'Try adjusting your search terms or filters to see more bills.'
                    : 'Create some bills to see them here. All bills (pending, completed, and delivered) will appear in this section.'
                  }
                </p>
                {(searchTerm || statusFilter) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #3498db, #2980b9)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Show All Bills
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {filteredBillHistory.map((bill, index) => (
                  <div key={bill.id || bill._id || index} style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(15px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    padding: '25px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                    animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                  }}>
                    <div style={{ color: 'white', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                          {bill.customerName}
                        </h4>
                        <span style={{ 
                          background: bill.status === 'delivered' ? '#27ae60' : bill.status === 'completed' ? '#3498db' : '#f39c12',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {bill.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', opacity: 0.8, fontSize: '13px' }}>
                            📋 Bill Number: <strong>{bill.billNumber}</strong>
                          </p>
                          <p style={{ margin: '0 0 4px 0', opacity: 0.8, fontSize: '13px' }}>
                            📱 Phone: <strong>{bill.customerPhone || 'N/A'}</strong>
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px 0', opacity: 0.8, fontSize: '13px' }}>
                            🛍️ Items: <strong>{bill.items.length} items</strong>
                          </p>
                          <p style={{ margin: '0 0 4px 0', opacity: 0.8, fontSize: '13px' }}>
                            💰 Total: <strong style={{ color: '#000000ff', fontSize: '16px' }}>₹{bill.grandTotal}</strong>
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px 0', opacity: 0.8, fontSize: '13px' }}>
                            📅 Created: <strong>{new Date(bill.createdAt).toLocaleDateString()}</strong>
                          </p>
                          {bill.deliveredAt && (
                            <p style={{ margin: '0 0 4px 0', opacity: 0.8, fontSize: '13px' }}>
                              🚚 Delivered: <strong>{new Date(bill.deliveredAt).toLocaleDateString()}</strong>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Item Details */}
                      <div style={{ 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        borderRadius: '10px', 
                        padding: '12px',
                        marginTop: '12px'
                      }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', opacity: 0.9 }}>
                          📦 Items Details:
                        </p>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>
                          {bill.items.slice(0, 3).map((item: any, idx: number) => (
                            <span key={idx}>
                              {item.name} (₹{item.rate} × {item.quantity})
                              {idx < Math.min(bill.items.length - 1, 2) ? ', ' : ''}
                            </span>
                          ))}
                          {bill.items.length > 3 && (
                            <span> +{bill.items.length - 3} more items</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Read Only */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '25px' }}>
                      <button
                        onClick={() => reprintBill(bill)}
                        className="glass-button"
                        style={{
                          background: 'linear-gradient(135deg, #3498db, #2980b9)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          minWidth: '120px'
                        }}
                      >
                        🖨️ Reprint Bill
                      </button>
                      
                      {bill.status !== 'delivered' && (
                        <button
                          onClick={() => markBillAsDelivered(bill.id || bill._id)}
                          className="glass-button"
                          style={{
                            background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            minWidth: '120px'
                          }}
                        >
                          🚚 Mark Delivered
                        </button>
                      )}
                      
                      <button
                        onClick={() => setShowBillManager(true)}
                        className="glass-button"
                        style={{
                          background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          minWidth: '120px'
                        }}
                      >
                        ✏️ Edit in Manager
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Stats */}
            {billHistory.length > 0 && (
              <div style={{ 
                marginTop: '30px',
                background: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: '15px', 
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
                  📊 History Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000ff' }}>
                      {billHistory.length}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8, color: 'white' }}>Total Bills</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1000a0ff' }}>
                      ₹{billHistory.reduce((sum, bill) => sum + bill.grandTotal, 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8, color: 'white' }}>Total Revenue</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0c2c33ff' }}>
                      {billHistory.filter(bill => bill.status === 'delivered').length}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8, color: 'white' }}>Delivered</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffffff' }}>
                      {Math.round(billHistory.reduce((sum, bill) => sum + bill.grandTotal, 0) / billHistory.length) || 0}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8, color: 'white' }}>Avg. Bill Value</div>
                  </div>
                </div>
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

      {/* Bulk Operations Modal */}
      {showBulkOperations && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1f2937, #374151)',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                ⚡ Bulk Operations
              </h2>
              <button
                onClick={() => setShowBulkOperations(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px' }}>
                📋 Select Bills for Bulk Operations
              </h3>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: '12px', 
                padding: '15px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {[...pendingBills, ...billHistory].map(bill => (
                  <div key={bill.id || bill._id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    marginBottom: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedBills.includes(bill.id || bill._id)}
                      onChange={(e) => {
                        const billId = bill.id || bill._id;
                        if (e.target.checked) {
                          setSelectedBills([...selectedBills, billId]);
                        } else {
                          setSelectedBills(selectedBills.filter(id => id !== billId));
                        }
                      }}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <div style={{ color: 'white', flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{bill.customerName}</div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {bill.billNumber} • ₹{bill.grandTotal} • {bill.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '15px' }}>
                Selected: {selectedBills.length} bills
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <button
                  onClick={() => {
                    setSelectedBills([...pendingBills, ...billHistory].map(b => b.id || b._id));
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #3498db, #2980b9)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  ✅ Select All
                </button>
                <button
                  onClick={() => setSelectedBills([])}
                  style={{
                    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  🗑️ Clear Selection
                </button>
                <button
                  onClick={() => {
                    if (selectedBills.length > 0) {
                      bulkMarkAsCompleted(selectedBills);
                      setSelectedBills([]);
                      setShowBulkOperations(false);
                    }
                  }}
                  disabled={selectedBills.length === 0 || loading}
                  style={{
                    background: selectedBills.length === 0 ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #27ae60, #2ecc71)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    color: 'white',
                    cursor: selectedBills.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? '⏳ Processing...' : '✅ Mark as Completed'}
                </button>
                <button
                  onClick={() => {
                    if (selectedBills.length > 0) {
                      bulkMarkAsDelivered(selectedBills);
                      setSelectedBills([]);
                      setShowBulkOperations(false);
                    }
                  }}
                  disabled={selectedBills.length === 0 || loading}
                  style={{
                    background: selectedBills.length === 0 ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #f39c12, #e67e22)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    color: 'white',
                    cursor: selectedBills.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? '⏳ Processing...' : '🚚 Mark as Delivered'}
                </button>
                <button
                  onClick={() => {
                    if (selectedBills.length > 0) {
                      const selectedBillsData = [...pendingBills, ...billHistory].filter(bill => 
                        selectedBills.includes(bill.id || bill._id)
                      );
                      const csvContent = convertToCSV(selectedBillsData, 'bills');
                      downloadCSV(csvContent, `selected_bills_${new Date().toISOString().split('T')[0]}.csv`);
                      showAlert({ message: `${selectedBills.length} bills exported successfully`, type: 'success' });
                    }
                  }}
                  disabled={selectedBills.length === 0}
                  style={{
                    background: selectedBills.length === 0 ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    color: 'white',
                    cursor: selectedBills.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  📊 Export Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reports Generator Modal */}
      {showReportsGenerator && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1f2937, #374151)',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                📊 Custom Report Generator
              </h2>
              <button
                onClick={() => setShowReportsGenerator(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                📈 Report Type
              </label>
              <select
                id="reportType"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <option value="sales">Sales Report (Daily Revenue)</option>
                <option value="customer">Customer Analysis</option>
                <option value="items">Items Performance</option>
                <option value="bills">Complete Bills Export</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  📅 Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  defaultValue={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  📅 End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  const reportType = (document.getElementById('reportType') as HTMLSelectElement).value;
                  const startDate = (document.getElementById('startDate') as HTMLInputElement).value;
                  const endDate = (document.getElementById('endDate') as HTMLInputElement).value;
                  
                  generateCustomReport(reportType, { start: startDate, end: endDate });
                  setShowReportsGenerator(false);
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #27ae60, #2ecc71)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px 25px',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '⏳ Generating...' : '🚀 Generate Report'}
              </button>
              <button
                onClick={() => setShowReportsGenerator(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px 25px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Manager Modal */}
      {showCustomerManager && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1f2937, #374151)',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                👥 Customer Manager
              </h2>
              <button
                onClick={() => setShowCustomerManager(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Search customers by name or phone..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px'
                }}
                onChange={(e) => {
                  // This would filter customers in a real implementation
                }}
              />
            </div>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '12px', 
              padding: '20px'
            }}>
              <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px' }}>
                📊 Customer Analytics
              </h3>
              
              {(() => {
                const customerData = [...pendingBills, ...billHistory].reduce((acc: any, bill) => {
                  const key = bill.customerName;
                  if (!acc[key]) {
                    acc[key] = { 
                      phone: bill.customerPhone || 'N/A', 
                      count: 0, 
                      total: 0, 
                      lastVisit: bill.createdAt 
                    };
                  }
                  acc[key].count++;
                  acc[key].total += bill.grandTotal;
                  if (new Date(bill.createdAt) > new Date(acc[key].lastVisit)) {
                    acc[key].lastVisit = bill.createdAt;
                  }
                  return acc;
                }, {});

                const customers = Object.entries(customerData)
                  .sort(([,a]: [string, any], [,b]: [string, any]) => b.total - a.total)
                  .slice(0, 10);

                return (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {customers.map(([name, data]: [string, any], index) => (
                      <div key={index} style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '15px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ color: 'white' }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{name}</div>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>
                            📱 {data.phone} • 📅 Last: {new Date(data.lastVisit).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', color: 'white' }}>
                          <div style={{ fontWeight: 'bold', color: '#27ae60' }}>₹{data.total.toLocaleString()}</div>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>{data.count} bills</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  generateCustomReport('customer', { 
                    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
                    end: new Date().toISOString().split('T')[0] 
                  });
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #3498db, #2980b9)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '⏳ Exporting...' : '📊 Export Customer Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Notification Panel - Highest Z-Index */}
      {showNotifications && (
        <>
          {/* Backdrop to close notifications */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2147483646,
              background: 'rgba(0, 0, 0, 0.1)'
            }}
            onClick={() => setShowNotifications(false)}
          />
          
          {/* Notification Panel */}
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            width: '320px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(25px)',
            borderRadius: '16px',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            zIndex: 2147483647,
            color: '#1f2937',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {notifications.map(notification => (
                <div key={notification.id} style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: notification.type === 'success' ? '#10b981' : 
                               notification.type === 'warning' ? '#f59e0b' : '#3b82f6',
                    marginTop: '8px',
                    flexShrink: 0
                  }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                        {notification.message}
                      </p>
                      {notification.count !== undefined && (
                        <span style={{
                          background: notification.type === 'success' ? '#10b981' : 
                                     notification.type === 'warning' ? '#f59e0b' : '#3b82f6',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {notification.count}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.6 }}>
                      Updated: {notification.time.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;