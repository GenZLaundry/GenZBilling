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
          className={`btn btn-ghost btn-sm ${className}`}
          style={{ fontSize: '14px' }}
        >
          <i className="fas fa-share-alt"></i>
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
      <div className={className} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={handleWhatsAppShare} className="btn btn-sm" style={{ background: '#25D366', color: 'white', border: 'none' }}>
          <i className="fab fa-whatsapp" style={{ marginRight: '4px' }}></i> WhatsApp
        </button>
        <button onClick={handleGenerateQR} disabled={loading} className="btn btn-primary btn-sm">
          <i className="fas fa-qrcode" style={{ marginRight: '4px' }}></i> QR Code
        </button>
        <button onClick={handleSystemShare} disabled={loading} className="btn btn-ghost btn-sm">
          <i className="fas fa-share-alt" style={{ marginRight: '4px' }}></i> Share
        </button>
        <button onClick={handleDownloadImage} disabled={loading} className="btn btn-ghost btn-sm">
          <i className="fas fa-download" style={{ marginRight: '4px' }}></i> Download
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
        className={`btn btn-ghost btn-sm ${className}`}
        style={{ fontSize: '12px' }}
      >
        <i className="fas fa-share-alt" style={{ marginRight: '4px' }}></i> Share
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
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-xl)',
        minWidth: '240px',
        zIndex: 9999,
        overflow: 'hidden',
        padding: '8px 0'
      }}>
        <div style={{ padding: '8px 14px 6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Share Bill
        </div>
        <button onClick={onWhatsApp} disabled={loading} className="share-menu-item">
          <i className="fab fa-whatsapp" style={{ color: '#25D366', width: '18px' }}></i>
          <span>WhatsApp</span>
        </button>
        <button onClick={onGenerateQR} disabled={loading} className="share-menu-item">
          <i className="fas fa-qrcode" style={{ color: 'var(--accent)', width: '18px' }}></i>
          <span>QR Code</span>
        </button>
        <button onClick={onSystemShare} disabled={loading} className="share-menu-item">
          <i className="fas fa-share-alt" style={{ color: 'var(--text-secondary)', width: '18px' }}></i>
          <span>Share via…</span>
        </button>
        <button onClick={onDownloadImage} disabled={loading} className="share-menu-item">
          <i className="fas fa-download" style={{ color: 'var(--text-secondary)', width: '18px' }}></i>
          <span>Download Image</span>
        </button>
        <button onClick={onCopyLink} disabled={loading} className="share-menu-item" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <i className="fas fa-link" style={{ color: 'var(--text-secondary)', width: '18px' }}></i>
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
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card"
        style={{ maxWidth: '360px', textAlign: 'center', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '8px', fontSize: '18px', color: 'var(--text-primary)' }}>
          <i className="fas fa-qrcode" style={{ marginRight: '8px' }}></i>Bill QR Code
        </h3>
        <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Scan to view bill details
        </p>
        <img 
          src={qrCode} 
          alt="Bill QR Code" 
          style={{ 
            width: '100%', 
            maxWidth: '240px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px'
          }} 
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button onClick={handleDownloadQR} className="btn btn-primary btn-sm">
            <i className="fas fa-download" style={{ marginRight: '4px' }}></i>Download
          </button>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
};

export default BillShareButton;
