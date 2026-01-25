import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AlertOptions {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  autoClose?: number;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({
    message: '',
    type: 'info'
  });

  const showAlert = (options: AlertOptions) => {
    setAlertOptions(options);
    setIsVisible(true);

    if (options.autoClose || (options.type === 'success' && !options.autoClose)) {
      const timeout = options.autoClose || 3000;
      setTimeout(() => {
        setIsVisible(false);
      }, timeout);
    }
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setAlertOptions({
      message,
      type: 'confirm',
      confirmText: 'Yes',
      cancelText: 'Cancel',
      onConfirm: () => {
        onConfirm();
        setIsVisible(false);
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setIsVisible(false);
      }
    });
    setIsVisible(true);
  };

  const hideAlert = () => {
    setIsVisible(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

// Global Alert Modal Component
export const GlobalAlertModal: React.FC<{ 
  isVisible: boolean;
  alertOptions: AlertOptions;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}> = ({ isVisible, alertOptions, onClose, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  const getAlertIcon = () => {
    switch (alertOptions.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'confirm': return '❓';
      default: return 'ℹ️';
    }
  };

  const getAlertColor = () => {
    switch (alertOptions.type) {
      case 'success': return '#27ae60';
      case 'error': return '#e74c3c';
      case 'warning': return '#f39c12';
      case 'confirm': return '#3498db';
      default: return '#3498db';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(15px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: '20px',
        padding: '35px',
        maxWidth: '450px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
        border: `3px solid ${getAlertColor()}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '100px',
          height: '100px',
          background: `${getAlertColor()}15`,
          borderRadius: '50%',
          zIndex: 0
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Icon */}
          <div style={{ 
            fontSize: '64px', 
            marginBottom: '20px',
            color: getAlertColor(),
            textShadow: `0 2px 10px ${getAlertColor()}30`
          }}>
            {getAlertIcon()}
          </div>
          
          {/* Title */}
          {alertOptions.title && (
            <h3 style={{ 
              color: '#2c3e50', 
              fontSize: '22px', 
              fontWeight: 'bold',
              marginBottom: '15px',
              margin: '0 0 15px 0'
            }}>
              {alertOptions.title}
            </h3>
          )}
          
          {/* Message */}
          <div style={{ 
            color: '#2c3e50', 
            fontSize: '16px', 
            lineHeight: '1.6',
            marginBottom: '25px',
            whiteSpace: 'pre-line'
          }}>
            {alertOptions.message}
          </div>
          
          {/* Buttons */}
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            {alertOptions.type === 'confirm' ? (
              <>
                <button
                  onClick={onCancel}
                  style={{
                    background: 'linear-gradient(135deg, #95a5a6, #7f8c8d)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 25px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    minWidth: '100px'
                  }}
                >
                  {alertOptions.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={onConfirm}
                  style={{
                    background: `linear-gradient(135deg, ${getAlertColor()}, ${getAlertColor()}dd)`,
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 25px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    minWidth: '100px'
                  }}
                >
                  {alertOptions.confirmText || 'OK'}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                style={{
                  background: `linear-gradient(135deg, ${getAlertColor()}, ${getAlertColor()}dd)`,
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 30px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  minWidth: '120px'
                }}
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced AlertProvider with modal
export const EnhancedAlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({
    message: '',
    type: 'info'
  });

  const showAlert = (options: AlertOptions) => {
    setAlertOptions(options);
    setIsVisible(true);

    if (options.autoClose || (options.type === 'success' && options.autoClose !== 0)) {
      const timeout = options.autoClose || 3000;
      setTimeout(() => {
        setIsVisible(false);
      }, timeout);
    }
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setAlertOptions({
      message,
      type: 'confirm',
      confirmText: 'Yes',
      cancelText: 'Cancel',
      onConfirm,
      onCancel
    });
    setIsVisible(true);
  };

  const hideAlert = () => {
    setIsVisible(false);
  };

  const handleConfirm = () => {
    if (alertOptions.onConfirm) {
      alertOptions.onConfirm();
    }
    setIsVisible(false);
  };

  const handleCancel = () => {
    if (alertOptions.onCancel) {
      alertOptions.onCancel();
    }
    setIsVisible(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
      <GlobalAlertModal
        isVisible={isVisible}
        alertOptions={alertOptions}
        onClose={hideAlert}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </AlertContext.Provider>
  );
};

// Global functions to replace browser alerts
export const globalAlert = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  // This will be set by the provider
  if (window.globalAlertFunction) {
    window.globalAlertFunction({ message, type });
  } else {
    // Fallback to browser alert
    alert(message);
  }
};

export const globalConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.globalConfirmFunction) {
      window.globalConfirmFunction(message, () => resolve(true), () => resolve(false));
    } else {
      // Fallback to browser confirm
      resolve(confirm(message));
    }
  });
};

// Extend window interface
declare global {
  interface Window {
    globalAlertFunction?: (options: AlertOptions) => void;
    globalConfirmFunction?: (message: string, onConfirm: () => void, onCancel: () => void) => void;
  }
}