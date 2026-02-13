import React, { useState } from 'react';
import { BillShareService, ShareableBillData } from './BillShareUtils';

interface BillShareButtonProps {
  billData: ShareableBillData;
  variant?: 'icon' | 'button' | 'full';
  className?: string;
}

const BillShareButton: React.FC<BillShareButtonProps> = ({ 
  billData, 
  variant = 'button',
  className = '' 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleWhatsAppShare = () => {
    BillShareService.shareOnWhatsApp(billData, billData.customerPhone);
    setShowMenu(false);
  };

  const handleSystemShare = async () => {
    setLoading(true);
    await BillShareService.shareViaSystem(billData);
    setLoading(false);
    setShowMenu(false);
  };

  const handleGenerateQR = async () => {
    setLoading(true);
    try {
      const qr = await BillShareService.generateBillQRCode(billData);
      setQrCode(qr);
      setShowQR(true);
    } catch (error) {
      alert('Failed to generate QR code');
    }
    setLoading(false);
    setShowMenu(false);
  };

  const handleDownloadImage = async () => {
    setLoading(true);
    await BillShareService.downloadBillAsImage(billData);
    setLoading(false);
    setShowMenu(false);
  };

  const handleCopyLink = async () => {
    const url = BillShareService.generateBillURL(billData);
    try {
      await navigator.clipboard.writeText(url);
      alert('Bill link copied to clipboard!');
    } catch (error) {
      alert('Failed to copy link');
    }
    setShowMenu(false);
  };

  if (variant === 'icon') {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={className}
          style={{
            background: '#25D366',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          📤
        </button>
        {showMenu && <ShareMenu 
          onWhatsApp={handleWhatsAppShare}
          onSystemShare={handleSystemShare}
          onGenerateQR={handleGenerateQR}
          onDownloadImage={handleDownloadImage}
          onCopyLink={handleCopyLink}
          onClose={() => setShowMenu(false)}
          loading={loading}
        />}
        {showQR && <QRModal qrCode={qrCode} onClose={() => setShowQR(false)} billNumber={billData.billNumber} />}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={className} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={handleWhatsAppShare}
          style={{
            background: '#25D366',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📱</span> WhatsApp (Image)
        </button>
        
        <button
          onClick={handleGenerateQR}
          disabled={loading}
          style={{
            background: '#007AFF',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: loading ? 0.6 : 1
          }}
        >
          <span>📷</span> QR Code
        </button>
        
        <button
          onClick={handleSystemShare}
          disabled={loading}
          style={{
            background: '#5856D6',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: loading ? 0.6 : 1
          }}
        >
          <span>📤</span> Share
        </button>

        <button
          onClick={handleDownloadImage}
          disabled={loading}
          style={{
            background: '#FF9500',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: loading ? 0.6 : 1
          }}
        >
          <span>💾</span> Download
        </button>

        {showQR && <QRModal qrCode={qrCode} onClose={() => setShowQR(false)} billNumber={billData.billNumber} />}
      </div>
    );
  }

  // Default button variant
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={className}
        style={{
          background: '#25D366',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>📤</span> Share Bill
      </button>
      {showMenu && <ShareMenu 
        onWhatsApp={handleWhatsAppShare}
        onSystemShare={handleSystemShare}
        onGenerateQR={handleGenerateQR}
        onDownloadImage={handleDownloadImage}
        onCopyLink={handleCopyLink}
        onClose={() => setShowMenu(false)}
        loading={loading}
      />}
      {showQR && <QRModal qrCode={qrCode} onClose={() => setShowQR(false)} billNumber={billData.billNumber} />}
    </div>
  );
};

interface ShareMenuProps {
  onWhatsApp: () => void;
  onSystemShare: () => void;
  onGenerateQR: () => void;
  onDownloadImage: () => void;
  onCopyLink: () => void;
  onClose: () => void;
  loading: boolean;
}

const ShareMenu: React.FC<ShareMenuProps> = ({ 
  onWhatsApp, 
  onSystemShare, 
  onGenerateQR, 
  onDownloadImage,
  onCopyLink,
  onClose,
  loading 
}) => {
  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999
        }}
        onClick={onClose}
      />
      <div style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: '200px',
        zIndex: 1000,
        overflow: 'hidden'
      }}>
        <button
          onClick={onWhatsApp}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            background: 'white',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <span style={{ fontSize: '20px' }}>📱</span>
          <span>Share on WhatsApp (Image)</span>
        </button>

        <button
          onClick={onGenerateQR}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            background: 'white',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <span style={{ fontSize: '20px' }}>📷</span>
          <span>Generate QR Code</span>
        </button>

        <button
          onClick={onSystemShare}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            background: 'white',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <span style={{ fontSize: '20px' }}>📤</span>
          <span>Share via...</span>
        </button>

        <button
          onClick={onDownloadImage}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            background: 'white',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <span style={{ fontSize: '20px' }}>💾</span>
          <span>Download as Image</span>
        </button>

        <button
          onClick={onCopyLink}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            background: 'white',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'background 0.2s',
            borderTop: '1px solid #eee'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <span style={{ fontSize: '20px' }}>🔗</span>
          <span>Copy Link</span>
        </button>
      </div>
    </>
  );
};

interface QRModalProps {
  qrCode: string;
  onClose: () => void;
  billNumber: string;
}

const QRModal: React.FC<QRModalProps> = ({ qrCode, onClose, billNumber }) => {
  const handleDownloadQR = () => {
    const a = document.createElement('a');
    a.href = qrCode;
    a.download = `Bill_${billNumber}_QR.png`;
    a.click();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          textAlign: 'center'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>Bill QR Code</h3>
        <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          Scan to view bill details
        </p>
        <img 
          src={qrCode} 
          alt="Bill QR Code" 
          style={{ 
            width: '100%', 
            maxWidth: '300px',
            border: '2px solid #eee',
            borderRadius: '8px',
            marginBottom: '16px'
          }} 
        />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={handleDownloadQR}
            style={{
              background: '#007AFF',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Download QR
          </button>
          <button
            onClick={onClose}
            style={{
              background: '#f5f5f5',
              color: '#333',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillShareButton;
