// Production configuration for GenZ Laundry POS
const isProduction = typeof window !== 'undefined' && window.location.hostname === 'billing.genzlaundry.com';
const apiUrl = isProduction 
  ? 'https://genzbilling.onrender.com/api'  // Production backend on Render
  : 'http://localhost:8000/api';  // Local development

// Debug logging
console.log('🔧 Config Debug Info:');
console.log('- Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server-side');
console.log('- Is production:', isProduction);
console.log('- API URL:', apiUrl);

const config = {
  // Backend API URL
  API_BASE_URL: apiUrl,
  
  // Thermal server runs locally on user's machine
  THERMAL_SERVER_URL: 'http://localhost:3001',
  
  // App information
  APP_NAME: 'GenZ Laundry POS',
  VERSION: '4.0.0',
  
  // Environment
  IS_PRODUCTION: isProduction,
  
  // Domain configuration
  DOMAIN: 'billing.genzlaundry.com'
};

export default config;