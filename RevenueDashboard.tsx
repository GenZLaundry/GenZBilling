import React from 'react';

interface RevenueDashboardProps {
  onClose: () => void;
}

const RevenueDashboard: React.FC<RevenueDashboardProps> = ({ onClose }) => {
  console.log('🎨 RevenueDashboard RENDERING NOW!');
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(255, 0, 0, 0.9)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999
    }}>
      <div style={{
        background: 'white',
        padding: '50px',
        borderRadius: '20px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <h1 style={{ color: 'black', fontSize: '32px', marginBottom: '20px' }}>
          🎉 Revenue Dashboard Test
        </h1>
        <p style={{ color: '#666', fontSize: '18px', marginBottom: '30px' }}>
          If you can see this, the component is rendering correctly!
        </p>
        <button
          onClick={onClose}
          style={{
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          ✕ Close Dashboard
        </button>
      </div>
    </div>
  );
};

export default RevenueDashboard;
