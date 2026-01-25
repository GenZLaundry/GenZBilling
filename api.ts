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
          throw new Error('Cannot connect to server - please ensure backend is running on port 8000');
        }
        if (error.message.includes('CORS')) {
          throw new Error('CORS error - server may not be configured properly');
        }
        throw error;
      }
      throw new Error('Unknown API error');
    }
  }

  // Bills API
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

  async updateBillStatus(billId: string, status: string) {
    return this.request(`/bills/${billId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteBill(billId: string) {
    return this.request(`/bills/${billId}`, {
      method: 'DELETE',
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

  // Analytics API
  async getDashboardAnalytics() {
    // Add cache-busting parameter
    const cacheBuster = `?_t=${Date.now()}`;
    return this.request(`/analytics/dashboard${cacheBuster}`);
  }

  async getDailyAnalytics(startDate: string, endDate: string) {
    return this.request(`/analytics/daily?startDate=${startDate}&endDate=${endDate}`);
  }

  async getWeeklyAnalytics(year?: number, week?: number) {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (week) params.append('week', week.toString());
    
    return this.request(`/analytics/weekly?${params.toString()}`);
  }

  async getMonthlyAnalytics(year?: number, month?: number) {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    
    return this.request(`/analytics/monthly?${params.toString()}`);
  }

  async getComparisonAnalytics(period: 'day' | 'week' | 'month' = 'month') {
    return this.request(`/analytics/comparison?period=${period}`);
  }

  async getProfitAnalysis(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.request(`/analytics/profit?period=${period}`);
  }

  // Expense API
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

  // Shop Configuration API
  async getShopConfig() {
    return this.request('/shop-config');
  }

  async updateShopConfig(configData: any) {
    return this.request('/shop-config', {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  }

  // Health check
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
}

export const apiService = new ApiService();
export default apiService;