import React from 'react';
import QRCode from 'qrcode';

export interface ShareableBillData {
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  previousBalance?: number;
  grandTotal: number;
  businessName: string;
  businessPhone: string;
  billDate?: string;
}

export class BillShareService {
  // Generate bill text for sharing
  static generateBillText(billData: ShareableBillData): string {
    const date = billData.billDate 
      ? new Date(billData.billDate).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');

    let text = `*${billData.businessName}*\n`;
    text += `📞 ${billData.businessPhone}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🧾 *Bill #${billData.billNumber}*\n`;
    text += `📅 ${date}\n`;
    text += `👤 ${billData.customerName}\n`;
    if (billData.customerPhone) {
      text += `📱 ${billData.customerPhone}\n`;
    }
    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*ITEMS*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    billData.items.forEach((item, index) => {
      text += `${index + 1}. ${item.name}\n`;
      text += `   ${item.quantity} × ₹${item.rate} = ₹${item.amount}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Subtotal: ₹${billData.subtotal}\n`;
    
    if (billData.discount && billData.discount > 0) {
      text += `Discount: -₹${billData.discount}\n`;
    }
    if (billData.deliveryCharge && billData.deliveryCharge > 0) {
      text += `Delivery: +₹${billData.deliveryCharge}\n`;
    }
    if (billData.previousBalance && billData.previousBalance > 0) {
      text += `Previous Balance: +₹${billData.previousBalance}\n`;
    }
    
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*TOTAL: ₹${billData.grandTotal}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Thank you for your business! 🙏`;

    return text;
  }

  // Share via WhatsApp (as image)
  static async shareOnWhatsApp(billData: ShareableBillData, phoneNumber?: string) {
    try {
      // Generate bill image
      const imageBlob = await this.generateBillImageBlob(billData);
      
      // Check if Web Share API with files is supported
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([imageBlob], 'bill.png')] })) {
        const file = new File([imageBlob], `Bill_${billData.billNumber}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: `Bill #${billData.billNumber}`,
          text: `Bill from ${billData.businessName}`
        });
      } else {
        // Fallback: Download image and show instructions
        const url = URL.createObjectURL(imageBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bill_${billData.billNumber}.png`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Open WhatsApp with text message
        const text = `Bill #${billData.billNumber} - Total: ₹${billData.grandTotal}\n\nImage downloaded. Please attach it manually.`;
        const encodedText = encodeURIComponent(text);
        
        let whatsappUrl = `https://wa.me/`;
        if (phoneNumber) {
          const cleanPhone = phoneNumber.replace(/\D/g, '');
          const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
          whatsappUrl += `${formattedPhone}?text=${encodedText}`;
        } else {
          whatsappUrl += `?text=${encodedText}`;
        }
        
        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
        }, 500);
      }
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
      alert('Failed to share bill. Please try downloading instead.');
    }
  }

  // Generic share (uses Web Share API)
  static async shareViaSystem(billData: ShareableBillData) {
    const text = this.generateBillText(billData);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bill #${billData.billNumber}`,
          text: text,
        });
        return true;
      } catch (error) {
        console.error('Error sharing:', error);
        return false;
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text);
        alert('Bill copied to clipboard!');
        return true;
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
      }
    }
  }

  // Generate QR code for bill
  static async generateBillQRCode(billData: ShareableBillData): Promise<string> {
    const billUrl = this.generateBillURL(billData);
    
    try {
      const qrDataUrl = await QRCode.toDataURL(billUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });
      return qrDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Generate shareable URL for bill
  static generateBillURL(billData: ShareableBillData): string {
    const billInfo = {
      bn: billData.billNumber,
      cn: billData.customerName,
      t: billData.grandTotal,
      d: billData.billDate || new Date().toISOString().split('T')[0]
    };
    
    const encodedData = btoa(JSON.stringify(billInfo));
    const baseUrl = window.location.origin;
    return `${baseUrl}/bill/${encodedData}`;
  }

  // Download bill as image
  static async downloadBillAsImage(billData: ShareableBillData) {
    try {
      const blob = await this.generateBillImageBlob(billData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bill_${billData.billNumber}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading bill:', error);
      alert('Failed to download bill image');
    }
  }

  // Generate bill image as blob (for sharing and downloading)
  private static generateBillImageBlob(billData: ShareableBillData): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      // Thermal receipt size (80mm width at 203 DPI = ~640px)
      canvas.width = 640;
      
      // Calculate height based on content (added more space for QR code and bottom text)
      const lineHeight = 25;
      const itemCount = billData.items.length;
      const baseHeight = 650;
      const itemsHeight = itemCount * 60;
      const extraHeight = (billData.discount ? 30 : 0) + 
                         (billData.deliveryCharge ? 30 : 0) + 
                         (billData.previousBalance ? 30 : 0);
      const qrCodeHeight = 400; // Increased space for full QR code section + bottom text
      canvas.height = baseHeight + itemsHeight + extraHeight + qrCodeHeight;

      // White background with high contrast
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw thick border for high contrast
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      let y = 50;

      // Business name - BOLD and HIGH CONTRAST
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(billData.businessName.toUpperCase(), canvas.width / 2, y);
      y += 40;

      ctx.font = 'bold 20px Arial';
      ctx.fillText('LAUNDRY & DRY CLEANERS', canvas.width / 2, y);
      y += 35;

      // Business details - BOLD
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Sabji Mandi Circle, Ratanada, Jodhpur (342011)', canvas.width / 2, y);
      y += 28;
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`📞 ${billData.businessPhone}`, canvas.width / 2, y);
      y += 45;

      // Thick divider
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(canvas.width - 30, y);
      ctx.stroke();
      y += 35;

      // Bill details - BOLD and HIGH CONTRAST
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`Customer Name: ${billData.customerName}`, 40, y);
      y += 28;
      ctx.fillText(`Bill No: ${billData.billNumber}`, 40, y);
      y += 28;
      
      const date = billData.billDate 
        ? new Date(billData.billDate).toLocaleDateString('en-IN')
        : new Date().toLocaleDateString('en-IN');
      ctx.fillText(`Date: ${date}`, 40, y);
      y += 28;
      
      const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(`Time: ${time}`, 40, y);
      y += 45;

      // ORDER DETAILS header - BOLD
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ORDER DETAILS', canvas.width / 2, y);
      y += 35;

      // Thick divider
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(canvas.width - 30, y);
      ctx.stroke();
      y += 30;

      // Table header - BOLD
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('ITEM', 40, y);
      ctx.textAlign = 'center';
      ctx.fillText('QTY', 300, y);
      ctx.fillText('PRICE', 420, y);
      ctx.textAlign = 'right';
      ctx.fillText('TOTAL', canvas.width - 40, y);
      y += 30;

      // Divider
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(canvas.width - 30, y);
      ctx.stroke();
      y += 28;

      // Items - BOLD
      ctx.font = 'bold 16px Arial';
      billData.items.forEach((item) => {
        ctx.textAlign = 'left';
        ctx.fillText(item.name, 40, y);
        ctx.textAlign = 'center';
        ctx.fillText(item.quantity.toString(), 300, y);
        ctx.fillText(`₹${item.rate}`, 420, y);
        ctx.textAlign = 'right';
        ctx.fillText(`₹${item.amount}`, canvas.width - 40, y);
        y += 32;
      });

      y += 15;

      // Thick divider
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(canvas.width - 30, y);
      ctx.stroke();
      y += 32;

      // Subtotal - BOLD
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Current Order:', 40, y);
      ctx.textAlign = 'right';
      ctx.fillText(`₹${billData.subtotal}`, canvas.width - 40, y);
      y += 28;

      ctx.textAlign = 'left';
      ctx.fillText('Subtotal:', 40, y);
      ctx.textAlign = 'right';
      ctx.fillText(`₹${billData.subtotal}`, canvas.width - 40, y);
      y += 32;

      // Additional charges - BOLD
      if (billData.discount && billData.discount > 0) {
        ctx.textAlign = 'left';
        ctx.fillText('Discount:', 40, y);
        ctx.textAlign = 'right';
        ctx.fillText(`-₹${billData.discount}`, canvas.width - 40, y);
        y += 28;
      }

      if (billData.deliveryCharge && billData.deliveryCharge > 0) {
        ctx.textAlign = 'left';
        ctx.fillText('Delivery Charge:', 40, y);
        ctx.textAlign = 'right';
        ctx.fillText(`+₹${billData.deliveryCharge}`, canvas.width - 40, y);
        y += 28;
      }

      if (billData.previousBalance && billData.previousBalance > 0) {
        ctx.textAlign = 'left';
        ctx.fillText('Previous Balance:', 40, y);
        ctx.textAlign = 'right';
        ctx.fillText(`+₹${billData.previousBalance}`, canvas.width - 40, y);
        y += 28;
      }

      y += 15;

      // Double thick line divider
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(canvas.width - 30, y);
      ctx.stroke();
      y += 40;

      // Total - EXTRA BOLD and LARGE
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`TOTAL: ₹${billData.grandTotal}`, canvas.width / 2, y);
      y += 45;

      // Double thick line divider
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(canvas.width - 30, y);
      ctx.stroke();
      y += 35;

      // Generate UPI QR Code
      try {
        const transactionNote = `Bill ${billData.billNumber}`;
        const upiId = '6367493127@ybl'; // Your UPI ID
        const payeeName = billData.businessName;
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${billData.grandTotal}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
        
        // Generate QR code
        const qrDataUrl = await QRCode.toDataURL(upiUrl, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H'
        });

        // SCAN TO PAY header
        ctx.font = 'bold 22px Arial';
        ctx.fillText('SCAN TO PAY', canvas.width / 2, y);
        y += 30;

        // Amount to pay
        ctx.font = 'bold 26px Arial';
        ctx.fillText(`₹${billData.grandTotal}`, canvas.width / 2, y);
        y += 35;

        // Draw QR code
        const qrImage = new Image();
        qrImage.src = qrDataUrl;
        await new Promise<void>((resolveImg) => {
          qrImage.onload = () => {
            const qrSize = 180;
            const qrX = (canvas.width - qrSize) / 2;
            
            // White background for QR
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(qrX - 10, y - 10, qrSize + 20, qrSize + 20);
            
            // Black border around QR
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeRect(qrX - 10, y - 10, qrSize + 20, qrSize + 20);
            
            // Draw QR code
            ctx.drawImage(qrImage, qrX, y, qrSize, qrSize);
            y += qrSize + 30; // Increased spacing after QR
            
            resolveImg();
          };
        });

        // Payment methods
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PhonePe | GPay | Paytm | UPI', canvas.width / 2, y);
        y += 22;
        ctx.font = 'bold 12px Arial';
        ctx.fillText('UPI ID: 6367493127@ybl', canvas.width / 2, y);
        y += 40;

      } catch (error) {
        console.error('QR code generation failed:', error);
        y += 20;
      }

      // Thank you message - BOLD
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Thank you for choosing Gen-z laundry!', canvas.width / 2, y);
      y += 28;
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Website: genzlaundry.com', canvas.width / 2, y);
      y += 25;
      ctx.font = '14px Arial';
      ctx.fillText('Visit us again • Gen-Z Laundry & Dry Cleaners', canvas.width / 2, y);
      y += 40; // Extra padding at bottom to ensure it's inside border

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    });
  }
}
