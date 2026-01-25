// Simple Authentication API service
import config from './config';

const API_BASE_URL = config.API_BASE_URL;

// Generate device fingerprint
const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Get stored device fingerprint or generate new one
const getDeviceFingerprint = (): string => {
  let fingerprint = localStorage.getItem('device_fingerprint');
  if (!fingerprint) {
    fingerprint = generateDeviceFingerprint();
    localStorage.setItem('device_fingerprint', fingerprint);
  }
  return fingerprint;
};

// API request helper with authentication headers
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const deviceFingerprint = getDeviceFingerprint();
  const token = localStorage.getItem('auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Device-Fingerprint': deviceFingerprint,
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

export const authApi = {
  // Login
  login: async (username: string, password: string) => {
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (response.success && response.token) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user_data', JSON.stringify(response.user));
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminLoginTime', Date.now().toString());
      }

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: error.message };
    }
  },

  // Logout
  logout: async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      // Clear local storage regardless of API success
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('adminAuthenticated');
      localStorage.removeItem('adminLoginTime');
    }
  },

  // Verify token
  verifyToken: async () => {
    try {
      return await apiRequest('/auth/verify');
    } catch (error) {
      console.error('Token verification failed:', error);
      // Clear invalid token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('adminAuthenticated');
      localStorage.removeItem('adminLoginTime');
      return { success: false, message: error.message };
    }
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      return await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    } catch (error) {
      console.error('Password change failed:', error);
      return { success: false, message: error.message };
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      return await apiRequest('/auth/profile');
    } catch (error) {
      console.error('Profile fetch failed:', error);
      return { success: false, message: error.message };
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('auth_token');
    const authStatus = localStorage.getItem('adminAuthenticated');
    return !!(token && authStatus === 'true');
  },

  // Get stored user data
  getUserData: () => {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  },

  // Get device fingerprint
  getDeviceFingerprint,
};

export default authApi;