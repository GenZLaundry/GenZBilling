// Production configuration for GenZ Laundry POS
const config = {
  // Backend API URL - Automatically detects environment
  API_BASE_URL: (() => {
    // If we're in production (built for deployment), use the production backend
    if (import.meta.env.PROD) {
      // Use environment variable if available, otherwise use the known Render URL
      return import.meta.env.VITE_API_URL || 
             'https://genzlaundry.onrender.com/api';  // Your actual Render URL
    }
    // Local development
    return 'http://localhost:8000/api';
  })(),
  
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
