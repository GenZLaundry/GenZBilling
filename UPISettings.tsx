import React, { useState, useEffect } from 'react';
import { getUPIConfig, saveUPIConfig, fetchUPIConfigFromDB, saveUPIConfigToDB, isValidUPIId, UPIConfig } from './upiConfig';
import { useAlert } from './GlobalAlert';

interface UPISettingsProps {
  onClose?: () => void;
}

const UPISettings: React.FC<UPISettingsProps> = ({ onClose }) => {
  const { showAlert } = useAlert();
  const [config, setConfig] = useState<UPIConfig>(getUPIConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verificationAmount, setVerificationAmount] = useState(1);
  const [tempAmount, setTempAmount] = useState('1');
  const [activeTab, setActiveTab] = useState('setup');

  useEffect(() => {
    // Synchronously set initial cache value, then fetch fresh data from MongoDB
    setConfig(getUPIConfig());
    fetchUPIConfigFromDB().then((freshConfig) => {
      if (freshConfig) setConfig(freshConfig);
    }).catch(err => console.warn('⚠️ Failed to load MongoDB config on mount:', err));
  }, []);

  const handleSave = async () => {
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

    setIsSaving(true);
    try {
      await saveUPIConfigToDB(config);
      showAlert({ message: '🎉 Payment configuration saved to MongoDB successfully!', type: 'success' });
      if (onClose) onClose();
    } catch (error) {
      console.error('Save error:', error);
      // Fallback save to local storage
      saveUPIConfig(config);
      showAlert({ message: 'Saved to local storage (Database update offline)', type: 'info' });
      if (onClose) onClose();
    } finally {
      setIsSaving(false);
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
    
    const verificationWindow = window.open('', '_blank', 'width=500,height=700');
    if (verificationWindow) {
      verificationWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Configuration Verification</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; 
              background: #09090b;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: rgba(24, 24, 27, 0.85);
              backdrop-filter: blur(20px);
              color: #ffffff;
              padding: 36px;
              border-radius: 20px;
              box-shadow: 0 16px 48px rgba(0,0,0,0.5);
              border: 1px solid rgba(255,255,255,0.08);
              max-width: 420px;
              width: 100%;
              animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(12px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .header { text-align: center; margin-bottom: 28px; }
            .header-icon {
              width: 52px; height: 52px;
              background: linear-gradient(135deg, #6366f1, #0ea5e9);
              border-radius: 14px;
              display: inline-flex; align-items: center; justify-content: center;
              font-size: 26px; margin-bottom: 14px;
            }
            .header h2 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 4px; }
            .header p { color: #a1a1aa; font-size: 14px; }
            .qr-section {
              text-align: center; margin: 24px 0; padding: 24px;
              background: rgba(255,255,255,0.03); border-radius: 16px;
              border: 1px solid rgba(255,255,255,0.06);
            }
            .amount-display { font-size: 32px; font-weight: 800; color: #10b981; margin-bottom: 16px; }
            .qr-code { border-radius: 12px; background: white; padding: 8px; }
            .config-card {
              background: rgba(255,255,255,0.03); padding: 20px; border-radius: 14px;
              margin: 20px 0; border: 1px solid rgba(255,255,255,0.06);
            }
            .config-item {
              display: flex; justify-content: space-between; align-items: center;
              padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .config-item:last-child { border-bottom: none; }
            .config-label { font-weight: 500; color: #a1a1aa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
            .config-value { font-weight: 600; color: #fff; font-size: 14px; max-width: 200px; text-align: right; word-break: break-all; }
            .instructions {
              background: rgba(99, 102, 241, 0.08); padding: 20px; border-radius: 14px;
              margin: 20px 0; border-left: 3px solid #6366f1;
            }
            .instructions h4 { color: #c7d2fe; margin-bottom: 12px; font-size: 15px; font-weight: 600; }
            .step-list { list-style: none; counter-reset: step-counter; }
            .step-list li {
              counter-increment: step-counter; margin-bottom: 10px; padding-left: 32px;
              position: relative; color: #a1a1aa; font-size: 14px; line-height: 1.5;
            }
            .step-list li::before {
              content: counter(step-counter); position: absolute; left: 0; top: 0;
              background: #6366f1; color: white; width: 22px; height: 22px;
              border-radius: 50%; display: flex; align-items: center; justify-content: center;
              font-size: 11px; font-weight: 700;
            }
            .warning-card {
              background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.15);
              border-left: 3px solid #f59e0b; padding: 16px; border-radius: 14px; margin: 20px 0;
            }
            .warning-card h4 { color: #fbbf24; margin-bottom: 6px; font-size: 14px; font-weight: 600; }
            .warning-card p { color: #a1a1aa; font-size: 13px; line-height: 1.5; margin: 0; }
            .supported-apps {
              text-align: center; margin-top: 24px; padding: 16px;
              background: rgba(16, 185, 129, 0.06); border-radius: 14px;
              border: 1px solid rgba(16, 185, 129, 0.12);
            }
            .supported-apps h4 { color: #10b981; margin-bottom: 12px; font-size: 13px; font-weight: 600; }
            .app-icons { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
            .app-icon {
              background: rgba(16, 185, 129, 0.1); padding: 6px 12px; border-radius: 6px;
              font-size: 12px; font-weight: 500; color: #10b981; border: 1px solid rgba(16, 185, 129, 0.15);
            }
            .close-btn {
              position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.06);
              border: none; border-radius: 8px; width: 32px; height: 32px;
              cursor: pointer; font-size: 16px; color: #71717a; transition: all 0.2s ease;
            }
            .close-btn:hover { background: rgba(244, 63, 94, 0.15); color: #f43f5e; }
          </style>
        </head>
        <body>
          <div class="container" style="position:relative;">
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
              </div>` : ''}
            </div>
            <div class="instructions">
              <h4>Verification Steps</h4>
              <ol class="step-list">
                <li>Scan this QR code with your UPI app</li>
                <li>Verify the business name appears correctly</li>
                <li>Confirm the amount shows as ₹${verificationAmount}</li>
                <li><strong>DO NOT complete the payment</strong></li>
                <li>Close the payment screen after verification</li>
              </ol>
            </div>
            <div class="warning-card">
              <h4>⚠ Important Notice</h4>
              <p>This is for verification only. Do not complete the payment transaction. Simply verify that your business details appear correctly in your UPI app.</p>
            </div>
            <div class="supported-apps">
              <h4>Supported Payment Apps</h4>
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

  const tabItems = [
    { key: 'setup', label: 'Setup' },
    { key: 'verify', label: 'Verify' },
    { key: 'guide', label: 'Guide' }
  ];

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '16px',
      overflowY: 'auto'
    }}>
      <style>{`
        @keyframes upiModalSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .upi-modal-card {
          animation: upiModalSlideIn 0.2s ease-out;
        }

        .upi-field-input {
          width: 100%;
          padding: 12px 14px !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          font-size: 15px !important;
          background: rgba(9, 9, 11, 0.6) !important;
          color: #ffffff !important;
          font-weight: 500 !important;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
          font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .upi-field-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }
        .upi-field-input::placeholder {
          color: #71717a !important;
          font-weight: 400 !important;
        }

        .upi-tab-btn {
          flex: 1;
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #a1a1aa;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .upi-tab-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.04);
        }
        .upi-tab-btn.active {
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        .upi-btn-primary {
          flex: 1;
          min-width: 140px;
          padding: 13px 24px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        .upi-btn-primary:hover {
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
          transform: translateY(-2px);
        }
        .upi-btn-primary:active {
          transform: translateY(0);
        }

        .upi-btn-ghost {
          flex: 1;
          min-width: 140px;
          padding: 13px 24px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.03);
          color: #a1a1aa;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          backdrop-filter: blur(8px);
        }
        .upi-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .upi-verify-action {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .upi-verify-action:not(:disabled) {
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        .upi-verify-action:not(:disabled):hover {
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
          transform: translateY(-2px);
        }
        .upi-verify-action:disabled {
          background: rgba(39, 39, 42, 0.75);
          color: #71717a;
          cursor: not-allowed;
        }

        .upi-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 10px;
          width: 36px;
          height: 36px;
          color: #71717a;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .upi-close-btn:hover {
          background: rgba(244, 63, 94, 0.15);
          color: #f43f5e;
        }

        .upi-amount-chip {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #a1a1aa;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 14px;
          transition: all 0.15s ease;
          background: rgba(255, 255, 255, 0.03);
          font-family: inherit;
        }
        .upi-amount-chip:hover {
          border-color: rgba(99, 102, 241, 0.4);
          color: #c7d2fe;
          background: rgba(99, 102, 241, 0.08);
        }
        .upi-amount-chip.selected {
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .upi-app-tag {
          background: rgba(16, 185, 129, 0.1);
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        @media (max-width: 640px) {
          .upi-modal-card {
            width: 100% !important;
            max-width: none !important;
            padding: 24px !important;
            margin: 8px !important;
            border-radius: 16px !important;
          }
          .upi-action-row {
            flex-direction: column !important;
          }
        }
      `}</style>

      <div className="upi-modal-card" style={{
        background: 'rgba(24, 24, 27, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '24px',
        padding: '32px',
        width: '90%',
        maxWidth: '520px',
        minWidth: '320px',
        maxHeight: '90vh',
        color: '#ffffff',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
        position: 'relative',
        overflowY: 'auto',
        margin: '16px',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
      }}>

        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '28px',
          gap: '12px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                fontSize: '22px',
                flexShrink: 0,
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
              }}>
                💳
              </div>
              <div>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '22px', 
                  fontWeight: '700',
                  color: '#ffffff',
                  lineHeight: '1.2'
                }}>
                  UPI Payment Hub
                </h2>
                <p style={{ 
                  margin: '2px 0 0 0', 
                  fontSize: '14px',
                  color: '#a1a1aa',
                  lineHeight: '1.4'
                }}>
                  Configure your digital payment gateway
                </p>
              </div>
            </div>
          </div>
          {onClose && (
            <button className="upi-close-btn" onClick={onClose}>×</button>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '28px',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          {tabItems.map(tab => (
            <button
              key={tab.key}
              className={`upi-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'setup' && (
            <div>
              {/* Business UPI ID */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: '#a1a1aa',
                  letterSpacing: '0.3px'
                }}>
                  Business UPI ID <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  className="upi-field-input"
                  type="text"
                  value={config.upiId}
                  onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                  placeholder="e.g., business@paytm"
                />
                <p style={{ 
                  color: '#71717a', 
                  fontSize: '12px',
                  margin: '6px 0 0 0',
                  lineHeight: '1.4'
                }}>
                  Your registered UPI ID for receiving payments
                </p>
              </div>

              {/* Business Name */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: '#a1a1aa',
                  letterSpacing: '0.3px'
                }}>
                  Business Name <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  className="upi-field-input"
                  type="text"
                  value={config.payeeName}
                  onChange={(e) => setConfig({ ...config, payeeName: e.target.value })}
                  placeholder="e.g., My Business Store"
                />
                <p style={{ 
                  color: '#71717a', 
                  fontSize: '12px',
                  margin: '6px 0 0 0',
                  lineHeight: '1.4'
                }}>
                  Displayed to customers during payment
                </p>
              </div>

              {/* Merchant Code */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: '#a1a1aa',
                  letterSpacing: '0.3px'
                }}>
                  Merchant Code <span style={{ color: '#71717a', fontWeight: '400' }}>(Optional)</span>
                </label>
                <input
                  className="upi-field-input"
                  type="text"
                  value={config.merchantCode || ''}
                  onChange={(e) => setConfig({ ...config, merchantCode: e.target.value })}
                  placeholder="e.g., MERCHANT001"
                />
                <p style={{ 
                  color: '#71717a', 
                  fontSize: '12px',
                  margin: '6px 0 0 0',
                  lineHeight: '1.4'
                }}>
                  Optional identifier for transaction tracking
                </p>
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <div>
              <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                <div style={{
                  width: '52px', height: '52px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  borderRadius: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  marginBottom: '12px'
                }}>🔍</div>
                <h3 style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '20px', 
                  color: '#ffffff',
                  fontWeight: '700'
                }}>
                  Configuration Verification
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#a1a1aa' }}>
                  Test your payment setup before going live
                </p>
              </div>

              {/* Test Amount */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <label style={{ 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: '#a1a1aa',
                  display: 'block',
                  marginBottom: '10px'
                }}>
                  Test Amount
                </label>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(9, 9, 11, 0.6)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  marginBottom: '14px'
                }}>
                  <span style={{ 
                    padding: '12px 14px',
                    fontSize: '16px', 
                    fontWeight: '700',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.08)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    value={tempAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempAmount(value);
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
                    }}
                    min="1"
                    max="999"
                    step="1"
                    placeholder="Enter amount"
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      border: 'none',
                      fontSize: '15px',
                      background: 'transparent',
                      color: '#ffffff',
                      fontWeight: '600',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                  {[1, 5, 10, 50, 100].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      className={`upi-amount-chip ${verificationAmount === amount ? 'selected' : ''}`}
                      onClick={() => {
                        setVerificationAmount(amount);
                        setTempAmount(amount.toString());
                      }}
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>
                
                <p style={{
                  color: '#71717a',
                  fontSize: '12px',
                  textAlign: 'center' as const,
                  marginTop: '12px'
                }}>
                  Choose a preset or enter a custom value (₹1–₹999)
                </p>
              </div>
              
              <button
                className="upi-verify-action"
                onClick={verifyConfiguration}
                disabled={isLoading || !config.upiId || !config.payeeName}
              >
                {isLoading ? 'Generating Verification...' : 'Generate Test QR Code'}
              </button>
              
              {(!config.upiId || !config.payeeName) && (
                <p style={{ 
                  fontSize: '13px', 
                  margin: '12px 0 0 0', 
                  textAlign: 'center' as const,
                  color: '#f59e0b',
                  fontWeight: '500'
                }}>
                  Complete the Setup tab first to enable verification
                </p>
              )}
            </div>
          )}

          {activeTab === 'guide' && (
            <div>
              {/* Quick Setup Tips */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.12)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '16px'
              }}>
                <h4 style={{ 
                  color: '#10b981', 
                  marginBottom: '12px', 
                  fontSize: '15px',
                  fontWeight: '600'
                }}>
                  Quick Setup Tips
                </h4>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '18px',
                  color: '#a1a1aa',
                  fontSize: '14px',
                  lineHeight: '1.8'
                }}>
                  <li>Use your registered business UPI ID for receiving payments</li>
                  <li>Always verify configuration before enabling for customers</li>
                  <li>Business name will be displayed to customers during payment</li>
                  <li>QR codes will automatically include exact bill amounts</li>
                </ul>
              </div>

              {/* Supported Apps */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '16px'
              }}>
                <h4 style={{ 
                  color: '#ffffff', 
                  marginBottom: '12px', 
                  fontSize: '15px',
                  fontWeight: '600'
                }}>
                  Supported UPI Apps
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
                  {['PhonePe', 'Google Pay', 'Paytm', 'BHIM', 'Bank UPI Apps'].map(app => (
                    <span key={app} className="upi-app-tag">{app}</span>
                  ))}
                </div>
              </div>
              
              {/* Security Note */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.12)',
                borderLeft: '3px solid #6366f1',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <h4 style={{ 
                  color: '#c7d2fe', 
                  marginBottom: '6px', 
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  🔒 Security Note
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: '13px', 
                  color: '#a1a1aa',
                  lineHeight: '1.5'
                }}>
                  Never share your UPI PIN or complete test transactions. Use the verification feature to test your setup safely.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="upi-action-row" style={{ 
          display: 'flex', 
          gap: '12px', 
          marginTop: '28px',
          flexWrap: 'wrap' as const
        }}>
          <button className="upi-btn-primary" onClick={handleSave}>
            Save Configuration
          </button>
          {onClose && (
            <button className="upi-btn-ghost" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UPISettings;