import React, { useState, useEffect } from 'react';
import { getUPIConfig } from './upiConfig';

const UPIStatusIndicator: React.FC = () => {
  const [upiConfig, setUpiConfig] = useState(getUPIConfig());

  useEffect(() => {
    // Update UPI config when component mounts or when storage changes
    const updateConfig = () => {
      setUpiConfig(getUPIConfig());
    };

    // Listen for storage changes
    window.addEventListener('storage', updateConfig);
    
    // Also check periodically in case of same-tab updates
    const interval = setInterval(updateConfig, 2000);

    return () => {
      window.removeEventListener('storage', updateConfig);
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{
      fontSize: '9px',
      color: 'rgba(255,255,255,0.7)',
      textAlign: 'center',
      marginBottom: '10px',
      padding: '4px',
      background: 'rgba(39, 174, 96, 0.2)',
      borderRadius: '4px',
      border: '1px solid rgba(39, 174, 96, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        <span style={{ color: '#2ecc71' }}>●</span>
        <span>UPI: {upiConfig.upiId}</span>
        <span>•</span>
        <span>Auto QR Active</span>
      </div>
    </div>
  );
};

export default UPIStatusIndicator;