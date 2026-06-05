import React, { useState, useEffect } from 'react';
import BillingMachineInterface from './BillingMachineInterface';
import SecureAuth from './SecureAuth';
import AdminDashboard from './AdminDashboard';
import AdminPinEntry from './AdminPinEntry';
import { EnhancedAlertProvider } from './GlobalAlert';
import authApi from './authApi';
import './App.css';

import CustomerIntakePortal from './CustomerIntakePortal';
import AdminReceiptPortal from './AdminReceiptPortal';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'billing' | 'admin' | 'customer-portal' | 'receipt-portal'>('billing');
  const [isLoading, setIsLoading] = useState(true);
  const [showPinEntry, setShowPinEntry] = useState(false);

  useEffect(() => {
    // Check if view query parameter is set to customer-portal
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam === 'customer-portal') {
      setCurrentView('customer-portal');
    }

    // Check authentication status using the new auth system
    const checkAuth = async () => {
      try {
        // First check if we have a token
        if (authApi.isAuthenticated()) {
          // Verify the token with the server
          const response = await authApi.verifyToken();
          if (response.success) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (success: boolean) => {
    setIsAuthenticated(success);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setIsAuthenticated(false);
    setCurrentView('billing');
  };

  const switchToAdmin = () => {
    setShowPinEntry(true);
  };

  const handlePinSuccess = () => {
    setShowPinEntry(false);
    setCurrentView('admin');
  };

  const handlePinCancel = () => {
    setShowPinEntry(false);
  };

  const switchToBilling = () => {
    setCurrentView('billing');
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div className="spinner" style={{ width: '36px', height: '36px' }}></div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <EnhancedAlertProvider>
      <div className="App">
        {/* PIN Entry Modal */}
        {showPinEntry && (
          <AdminPinEntry
            onSuccess={handlePinSuccess}
            onCancel={handlePinCancel}
          />
        )}

        {/* Global Alert Integration Complete */}
        {currentView === 'customer-portal' ? (
          <CustomerIntakePortal onBackToLogin={() => setCurrentView('billing')} />
        ) : currentView === 'receipt-portal' ? (
          <AdminReceiptPortal onClose={() => setCurrentView('billing')} />
        ) : isAuthenticated ? (
          currentView === 'billing' ? (
            <BillingMachineInterface 
              onLogout={handleLogout} 
              onSwitchToAdmin={switchToAdmin} 
              onOpenCustomerPortal={() => setCurrentView('customer-portal')}
              onOpenReceiptPortal={() => setCurrentView('receipt-portal')}
            />
          ) : (
            <AdminDashboard onBackToBilling={switchToBilling} onLogout={handleLogout} />
          )
        ) : (
          <SecureAuth onLogin={handleLogin} onOpenCustomerPortal={() => setCurrentView('customer-portal')} />
        )}
      </div>
    </EnhancedAlertProvider>
  );
};

export default App;