// UPI Payment Configuration
export interface UPIConfig {
  upiId: string;
  payeeName: string;
  merchantCode?: string;
}

// Default UPI configuration - Update these with your actual UPI details
export const defaultUPIConfig: UPIConfig = {
  upiId: '6367493127@ybl', // Your PhonePe UPI ID
  payeeName: 'GenZ Laundry',
  merchantCode: 'GENZ001' // Optional merchant code
};

// Alternative UPI IDs for fallback
export const alternativeUPIConfigs: UPIConfig[] = [
  {
    upiId: '6367493127@ybl',
    payeeName: 'GenZ Laundry',
    merchantCode: 'GENZ002'
  },
  {
    upiId: 'genzlaundry@paytm',
    payeeName: 'GenZ Laundry',
    merchantCode: 'GENZ003'
  },
  {
    upiId: 'genzlaundry@googlepay',
    payeeName: 'GenZ Laundry', 
    merchantCode: 'GENZ004'
  }
];

// Get UPI configuration from localStorage or use default
export const getUPIConfig = (): UPIConfig => {
  try {
    const saved = localStorage.getItem('laundry_upi_config');
    if (saved) {
      const config = JSON.parse(saved);
      // Validate required fields
      if (config.upiId && config.payeeName) {
        return config;
      }
    }
  } catch (error) {
    console.warn('Error loading UPI config from localStorage:', error);
  }
  
  return defaultUPIConfig;
};

// Save UPI configuration to localStorage
export const saveUPIConfig = (config: UPIConfig): void => {
  try {
    localStorage.setItem('laundry_upi_config', JSON.stringify(config));
  } catch (error) {
    console.error('Error saving UPI config to localStorage:', error);
  }
};

// Validate UPI ID format
export const isValidUPIId = (upiId: string): boolean => {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  return upiRegex.test(upiId);
};

// Generate UPI payment URL
export const generateUPIUrl = (
  config: UPIConfig,
  amount: number,
  transactionNote: string = 'Laundry Payment'
): string => {
  const params = new URLSearchParams({
    pa: config.upiId,
    pn: config.payeeName,
    am: amount.toString(),
    cu: 'INR',
    tn: transactionNote
  });

  if (config.merchantCode) {
    params.append('mc', config.merchantCode);
  }

  return `upi://pay?${params.toString()}`;
};