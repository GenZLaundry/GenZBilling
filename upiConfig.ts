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
  upiId: '6367493127@ybl',
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
    // 1. Try dedicated UPI config route
    const response = await apiService.getUPIConfig();
    if (response.success && response.data && response.data.upiId) {
      const dbConfig: UPIConfig = {
        upiId: response.data.upiId,
        payeeName: response.data.payeeName,
        merchantCode: response.data.merchantCode || '',
        alternativeConfigs: response.data.alternativeConfigs || alternativeUPIConfigs
      };
      localStorage.setItem('laundry_upi_config', JSON.stringify(dbConfig));
      console.log('✅ Fetched UPI config from MongoDB via /upi-config:', dbConfig.upiId);
      return dbConfig;
    }
  } catch (error) {
    console.warn('⚠️ /api/upi-config route unavailable, trying /api/shop-config route...');
  }

  try {
    // 2. Fallback to existing /api/shop-config route in MongoDB
    const shopResponse = await apiService.getShopConfig();
    if (shopResponse.success && shopResponse.data && shopResponse.data.upiId) {
      const dbConfig: UPIConfig = {
        upiId: shopResponse.data.upiId,
        payeeName: shopResponse.data.payeeName || 'GenZ Laundry',
        merchantCode: shopResponse.data.merchantCode || 'GENZ001',
        alternativeConfigs: shopResponse.data.alternativeConfigs || alternativeUPIConfigs
      };
      localStorage.setItem('laundry_upi_config', JSON.stringify(dbConfig));
      console.log('✅ Fetched UPI config from MongoDB via /shop-config:', dbConfig.upiId);
      return dbConfig;
    }
  } catch (err) {
    console.warn('⚠️ Error fetching shop config from MongoDB:', err);
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
  
  saveUPIConfigToDB(config).catch(err => {
    console.warn('⚠️ Background sync of UPI config to MongoDB pending:', err);
  });
};

// Asynchronously save UPI configuration to MongoDB Database
export const saveUPIConfigToDB = async (config: UPIConfig): Promise<UPIConfig> => {
  localStorage.setItem('laundry_upi_config', JSON.stringify(config));

  let savedInDB = false;

  // 1. Try saving to /api/upi-config
  try {
    const response = await apiService.updateUPIConfig(config);
    if (response.success && response.data) {
      console.log('✅ Saved UPI config to MongoDB via /upi-config:', response.data);
      savedInDB = true;
      return response.data;
    }
  } catch (error) {
    console.warn('⚠️ Could not save via /api/upi-config, trying /api/shop-config route...', error);
  }

  // 2. Fallback to saving to existing /api/shop-config in MongoDB Atlas
  try {
    const shopResponse = await apiService.updateShopConfig({
      upiId: config.upiId,
      payeeName: config.payeeName,
      merchantCode: config.merchantCode || '',
      alternativeConfigs: config.alternativeConfigs || alternativeUPIConfigs
    });

    if (shopResponse.success) {
      console.log('✅ Saved UPI config to MongoDB Atlas via /shop-config successfully!');
      savedInDB = true;
      return config;
    }
  } catch (shopErr) {
    console.error('❌ Error saving UPI config via /shop-config:', shopErr);
    throw shopErr;
  }

  if (!savedInDB) {
    throw new Error('Failed to update UPI config in MongoDB database');
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