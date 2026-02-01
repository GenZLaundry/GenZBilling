import React, { useEffect, useRef, useState } from 'react';

interface QRCodeGeneratorProps {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionNote?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  upiId,
  payeeName,
  amount,
  transactionNote = 'Laundry Payment',
  size = 200,
  className = '',
  style = {}
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [upiId, payeeName, amount, transactionNote]);

  const generateQRCode = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Create UPI payment string
      const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
      
      // Use Google Charts API for high-quality QR code generation
      const qrUrl = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(upiString)}&choe=UTF-8&chld=H|4`;
      
      // Test if the image loads successfully
      const img = new Image();
      img.onload = () => {
        setQrCodeUrl(qrUrl);
        setIsLoading(false);
      };
      img.onerror = () => {
        // Fallback to QR Server API
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiString)}&ecc=H&margin=10`;
        
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setQrCodeUrl(fallbackUrl);
          setIsLoading(false);
        };
        fallbackImg.onerror = () => {
          setError('Failed to generate QR code');
          setIsLoading(false);
        };
        fallbackImg.src = fallbackUrl;
      };
      img.src = qrUrl;

    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('QR code generation failed');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div 
        className={className} 
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #ddd',
          borderRadius: '8px',
          background: '#f9f9f9',
          ...style
        }}
      >
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <div style={{ fontSize: '12px' }}>Generating QR...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={className} 
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #e74c3c',
          borderRadius: '8px',
          background: '#fdf2f2',
          ...style
        }}
      >
        <div style={{ textAlign: 'center', color: '#e74c3c' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
          <div style={{ fontSize: '10px' }}>QR Error</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <img
        src={qrCodeUrl}
        alt={`UPI Payment QR Code for ₹${amount}`}
        style={{
          width: size,
          height: size,
          border: '3px solid #000',
          borderRadius: '8px',
          background: 'white',
          imageRendering: 'pixelated', // Ensures sharp QR code
          filter: 'contrast(1.2)', // Increase contrast for better scanning
          ...style
        }}
        onError={() => {
          setError('Failed to load QR code');
        }}
      />
    </div>
  );
};

export default QRCodeGenerator;