# Bill Sharing & QR Code Feature Guide

## Overview
This feature allows you to share bills via WhatsApp, generate QR codes, and share bills through various platforms.

## Installation

1. Install the required dependency:
```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

## Features

### 1. WhatsApp Sharing
- Share bill details directly to WhatsApp
- Automatically formats bill with items, totals, and business info
- Can send to customer's phone number or open WhatsApp to select contact

### 2. QR Code Generation
- Generates QR code containing bill information
- Scannable QR code for easy bill access
- Download QR code as PNG image

### 3. System Share
- Uses native Web Share API (mobile devices)
- Fallback to clipboard copy on desktop
- Share to any app on your device

### 4. Download as Image
- Convert bill to image format
- Download bill as PNG file
- Perfect for archiving or email

### 5. Copy Link
- Generate shareable URL for bill
- Copy link to clipboard
- Share via any messaging platform

## Usage

### In Billing Interface
After generating a bill, the success modal will show share buttons:
- **WhatsApp**: Direct share to customer's WhatsApp
- **QR Code**: Generate and download QR code
- **Share**: Use system share menu
- **Download**: Save bill as image

### In Bill Manager
Each bill in the history has a share button (📤 icon):
- Click to open share menu
- Choose sharing method
- Share with customers or for records

## Components

### BillShareUtils.tsx
Core utility class with methods:
- `generateBillText()`: Format bill as text
- `shareOnWhatsApp()`: Share via WhatsApp
- `shareViaSystem()`: Use Web Share API
- `generateBillQRCode()`: Create QR code
- `generateBillURL()`: Create shareable link
- `downloadBillAsImage()`: Export as image

### BillShareButton.tsx
React component with three variants:
- `icon`: Compact share icon button
- `button`: Standard share button
- `full`: All share options displayed

## Integration Points

### BillingMachineInterface.tsx
- Added after successful bill generation
- Shows in success modal
- Full variant with all options

### BillManager.tsx
- Added to each bill in history
- Icon variant for compact display
- Quick access to share options

## Bill Data Format

```typescript
interface ShareableBillData {
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
```

## WhatsApp Message Format

```
*GenZ Laundry*
📞 +91 9256930727
━━━━━━━━━━━━━━━━━━━━

🧾 *Bill #GZ123456*
📅 13/02/2026
👤 Customer Name
📱 9876543210

━━━━━━━━━━━━━━━━━━━━
*ITEMS*
━━━━━━━━━━━━━━━━━━━━

1. Shirt
   2 × ₹60 = ₹120

2. Pant
   1 × ₹70 = ₹70

━━━━━━━━━━━━━━━━━━━━
Subtotal: ₹190
Discount: -₹10
Delivery: +₹20
━━━━━━━━━━━━━━━━━━━━
*TOTAL: ₹200*
━━━━━━━━━━━━━━━━━━━━

Thank you for your business! 🙏
```

## Browser Compatibility

- **WhatsApp Share**: All browsers (opens WhatsApp Web/App)
- **QR Code**: All modern browsers
- **Web Share API**: Mobile browsers, some desktop browsers
- **Clipboard API**: Modern browsers (HTTPS required)
- **Download**: All browsers

## Security Notes

- Bill URLs use base64 encoding (not encryption)
- QR codes contain bill summary, not full details
- No sensitive payment information in shares
- Customer phone numbers are optional in shares

## Customization

### Change Business Info
Update in `BillManager.tsx` and `BillingMachineInterface.tsx`:
```typescript
businessName: 'Your Business Name',
businessPhone: '+91 XXXXXXXXXX'
```

### Modify Message Format
Edit `BillShareService.generateBillText()` in `BillShareUtils.tsx`

### Style Share Buttons
Modify inline styles in `BillShareButton.tsx`

### QR Code Options
Adjust QR code generation in `BillShareService.generateBillQRCode()`:
```typescript
await QRCode.toDataURL(billUrl, {
  width: 400,        // Size
  margin: 2,         // Margin
  errorCorrectionLevel: 'H'  // Error correction
});
```

## Troubleshooting

### QR Code Not Generating
- Check if `qrcode` package is installed
- Verify bill data is complete
- Check browser console for errors

### WhatsApp Not Opening
- Ensure phone number format is correct (with country code)
- Check if WhatsApp is installed
- Try WhatsApp Web as fallback

### Share Not Working
- Web Share API requires HTTPS
- Check browser compatibility
- Fallback to clipboard copy

### Download Not Working
- Check browser popup settings
- Verify canvas API support
- Try different browser

## Future Enhancements

- Email bill directly
- SMS sharing
- Print to PDF
- Bulk bill sharing
- Custom QR code branding
- Bill templates
- Multi-language support
