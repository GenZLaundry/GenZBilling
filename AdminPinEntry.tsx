import React, { useState } from 'react';

interface AdminPinEntryProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AdminPinEntry: React.FC<AdminPinEntryProps> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_PIN = '1234'; // Default PIN - should be configurable

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (pin === ADMIN_PIN) {
        onSuccess();
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
      setIsLoading(false);
    }, 300);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setPin(value);
      setError('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.3s ease-out'
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          color: '#1e293b',
          textAlign: 'center'
        }}>
          Admin Access
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: '#64748b',
          textAlign: 'center'
        }}>
          Enter your PIN to access the admin dashboard
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="Enter PIN"
              autoFocus
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '18px',
                border: error ? '2px solid #ef4444' : '2px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                textAlign: 'center',
                letterSpacing: '4px',
                fontWeight: '600',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'}
            />
            {error && (
              <div style={{
                marginTop: '8px',
                color: '#ef4444',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                background: 'white',
                color: '#64748b',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || pin.length === 0}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                background: (isLoading || pin.length === 0) ? '#cbd5e1' : '#3b82f6',
                color: 'white',
                cursor: (isLoading || pin.length === 0) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && pin.length > 0) {
                  e.currentTarget.style.background = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && pin.length > 0) {
                  e.currentTarget.style.background = '#3b82f6';
                }
              }}
            >
              {isLoading ? 'Verifying...' : 'Enter'}
            </button>
          </div>
        </form>

        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AdminPinEntry;
