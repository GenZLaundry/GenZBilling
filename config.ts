// Production configuration for GenZ Laundry POS
const config = {
  // Backend API URL - Hardcoded for manual deployment
  API_BASE_URL: typeof window !== 'undefined' && window.location.hostname === 'billing.genzlaundry.com'
    ? 'https://genzbilling.onrender.com/api'  // Production backend on Render
    : 'http://localhost:8000/api',  // Local development
  
  // Thermal server runs locally on user's machine
  THERMAL_SERVER_URL: 'http://localhost:3001',
  
  // App information
  APP_NAME: 'GenZ Laundry POS',
  VERSION: '4.0.0',
  
  // Environment
  IS_PRODUCTION: typeof window !== 'undefined' && window.location.hostname === 'billing.genzlaundry.com',
  
  // Domain configuration
  DOMAIN: 'billing.genzlaundry.com'
};

export default config;
