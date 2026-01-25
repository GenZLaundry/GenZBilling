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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
    display: 'flex',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    position: 'relative' as const,
    overflow: 'hidden' as const
  };

  const leftPanelStyle = {
    flex: '1.2',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: '60px',
    position: 'relative' as const
  };

  const rightPanelStyle = {
    flex: '1',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: '60px 80px'
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        
        @media (max-width: 768px) {
          .login-container { flex-direction: column !important; }
        }
      `}</style>
      
      {/* Left Side - Branding */}
      <div style={leftPanelStyle}>
        {/* Floating Elements */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '15%',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite'
        }}></div>
        
        <div style={{
          position: 'absolute',
          bottom: '25%',
          right: '20%',
          width: '80px',
          height: '80px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          animation: 'pulse 6s ease-in-out infinite'
        }}></div>

        {/* Main Branding */}
        <div style={{ textAlign: 'center', zIndex: 2 }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
          }}>
            🧺
          </div>

          <h1 style={{
            fontSize: '64px',
            fontWeight: '900',
            color: 'white',
            margin: '0 0 16px 0',
            letterSpacing: '-2px',
            textShadow: '0 8px 32px rgba(0,0,0,0.3)',
            lineHeight: '1.1'
          }}>
            GenZ<span style={{ color: '#4facfe' }}>Laundry</span>
          </h1>

          <p style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: '300',
            margin: '0 0 40px 0',
            letterSpacing: '1px'
          }}>
            Professional POS System
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center'
          }}>
            {[
              { icon: '⚡', text: 'Lightning Fast Billing' },
              { icon: '📊', text: 'Advanced Analytics' },
              { icon: '🔒', text: 'Enterprise Security' }
            ].map((feature, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                <span style={{ fontSize: '20px' }}>{feature.icon}</span>
                {feature.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div style={rightPanelStyle}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 12px 0',
              letterSpacing: '-1px'
            }}>
              Admin Access
            </h2>
            <p style={{
              color: '#718096',
              fontSize: '16px',
              margin: '0',
              fontWeight: '400'
            }}>
              Secure authentication required
            </p>
          </div>

          <form onSubmit={handleLogin} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '8px'
              }}>
                👤 Username
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                placeholder="Enter admin username"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '500',
                  background: 'rgba(255, 255, 255, 0.9)',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '8px'
              }}>
                🔐 Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  placeholder="Enter secure password"
                  style={{
                    width: '100%',
                    padding: '16px 50px 16px 20px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '500',
                    background: 'rgba(255, 255, 255, 0.9)',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: '#718096'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !credentials.username || !credentials.password}
              style={{
                width: '100%',
                padding: '18px 24px',
                background: isLoading || !credentials.username || !credentials.password 
                  ? 'linear-gradient(135deg, #a0aec0, #718096)' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: isLoading || !credentials.username || !credentials.password 
                  ? 'not-allowed' 
                  : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                letterSpacing: '0.5px',
                boxShadow: isLoading || !credentials.username || !credentials.password
                  ? 'none'
                  : '0 10px 25px rgba(102, 126, 234, 0.3)'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <span style={{ fontSize: '20px' }}>🏪</span>
                  Enter in Shop
                </>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
            borderRadius: '12px',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            fontSize: '13px',
            color: '#718096',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '16px', marginRight: '8px' }}>🛡️</span>
              <strong style={{ color: '#4a5568' }}>Enterprise Security</strong>
            </div>
            <div>
              Advanced encryption • Device binding • Audit logging • Rate limiting
            </div>
          </div>

          <div style={{
            marginTop: '24px',
            fontSize: '12px',
            color: '#a0aec0',
            textAlign: 'center'
          }}>
            GenZ Laundry POS v4.0.0 - Enterprise Edition
          </div>

          {/* Powered by Credit */}
          <div style={{
            marginTop: '16px',
            fontSize: '11px',
            color: '#cbd5e0',
            textAlign: 'center',
            opacity: 0.8,
            letterSpacing: '0.5px'
          }}>
Powered by{' '}
<a
  href="https://www.linkedin.com/in/mr-manohar-solanki/" // replace with your site / GitHub / LinkedIn
  target="_blank"
  rel="noopener noreferrer"
  style={{ textDecoration: 'none' }}
>
  <span
    style={{
      fontWeight: '600',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      cursor: 'pointer'
    }}
  >
    Manohar Solanki
  </span>
</a>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureAuth;