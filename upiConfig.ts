// UPI Payment Configuration
import apiService from './api';

export interface UPIConfig {
  upiId: string;
  payeeName: string;
  merchantCode?: string;
  alternativeConfigs?: UPIConfig[];
}

// Default UPI configuration
export const defaultUPIConfig: UPIConfig = {
  upiId: '6367493127@ybl', // Default PhonePe UPI ID
  payeeName: 'GenZ Laundry',
  merchantCode: 'GENZ001'
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

// Synchronously get cached UPI configuration from localStorage or default
export const getUPIConfig = (): UPIConfig => {
  try {
    const saved = localStorage.getItem('laundry_upi_config');
    if (saved) {
      const config = JSON.parse(saved);
      if (config.upiId && config.payeeName) {
        return config;
      }
    }
  } catch (error) {
    console.warn('⚠️ Error loading UPI config from localStorage cache:', error);
  }
  
  return defaultUPIConfig;
};

// Asynchronously fetch UPI configuration directly from MongoDB database
export const fetchUPIConfigFromDB = async (): Promise<UPIConfig> => {
  try {
    const response = await apiService.getUPIConfig();
    if (response.success && response.data) {
      const dbConfig: UPIConfig = {
        upiId: response.data.upiId,
        payeeName: response.data.payeeName,
        merchantCode: response.data.merchantCode || '',
        alternativeConfigs: response.data.alternativeConfigs || alternativeUPIConfigs
      };
      // Cache in localStorage for offline availability
      localStorage.setItem('laundry_upi_config', JSON.stringify(dbConfig));
      console.log('✅ Fetched UPI config from MongoDB Atlas:', dbConfig.upiId);
      return dbConfig;
    }
  } catch (error) {
    console.warn('⚠️ MongoDB UPI config fetch error, falling back to local cache:', error);
  }
  
  return getUPIConfig();
};

// Synchronously save to local cache and trigger async database update
export const saveUPIConfig = (config: UPIConfig): void => {
  try {
    localStorage.setItem('laundry_upi_config', JSON.stringify(config));
  } catch (error) {
    console.error('Error saving UPI config to localStorage cache:', error);
  }
  
  // Also push to MongoDB asynchronously
  saveUPIConfigToDB(config).catch(err => {
    console.warn('⚠️ Background sync of UPI config to MongoDB pending:', err);
  });
};

// Asynchronously save UPI configuration to MongoDB Database
export const saveUPIConfigToDB = async (config: UPIConfig): Promise<UPIConfig> => {
  try {
    localStorage.setItem('laundry_upi_config', JSON.stringify(config));
    const response = await apiService.updateUPIConfig(config);
    if (response.success && response.data) {
      console.log('✅ Saved UPI config to MongoDB successfully:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error('❌ Error persisting UPI config to MongoDB:', error);
    throw error;
  }
  return config;
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