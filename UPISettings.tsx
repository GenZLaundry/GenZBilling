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
  const [tempAmount, setTempAmount] = useState('1');
  const [activeTab, setActiveTab] = useState('setup');

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
      showAlert({ message: '🎉 Payment configuration saved successfully!', type: 'success' });
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
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}&ecc=H&margin=20&color=2c3e50&bgcolor=FFFFFF`;
    
    // Open verification window
    const verificationWindow = window.open('', '_blank', 'width=500,height=700');
    if (verificationWindow) {
      verificationWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>🔍 Payment Configuration Verification</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(20px);
              color: #2c3e50;
              padding: 40px;
              border-radius: 25px;
              box-shadow: 0 25px 50px rgba(0,0,0,0.2);
              max-width: 420px;
              width: 100%;
              border: 1px solid rgba(255, 255, 255, 0.3);
              animation: slideIn 0.5s ease-out;
            }
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header-icon {
              font-size: 48px;
              margin-bottom: 15px;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            .header h2 {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 8px;
              background: linear-gradient(135deg, #667eea, #764ba2);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .header p {
              color: #6c757d;
              font-size: 14px;
            }
            .qr-section {
              text-align: center;
              margin: 30px 0;
              padding: 25px;
              background: linear-gradient(135deg, #f8f9ff, #ffffff);
              border-radius: 20px;
              border: 2px solid #e3f2fd;
              box-shadow: 0 8px 25px rgba(102, 126, 234, 0.1);
            }
            .amount-display {
              font-size: 36px;
              font-weight: 800;
              background: linear-gradient(135deg, #27ae60, #2ecc71);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: 20px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .qr-code {
              border-radius: 15px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.15);
              transition: transform 0.3s ease;
              background: white;
              padding: 10px;
            }
            .qr-code:hover {
              transform: scale(1.02);
            }
            .config-card {
              background: linear-gradient(135deg, #f8f9ff, #ffffff);
              padding: 25px;
              border-radius: 18px;
              margin: 25px 0;
              border: 1px solid #e3f2fd;
              box-shadow: 0 5px 15px rgba(102, 126, 234, 0.08);
            }
            .config-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
              padding: 12px 0;
              border-bottom: 1px solid rgba(108, 117, 125, 0.1);
            }
            .config-item:last-child {
              border-bottom: none;
              margin-bottom: 0;
            }
            .config-label {
              font-weight: 600;
              color: #495057;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .config-value {
              font-weight: 700;
              color: #2c3e50;
              font-size: 14px;
              max-width: 200px;
              text-align: right;
              word-break: break-all;
            }
            .instructions {
              background: linear-gradient(135deg, #e3f2fd, #f8f9ff);
              padding: 25px;
              border-radius: 18px;
              margin: 25px 0;
              border-left: 5px solid #2196f3;
              box-shadow: 0 5px 15px rgba(33, 150, 243, 0.1);
            }
            .instructions h4 {
              color: #1976d2;
              margin-bottom: 15px;
              font-size: 16px;
              font-weight: 700;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .step-list {
              list-style: none;
              counter-reset: step-counter;
            }
            .step-list li {
              counter-increment: step-counter;
              margin-bottom: 12px;
              padding-left: 35px;
              position: relative;
              color: #495057;
              font-size: 14px;
              line-height: 1.5;
            }
            .step-list li::before {
              content: counter(step-counter);
              position: absolute;
              left: 0;
              top: 0;
              background: linear-gradient(135deg, #2196f3, #1976d2);
              color: white;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 700;
            }
            .warning-card {
              background: linear-gradient(135deg, #fff3e0, #fffbf0);
              border: 1px solid #ffcc02;
              border-left: 5px solid #ff9800;
              padding: 20px;
              border-radius: 15px;
              margin: 25px 0;
              box-shadow: 0 5px 15px rgba(255, 152, 0, 0.1);
            }
            .warning-card h4 {
              color: #f57c00;
              margin-bottom: 10px;
              font-size: 15px;
              font-weight: 700;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .warning-card p {
              color: #bf360c;
              font-size: 13px;
              line-height: 1.5;
              margin: 0;
            }
            .supported-apps {
              text-align: center;
              margin-top: 30px;
              padding: 20px;
              background: linear-gradient(135deg, #f1f8e9, #ffffff);
              border-radius: 15px;
              border: 1px solid #c8e6c9;
            }
            .supported-apps h4 {
              color: #388e3c;
              margin-bottom: 15px;
              font-size: 14px;
              font-weight: 700;
            }
            .app-icons {
              display: flex;
              justify-content: center;
              gap: 15px;
              flex-wrap: wrap;
            }
            .app-icon {
              background: white;
              padding: 8px 12px;
              border-radius: 10px;
              font-size: 12px;
              font-weight: 600;
              color: #2e7d32;
              border: 1px solid #c8e6c9;
              box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);
            }
            .close-btn {
              position: absolute;
              top: 15px;
              right: 15px;
              background: rgba(255, 255, 255, 0.9);
              border: none;
              border-radius: 50%;
              width: 35px;
              height: 35px;
              cursor: pointer;
              font-size: 18px;
              color: #666;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .close-btn:hover {
              background: #f44336;
              color: white;
              transform: scale(1.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <button class="close-btn" onclick="window.close()">×</button>
            
            <div class="header">
              <div class="header-icon">🔍</div>
              <h2>Configuration Verification</h2>
              <p>Test your UPI payment setup</p>
            </div>
            
            <div class="qr-section">
              <div class="amount-display">₹${verificationAmount}</div>
              <img src="${qrCodeUrl}" alt="Configuration Verification QR" class="qr-code" />
            </div>
            
            <div class="config-card">
              <div class="config-item">
                <span class="config-label">Business UPI ID</span>
                <span class="config-value">${config.upiId}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Business Name</span>
                <span class="config-value">${config.payeeName}</span>
              </div>
              <div class="config-item">
                <span class="config-label">Verification Amount</span>
                <span class="config-value">₹${verificationAmount}</span>
              </div>
              ${config.merchantCode ? `
              <div class="config-item">
                <span class="config-label">Merchant Code</span>
                <span class="config-value">${config.merchantCode}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="instructions">
              <h4>📋 Verification Steps</h4>
              <ol class="step-list">
                <li>Scan this QR code with your UPI app</li>
                <li>Verify the business name appears correctly</li>
                <li>Confirm the amount shows as ₹${verificationAmount}</li>
                <li><strong>DO NOT complete the payment</strong></li>
                <li>Close the payment screen after verification</li>
              </ol>
            </div>
            
            <div class="warning-card">
              <h4>⚠️ Important Notice</h4>
              <p>This is for verification only. Do not complete the payment transaction. Simply verify that your business details appear correctly in your UPI app.</p>
            </div>
            
            <div class="supported-apps">
              <h4>✅ Supported Payment Apps</h4>
              <div class="app-icons">
                <span class="app-icon">PhonePe</span>
                <span class="app-icon">Google Pay</span>
                <span class="app-icon">Paytm</span>
                <span class="app-icon">BHIM</span>
                <span class="app-icon">Bank UPI</span>
              </div>
            </div>
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
      background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(0,0,0,0.9))',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(15px)',
      animation: 'fadeIn 0.3s ease-out',
      padding: '10px',
      overflowY: 'auto'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.2), 0 0 30px rgba(52,152,219,0.3); }
        }
        .modal-container {
          animation: slideUp 0.4s ease-out, glow 3s ease-in-out infinite;
        }
        .tab-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab-button:hover {
          transform: translateY(-2px);
        }
        .input-field {
          transition: all 0.3s ease;
        }
        .input-field:focus {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(52, 152, 219, 0.2);
        }
        .save-button {
          background: linear-gradient(135deg, #27ae60, #2ecc71, #58d68d);
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .verification-section {
          background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(52, 152, 219, 0.05));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(52, 152, 219, 0.2);
          transition: all 0.3s ease;
        }
        .verification-section:hover {
          border-color: rgba(52, 152, 219, 0.4);
          background: linear-gradient(135deg, rgba(52, 152, 219, 0.15), rgba(52, 152, 219, 0.08));
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .modal-container {
            width: 95% !important;
            max-width: none !important;
            padding: 20px !important;
            margin: 10px !important;
            max-height: 95vh !important;
            overflow-y: auto !important;
          }
          .header-title {
            font-size: 22px !important;
          }
          .header-subtitle {
            font-size: 13px !important;
          }
          .tab-container {
            flex-direction: column !important;
            gap: 4px !important;
          }
          .tab-button {
            padding: 10px 16px !important;
            font-size: 12px !important;
          }
          .input-field {
            padding: 14px 16px !important;
            font-size: 14px !important;
          }
          .verification-amount-container {
            flex-direction: column !important;
            gap: 10px !important;
            align-items: stretch !important;
          }
          .verification-amount-label {
            min-width: auto !important;
            text-align: left !important;
          }
          .action-buttons {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .close-button {
            width: 35px !important;
            height: 35px !important;
            font-size: 18px !important;
          }
        }
        
        @media (max-width: 480px) {
          .modal-container {
            width: 98% !important;
            padding: 15px !important;
            margin: 5px !important;
          }
          .header-icon {
            padding: 8px !important;
            font-size: 20px !important;
          }
          .header-title {
            font-size: 20px !important;
          }
          .verification-icon {
            font-size: 36px !important;
          }
          .verification-title {
            font-size: 18px !important;
          }
        }
        
        /* High DPI / Retina Display Support */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .modal-container {
            border-width: 0.5px;
          }
          .input-field {
            border-width: 1px;
          }
        }
        
        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
          .input-field {
            background: rgba(255,255,255,0.98) !important;
          }
        }
        
        /* Reduced Motion Support */
        @media (prefers-reduced-motion: reduce) {
          .modal-container {
            animation: none !important;
          }
          .tab-button, .input-field, .save-button {
            transition: none !important;
          }
          .save-button {
            animation: none !important;
          }
        }
        
        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .modal-container {
            border: 2px solid white !important;
          }
          .input-field {
            border: 2px solid #333 !important;
          }
          .tab-button {
            border: 1px solid rgba(255,255,255,0.5) !important;
          }
        }
      `}</style>
      
      <div className="modal-container" style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)',
        borderRadius: '25px',
        padding: '40px',
        width: '90%',
        maxWidth: '600px',
        minWidth: '320px',
        maxHeight: '90vh',
        color: 'white',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        overflow: 'hidden',
        overflowY: 'auto',
        margin: '20px'
      }}>
        
        {/* Decorative Background Elements */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(52,152,219,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-50%',
          left: '-50%',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(46,204,113,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '35px',
          position: 'relative',
          zIndex: 1,
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div className="header-icon" style={{
                background: 'linear-gradient(135deg, #3498db, #2980b9)',
                borderRadius: '15px',
                padding: '12px',
                fontSize: '24px',
                boxShadow: '0 8px 20px rgba(52, 152, 219, 0.3)',
                flexShrink: 0
              }}>
                💳
              </div>
              <h2 className="header-title" style={{ 
                margin: 0, 
                fontSize: 'clamp(20px, 5vw, 28px)', 
                fontWeight: '800',
                background: 'linear-gradient(135deg, #ffffff, #e8f4fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: '1.2'
              }}>
                UPI Payment Hub
              </h2>
            </div>
            <p className="header-subtitle" style={{ 
              margin: 0, 
              opacity: 0.8, 
              fontSize: 'clamp(13px, 3vw, 15px)',
              color: '#bdc3c7',
              lineHeight: '1.4'
            }}>
              Configure your digital payment gateway with style
            </p>
          </div>
          {onClose && (
            <button
              className="close-button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '45px',
                height: '45px',
                color: 'white',
                fontSize: '22px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(10px)',
                flexShrink: 0
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(231, 76, 60, 0.8)';
                e.target.style.transform = 'scale(1.1) rotate(90deg)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.transform = 'scale(1) rotate(0deg)';
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="tab-container" style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '30px',
          background: 'rgba(255,255,255,0.05)',
          padding: '6px',
          borderRadius: '15px',
          position: 'relative',
          zIndex: 1,
          flexWrap: 'wrap'
        }}>
          {[
            { key: 'setup', label: '⚙️ Setup', icon: '⚙️' },
            { key: 'verify', label: '🔍 Verify', icon: '🔍' },
            { key: 'guide', label: '📚 Guide', icon: '📚' }
          ].map(tab => (
            <button
              key={tab.key}
              className="tab-button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === tab.key 
                  ? 'linear-gradient(135deg, #3498db, #2980b9)' 
                  : 'transparent',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: activeTab === tab.key 
                  ? '0 8px 20px rgba(52, 152, 219, 0.3)' 
                  : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {activeTab === 'setup' && (
            <div>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontSize: 'clamp(14px, 3vw, 16px)', 
                  fontWeight: '600',
                  color: '#ecf0f1'
                }}>
                  🏪 Business UPI ID *
                </label>
                <input
                  className="input-field"
                  type="text"
                  value={config.upiId}
                  onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                  placeholder="business@paytm"
                  style={{
                    width: '100%',
                    padding: 'clamp(14px, 3vw, 16px) clamp(16px, 4vw, 20px)',
                    borderRadius: '15px',
                    border: '2px solid rgba(255,255,255,0.1)',
                    fontSize: 'clamp(14px, 3vw, 16px)',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#2c3e50',
                    fontWeight: '500',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3498db';
                    e.target.style.background = 'rgba(255,255,255,1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.background = 'rgba(255,255,255,0.95)';
                  }}
                />
                <small style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: 'clamp(11px, 2.5vw, 13px)',
                  display: 'block',
                  marginTop: '8px',
                  fontStyle: 'italic',
                  lineHeight: '1.4'
                }}>
                  💡 Your registered UPI ID for receiving payments (e.g., business@paytm, shop@ybl)
                </small>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#ecf0f1'
                }}>
                  🏢 Business Name *
                </label>
                <input
                  className="input-field"
                  type="text"
                  value={config.payeeName}
                  onChange={(e) => setConfig({ ...config, payeeName: e.target.value })}
                  placeholder="Your Business Name"
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '15px',
                    border: '2px solid rgba(255,255,255,0.1)',
                    fontSize: '16px',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#2c3e50',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3498db';
                    e.target.style.background = 'rgba(255,255,255,1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.background = 'rgba(255,255,255,0.95)';
                  }}
                />
                <small style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '13px',
                  display: 'block',
                  marginTop: '8px',
                  fontStyle: 'italic'
                }}>
                  👥 Name that will appear to customers during payment
                </small>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#ecf0f1'
                }}>
                  🏷️ Merchant Code (Optional)
                </label>
                <input
                  className="input-field"
                  type="text"
                  value={config.merchantCode || ''}
                  onChange={(e) => setConfig({ ...config, merchantCode: e.target.value })}
                  placeholder="MERCHANT001"
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '15px',
                    border: '2px solid rgba(255,255,255,0.1)',
                    fontSize: '16px',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#2c3e50',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3498db';
                    e.target.style.background = 'rgba(255,255,255,1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.background = 'rgba(255,255,255,0.95)';
                  }}
                />
                <small style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '13px',
                  display: 'block',
                  marginTop: '8px',
                  fontStyle: 'italic'
                }}>
                  📊 Optional merchant identifier for transaction tracking
                </small>
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <div className="verification-section" style={{
              borderRadius: '20px',
              padding: '30px',
              marginBottom: '30px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
                <h3 style={{ 
                  margin: '0 0 10px 0', 
                  fontSize: '22px', 
                  color: '#3498db',
                  fontWeight: '700'
                }}>
                  Configuration Verification
                </h3>
                <p style={{ 
                  margin: 0, 
                  opacity: 0.8, 
                  fontSize: '14px',
                  color: '#bdc3c7'
                }}>
                  Test your payment setup before going live
                </p>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '15px', 
                marginBottom: '25px',
                background: 'rgba(255,255,255,0.05)',
                padding: '25px',
                borderRadius: '15px'
              }}>
                <label style={{ 
                  fontSize: 'clamp(14px, 3vw, 16px)', 
                  fontWeight: '600',
                  color: '#ecf0f1',
                  marginBottom: '10px'
                }}>
                  💰 Custom Test Amount
                </label>
                
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: '12px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(52, 152, 219, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <span style={{ 
                    padding: '14px 18px',
                    fontSize: 'clamp(14px, 3vw, 16px)', 
                    fontWeight: '700',
                    color: '#27ae60',
                    background: 'linear-gradient(135deg, #e8f5e8, #f0f8f0)',
                    borderRight: '1px solid rgba(39, 174, 96, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    minWidth: '60px',
                    justifyContent: 'center'
                  }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    value={tempAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAmount(value);
                      // Only update verificationAmount if it's a valid number
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue >= 1 && numValue <= 999) {
                        setVerificationAmount(numValue);
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = parseInt(value) || 1;
                      const finalValue = Math.max(1, Math.min(999, numValue));
                      setVerificationAmount(finalValue);
                      setTempAmount(finalValue.toString());
                      
                      e.target.parentElement.style.borderColor = 'rgba(255,255,255,0.2)';
                      e.target.parentElement.style.boxShadow = 'none';
                      e.target.parentElement.style.transform = 'translateY(0)';
                    }}
                    min="1"
                    max="999"
                    step="1"
                    placeholder="Enter amount"
                    style={{
                      flex: 1,
                      padding: '14px 18px',
                      border: 'none',
                      fontSize: 'clamp(14px, 3vw, 16px)',
                      background: 'transparent',
                      color: '#2c3e50',
                      fontWeight: '600',
                      outline: 'none',
                      minWidth: '100px'
                    }}
                    onFocus={(e) => {
                      e.target.parentElement.style.borderColor = '#3498db';
                      e.target.parentElement.style.boxShadow = '0 0 25px rgba(52, 152, 219, 0.3)';
                      e.target.parentElement.style.transform = 'translateY(-2px)';
                    }}
                  />
                  <div style={{
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = Math.min(999, verificationAmount + 1);
                        setVerificationAmount(newValue);
                        setTempAmount(newValue.toString());
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #3498db, #2980b9)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        padding: '3px 8px',
                        transition: 'all 0.2s ease',
                        lineHeight: '1'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'linear-gradient(135deg, #2980b9, #3498db)'}
                      onMouseOut={(e) => e.target.style.background = 'linear-gradient(135deg, #3498db, #2980b9)'}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = Math.max(1, verificationAmount - 1);
                        setVerificationAmount(newValue);
                        setTempAmount(newValue.toString());
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #3498db, #2980b9)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        padding: '3px 8px',
                        transition: 'all 0.2s ease',
                        lineHeight: '1'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'linear-gradient(135deg, #2980b9, #3498db)'}
                      onMouseOut={(e) => e.target.style.background = 'linear-gradient(135deg, #3498db, #2980b9)'}
                    >
                      ▼
                    </button>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '15px',
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    fontSize: 'clamp(11px, 2.5vw, 12px)',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: '500',
                    marginRight: '10px',
                    alignSelf: 'center'
                  }}>
                    Quick Select:
                  </span>
                  {[1, 5, 10, 50, 100].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setVerificationAmount(amount);
                        setTempAmount(amount.toString());
                      }}
                      style={{
                        background: verificationAmount === amount 
                          ? 'linear-gradient(135deg, #27ae60, #2ecc71)' 
                          : 'rgba(255,255,255,0.1)',
                        border: verificationAmount === amount 
                          ? '2px solid #27ae60' 
                          : '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: verificationAmount === amount ? 'white' : '#ecf0f1',
                        fontSize: 'clamp(11px, 2.5vw, 12px)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        transition: 'all 0.3s ease',
                        minWidth: '45px',
                        boxShadow: verificationAmount === amount 
                          ? '0 4px 12px rgba(39, 174, 96, 0.3)' 
                          : 'none'
                      }}
                      onMouseOver={(e) => {
                        if (verificationAmount !== amount) {
                          e.target.style.background = 'rgba(255,255,255,0.15)';
                          e.target.style.borderColor = 'rgba(255,255,255,0.4)';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(255,255,255,0.1)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (verificationAmount !== amount) {
                          e.target.style.background = 'rgba(255,255,255,0.1)';
                          e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>
                
                <small style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 'clamp(10px, 2vw, 11px)',
                  textAlign: 'center',
                  marginTop: '10px',
                  fontStyle: 'italic',
                  lineHeight: '1.4'
                }}>
                  💡 Choose a preset amount or enter custom value (₹1-₹999)
                </small>
              </div>
              
              <button
                onClick={verifyConfiguration}
                disabled={isLoading || !config.upiId || !config.payeeName}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '15px',
                  border: 'none',
                  background: isLoading || !config.upiId || !config.payeeName 
                    ? 'rgba(255,255,255,0.1)' 
                    : 'linear-gradient(135deg, #3498db, #2980b9, #5dade2)',
                  backgroundSize: '200% 200%',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: isLoading || !config.upiId || !config.payeeName ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 25px rgba(52, 152, 219, 0.3)',
                  animation: !isLoading && config.upiId && config.payeeName ? 'gradientShift 3s ease infinite' : 'none'
                }}
                onMouseOver={(e) => {
                  if (!isLoading && config.upiId && config.payeeName) {
                    e.target.style.transform = 'translateY(-3px)';
                    e.target.style.boxShadow = '0 12px 35px rgba(52, 152, 219, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 25px rgba(52, 152, 219, 0.3)';
                }}
              >
                {isLoading ? '⏳ Generating Verification...' : '🚀 Generate Test QR Code'}
              </button>
              
              <p style={{ 
                fontSize: 'clamp(11px, 2.5vw, 13px)', 
                opacity: 0.8, 
                margin: '15px 0 0 0', 
                textAlign: 'center',
                color: '#bdc3c7',
                fontStyle: 'italic'
              }}>
                ✨ Generate a beautiful verification QR with your custom test amount
              </p>
            </div>
          )}

          {activeTab === 'guide' && (
            <div style={{
              background: 'rgba(46, 204, 113, 0.1)',
              borderRadius: '20px',
              padding: '30px',
              border: '1px solid rgba(46, 204, 113, 0.2)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📚</div>
                <h3 style={{ 
                  margin: '0 0 10px 0', 
                  fontSize: '22px', 
                  color: '#2ecc71',
                  fontWeight: '700'
                }}>
                  Setup Guidelines
                </h3>
              </div>
              
              <div style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'rgba(255,255,255,0.9)'
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#2ecc71', marginBottom: '12px', fontSize: '16px' }}>
                    🎯 Quick Setup Tips:
                  </h4>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '8px' }}>Use your registered business UPI ID for receiving payments</li>
                    <li style={{ marginBottom: '8px' }}>Always verify configuration before enabling for customers</li>
                    <li style={{ marginBottom: '8px' }}>Business name will be displayed to customers during payment</li>
                    <li style={{ marginBottom: '8px' }}>QR codes will automatically include exact bill amounts</li>
                  </ul>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#2ecc71', marginBottom: '12px', fontSize: '16px' }}>
                    💳 Supported UPI Apps:
                  </h4>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '10px',
                    marginTop: '10px'
                  }}>
                    {['PhonePe', 'Google Pay', 'Paytm', 'BHIM', 'Bank UPI Apps'].map(app => (
                      <span key={app} style={{
                        background: 'rgba(46, 204, 113, 0.2)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: '1px solid rgba(46, 204, 113, 0.3)'
                      }}>
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div style={{
                  background: 'rgba(52, 152, 219, 0.1)',
                  padding: '15px',
                  borderRadius: '12px',
                  border: '1px solid rgba(52, 152, 219, 0.2)',
                  marginTop: '20px'
                }}>
                  <h4 style={{ color: '#3498db', marginBottom: '8px', fontSize: '14px' }}>
                    🔒 Security Note:
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
                    Never share your UPI PIN or complete test transactions. Use the verification feature to test your setup safely.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons" style={{ 
          display: 'flex', 
          gap: '15px', 
          marginTop: '30px',
          position: 'relative',
          zIndex: 1,
          flexWrap: 'wrap'
        }}>
          <button
            className="save-button"
            onClick={handleSave}
            style={{
              flex: 1,
              minWidth: '140px',
              padding: 'clamp(12px, 3vw, 16px)',
              borderRadius: '15px',
              border: 'none',
              color: 'white',
              fontSize: 'clamp(14px, 3vw, 16px)',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 8px 25px rgba(39, 174, 96, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 12px 35px rgba(39, 174, 96, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 25px rgba(39, 174, 96, 0.3)';
            }}
          >
            💾 Save Configuration
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: 'clamp(12px, 3vw, 16px)',
                borderRadius: '15px',
                border: '2px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                fontSize: 'clamp(14px, 3vw, 16px)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 8px 25px rgba(255,255,255,0.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.05)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UPISettings;