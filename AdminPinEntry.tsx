import React, { useState } from 'react';

interface AdminPinEntryProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AdminPinEntry: React.FC<AdminPinEntryProps> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_PIN = localStorage.getItem('adminPin') || '1234';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

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
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setPin(value);
      setError('');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div className="alert-icon alert-icon-info" style={{ margin: '0 auto 12px', width: '48px', height: '48px', fontSize: '20px' }}>
            <i className="fas fa-shield-halved"></i>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px', color: 'var(--text-primary)' }}>
            Admin Access
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Enter your PIN to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="Enter PIN"
              autoFocus
              disabled={isLoading}
              style={{
                textAlign: 'center',
                letterSpacing: '6px',
                fontSize: '20px',
                fontWeight: '600',
                padding: '14px',
                borderColor: error ? 'var(--danger)' : undefined
              }}
            />
            {error && (
              <div style={{ marginTop: '8px', color: 'var(--danger)', fontSize: '13px', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="btn btn-ghost"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || pin.length === 0}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {isLoading ? 'Verifying…' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPinEntry;
