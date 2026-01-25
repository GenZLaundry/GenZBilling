import React, { useState, useEffect } from 'react';
import BillingMachineInterface from './BillingMachineInterface';
import SecureAuth from './SecureAuth';
import AdminDashboard from './AdminDashboard';
import { EnhancedAlertProvider } from './GlobalAlert';
import authApi from './authApi';
import './App.css';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'billing' | 'admin'>('billing');
  const [isLoading, setIsLoading] = useState(true);

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
    setCurrentView('admin');
  };

  const switchToBilling = () => {
    setCurrentView('billing');
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 25%, #3b82f6 50%, #6366f1 75%, #8b5cf6 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <div style={{ fontSize: '18px', color: '#2c3e50' }}>
            Loading GenZ Laundry POS...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <EnhancedAlertProvider>
      <div className="App">
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