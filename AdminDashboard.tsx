import React, { useState, useEffect } from 'react';
import { ShopConfig, PendingBill, BillData } from './types';
import { printThermalBill } from './ThermalPrintManager';
import AddPreviousBill from './AddPreviousBill';
import AnalyticsDashboard from './AnalyticsDashboard';
import ExpenseManager from './ExpenseManager';
import BillManager from './BillManager';
import TagHistoryViewer from './TagHistoryViewer';
import RevenueDashboard from './RevenueDashboard';
import ComprehensiveRevenueDashboard from './ComprehensiveRevenueDashboard';
import apiService from './api';
import { useAlert } from './GlobalAlert';

interface AdminDashboardProps {
  onBackToBilling: () => void;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToBilling, onLogout }) => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'pending' | 'history' | 'analytics' | 'expenses' | 'manage' | 'tags' | 'revenue'>('dashboard');
  const [shopConfig, setShopConfig] = useState<ShopConfig>({
    shopName: 'GenZ Laundry',
    address: 'Sabji Mandi Circle,Ratanada, Jodhpur (342011)',
    contact: '+91 9256930727',
    gstNumber: ''
  });
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [billHistory, setBillHistory] = useState<PendingBill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editBillToPass, setEditBillToPass] = useState<any>(null); // New state for passing bill to BillManager
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
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showDataImport, setShowDataImport] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [showCustomerManager, setShowCustomerManager] = useState(false);
  const [showReportsGenerator, setShowReportsGenerator] = useState(false);
  const [dateFilteredRevenue, setDateFilteredRevenue] = useState(0);
  const [dateFilteredBillCount, setDateFilteredBillCount] = useState(0);
  const [showTagHistory, setShowTagHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // System Preferences states
  const [systemPrefs, setSystemPrefs] = useState({
    autoPrint: true,
    soundAlerts: true,
    thankYouMessage: 'Thank you for choosing us!',
    termsAndConditions: '1. Not responsible for color bleeding.\n2. Collect within 15 days.'
  });

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
    loadDashboardAnalytics();
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

  // Helper to close all modals and prevent stacking
  const closeAllModals = () => {
    setShowAddPreviousBill(false);
    setShowAnalytics(false);
    setShowExpenseManager(false);
    setShowBillManager(false);
    setShowDataImport(false);
    setShowBackupRestore(false);
    setShowBulkOperations(false);
    setShowCustomerManager(false);
    setShowReportsGenerator(false);
    setShowTagHistory(false);
    setShowSettings(false);
    setEditBillToPass(null);
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

  // Load System Preferences
  useEffect(() => {
    const savedPrefs = localStorage.getItem('genz_system_prefs');
    if (savedPrefs) {
      try {
        setSystemPrefs(JSON.parse(savedPrefs));
      } catch (e) {
        console.error('Failed to parse system prefs', e);
      }
    }
  }, []);

  const saveSystemPrefs = () => {
    localStorage.setItem('genz_system_prefs', JSON.stringify(systemPrefs));
    showAlert({ message: 'System preferences saved successfully!', type: 'success' });
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
      thankYouMessage: systemPrefs.thankYouMessage,
      termsAndConditions: systemPrefs.termsAndConditions
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

    // Date filtering
    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const billDate = new Date(bill.createdAt);
      if (startDateFilter) {
        const startDate = new Date(startDateFilter);
        startDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && billDate >= startDate;
      }
      if (endDateFilter) {
        const endDate = new Date(endDateFilter);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && billDate <= endDate;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate revenue for filtered date range
  useEffect(() => {
    if (startDateFilter || endDateFilter) {
      const filtered = billHistory.filter(bill => {
        const billDate = new Date(bill.createdAt);
        let matches = true;

        if (startDateFilter) {
          const startDate = new Date(startDateFilter);
          startDate.setHours(0, 0, 0, 0);
          matches = matches && billDate >= startDate;
        }
        if (endDateFilter) {
          const endDate = new Date(endDateFilter);
          endDate.setHours(23, 59, 59, 999);
          matches = matches && billDate <= endDate;
        }

        return matches;
      });

      const revenue = filtered.reduce((sum, bill) => sum + (bill.grandTotal || 0), 0);
      setDateFilteredRevenue(revenue);
      setDateFilteredBillCount(filtered.length);
    } else {
      setDateFilteredRevenue(0);
      setDateFilteredBillCount(0);
    }
  }, [startDateFilter, endDateFilter, billHistory]);

  return (
    <>
      <div className="admin-layout">


        <div className="admin-header">
            <div className="admin-header-brand">
              <img src="/logo.png" alt="Logo" className="admin-header-logo" />
              <div>
                <h1>Admin Dashboard</h1>
                <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Manage your laundry business
                  <span className={`badge ${connectionStatus === 'connected' ? 'badge-success' : connectionStatus === 'disconnected' ? 'badge-danger' : 'badge-warning'}`}>
                    <span className={`status-dot ${connectionStatus === 'connected' ? 'status-dot-online' : connectionStatus === 'disconnected' ? 'status-dot-offline' : 'status-dot-testing'}`}></span>
                    {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'disconnected' ? 'Offline' : 'Testing'}
                  </span>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                </div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
              </div>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn btn-ghost btn-icon"
                style={{ position: 'relative' }}
              >
                <i className="fas fa-bell"></i>
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '2px',
                    background: 'var(--danger)', color: 'white', borderRadius: '50%',
                    width: '16px', height: '16px', fontSize: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600'
                  }}>
                    {notifications.length}
                  </span>
                )}
              </button>

              {onBackToBilling && (
                <button onClick={onBackToBilling} className="btn btn-success btn-sm">
                  <i className="fas fa-cash-register"></i> Billing
                </button>
              )}

              {onLogout && (
                <button onClick={onLogout} className="btn btn-danger btn-sm">
                  <i className="fas fa-right-from-bracket"></i> Logout
                </button>
              )}
            </div>
          </div>

          <div className="admin-tabs">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
              { key: 'revenue', label: 'Revenue', icon: 'fa-indian-rupee-sign' },
              { key: 'analytics', label: 'Analytics', icon: 'fa-chart-pie' },
              { key: 'manage', label: 'Data Manager', icon: 'fa-database' },
              { key: 'expenses', label: 'Expenses', icon: 'fa-wallet' },
              { key: 'pending', label: 'Pending', icon: 'fa-clock' },
              { key: 'history', label: 'History', icon: 'fa-list-check' },
              { key: 'tags', label: 'Tag History', icon: 'fa-tag' },
              { key: 'settings', label: 'Settings', icon: 'fa-gear' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
              >
                <i className={`fas ${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="card" style={{
            margin: '0 16px 16px',
            padding: '20px',
            minHeight: '200px'
          }}>
            {activeTab === 'dashboard' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                      <i className="fas fa-chart-line" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                      Business Dashboard
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '13px' }}>
                      Overview of your laundry business performance
                      {dashboardData && <span style={{ color: 'var(--success)', fontWeight: '600' }}> · Database connected</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={loadDashboardAnalytics} disabled={loading} className="btn btn-ghost btn-sm">
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} style={{ marginRight: '4px' }}></i>Refresh
                    </button>
                    <button onClick={() => exportData('bills')} disabled={loading} className="btn btn-ghost btn-sm">
                      <i className="fas fa-download" style={{ marginRight: '4px' }}></i>Export
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginBottom: '28px'
                }}>
                  {[
                    {
                      title: 'Total Revenue',
                      value: dashboardData?.month?.revenue
                        ? `₹${dashboardData.month.revenue.toLocaleString()}`
                        : `₹${(pendingBills.reduce((sum, bill) => sum + bill.grandTotal, 0) + billHistory.reduce((sum, bill) => sum + bill.grandTotal, 0)).toLocaleString()}`,
                      icon: 'fa-rupee-sign',
                      subtitle: dashboardData ? 'This month' : 'Local data'
                    },
                    {
                      title: 'Today Revenue',
                      value: dashboardData?.today?.revenue
                        ? `₹${dashboardData.today.revenue.toLocaleString()}`
                        : `₹${[...pendingBills, ...billHistory]
                          .filter(bill => new Date(bill.createdAt).toDateString() === new Date().toDateString())
                          .reduce((sum, bill) => sum + bill.grandTotal, 0).toLocaleString()}`,
                      icon: 'fa-calendar-day',
                      subtitle: dashboardData ? 'From database' : 'Local data'
                    },
                    {
                      title: 'Total Bills',
                      value: dashboardData?.month?.bills
                        ? dashboardData.month.bills.toString()
                        : (pendingBills.length + billHistory.length).toString(),
                      icon: 'fa-file-invoice',
                      subtitle: dashboardData ? 'This month' : 'Local data'
                    },
                    {
                      title: 'Pending',
                      value: dashboardData?.pendingBills !== undefined
                        ? dashboardData.pendingBills.toString()
                        : pendingBills.length.toString(),
                      icon: 'fa-clock',
                      subtitle: pendingBills.length > 5 ? 'Needs attention' : 'On track'
                    },
                    {
                      title: 'Today Profit',
                      value: dashboardData?.today?.profit !== undefined
                        ? `₹${dashboardData.today.profit.toLocaleString()}`
                        : 'N/A',
                      icon: 'fa-chart-pie',
                      subtitle: dashboardData ? 'Revenue − Expenses' : 'Connect DB'
                    }
                  ].map((stat, index) => (
                    <div key={index} style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: 'var(--accent-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--accent)', fontSize: '14px'
                        }}>
                          <i className={`fas ${stat.icon}`}></i>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>{stat.title}</span>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stat.subtitle}</div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px', fontWeight: '600' }}>
                    <i className="fas fa-bolt" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>
                    Quick Actions
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '8px'
                  }}>
                    {[
                      { title: 'New Bill', icon: 'fa-plus', action: onBackToBilling },
                      {
                        title: 'Analytics', icon: 'fa-chart-bar', action: () => {
                          loadAnalyticsData();
                          setShowAnalytics(true);
                        }
                      },
                      { title: 'Revenue', icon: 'fa-chart-line', action: () => setActiveTab('revenue') },
                      { title: 'Expenses', icon: 'fa-wallet', action: () => setShowExpenseManager(true) },
                      { title: 'Edit Bills', icon: 'fa-pen', action: () => setShowBillManager(true) },
                      { title: 'Add Previous', icon: 'fa-history', action: () => setShowAddPreviousBill(true) },
                      {
                        title: 'Test QR', icon: 'fa-qrcode', action: () => {
                          import('./ThermalPrintManager').then(module => {
                            module.testThermalQRCode(100);
                          });
                        }
                      },
                      {
                        title: 'Test Print', icon: 'fa-print', action: () => {
                          const testBill: BillData = {
                            businessName: shopConfig.shopName,
                            address: shopConfig.address,
                            phone: shopConfig.contact,
                            billNumber: 'TEST-' + Date.now(),
                            customerName: 'Test Customer',
                            items: [{ name: 'Test Item', quantity: 1, rate: 100, amount: 100 }],
                            subtotal: 100,
                            grandTotal: 100,
                            thankYouMessage: systemPrefs.thankYouMessage,
                            termsAndConditions: systemPrefs.termsAndConditions
                          };
                          printThermalBill(testBill);
                        }
                      },
                      { title: 'Backup', icon: 'fa-cloud-download-alt', action: backupAllData }
                    ].map((action, index) => (
                      <button
                        key={index}
                        onClick={action.action}
                        className="btn btn-ghost"
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          padding: '14px 8px', fontSize: '12px', fontWeight: '500'
                        }}
                      >
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '8px',
                          background: 'var(--accent-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--accent)', fontSize: '14px'
                        }}>
                          <i className={`fas ${action.icon}`}></i>
                        </div>
                        {action.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px', fontWeight: '600' }}>
                    <i className="fas fa-history" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>
                    Recent Activity
                    {dashboardData?.recentActivity && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '8px' }}>
                        from database
                      </span>
                    )}
                  </h3>
                  <div style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden'
                  }}>
                    {(dashboardData?.recentActivity ||
                      [...pendingBills, ...billHistory]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .slice(0, 5)
                    ).map((bill: any, index: number) => (
                      <div key={index} style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: index < 4 ? '1px solid var(--border-subtle)' : 'none'
                      }}>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>
                            {bill.billNumber}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                            {bill.customerName} · ₹{bill.grandTotal}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            background: bill.status === 'completed' || bill.status === 'delivered' ? 'var(--success)' : 'var(--warning)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {bill.status}
                          </span>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                            {new Date(bill.createdAt).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!dashboardData?.recentActivity && [...pendingBills, ...billHistory].length === 0) && (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                        <i className="fas fa-inbox" style={{ fontSize: '20px', marginBottom: '8px', opacity: 0.4 }}></i>
                        <p style={{ margin: 0 }}>No recent activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'revenue' && (
              <ComprehensiveRevenueDashboard
                onClose={() => setActiveTab('dashboard')}
                bills={[...pendingBills, ...billHistory]}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard />
            )}

            {activeTab === 'expenses' && (
              <div style={{ animation: 'slideIn 0.5s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <i className="fas fa-wallet" style={{ marginRight: '8px', color: 'var(--accent)' }}></i> Expense Management
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '12px' }}>
                      Track and manage business expenses
                    </p>
                  </div>
                  <button
                    onClick={() => { closeAllModals(); setShowExpenseManager(true); }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: '12px' }}
                  >
                    <i className="fas fa-wallet" style={{ marginRight: '6px' }}></i> Manage Expenses
                  </button>
                </div>

                <div style={{
                  textAlign: 'center',
                  padding: '32px 20px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '16px',
                    color: 'var(--accent)'
                  }}>
                    <i className="fas fa-money-check-alt"></i>
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: 'var(--text-primary)'
                  }}>
                    Track Business Expenses
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    marginBottom: '24px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    maxWidth: '400px',
                    margin: '0 auto 24px auto'
                  }}>
                    Add and manage all business expenses including rent, utilities, and supplies.<br />
                    Calculate true profit by tracking income against expenses.
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                    maxWidth: '800px',
                    margin: '0 auto 24px auto'
                  }}>
                    {[
                      { icon: 'fa-home', title: 'Rent & Utilities', desc: 'Fixed costs', color: 'var(--error)' },
                      { icon: 'fa-box-open', title: 'Supplies', desc: 'Materials', color: 'var(--warning)' },
                      { icon: 'fa-chart-line', title: 'Profit Analysis', desc: 'Income vs Expenses', color: 'var(--success)' }
                    ].map((item, index) => (
                      <div key={index} style={{
                        background: 'var(--bg-base)',
                        padding: '16px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}>
                        <i className={`fas ${item.icon}`} style={{ fontSize: '20px', color: item.color }}></i>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => { closeAllModals(); setShowExpenseManager(true); }}
                    className="btn btn-primary"
                    style={{ borderRadius: 'var(--radius-md)', padding: '12px 24px', fontSize: '14px' }}
                  >
                    <i className="fas fa-rocket" style={{ marginRight: '8px' }}></i> Open Expense Manager
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'manage' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                    <i className="fas fa-database" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                    Data Manager
                  </h2>
                  <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '13px' }}>
                    Backup, import, export, and manage your business data
                  </p>
                </div>

                {/* Management Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px'
                }}>

                  {/* Data Operations */}
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '14px' }}>
                        <i className="fas fa-hdd"></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Data Operations</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Backup, restore, import & export</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button onClick={backupAllData} disabled={loading} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-cloud-download-alt'}`} style={{ marginRight: '8px', width: '14px', color: 'var(--success)' }}></i>
                        Backup All Data
                      </button>
                      <label style={{ width: '100%', cursor: 'pointer' }}>
                        <input type="file" accept=".json" onChange={restoreFromBackup} style={{ display: 'none' }} />
                        <div className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                          <i className="fas fa-upload" style={{ marginRight: '8px', width: '14px', color: 'var(--warning)' }}></i>
                          Restore from Backup
                        </div>
                      </label>
                      <button onClick={() => exportData('bills')} disabled={loading} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-file-csv'}`} style={{ marginRight: '8px', width: '14px', color: 'var(--accent)' }}></i>
                        Export to CSV
                      </button>
                      <label style={{ width: '100%', cursor: 'pointer' }}>
                        <input type="file" accept=".csv"
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
                                  showAlert({ message: `CSV loaded: ${lines.length - 1} rows. Import coming soon!`, type: 'info' });
                                } else {
                                  showAlert({ message: 'Invalid CSV format. Use exported CSV as template.', type: 'error' });
                                }
                              } catch { showAlert({ message: 'Error reading CSV file', type: 'error' }); }
                            };
                            reader.readAsText(file);
                          }}
                          style={{ display: 'none' }}
                        />
                        <div className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                          <i className="fas fa-file-import" style={{ marginRight: '8px', width: '14px', color: 'var(--text-muted)' }}></i>
                          Import from CSV
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Bill Management */}
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '14px' }}>
                        <i className="fas fa-file-invoice"></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Bill Management</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Edit, delete & bulk operations</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button onClick={() => { closeAllModals(); setShowBillManager(true); }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className="fas fa-pen" style={{ marginRight: '8px', width: '14px', color: 'var(--accent)' }}></i>
                        Open Bill Manager
                      </button>
                      <button onClick={() => { closeAllModals(); setShowBulkOperations(true); }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className="fas fa-layer-group" style={{ marginRight: '8px', width: '14px', color: 'var(--warning)' }}></i>
                        Bulk Operations
                      </button>
                      <button onClick={() => { closeAllModals(); setShowCustomerManager(true); }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className="fas fa-users" style={{ marginRight: '8px', width: '14px', color: 'var(--success)' }}></i>
                        Customer Manager
                      </button>
                    </div>
                  </div>

                  {/* Reports & Analytics */}
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '14px' }}>
                        <i className="fas fa-chart-bar"></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Reports</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Generate reports & analytics</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button onClick={() => { closeAllModals(); setShowReportsGenerator(true); }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className="fas fa-file-alt" style={{ marginRight: '8px', width: '14px', color: 'var(--accent)' }}></i>
                        Custom Reports
                      </button>
                      <button onClick={() => { const today = new Date().toISOString().split('T')[0]; const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; generateCustomReport('sales', { start: lastWeek, end: today }); }} disabled={loading} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-calendar-week'}`} style={{ marginRight: '8px', width: '14px', color: 'var(--warning)' }}></i>
                        Weekly Sales Report
                      </button>
                      <button onClick={() => { const today = new Date().toISOString().split('T')[0]; const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; generateCustomReport('customer', { start: lastMonth, end: today }); }} disabled={loading} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-user-chart'}`} style={{ marginRight: '8px', width: '14px', color: 'var(--success)' }}></i>
                        Customer Analysis
                      </button>
                    </div>
                  </div>

                  {/* System */}
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '14px' }}>
                        <i className="fas fa-cog"></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>System</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Health checks & diagnostics</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button onClick={testAllEndpoints} disabled={loading} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-heartbeat'}`} style={{ marginRight: '8px', width: '14px', color: 'var(--success)' }}></i>
                        System Health Check
                      </button>
                      <button onClick={() => {
                        const stats = { totalBills: pendingBills.length + billHistory.length, totalRevenue: [...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0), dbStatus: connectionStatus, lastBackup: localStorage.getItem('last_backup_date') || 'Never' };
                        showAlert({ message: `${stats.totalBills} bills · ₹${stats.totalRevenue.toLocaleString()} revenue · DB: ${stats.dbStatus}`, type: 'info' });
                      }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className="fas fa-info-circle" style={{ marginRight: '8px', width: '14px', color: 'var(--accent)' }}></i>
                        System Statistics
                      </button>
                      <button onClick={() => {
                        const systemReport = { timestamp: new Date().toISOString(), totalBills: pendingBills.length + billHistory.length, pendingBills: pendingBills.length, completedBills: billHistory.filter(b => b.status === 'completed').length, deliveredBills: billHistory.filter(b => b.status === 'delivered').length, totalRevenue: [...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0), uniqueCustomers: new Set([...pendingBills, ...billHistory].map(bill => bill.customerName)).size, databaseStatus: connectionStatus, averageBillValue: Math.round([...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0) / (pendingBills.length + billHistory.length)) || 0, todaysBills: [...pendingBills, ...billHistory].filter(bill => new Date(bill.createdAt).toDateString() === new Date().toDateString()).length, thisMonthRevenue: [...pendingBills, ...billHistory].filter(bill => { const d = new Date(bill.createdAt); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).reduce((sum, bill) => sum + bill.grandTotal, 0) };
                        const reportContent = `GenZ Laundry System Report\nGenerated: ${new Date().toLocaleString()}\n\n=== BUSINESS OVERVIEW ===\nTotal Bills: ${systemReport.totalBills}\nPending: ${systemReport.pendingBills}\nCompleted: ${systemReport.completedBills}\nDelivered: ${systemReport.deliveredBills}\n\n=== FINANCIAL ===\nTotal Revenue: ₹${systemReport.totalRevenue.toLocaleString()}\nThis Month: ₹${systemReport.thisMonthRevenue.toLocaleString()}\nAvg Bill: ₹${systemReport.averageBillValue}\n\n=== CUSTOMERS ===\nUnique: ${systemReport.uniqueCustomers}\nToday's Bills: ${systemReport.todaysBills}\n\n=== SYSTEM ===\nDB: ${systemReport.databaseStatus}\nGenerated: ${systemReport.timestamp}\n`;
                        const blob = new Blob([reportContent], { type: 'text/plain' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `system_report_${new Date().toISOString().split('T')[0]}.txt`; a.click(); window.URL.revokeObjectURL(url);
                        showAlert({ message: 'System report downloaded', type: 'success' });
                      }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '13px', padding: '8px 12px' }}>
                        <i className="fas fa-download" style={{ marginRight: '8px', width: '14px', color: 'var(--warning)' }}></i>
                        Download System Report
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary Bar */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '16px'
                }}>
                  {[
                    { label: 'Total Bills', value: (pendingBills.length + billHistory.length).toString(), icon: 'fa-file-invoice' },
                    { label: 'Revenue', value: `₹${[...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0).toLocaleString()}`, icon: 'fa-rupee-sign' },
                    { label: 'Database', value: connectionStatus === 'connected' ? 'Online' : connectionStatus === 'disconnected' ? 'Offline' : 'Testing', icon: connectionStatus === 'connected' ? 'fa-check-circle' : 'fa-times-circle' },
                    { label: 'Customers', value: new Set([...pendingBills, ...billHistory].map(bill => bill.customerName)).size.toString(), icon: 'fa-users' },
                    { label: 'Last Backup', value: localStorage.getItem('last_backup_date') ? new Date(localStorage.getItem('last_backup_date')!).toLocaleDateString('en-IN') : 'Never', icon: 'fa-clock' },
                    { label: 'Avg Bill', value: `₹${Math.round([...pendingBills, ...billHistory].reduce((sum, bill) => sum + bill.grandTotal, 0) / (pendingBills.length + billHistory.length)) || 0}`, icon: 'fa-receipt' }
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <i className={`fas ${item.icon}`} style={{ marginRight: '4px' }}></i>{item.label}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'tags' && (
              <TagHistoryViewer />
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '24px' }}>⚙️ Settings</h2>

                {/* Store Configuration Section */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '25px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '18px' }}>🏪 Store Configuration</h3>
                  <div style={{ display: 'grid', gap: '15px', maxWidth: '500px' }}>
                    <div>
                      <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Store Name
                      </label>
                      <input
                        type="text"
                        value={shopConfig.shopName}
                        onChange={(e) => setShopConfig({ ...shopConfig, shopName: e.target.value })}
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
                      <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Address
                      </label>
                      <textarea
                        value={shopConfig.address}
                        onChange={(e) => setShopConfig({ ...shopConfig, address: e.target.value })}
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
                      <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Contact Number
                      </label>
                      <input
                        type="text"
                        value={shopConfig.contact}
                        onChange={(e) => setShopConfig({ ...shopConfig, contact: e.target.value })}
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
                      <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        GST Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={shopConfig.gstNumber || ''}
                        onChange={(e) => setShopConfig({ ...shopConfig, gstNumber: e.target.value })}
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
                        marginTop: '10px'
                      }}
                    >
                      {loading ? '💾 Saving...' : '💾 Save Store Settings'}
                    </button>
                  </div>
                </div>

                {/* System Preferences Section */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '25px',
                  marginTop: '20px'
                }}>
                  <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '18px' }}>⚙️ System Preferences</h3>
                  <div style={{ display: 'grid', gap: '15px', maxWidth: '500px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '8px' }}>
                      <div>
                        <div style={{ color: 'white', fontWeight: '500' }}>Auto-print Receipts</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Automatically print receipt when a new bill is created</div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                        <input type="checkbox" checked={systemPrefs.autoPrint} onChange={(e) => setSystemPrefs({ ...systemPrefs, autoPrint: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: systemPrefs.autoPrint ? '#4CAF50' : '#ccc', transition: '.4s', borderRadius: '34px' }}>
                          <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: systemPrefs.autoPrint ? '28px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                        </span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '8px' }}>
                      <div>
                        <div style={{ color: 'white', fontWeight: '500' }}>Sound Alerts</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Play a sound when a new bill or notification arrives</div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                        <input type="checkbox" checked={systemPrefs.soundAlerts} onChange={(e) => setSystemPrefs({ ...systemPrefs, soundAlerts: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: systemPrefs.soundAlerts ? '#4CAF50' : '#ccc', transition: '.4s', borderRadius: '34px' }}>
                          <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: systemPrefs.soundAlerts ? '28px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                        </span>
                      </label>
                    </div>

                    <div>
                      <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Thank You Message (Receipt)
                      </label>
                      <input
                        type="text"
                        value={systemPrefs.thankYouMessage}
                        onChange={(e) => setSystemPrefs({ ...systemPrefs, thankYouMessage: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255, 255, 255, 0.9)', fontSize: '16px' }}
                      />
                    </div>

                    <div>
                      <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Terms & Conditions (Receipt)
                      </label>
                      <textarea
                        value={systemPrefs.termsAndConditions}
                        onChange={(e) => setSystemPrefs({ ...systemPrefs, termsAndConditions: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', minHeight: '80px', resize: 'vertical' }}
                      />
                    </div>

                    <button
                      onClick={saveSystemPrefs}
                      style={{
                        background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '15px 30px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        marginTop: '10px'
                      }}
                    >
                      💾 Save Preferences
                    </button>
                  </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <i className="fas fa-history" style={{ marginRight: '12px', color: 'var(--accent)' }}></i>
                      Bill History <span style={{ marginLeft: '12px', background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '14px', border: '1px solid var(--border-subtle)' }}>{billHistory.length}</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '14px' }}>
                      View all completed and delivered bills • Use Bill Management for editing
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={loadBillHistory}
                      disabled={loading}
                      className="btn btn-ghost"
                      style={{ borderRadius: 'var(--radius-md)', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                      <i className={`fas ${loading ? 'fa-circle-notch fa-spin' : 'fa-sync-alt'}`}></i> Refresh History
                    </button>
                    <button
                      onClick={() => exportData('bills')}
                      disabled={loading}
                      className="btn btn-ghost"
                      style={{ borderRadius: 'var(--radius-md)', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                      <i className={`fas ${loading ? 'fa-circle-notch fa-spin' : 'fa-file-csv'}`}></i> Export CSV
                    </button>
                    <button
                      onClick={() => setShowBillManager(true)}
                      className="btn btn-primary"
                      style={{ borderRadius: 'var(--radius-md)' }}
                    >
                      <i className="fas fa-tasks"></i> Manage Bills
                    </button>
                  </div>
                </div>

                {/* Search and Filter */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  marginBottom: '24px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '16px', alignItems: 'end', marginBottom: '16px' }}>
                    <div>
                      <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <i className="fas fa-search" style={{ marginRight: '6px' }}></i> Search Bills
                      </label>
                      <input
                        type="text"
                        placeholder="Search by customer name, bill number, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-base)' }}
                      />
                    </div>
                    <div>
                      <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <i className="fas fa-filter" style={{ marginRight: '6px' }}></i> Status Filter
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-base)' }}
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
                          setStartDateFilter('');
                          setEndDateFilter('');
                        }}
                        className="btn btn-ghost"
                        style={{ height: '42px', borderRadius: 'var(--radius-md)', color: 'var(--error)' }}
                      >
                        <i className="fas fa-times"></i> Clear Filters
                      </button>
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr) 2fr', gap: '16px', alignItems: 'end' }}>
                    <div>
                      <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <i className="far fa-calendar-alt" style={{ marginRight: '6px' }}></i> Start Date
                      </label>
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-base)' }}
                      />
                    </div>
                    <div>
                      <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <i className="far fa-calendar-alt" style={{ marginRight: '6px' }}></i> End Date
                      </label>
                      <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', background: 'var(--bg-base)' }}
                      />
                    </div>
                    <div>
                      {(startDateFilter || endDateFilter) && (
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(39, 174, 96, 0.1)',
                          border: '1px solid rgba(39, 174, 96, 0.2)',
                          color: 'var(--success)',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '16px',
                          height: '42px'
                        }}>
                          <span><i className="fas fa-wallet" style={{ marginRight: '6px' }}></i> Revenue: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(dateFilteredRevenue)}</span>
                          <span style={{ width: '1px', height: '14px', background: 'currentColor', opacity: 0.3 }}></span>
                          <span><i className="fas fa-file-invoice" style={{ marginRight: '6px' }}></i> Bills: {dateFilteredBillCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bills Display */}
                {filteredBillHistory.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    padding: '80px 20px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px dashed var(--border-subtle)'
                  }}>
                    <i className="fas fa-file-invoice fa-4x" style={{ opacity: 0.3, marginBottom: '24px' }}></i>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>
                      {searchTerm || statusFilter ? 'No bills match your filters' : 'No bills found'}
                    </h3>
                    <p style={{ fontSize: '15px', margin: '0 auto 24px auto', maxWidth: '400px' }}>
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
                        className="btn btn-primary"
                        style={{ borderRadius: 'var(--radius-md)' }}
                      >
                        <i className="fas fa-sync-alt"></i> Show All Bills
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {filteredBillHistory.map((bill, index) => (
                      <div key={bill.id || bill._id || index} style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.3s ease',
                        animation: `slideIn 0.5s ease-out ${index * 0.1}s both`,
                        position: 'relative'
                      }}>
                        {/* Serial Number Badge */}
                        <div style={{
                          position: 'absolute',
                          top: '16px',
                          left: '16px',
                          background: 'var(--bg-base)',
                          color: 'var(--text-secondary)',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          {index + 1}
                        </div>

                        <div style={{ flex: 1, paddingLeft: '48px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {bill.customerName}
                            </h4>
                            <span style={{
                              background: bill.status === 'delivered' ? 'rgba(39, 174, 96, 0.1)' : bill.status === 'completed' ? 'rgba(52, 152, 219, 0.1)' : 'rgba(243, 156, 18, 0.1)',
                              border: `1px solid ${bill.status === 'delivered' ? 'rgba(39, 174, 96, 0.3)' : bill.status === 'completed' ? 'rgba(52, 152, 219, 0.3)' : 'rgba(243, 156, 18, 0.3)'}`,
                              padding: '4px 12px',
                              borderRadius: 'var(--radius-full)',
                              color: bill.status === 'delivered' ? 'var(--success)' : bill.status === 'completed' ? '#3498db' : 'var(--warning)',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              <i className={`fas ${bill.status === 'delivered' ? 'fa-check-circle' : bill.status === 'completed' ? 'fa-clipboard-check' : 'fa-clock'}`} style={{ marginRight: '6px' }}></i>
                              {bill.status}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                            <div>
                              <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                <i className="fas fa-hashtag" style={{ width: '16px', marginRight: '6px', color: 'var(--accent)' }}></i> Bill No: <strong style={{ color: 'var(--text-primary)' }}>{bill.billNumber}</strong>
                              </p>
                              <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                <i className="fas fa-phone-alt" style={{ width: '16px', marginRight: '6px', color: 'var(--accent)' }}></i> Phone: <strong style={{ color: 'var(--text-primary)' }}>{bill.customerPhone || 'N/A'}</strong>
                              </p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                <i className="fas fa-tshirt" style={{ width: '16px', marginRight: '6px', color: 'var(--accent)' }}></i> Items: <strong style={{ color: 'var(--text-primary)' }}>{bill.items.length} items</strong>
                              </p>
                              <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                <i className="fas fa-rupee-sign" style={{ width: '16px', marginRight: '6px', color: 'var(--success)' }}></i> Total: <strong style={{ color: 'var(--text-primary)', fontSize: '16px' }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(bill.grandTotal)}</strong>
                              </p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                <i className="fas fa-calendar-plus" style={{ width: '16px', marginRight: '6px', color: 'var(--accent)' }}></i> Created: <strong style={{ color: 'var(--text-primary)' }}>{new Date(bill.createdAt).toLocaleDateString('en-IN')}</strong>
                              </p>
                              {bill.deliveredAt && (
                                <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                  <i className="fas fa-truck" style={{ width: '16px', marginRight: '6px', color: 'var(--accent)' }}></i> Delivered: <strong style={{ color: 'var(--text-primary)' }}>{new Date(bill.deliveredAt).toLocaleDateString('en-IN')}</strong>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Item Details */}
                          <div style={{
                            background: 'var(--bg-base)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 16px',
                            marginTop: '16px',
                            border: '1px solid var(--border-subtle)'
                          }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              <i className="fas fa-box-open" style={{ marginRight: '6px' }}></i> Items Details:
                            </p>
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {bill.items.slice(0, 3).map((item: any, idx: number) => (
                                <span key={idx} style={{ background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                  {item.name} <span style={{ color: 'var(--text-secondary)' }}>(₹{item.rate} × {item.quantity})</span>
                                </span>
                              ))}
                              {bill.items.length > 3 && (
                                <span style={{ background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                  +{bill.items.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '32px' }}>
                          <button
                            onClick={() => reprintBill(bill)}
                            className="btn btn-ghost"
                            style={{ borderRadius: 'var(--radius-md)', width: '100%', justifyContent: 'flex-start' }}
                          >
                            <i className="fas fa-print" style={{ width: '20px' }}></i> Reprint
                          </button>

                          {bill.status !== 'delivered' && (
                            <button
                              onClick={() => markBillAsDelivered(bill.id || bill._id)}
                              className="btn btn-primary"
                              style={{ borderRadius: 'var(--radius-md)', width: '100%', justifyContent: 'flex-start' }}
                            >
                              <i className="fas fa-truck" style={{ width: '20px' }}></i> Deliver
                            </button>
                          )}

                          <button
                            onClick={() => {
                              // We can pass the bill to edit specifically
                              setEditBillToPass(bill);
                              setShowBillManager(true);
                            }}
                            className="btn btn-ghost"
                            style={{ borderRadius: 'var(--radius-md)', width: '100%', justifyContent: 'flex-start' }}
                          >
                            <i className="fas fa-edit" style={{ width: '20px' }}></i> Edit Bill
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary Stats */}
                {billHistory.length > 0 && (
                  <div style={{
                    marginTop: '32px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fas fa-chart-bar" style={{ color: 'var(--accent)' }}></i> History Summary
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                      <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          <i className="fas fa-file-invoice" style={{ marginRight: '6px' }}></i> Total Bills
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {billHistory.length}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          <i className="fas fa-rupee-sign" style={{ marginRight: '6px' }}></i> Total Revenue
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(billHistory.reduce((sum, bill) => sum + bill.grandTotal, 0))}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          <i className="fas fa-truck" style={{ marginRight: '6px' }}></i> Delivered
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3498db' }}>
                          {billHistory.filter(bill => bill.status === 'delivered').length}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          <i className="fas fa-chart-pie" style={{ marginRight: '6px' }}></i> Avg. Bill Value
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(billHistory.reduce((sum, bill) => sum + bill.grandTotal, 0) / (billHistory.length || 1)))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Removed Analytics Modal - Now renders inline */}

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
              background: 'rgba(15, 23, 42, 0.8)', // Darker auth backdrop
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}>
              <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-xl)',
                padding: '32px',
                width: '100%',
                maxWidth: '650px',
                maxHeight: '85vh',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)'
              }} className="custom-scrollbar">
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--warning-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                      <i className="fas fa-layer-group" style={{ fontSize: '18px' }}></i>
                    </div>
                    <div>
                      <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                        Bulk Operations
                      </h2>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>Manage multiple bills simultaneously</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBulkOperations(false)}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Select Bills
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{selectedBills.length}</span> / {[...pendingBills, ...billHistory].length} selected
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--bg-base)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    maxHeight: '340px',
                    overflowY: 'auto'
                  }} className="custom-scrollbar">
                    {/* Select All Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'var(--bg-elevated)',
                      borderBottom: '1px solid var(--border-subtle)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1
                    }}>
                      <div className="checkbox-wrapper">
                         <input
                           type="checkbox"
                           id="selectAllBillsBulk"
                           checked={selectedBills.length === [...pendingBills, ...billHistory].length && [...pendingBills, ...billHistory].length > 0}
                           onChange={(e) => {
                             if (e.target.checked) {
                               setSelectedBills([...pendingBills, ...billHistory].map(b => b.id || b._id));
                             } else {
                               setSelectedBills([]);
                             }
                           }}
                         />
                         <label htmlFor="selectAllBillsBulk"></label>
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>Select All Bills</span>
                    </div>

                    {/* Bills List */}
                    <div style={{ padding: '8px' }}>
                      {[...pendingBills, ...billHistory].map(bill => (
                        <div key={bill.id || bill._id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '12px 16px',
                            background: selectedBills.includes(bill.id || bill._id) ? 'var(--accent-muted)' : 'var(--bg-surface)',
                            border: `1px solid ${selectedBills.includes(bill.id || bill._id) ? 'var(--accent)' : 'transparent'}`,
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => {
                            const billId = bill.id || bill._id;
                            if (selectedBills.includes(billId)) {
                              setSelectedBills(selectedBills.filter(id => id !== billId));
                            } else {
                              setSelectedBills([...selectedBills, billId]);
                            }
                          }}
                        >
                          <div className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              id={`bulk-bill-${bill.id || bill._id}`}
                              checked={selectedBills.includes(bill.id || bill._id)}
                              onChange={(e) => {
                                const billId = bill.id || bill._id;
                                if (e.target.checked) {
                                  setSelectedBills([...selectedBills, billId]);
                                } else {
                                  setSelectedBills(selectedBills.filter(id => id !== billId));
                                }
                              }}
                            />
                            <label htmlFor={`bulk-bill-${bill.id || bill._id}`}></label>
                          </div>
                          
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                                {bill.customerName}
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontFamily: 'monospace', background: 'var(--bg-base)', padding: '2px 6px', borderRadius: '4px' }}>
                                  #{bill.billNumber}
                                </span>
                                <span>•</span>
                                <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>₹{bill.grandTotal}</span>
                              </div>
                            </div>
                            
                            <div>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                background: bill.status === 'completed' || bill.status === 'delivered' ? 'var(--success-muted)' : (bill.status === 'pending' ? 'var(--warning-muted)' : 'var(--bg-elevated)'),
                                color: bill.status === 'completed' || bill.status === 'delivered' ? 'var(--success)' : (bill.status === 'pending' ? 'var(--warning)' : 'var(--text-muted)'),
                                border: `1px solid ${bill.status === 'completed' || bill.status === 'delivered' ? 'rgba(34, 197, 94, 0.2)' : (bill.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'var(--border-subtle)')}`
                              }}>
                                {bill.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {[...pendingBills, ...billHistory].length === 0 && (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <i className="fas fa-inbox" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                          <p style={{ margin: 0, fontSize: '14px' }}>No bills available for bulk operations</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ color: 'var(--text-muted)', margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selection</h4>
                      <button
                        onClick={() => setSelectedBills([])}
                        disabled={selectedBills.length === 0}
                        className="btn btn-ghost"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <i className="fas fa-eraser" style={{ marginRight: '8px' }}></i>
                        Clear Selection
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ color: 'var(--text-muted)', margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</h4>
                      <button
                        onClick={() => {
                          if (selectedBills.length > 0) {
                            showConfirm(`Are you sure you want to mark ${selectedBills.length} bills as completed?`, async () => {
                              await bulkMarkAsCompleted(selectedBills);
                              setSelectedBills([]);
                              setShowBulkOperations(false);
                            });
                          }
                        }}
                        disabled={selectedBills.length === 0 || loading}
                        className="btn btn-primary"
                        style={{ 
                          width: '100%', 
                          justifyContent: 'center',
                          background: 'var(--success)',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                        }}
                      >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>}
                        Mark Completed
                      </button>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={() => {
                            if (selectedBills.length > 0) {
                              showConfirm(`Are you sure you want to mark ${selectedBills.length} bills as delivered?`, async () => {
                                await bulkMarkAsDelivered(selectedBills);
                                setSelectedBills([]);
                                setShowBulkOperations(false);
                              });
                            }
                          }}
                          disabled={selectedBills.length === 0 || loading}
                          className="btn btn-primary"
                          style={{ 
                            flex: 1, 
                            justifyContent: 'center',
                            background: 'var(--accent)',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' 
                          }}
                        >
                          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-truck" style={{ marginRight: '8px' }}></i>}
                          Mark Delivered
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
                          className="btn btn-ghost"
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          <i className="fas fa-file-export" style={{ marginRight: '8px' }}></i>
                          Export Selected
                        </button>
                      </div>
                    </div>
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
                      .sort(([, a]: [string, any], [, b]: [string, any]) => b.total - a.total)
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
                background: 'rgba(121, 106, 106, 0.27)',
                backdropFilter: 'blur(25px)',
                borderRadius: '16px',
                border: '2px solid rgba(95, 69, 69, 0.4)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
                zIndex: 2147483647,
                color: '#000000ff',
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
                      color: '#000000ff',
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
    </>
  );
};

export default AdminDashboard;