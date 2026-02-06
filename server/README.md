# GenZ Laundry Backend API

MongoDB-powered backend API for GenZ Laundry POS system with analytics and reporting.

## Features

- 📊 **Complete Analytics Dashboard** - Daily, weekly, monthly income reports
- 💾 **MongoDB Database** - All bills, pending orders, and shop configuration stored in cloud
- 🔄 **Real-time Sync** - Frontend automatically syncs with database
- 📈 **Performance Insights** - Top customers, recent bills, income comparisons
- ⚙️ **Shop Configuration** - Centralized store settings management
- 🔒 **Data Security** - Rate limiting, CORS protection, input validation

## Quick Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Environment Setup
The `.env` file is already configured with your MongoDB Atlas connection:
```
MONGODB_URI=mongodb+srv://genzadmin:uNd78VXJ2I@genzlaundry.yl3vi98.mongodb.net/genzlaundry
PORT=8000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### 4. Verify Connection
Visit: `http://localhost:8000/api/health`

You should see:
```json
{
  "success": true,
  "message": "GenZ Laundry API is running",
  "timestamp": "2026-01-25T...",
  "environment": "development"
}
```

## API Endpoints

### Bills Management
- `POST /api/bills` - Create new bill
- `GET /api/bills` - Get all bills (with pagination & filters)
- `GET /api/bills/pending` - Get pending bills only
- `PATCH /api/bills/:id/status` - Update bill status
- `DELETE /api/bills/:id` - Delete bill
- `GET /api/bills/:id` - Get specific bill

### Analytics & Reports
- `GET /api/analytics/dashboard` - Complete dashboard data
- `GET /api/analytics/daily` - Daily income reports
- `GET /api/analytics/weekly` - Weekly income reports  
- `GET /api/analytics/monthly` - Monthly income reports
- `GET /api/analytics/comparison` - Period-over-period comparison

### Shop Configuration
- `GET /api/shop-config` - Get shop settings
- `PUT /api/shop-config` - Update shop settings

## Database Schema

### Bills Collection
```javascript
{
  billNumber: "GZ123456",
  businessName: "GenZ Laundry",
  address: "123 Main Street",
  phone: "+91 9876543210",
  customerName: "John Doe",
  customerPhone: "+91 9876543210",
  items: [
    {
      name: "Shirt (WASH)",
      quantity: 2,
      rate: 60,
      amount: 120
    }
  ],
  subtotal: 120,
  discount: 10,
  deliveryCharge: 20,
  previousBalance: 50,
  grandTotal: 180,
  status: "completed", // pending, completed, delivered
  paymentStatus: "paid", // paid, unpaid, partial
  createdAt: "2026-01-25T...",
  completedAt: "2026-01-25T...",
  deliveredAt: "2026-01-25T..."
}
```

### Shop Configuration Collection
```javascript
{
  shopName: "GenZ Laundry",
  address: "123 Main Street, City",
  contact: "+91 9876543210",
  gstNumber: "GST123456789",
  email: "info@genzlaundry.com",
  website: "www.genzlaundry.com",
  isActive: true
}
```

## Analytics Features

### Dashboard Metrics
- **Today's Stats**: Income, bills, items, average bill amount
- **Weekly Stats**: Total income, bills, items for current week
- **Monthly Stats**: Total income, bills, items for current month
- **Pending Count**: Number of pending bills
- **Recent Bills**: Last 10 bills with status
- **Top Customers**: Top 5 customers by spending (current month)

### Income Reports
- **Daily Reports**: Income breakdown by date range
- **Weekly Reports**: Week-over-week performance
- **Monthly Reports**: Month-over-month analysis
- **Comparison Reports**: Current vs previous period with percentage changes

### Performance Insights
- Income trends and patterns
- Customer behavior analysis
- Business growth metrics
- Operational efficiency indicators

## Frontend Integration

The frontend automatically connects to this API and provides:
- **Fallback Support**: Works offline with localStorage if database is unavailable
- **Real-time Sync**: All operations sync with database when online
- **Analytics Dashboard**: Beautiful charts and reports
- **Error Handling**: Graceful degradation when API is unavailable

## Production Deployment

### MongoDB Atlas (Already Configured)
- Database: `genzlaundry`
- Connection: Already set up in `.env`
- Collections: Auto-created on first use

### Server Deployment Options
1. **Heroku**: `git push heroku main`
2. **Railway**: Connect GitHub repo
3. **DigitalOcean**: Deploy via App Platform
4. **AWS**: Use Elastic Beanstalk or EC2

### Environment Variables for Production
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://genzadmin:uNd78VXJ2I@genzlaundry.yl3vi98.mongodb.net/genzlaundry
PORT=8000
CORS_ORIGIN=https://your-frontend-domain.com
```

## Monitoring & Maintenance

### Health Checks
- API health endpoint: `/api/health`
- MongoDB connection status included
- Environment information provided

### Logging
- Request logging with Morgan
- Error logging to console
- Production-ready error handling

### Security
- Helmet.js for security headers
- CORS protection
- Rate limiting (1000 requests per 15 minutes)
- Input validation and sanitization

## Support

For issues or questions:
1. Check the logs: `npm run dev` shows detailed error messages
2. Verify MongoDB connection in Atlas dashboard
3. Test API endpoints with Postman or curl
4. Check CORS settings if frontend can't connect

The system is designed to be robust and handle both online and offline scenarios gracefully!