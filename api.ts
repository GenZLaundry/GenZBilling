// API Service for GenZ Laundry Backend
import config from './config';

const API_BASE_URL = config.API_BASE_URL;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      console.log(`🔄 API Request: ${API_BASE_URL}${endpoint}`);
      console.log(`🌐 Environment: ${import.meta.env.PROD ? 'PRODUCTION' : 'DEVELOPMENT'}`);
      console.log(`🌐 Request options:`, { 
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        mode: 'cors'
      });

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        mode: 'cors', // Explicitly set CORS mode
        ...options,
      });

      clearTimeout(timeoutId);

      console.log(`✅ API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error Response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log(`📦 API Data:`, data);

      return data;
    } catch (error) {
      console.error('❌ API request failed:', error);
      
      // Return a structured error response
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please check your connection');
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error(`Cannot connect to server at ${API_BASE_URL} - please check if backend is running and accessible`);
        }
        if (error.message.includes('CORS')) {
          throw new Error('CORS error - server may not be configured properly for this domain');
        }
        throw error;
      }
      throw new Error('Unknown API error');
    }
  }

  // ===== BILLS API =====
  async createBill(billData: any) {
    return this.request('/bills', {
      method: 'POST',
      body: JSON.stringify(billData),
    });
  }

  async getBills(params: {
    page?: number;
    limit?: number;
    status?: string;
    customerName?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request(`/bills?${queryParams.toString()}`);
  }

  async getPendingBills() {
    return this.request('/bills/pending');
  }

  async getCompletedBills(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request(`/bills/completed?${queryParams.toString()}`);
  }

  async getCustomerBills(customerName: string, limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/bills/customer/${encodeURIComponent(customerName)}${params}`);
  }

  async updateBillStatus(billId: string, status: string) {
    return this.request(`/bills/${billId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async bulkUpdateBillStatus(billIds: string[], status: string) {
    return this.request('/bills/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ billIds, status }),
    });
  }

  async deleteBill(billId: string) {
    return this.request(`/bills/${billId}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteBills(billIds: string[]) {
    return this.request('/bills/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ billIds }),
    });
  }

  async updateBill(billId: string, billData: any) {
    return this.request(`/bills/${billId}`, {
      method: 'PUT',
      body: JSON.stringify(billData),
    });
  }

  async getBillById(billId: string) {
    return this.request(`/bills/${billId}`);
  }

  // ===== ANALYTICS API =====
  async getDashboardOverview() {
    const cacheBuster = `?_t=${Date.now()}`;
    return this.request(`/analytics/dashboard-overview${cacheBuster}`);
  }

  async getBusinessReports(params: {
    period?: 'today' | 'week' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request(`/analytics/business-reports?${queryParams.toString()}`);
  }

  async getStats() {
    return this.request('/analytics/stats');
  }

  async getRevenueChart(period: 'week' | 'month' | 'year' = 'week') {
    return this.request(`/analytics/revenue-chart?period=${period}`);
  }

  // Legacy analytics methods (for backward compatibility)
  async getDashboardAnalytics() {
    return this.getDashboardOverview();
  }

  async getDailyAnalytics(startDate: string, endDate: string) {
    return this.getBusinessReports({ period: 'custom', startDate, endDate });
  }

  async getWeeklyAnalytics(year?: number, week?: number) {
    return this.getBusinessReports({ period: 'week' });
  }

  async getMonthlyAnalytics(year?: number, month?: number) {
    return this.getBusinessReports({ period: 'month' });
  }

  async getComparisonAnalytics(period: 'day' | 'week' | 'month' = 'month') {
    return this.getBusinessReports({ period });
  }

  async getProfitAnalysis(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.getBusinessReports({ period });
  }

  // ===== EXPENSES API =====
  async getExpenses(params: {
    page?: number;
    limit?: number;
    category?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request(`/expenses?${queryParams.toString()}`);
  }

  async getExpenseSummary(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.request(`/expenses/summary?period=${period}`);
  }

  async createExpense(expenseData: {
    title: string;
    description?: string;
    amount: number;
    category: string;
    date?: string;
  }) {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  async updateExpense(id: string, expenseData: {
    title: string;
    description?: string;
    amount: number;
    category: string;
    date?: string;
  }) {
    return this.request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    });
  }

  async deleteExpense(id: string) {
    return this.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== SHOP CONFIGURATION API =====
  async getShopConfig() {
    return this.request('/shop-config');
  }

  async updateShopConfig(configData: any) {
    return this.request('/shop-config', {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  }

  // ===== AUTHENTICATION API =====
  async login(credentials: { username: string; password: string }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async validateSession() {
    return this.request('/auth/validate');
  }

  // ===== UTILITY METHODS =====
  async healthCheck() {
    return this.request('/health');
  }

  // Connection test with detailed logging
  async testConnection() {
    try {
      console.log('🔍 Testing API connection...');
      const response = await this.healthCheck();
      console.log('✅ Connection test successful:', response);
      return response;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }

  // ===== DATA MANAGEMENT METHODS =====
  
  // Get all data for dashboard overview
  async getAllDashboardData() {
    try {
      const [overview, stats, revenueChart] = await Promise.all([
        this.getDashboardOverview(),
        this.getStats(),
        this.getRevenueChart('week')
      ]);

      return {
        success: true,
        data: {
          overview: overview.data,
          stats: stats.data,
          revenueChart: revenueChart.data
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return {
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get all bills data (pending + completed)
  async getAllBillsData() {
    try {
      const [pending, completed] = await Promise.all([
        this.getPendingBills(),
        this.getCompletedBills({ limit: 100 })
      ]);

      return {
        success: true,
        data: {
          pending: pending.data || [],
          completed: completed.data || [],
          history: completed.data || []
        }
      };
    } catch (error) {
      console.error('Error fetching bills data:', error);
      return {
        success: false,
        message: 'Failed to fetch bills data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get comprehensive analytics data
  async getAnalyticsData(period: 'today' | 'week' | 'month' | 'year' = 'month') {
    try {
      const [businessReports, expenseSummary] = await Promise.all([
        this.getBusinessReports({ period }),
        this.getExpenseSummary(period === 'today' ? 'day' : period)
      ]);

      return {
        success: true,
        data: {
          reports: businessReports.data,
          expenses: expenseSummary.data
        }
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return {
        success: false,
        message: 'Failed to fetch analytics data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const apiService = new ApiService();
export default apiService;