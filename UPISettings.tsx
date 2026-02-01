import React, { useState, useEffect } from 'react';
import { getUPIConfig, saveUPIConfig, isValidUPIId, UPIConfig } from './upiConfig';
import { useAlert } from './GlobalAlert';

interface UPISettingsProps {
  onClose?: () => void;
}

const UPISettings: React.FC<UPISettingsProps> = ({ onClose }) => {
  const { showAlert } = useAlert();
  const [config, setConfig] = useState<UPIConfig>(getUPIConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [verificationAmount, setVerificationAmount] = useState(1);

  useEffect(() => {
    setConfig(getUPIConfig());
  }, []);

  const handleSave = () => {
    if (!config.upiId.trim()) {
      showAlert({ message: 'UPI ID is required for digital payments', type: 'warning' });
      return;
    }

    if (!isValidUPIId(config.upiId)) {
      showAlert({ message: 'Please enter a valid UPI ID format (e.g., business@paytm)', type: 'warning' });
      return;
    }

    if (!config.payeeName.trim()) {
      showAlert({ message: 'Business name is required for customer identification', type: 'warning' });
      return;
    }

    try {
      saveUPIConfig(config);
      showAlert({ message: 'Payment configuration saved successfully', type: 'success' });
      if (onClose) onClose();
    } catch (error) {
      showAlert({ message: 'Failed to save payment configuration', type: 'error' });
    }
  };

  const verifyConfiguration = () => {
    if (!config.upiId || !config.payeeName) {
      showAlert({ message: 'Please complete all required fields before verification', type: 'warning' });
      return;
    }

    setIsLoading(true);
    
    const upiUrl = `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.payeeName)}&am=${verificationAmount}&cu=INR&tn=Payment Configuration Verification`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}&ecc=H&margin=15&color=000000&bgcolor=FFFFFF`;
    
    // Open verification window
    const verificationWindow = window.open('', '_blank', 'width=450,height=600');
    if (verificationWindow) {
      verificationWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Configuration Verification</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 30px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              color: white;
            }
            .container {
              background: white;
              color: #333;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              max-width: 350px;
              margin: 0 auto;
            }
            .header {
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 25px;
            }
            .qr-code {
              border: 2px solid #333;
              border-radius: 10px;
              margin: 20px 0;
              background: white;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .config-details {
              text-align: left;
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              font-size: 14px;
              border-left: 4px solid #667eea;
            }
            .amount {
              font-size: 28px;
              font-weight: bold;
              color: #27ae60;
              margin: 15px 0;
            }
            .warning {
              background: #fff3cd;
              color: #856404;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              font-size: 13px;
              border-left: 4px solid #ffc107;
            }
            .instructions {
              background: #e7f3ff;
              color: #0c5460;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              font-size: 13px;
              text-align: left;
              border-left: 4px solid #17a2b8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">⚙️ Configuration Verification</h2>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Verify your payment setup</p>
            </div>
            
            <div class="amount">₹${verificationAmount}</div>
            <img src="${qrCodeUrl}" alt="Configuration Verification QR" class="qr-code" />
            
            <div class="config-details">
              <strong>Business UPI ID:</strong> ${config.upiId}<br>
              <strong>Business Name:</strong> ${config.payeeName}<br>
              <strong>Verification Amount:</strong> ₹${verificationAmount}<br>
              ${config.merchantCode ? `<strong>Merchant Code:</strong> ${config.merchantCode}<br>` : ''}
            </div>
            
            <div class="instructions">
              <strong>Verification Steps:</strong><br>
              1. Scan this QR code with your UPI app<br>
              2. Verify the business name appears correctly<br>
              3. Confirm the amount shows as ₹${verificationAmount}<br>
              4. <strong>DO NOT complete the payment</strong><br>
              5. Close the payment screen after verification
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This is for verification only. Do not complete the payment transaction. Simply verify that your business details appear correctly in your UPI app.
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 25px;">
              <strong>Supported Payment Apps:</strong><br>
              PhonePe • Google Pay • Paytm • BHIM • Bank UPI Apps
            </p>
          </div>
        </body>
        </html>
      `);
      verificationWindow.document.close();
    }
    
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        borderRadius: '20px',
        padding: '35px',
        width: '90%',
        maxWidth: '550px',
        color: 'white',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 'bold' }}>
              💳 Payment Configuration
            </h2>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '14px' }}>
              Configure UPI payment settings for your business
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.25)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
            >
              ×
            </button>
          )}
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: '600' }}>
            Business UPI ID *
          </label>
          <input
            type="text"
            value={config.upiId}
            onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
            placeholder="business@paytm"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.2)',
              fontSize: '16px',
              background: 'rgba(255,255,255,0.95)',
              color: '#333',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3498db'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
          />
          <small style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            Your registered UPI ID for receiving payments (e.g., business@paytm, shop@ybl)
          </small>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: '600' }}>
            Business Name *
          </label>
          <input
            type="text"
            value={config.payeeName}
            onChange={(e) => setConfig({ ...config, payeeName: e.target.value })}
            placeholder="Your Business Name"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.2)',
              fontSize: '16px',
              background: 'rgba(255,255,255,0.95)',
              color: '#333',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3498db'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
          />
          <small style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            Name that will appear to customers during payment
          </small>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: '600' }}>
            Merchant Code (Optional)
          </label>
          <input
            type="text"
            value={config.merchantCode || ''}
            onChange={(e) => setConfig({ ...config, merchantCode: e.target.value })}
            placeholder="MERCHANT001"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.2)',
              fontSize: '16px',
              background: 'rgba(255,255,255,0.95)',
              color: '#333',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3498db'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
          />
          <small style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            Optional merchant identifier for transaction tracking
          </small>
        </div>

        {/* Verification Section */}
        <div style={{
          background: 'rgba(52, 152, 219, 0.15)',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '30px',
          border: '1px solid rgba(52, 152, 219, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 18px 0', fontSize: '17px', color: '#3498db' }}>
            🔍 Configuration Verification
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '18px' }}>
            <label style={{ fontSize: '14px', minWidth: '120px', fontWeight: '500' }}>
              Verification Amount:
            </label>
            <input
              type="number"
              value={verificationAmount}
              onChange={(e) => setVerificationAmount(parseInt(e.target.value) || 1)}
              min="1"
              max="10"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                fontSize: '14px',
                background: 'rgba(255,255,255,0.9)',
                color: '#333'
              }}
            />
            <span style={{ fontSize: '13px', opacity: 0.8 }}>₹</span>
          </div>
          <button
            onClick={verifyConfiguration}
            disabled={isLoading || !config.upiId || !config.payeeName}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: isLoading || !config.upiId || !config.payeeName 
                ? 'rgba(255,255,255,0.2)' 
                : 'linear-gradient(135deg, #3498db, #2980b9)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: isLoading || !config.upiId || !config.payeeName ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isLoading ? '⏳ Generating Verification...' : '🔍 Verify Configuration'}
          </button>
          <p style={{ fontSize: '12px', opacity: 0.8, margin: '12px 0 0 0', textAlign: 'center' }}>
            Generate a verification QR to test your payment setup
          </p>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            💾 Save Configuration
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Cancel
            </button>
          )}
        </div>

        <div style={{
          marginTop: '25px',
          padding: '20px',
          background: 'rgba(46, 204, 113, 0.15)',
          borderRadius: '10px',
          fontSize: '13px',
          lineHeight: '1.5',
          border: '1px solid rgba(46, 204, 113, 0.3)'
        }}>
          <div style={{ color: '#2ecc71', fontWeight: '600', marginBottom: '10px' }}>
            💡 Setup Guidelines:
          </div>
          <ul style={{ margin: '0', paddingLeft: '18px', color: 'rgba(255,255,255,0.9)' }}>
            <li>Use your registered business UPI ID for receiving payments</li>
            <li>Verify configuration before enabling for customers</li>
            <li>Business name will be displayed to customers during payment</li>
            <li>QR codes will automatically include exact bill amounts</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UPISettings;