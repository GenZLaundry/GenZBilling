import React, { useState } from 'react';

interface AdminLoginProps {
  onLogin: (success: boolean) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Default admin credentials
  const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'admin123'
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate loading for better UX
    setTimeout(() => {
      if (credentials.username === DEFAULT_ADMIN.username && 
          credentials.password === DEFAULT_ADMIN.password) {
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminLoginTime', Date.now().toString());
        onLogin(true);
      } else {
        setError('Invalid username or password');
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
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 25%, #3b82f6 50%, #6366f1 75%, #8b5cf6 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
        padding: '50px',
        width: '100%',
        maxWidth: '450px',
        textAlign: 'center'
      }}>
        {/* Logo/Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '15px'
          }}>🔐</div>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '8px'
          }}>
            Admin Access Required
          </h1>
          <p style={{
            margin: 0,
            color: '#6c757d',
            fontSize: '16px'
          }}>
            GenZ Laundry POS System
          </p>
        </div>

        {/* Default Credentials Info - Hidden Values */}
        {/* <div style={{
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '30px',
          border: '2px solid #e1bee7'
        }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: '16px' }}>
            🔑 Default Admin Credentials
          </h4>
          <div style={{ 
            background: 'white', 
            padding: '15px', 
            borderRadius: '10px',
            marginBottom: '15px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Username:</strong> ••••••
            </div>
            <div>
              <strong>Password:</strong> ••••••••
            </div>
          </div>
          <button
            onClick={fillDefaultCredentials}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            📋 Fill Default Credentials
          </button>
        </div> */}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              textAlign: 'left',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#2c3e50'
            }}>
              Username
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              style={{
                width: '100%',
                padding: '15px',
                border: '2px solid #e9ecef',
                borderRadius: '10px',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              placeholder="Enter username"
              required
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              textAlign: 'left',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#2c3e50'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '15px',
                  paddingRight: '50px',
                  border: '2px solid #e9ecef',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter password"
                required
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb',
              fontSize: '14px'
            }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !credentials.username || !credentials.password}
            style={{
              width: '100%',
              padding: '18px',
              background: isLoading || !credentials.username || !credentials.password 
                ? '#6c757d' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: isLoading || !credentials.username || !credentials.password 
                ? 'not-allowed' 
                : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #ffffff40',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Authenticating...
              </>
            ) : (
              <>
                🔓 Login to POS System
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div style={{
          marginTop: '30px',
          padding: '15px',
          background: '#fff3cd',
          borderRadius: '10px',
          border: '1px solid #ffeaa7',
          fontSize: '12px',
          color: '#856404'
        }}>
          🔒 <strong>Security Notice:</strong> This system is for authorized personnel only. 
          All activities are logged and monitored.
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '25px',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          GenZ Laundry POS v3.0.0 TSC Edition
          Powered By Manohar Solanki
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;