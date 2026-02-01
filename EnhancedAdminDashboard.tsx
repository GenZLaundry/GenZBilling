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

interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  totalBills: number;
  pendingBills: number;
  completedBills: number;
  totalCustomers: number;
  avgBillValue: number;
  monthlyGrowth: number;
}

const EnhancedAdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToBilling, onLogout }) => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'bills' | 'expenses' | 'settings' | 'customers'>('dashboard');
  const [shopConfig, setShopConfig] = useState<ShopConfig>({
    shopName: 'GenZ Laundry',
    address: 'Sabji Mandi Circle,Ratanada, Jodhpur (342011)',
    contact: '+91 9256930727',
    gstNumber: ''
  });
  
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalBills: 0,
    pendingBills: 0,
    completedBills: 0,
    totalCustomers: 0,
    avgBillValue: 0,
    monthlyGrowth: 0
  });

  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [billHistory, setBillHistory] = useState<PendingBill[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showExpenseManager, setShowExpenseManager] = useState(false);
  const [showBillManager, setShowBillManager] = useState(false);
  const [showAddPreviousBill, setShowAddPreviousBill] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadShopConfig(),
      loadPendingBills(),
      loadBillHistory(),
      calculateStats()
    ]);
    setLoading(false);
  };

  const loadShopConfig = async () => {
    try {
      const response = await apiService.getShopConfig();
      if (response.success && response.data) {
        setShopConfig(response.data);
      }
    } catch (error) {
      const saved = localStorage.getItem('laundry_shop_config');
      if (saved) {
        setShopConfig(JSON.parse(saved));
      }
    }
  };

  const loadPendingBills = async () => {
    try {
      const response = await apiService.getPendingBills();
      if (response.success && response.data) {
        setPendingBills(response.data);
      }
    } catch (error) {
      const saved = localStorage.getItem('laundry_pending_bills');
      if (saved) {
        setPendingBills(JSON.parse(saved));
      }
    