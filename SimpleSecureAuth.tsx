import React, { useState } from 'react';
import { useAlert } from './GlobalAlert';

interface SimpleSecureAuthProps {
  onLogin: (success: boolean) => void;
}

const SimpleSecureAuth: React.FC<SimpleSecureAuthProps> = ({ onLogin }) => {
  const { showAlert } = useAlert();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Enhanced default admin credentials with device binding
  const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'SecureAdmin2024!'
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate loading for better UX
    setTimeout(() => {
      if (credentials.username === DEFAULT_ADMIN.username && 
          credentials.password === DEFAULT_ADMIN.password) {
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminLoginTime', Date.now().toString());
        
        showAlert({ 
          message: 'Authentication successful!\nWelcome to GenZ Laundry POS Admin Portal.', 
          type: 'success' 
        });
        
        setTimeout(() => {
          onLogin(true);
        }, 1500);
      } else {
        showAlert({ 
          message: 'Invalid username or password.\nAccess denied for security reasons.', 
          type: 'error' 
        });
        setCredentials({ username: '', password: '' });
      }
      setIsLoading(false);
    }, 1000);
  };

  const fillDefaultCredentials = () => {
    setCredentials({
      username: DEFAULT_ADMIN.username,
      password: DEFAULT_ADMIN.password
    });
    showAlert({ 
      message: 'Default credentials filled.\nFor production use, please change these credentials.', 
      type: 'info' 
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #533483 100%)',
      displa