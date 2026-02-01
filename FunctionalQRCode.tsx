import React, { useState, useEffect } from 'react';
import { getUPIConfig } from './upiConfig';

interface FunctionalQRCodeProps {
  amount: number;
  billNumber: string;
  businessName: string;
  style?: React.CSSProperties;
}

const FunctionalQRCode: React.FC<FunctionalQRCodeProps> = ({
  amount,
  billNumber,
  businessName,
  style = {}
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('/scanner.png');

  useEffect(() => {
    generateFunctionalQR();
  }, [amount, billNumber]);

  const generateFunctionalQR = async () => {
    try {
      const config = getUPIConfig();
      
      // Only generate functional QR if UPI is configured
      if (config.upiId && config.upiId !== 'genzlaundry@paytm') {
        const transactionNote = `Bill ${billNumber}`;
        const upiString = `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
        
        // Generate QR code with original scanner.png styling
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}&ecc=H&margin=10&color=000000&bgcolor=FFFFFF`;
        
        // Test if QR generation works
        const img = new Image();
        img.onload = () => setQrCodeUrl(qrUrl);
        img.onerror = () => setQrCodeUrl('/scanner.png'); // Fallback to original
        img.src = qrUrl;
      }
    } catch (error) {
      console.log('Using original scanner.png');
      setQrCodeUrl('/scanner.png');
    }
  };

  return (
    <img 
      src={qrCodeUrl} 
      alt="Scan to Pay" 
      style={{
        width: '25mm',
        height: '25mm',
        border: '1px solid #000',
        borderRadius: '2mm',
        background: 'white',
        padding: '1mm',
        ...style
      }}
      onError={() => setQrCodeUrl('/scanner.png')}
    />
  );
};

export default FunctionalQRCode;