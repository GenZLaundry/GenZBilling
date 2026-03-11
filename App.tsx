import React, { useState, useEffect } from 'react';
import BillingMachineInterface from './BillingMachineInterface';
import SecureAuth from './SecureAuth';
import AdminDashboard from './AdminDashboard';
import AdminPinEntry from './AdminPinEntry';
import { EnhancedAlertProvider } from './GlobalAlert';
import authApi from './authApi';
import './App.css';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'billing' | 'admin'>('billing');
  const [isLoading, setIsLoading] = useState(true);
  const [showPinEntry, setShowPinEntry] = useState(false);

  useEffect(() => {
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
        {isAuthenticated ? (
          currentView === 'billing' ? (
            <BillingMachineInterface onLogout={handleLogout} onSwitchToAdmin={switchToAdmin} />
          ) : (
            <AdminDashboard onBackToBilling={switchToBilling} onLogout={handleLogout} />
          )
        ) : (
          <SecureAuth onLogin={handleLogin} />
        )}
      </div>
    </EnhancedAlertProvider>
  );
};

export default App;