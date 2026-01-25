# 🚀 GenZ Laundry POS - Quick Deployment Guide

## 🎯 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (free tier works)
- Git installed

### 1. Clone & Setup
```bash
git clone <your-repo-url>
cd GenZLaundry
```

### 2. Environment Configuration
```bash
# Copy environment template
cp server/.env.example server/.env

# Edit server/.env with your details:
# - MongoDB connection string
# - Admin username/password
# - JWT secret key
```

### 3. One-Click Deploy
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

### 4. Start Services
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
npm run preview

# Terminal 3 - Thermal Server (optional)
cd thermal-print-server
npm start
```

### 5. Access Your App
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Thermal Server**: http://localhost:3001

## 🌐 Production Deployment Options

### Option A: Vercel + Railway (Recommended)
1. **Frontend on Vercel**:
   - Connect GitHub repo
   - Build command: `npm run build`
   - Output directory: `dist`

2. **Backe
n Issues:

**"Failed to fetch" error:**
- Check if backend server is running on port 8000
- Verify CORS_ORIGIN in server/.env matches frontend URL

**MongoDB connection error:**
- Verify MONGODB_URI in server/.env
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for testing)

**Admin login not working:**
- Check ADMIN_USERNAME and ADMIN_PASSWORD in server/.env
- Verify JWT_SECRET is set

**Thermal printing not working:**
- Start thermal-print-server: `cd thermal-print-server && npm start`
- Check printer connection and drivers

## 📞 Support

For deployment help:
- Check server logs: `pm2 logs` or `docker logs`
- Verify all environment variables are set
- Test database connectivity
- Check network/firewall settings

## 🎉 Success!

Once deployed, you'll have:
- Professional POS system running 24/7
- Secure admin authentication
- Real-time data synchronization
- Thermal receipt printing
- Complete business analytics

---

**Developed by Manohar Solanki**
GenZ Laundry POS v4.0.0 - Enterprise Edition

🌟 **Star this repo if it helped your business!**