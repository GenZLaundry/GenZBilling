// Production configuration for GenZ Laundry POS
const config = {
  // Backend API URL - Update this after deploying to Railway
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  
  // Thermal server runs locally on user's machine
  THERMAL_SERVER_URL: 'http://localhost:3001',
  
  // App information
  APP_NAME: 'GenZ Laundry POS',
  VERSION: '4.0.0',
  
  // Environment
  IS_PRODUCTION: import.meta.env.PROD,
  
  // Domain configuration
  DOMAIN: 'billing.genzlaundry.com'
};

export default config;