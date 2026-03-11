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

const getAlertIconClass = (type?: string) => {
  switch (type) {
    case 'success': return 'fas fa-check';
    case 'error': return 'fas fa-xmark';
    case 'warning': return 'fas fa-exclamation';
    case 'confirm': return 'fas fa-question';
    default: return 'fas fa-info';
  }
};

const getAlertColorVar = (type?: string) => {
  switch (type) {
    case 'success': return 'var(--success)';
    case 'error': return 'var(--danger)';
    case 'warning': return 'var(--warning)';
    case 'confirm': return 'var(--info)';
    default: return 'var(--info)';
  }
};

const getAlertIconBgClass = (type?: string) => {
  switch (type) {
    case 'success': return 'alert-icon alert-icon-success';
    case 'error': return 'alert-icon alert-icon-error';
    case 'warning': return 'alert-icon alert-icon-warning';
    case 'confirm': return 'alert-icon alert-icon-confirm';
    default: return 'alert-icon alert-icon-info';
  }
};

export const GlobalAlertModal: React.FC<{
  isVisible: boolean;
  alertOptions: AlertOptions;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}> = ({ isVisible, alertOptions, onClose, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  const accentColor = getAlertColorVar(alertOptions.type);

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div className={getAlertIconBgClass(alertOptions.type)}>
            <i className={getAlertIconClass(alertOptions.type)}></i>
          </div>
        </div>

        {/* Title */}
        {alertOptions.title && (
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
            {alertOptions.title}
          </h3>
        )}

        {/* Message */}
        <div style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          lineHeight: '1.6',
          marginBottom: '24px',
          whiteSpace: 'pre-line'
        }}>
          {alertOptions.message}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {alertOptions.type === 'confirm' ? (
            <>
              <button className="btn btn-ghost" onClick={onCancel} style={{ minWidth: '90px' }}>
                {alertOptions.cancelText || 'Cancel'}
              </button>
              <button
                className="btn"
                onClick={onConfirm}
                style={{ minWidth: '90px', background: accentColor, color: 'white' }}
              >
                {alertOptions.confirmText || 'OK'}
              </button>
            </>
          ) : (
            <button
              className="btn"
              onClick={onClose}
              style={{ minWidth: '100px', background: accentColor, color: 'white' }}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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
  if (window.globalAlertFunction) {
    window.globalAlertFunction({ message, type });
  } else {
    alert(message);
  }
};

export const globalConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.globalConfirmFunction) {
      window.globalConfirmFunction(message, () => resolve(true), () => resolve(false));
    } else {
      resolve(confirm(message));
    }
  });
};

declare global {
  interface Window {
    globalAlertFunction?: (options: AlertOptions) => void;
    globalConfirmFunction?: (message: string, onConfirm: () => void, onCancel: () => void) => void;
  }
}