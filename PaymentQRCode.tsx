import React, { useState, useEffect } from 'react';
import { getUPIConfig } from './upiConfig';

interface PaymentQRCodeProps {
  amount: number;
  billNumber: string;
  businessName: string;
  size?: number;
  showAmount?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const PaymentQRCode: React.FC<PaymentQRCodeProps> = ({
  amount,
  billNumber,
  businessName,
  size = 150,
  showAmount = true,
  className = '',
  style = {}
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [amount, billNumber, businessName]);

  const generateQRCode = async () => {
    setIsLoading(true);
    setError('');

    try {
      const config = getUPIConfig();

      // Create UPI payment string
      const transactionNote = `Bill ${billNumber}`;
      const upiString = `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
      
      // Generate high-contrast QR code that looks like the original scanner.png
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiString)}&ecc=H&margin=8&color=000000&bgcolor=FFFFFF`;
      
      // Test if the image loads successfully
      const img = new Image();
      img.onload = () => {
        setQrCodeUrl(qrUrl);
        setIsLoading(false);
      };
      img.onerror = () => {
        // Fallback to Google Charts API
        const fallbackUrl = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(upiString)}&choe=UTF-8&chld=H|4`;
        
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setQrCodeUrl(fallbackUrl);
          setIsLoading(false);
        };
        fallbackImg.onerror = () => {
          // Final fallback to original scanner.png
          setQrCodeUrl('/scanner.png');
          setIsLoading(false);
        };
        fallbackImg.src = fallbackUrl;
      };
      img.src = qrUrl;

    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback to original scanner.png
      setQrCodeUrl('/scanner.png');
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #000',
          borderRadius: '2mm',
          background: 'white',
          padding: '1mm',
          ...style
        }}
      >
        <img 
          src="/scanner.png" 
          alt="Loading QR Code" 
          style={{ 
            width: '80%', 
            height: '80%', 
            opacity: 0.5 
          }} 
        />
      </div>
    );
  }

  return (
    <div className={className} style={{ textAlign: 'center', ...style }}>
      <img
        src={qrCodeUrl}
        alt="Scan to Pay"
        style={{
          width: size,
          height: size,
          border: '1px solid #000',
          borderRadius: '2mm',
          background: 'white',
          padding: '1mm',
          imageRendering: 'pixelated',
          filter: 'contrast(1.3)', // High contrast for better scanning
          ...style
        }}
        onError={() => {
          // Final fallback to original image
          setQrCodeUrl('/scanner.png');
        }}
      />
      
      <div style={{
        fontSize: '10px',
        color: '#666',
        marginTop: '1mm',
        lineHeight: '1.2'
      }}>
        PhonePe | UPI | Cards
      </div>
    </div>
  );
};

export default PaymentQRCode;