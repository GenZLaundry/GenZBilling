# 🚀 GenZ Laundry POS - Deployment Guide

## Overview
This guide covers multiple deployment options for your GenZ Laundry POS system, from local deployment to cloud hosting.

## 📋 Pre-Deployment Checklist

### ✅ Environment Setup
- [ ] MongoDB Atlas connection string configured
- [ ] Admin credentials set in environment variables
- [ ] JWT secret key configured
- [ ] CORS origins properly set
- [ ] All dependencies installed

### ✅ Security Checklist
- [ ] Strong admin password set
- [ ] JWT secret is cryptographically secure
- [ ] MongoDB connection uses authentication
- [ ] Rate limiting configured
- [ ] HTTPS enabled (for production)

## 🏠 Option 1: Local Deployment

### Frontend (React + Vite)
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend (Node.js + Express)
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start production server
npm start
```

### Environment Variables
Create `server/.env` with:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
ADMIN_EMAIL=your_email@domain.com
PORT=8000
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000
```

## ☁️ Option 2: Cloud Deployment

### 2A. Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel:
1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy

#### Backend on Railway:
1. Connect GitHub repo to Railway
2. Set root directory: `server`
3. Add environment variables
4. Deploy

### 2B. Netlify (Frontend) + Heroku (Backend)

#### Frontend on Netlify:
1. Drag and drop `dist` folder to Netlify
2. Or connect GitHub repo
3. Set build command: `npm run build`
4. Set publish directory: `dist`

#### Backend on Heroku:
1. Create Heroku app
2. Add environment variables
3. Deploy from GitHub or CLI

### 2C. Full Stack on Railway/Render

#### Single Repository Deployment:
1. Create `package.json` in root:
```json
{
  "name": "genzlaundry-fullstack",
  "scripts": {
    "build": "npm install && npm run build:frontend && npm run build:backend",
    "build:frontend": "npm run build",
    "build:backend": "cd server && npm install",
    "start": "cd server && npm start"
  }
}
```

## 🐳 Option 3: Docker Deployment

### Docker Configuration Files Created:
- `Dockerfile` (Frontend)
- `server/Dockerfile` (Backend)
- `docker-compose.yml` (Full stack)

### Deploy with Docker:
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run individually
docker build -t genzlaundry-frontend .
docker build -t genzlaundry-backend ./server
```

## 🌐 Option 4: VPS/Dedicated Server

### Using PM2 for Process Management:
```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd server
pm2 start server.js --name "genzlaundry-api"

# Serve frontend with nginx or serve
npm install -g serve
serve -s dist -l 3000
```

### Nginx Configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/your/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📱 Option 5: Mobile App (PWA)

Your app is already PWA-ready! Add to home screen on mobile devices.

### PWA Features:
- Offline capability
- App-like experience
- Push notifications (can be added)
- Home screen installation

## 🔧 Production Optimizations

### Frontend Optimizations:
- Code splitting implemented
- Asset optimization
- Gzip compression
- CDN for static assets

### Backend Optimizations:
- Database connection pooling
- Request rate limiting
- Security headers
- Logging and monitoring

## 📊 Monitoring & Analytics

### Recommended Tools:
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics
- **Performance**: Lighthouse, GTmetrix

## 🔐 SSL/HTTPS Setup

### Free SSL with Let's Encrypt:
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## 🚀 Quick Deploy Commands

### One-Click Deploy Scripts:
```bash
# Frontend build and deploy
npm run build && npm run deploy

# Backend deploy
cd server && npm start

# Full stack deploy
./deploy.sh
```

## 📞 Support

For deployment issues:
- Check logs: `pm2 logs` or `docker logs`
- Verify environment variables
- Test database connectivity
- Check CORS settings

## 🎉 Post-Deployment

After successful deployment:
1. Test all features
2. Verify thermal printing works
3. Test admin authentication
4. Check database operations
5. Monitor performance

---

**Powered by Manohar Solanki**
GenZ Laundry POS v4.0.0 - Enterprise Edition