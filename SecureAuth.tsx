import React, { useState } from 'react';
import { useAlert } from './GlobalAlert';
import authApi from './simpleAuthApi';

interface SecureAuthProps {
  onLogin: (success: boolean) => void;
}

const SecureAuth: React.FC<SecureAuthProps> = ({ onLogin }) => {
  const { showAlert } = useAlert();
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.login(credentials.username, credentials.password);
      
      if (response.success) {
        showAlert({ 
          message: 'Welcome to GenZ Laundry!\nAccess granted to admin portal.', 
          type: 'success' 
        });
        
        setTimeout(() => {
          onLogin(true);
        }, 1500);
      } else {
        showAlert({ message: response.message || 'Invalid credentials. Please try again.', type: 'error' });
        setCredentials({ username: '', password: '' });
      }
    } catch (error) {
      showAlert({ message: 'Authentication failed. Please check your credentials.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const containerStyle = {
    height: '100vh',
    width: '100vw',
    backgroundImage: 'url(/bg.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    position: 'relative' as const,
    overflow: 'hidden' as const
  };

  const overlayStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(3px)'
  };

  const loginBoxStyle = {
    position: 'relative' as const,
    zIndex: 10,
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '90%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      {/* Background Overlay */}
      <div style={overlayStyle}></div>

      {/* Login Box */}
      <div style={loginBoxStyle}>
        {/* Logo */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img 
            src="/logo.png" 
            alt="GenZ Laundry" 
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto 16px auto',
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
            }}
          />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 8px 0',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}>
            Login
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '15px',
            margin: '0',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)'
          }}>
            Welcome back to GenZ Laundry POS
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Email Field */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '8px',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
            }}>
              <span style={{ fontSize: '16px' }}>📧</span>
              Email
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#2d3748',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          {/* Password Field */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '8px',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
            }}>
              <span style={{ fontSize: '16px' }}>🔒</span>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '14px 50px 14px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#2d3748',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                  color: '#64748b'
                }}
              >
                {showPassword ? '👁️' : '👁️'}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading || !credentials.username || !credentials.password}
            style={{
              width: '100%',
              padding: '16px',
              background: isLoading || !credentials.username || !credentials.password 
                ? 'rgba(156, 163, 175, 0.8)' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: isLoading || !credentials.username || !credentials.password 
                ? 'not-allowed' 
                : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Powered by Credit */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.8)',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
        }}>
          Powered by{' '}
          <a 
            href="https://www.linkedin.com/in/mr-manohar-solanki/" 
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'white',
              fontWeight: '700',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderBottom = '1px solid white';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderBottom = '1px solid rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.color = 'white';
            }}
          >
            Manohar Solanki
          </a>
        </div>
      </div>
    </div>
  );
};

export default SecureAuth;