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

  return (
    <div className="login-container" style={{ backgroundImage: 'url(/bg.png)' }}>
      <div className="login-overlay"></div>

      <div className="login-card">
        <img src="/logo.png" alt="GenZ Laundry" className="login-logo" />

        <div className="login-title">
          <h2>Welcome back</h2>
          <p>Sign in to GenZ Laundry POS</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label>
              <i className="fas fa-envelope"></i>
              Email
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder="Enter your email"
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label>
              <i className="fas fa-lock"></i>
              Password
            </label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !credentials.username || !credentials.password}
            className="login-btn"
          >
            {isLoading ? (
              <>
                <span className="spinner spinner-sm"></span>
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="login-footer">
          Built by{' '}
          <a
            href="https://www.linkedin.com/in/mr-manohar-solanki/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Manohar Solanki
          </a>
        </div>
      </div>
    </div>
  );
};

export default SecureAuth;