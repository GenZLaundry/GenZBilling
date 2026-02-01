# 🔧 QR Code Payment Setup Guide

## Quick Setup (2 minutes)

### Step 1: Configure Your UPI ID
1. Open the billing interface
2. Click the **💳 UPI** button in the bill section
3. Enter your UPI ID (e.g., `yourname@paytm`, `yourname@phonepe`)
4. Enter your business name as it should appear to customers
5. Click **Save Settings**

### Step 2: Test the QR Code
1. In the UPI settings, set a test amount (e.g., ₹10)
2. Click **Generate Test QR Code**
3. Scan with your phone's UPI app (PhonePe, Google Pay, etc.)
4. Verify the payment details are correct
5. **Don't complete the payment** - just verify it shows correctly

### Step 3: Start Using
- QR codes will now appear automatically on bills
- Each QR code contains the exact bill amount
- Customers can scan with any UPI app

## Supported UPI Apps
✅ **PhonePe** - @ybl, @phonepe  
✅ **Google Pay** - @oksbi, @okhdfcbank  
✅ **Paytm** - @paytm  
✅ **BHIM** - @upi  
✅ **Amazon Pay** - @apl  
✅ **All Bank UPI Apps**

## Common UPI ID Formats
- **Paytm**: `yourname@paytm`
- **PhonePe**: `yourname@ybl`
- **Google Pay**: `yourname@oksbi`
- **BHIM**: `yourname@upi`
- **Bank Apps**: `yourname@bankname`

## Troubleshooting

### QR Code Not Scanning?
1. **Check UPI ID**: Make sure it's correct and active
2. **Test Amount**: Try with a small amount first
3. **Network**: Ensure internet connection for QR generation
4. **App Update**: Update your UPI app to latest version

### QR Code Shows Error?
1. **Internet Connection**: QR codes are generated online
2. **UPI ID Format**: Must be `name@provider` format
3. **Special Characters**: Avoid special characters in business name

### Payment Not Received?
1. **UPI ID**: Double-check it's your correct UPI ID
2. **Bank Account**: Ensure UPI ID is linked to active account
3. **Limits**: Check daily/monthly UPI limits

## Features

### High Contrast QR Codes
- **Black & White**: Maximum contrast for easy scanning
- **Error Correction**: High-level error correction (Level H)
- **Optimal Size**: Perfect size for phone cameras

### Dynamic Amount
- Each QR code contains the exact bill amount
- No manual entry needed by customer
- Reduces payment errors

### Multiple Fallbacks
- Primary: QR Server API
- Fallback: Google Charts API
- Error handling with clear messages

## Security Notes
- QR codes contain only payment information
- No sensitive business data in QR codes
- Standard UPI protocol - same as bank apps
- Customers see your business name before paying

## Need Help?
- Test the QR code yourself first
- Check with your bank if UPI ID is active
- Ensure your UPI app is updated
- Contact your UPI provider for account issues

---

**💡 Pro Tip**: Always test with a small amount first to ensure everything works correctly!