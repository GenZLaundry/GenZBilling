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
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (amount > 0) {
      generateFunctionalQR();
    } else {
      setQrCodeUrl('/scanner.png');
    }
  }, [amount, billNumber]);

  const generateFunctionalQR = async () => {
    setIsGenerating(true);
    
    try {
      const config = getUPIConfig();
      
      // Create UPI payment string with exact bill amount
      const transactionNote = `Bill ${billNumber} - ${businessName}`;
      const upiString = `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
      
      // Generate high-contrast QR code that looks like original scanner.png
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}&ecc=H&margin=10&color=000000&bgcolor=FFFFFF`;
      
      // Test if QR generation works
      const img = new Image();
      img.onload = () => {
        setQrCodeUrl(qrUrl);
        setIsGenerating(false);
      };
      img.onerror = () => {
        // Fallback to Google Charts API
        const fallbackUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(upiString)}&choe=UTF-8&chld=H|4`;
        
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setQrCodeUrl(fallbackUrl);
          setIsGenerating(false);
        };
        fallbackImg.onerror = () => {
          setQrCodeUrl('/scanner.png'); // Final fallback to original
          setIsGenerating(false);
        };
        fallbackImg.src = fallbackUrl;
      };
      img.src = qrUrl;

    } catch (error) {
      console.log('QR generation failed, using original scanner.png');
      setQrCodeUrl('/scanner.png');
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img 
        src={qrCodeUrl} 
        alt={amount > 0 ? `Pay ₹${amount}` : "Scan to Pay"} 
        style={{
          width: '25mm',
          height: '25mm',
          border: '1px solid #000',
          borderRadius: '2mm',
          background: 'white',
          padding: '1mm',
          filter: 'contrast(1.2)', // High contrast for better scanning
          ...style
        }}
        onError={() => setQrCodeUrl('/scanner.png')}
      />
      
      {/* Loading indicator */}
      {isGenerating && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px'
        }}>
          ⏳
        </div>
      )}
      
      {/* Amount indicator for functional QR codes */}
      {amount > 0 && qrCodeUrl !== '/scanner.png' && (
        <div style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px',
          background: '#27ae60',
          color: 'white',
          fontSize: '8px',
          padding: '1px 3px',
          borderRadius: '2px',
          fontWeight: 'bold'
        }}>
          ₹{amount}
        </div>
      )}
    </div>
  );
};

export default FunctionalQRCode;