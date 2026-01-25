# 🌐 Deploy GenZ Laundry POS to billing.genzlaundry.com

## 🎯 Your Setup: Domain Only (No Hosting)

Since you have `genzlaundry.com` domain but no hosting, here are the **best FREE options** to deploy your POS system:

## 🚀 Recommended Solution: Vercel + Railway

### Why This Combo?
- ✅ **100% FREE** for your use case
- ✅ **Custom domain support** (billing.genzlaundry.com)
- ✅ **Professional performance**
- ✅ **SSL certificate included**
- ✅ **Easy deployment**

---

## 📋 Step-by-Step Deployment

### Step 1: Prepare Your Code
```bash
# Update environment variables for production
# Edit server/.env
MONGODB_URI=mongodb+srv://genzadmin:uNd78VXJ2S7z1i4I@genzlaundry.yl3vi98.mongodb.net/genzlaundry
JWT_SECRET=ec1xmBG2kI9tblFRKMf7Nudav5UC4n3OjoTq6AVH8gwsiEQrJYLp0PDhSzyXWZ
ADMIN_USERNAME=sawai
ADMIN_PASSWORD=SecurePass123!
ADMIN_EMAIL=genzlaundry.in@gmail.com
PORT=8000
NODE_ENV=production
CORS_ORIGIN=https://billing.genzlaundry.com
```

### Step 2: Deploy Backend to Railway (FREE)

1. **Go to [Railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Create New Project** → **Deploy from GitHub repo**
4. **Select your repository**
5. **Configure deployment**:
   - Root Directory: `server`
   - Start Command: `npm start`
6. **Add Environment Variables**:
   ```
   CORS_ORIGIN=https://billing.genzlaundry.com
   ```
7. **Deploy** → You'll get a URL like: `https://your-app-name.railway.app`

### Step 3: Update Frontend Configuration

Create `src/config.ts`:
```typescript
const config = {
  API_BASE_URL: 'https://your-railway-backend-url.railway.app/api',
  THERMAL_SERVER_URL: 'http://localhost:3001',
  APP_NAME: 'GenZ Laundry POS',
  VERSION: '4.0.0'
};

export default config;
```

Update your API calls to use this config:
```typescript
// In your API files, replace:
// const API_BASE_URL = 'http://localhost:8000/api';
// With:
import config from './config';
const API_BASE_URL = config.API_BASE_URL;
```

### Step 4: Deploy Frontend to Vercel (FREE)

1. **Go to [Vercel.com](https://vercel.com)**
2. **Sign up with GitHub**
3. **Import your repository**
4. **Configure build settings**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `/` (leave empty)
5. **Add Environment Variables**:
   ```
   VITE_API_URL=https://your-railway-backend-url.railway.app/api
   ```
6. **Deploy** → You'll get a URL like: `https://your-app-name.vercel.app`

### Step 5: Configure Custom Domain

1. **In Vercel Dashboard**:
   - Go to your project
   - Click **Settings** → **Domains**
   - Add domain: `billing.genzlaundry.com`
   - Vercel will show you DNS records to add

2. **In Your Domain Provider** (where you bought genzlaundry.com):
   - Add CNAME record:
     ```
     Name: billing
     Value: cname.vercel-dns.com
     ```
   - Or A record (if CNAME not supported):
     ```
     Name: billing
     Value: 76.76.19.61
     ```

3. **Wait 24-48 hours** for DNS propagation

---

## 🎯 Alternative Options

### Option B: Netlify + Railway
- Frontend: Netlify (free)
- Backend: Railway (free)
- Same process as Vercel

### Option C: GitHub Pages + Railway
- Frontend: GitHub Pages (free)
- Backend: Railway (free)
- Requires static site generation

### Option D: Firebase Hosting + Railway
- Frontend: Firebase Hosting (free)
- Backend: Railway (free)
- Google's infrastructure

---

## 🔧 Quick Setup Files

### 1. Update package.json (add build script)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "npm run build"
  }
}
```

### 2. Create vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### 3. Update CORS in server
```javascript
// In server/server.js
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://billing.genzlaundry.com',
    'https://your-vercel-app.vercel.app'
  ],
  credentials: true
}));
```

---

## 🚀 Deployment Commands

```bash
# 1. Build frontend
npm run build

# 2. Test locally
npm run preview

# 3. Push to GitHub (triggers auto-deploy)
git add .
git commit -m "Deploy to production"
git push origin main
```

---

## 🎉 Final Result

After deployment, you'll have:
- **Frontend**: https://billing.genzlaundry.com
- **Backend**: https://your-app.railway.app
- **SSL Certificate**: Automatic (free)
- **Professional URL**: Custom domain
- **99.9% Uptime**: Enterprise-grade hosting

---

## 💰 Cost Breakdown

- **Domain**: Already owned ✅
- **Frontend Hosting**: FREE (Vercel)
- **Backend Hosting**: FREE (Railway - 500 hours/month)
- **Database**: FREE (MongoDB Atlas)
- **SSL Certificate**: FREE (automatic)
- **Total Monthly Cost**: $0 🎉

---

## 🆘 Need Help?

If you need assistance with:
1. Setting up the deployments
2. Configuring DNS records
3. Troubleshooting issues

Just let me know! I can guide you through each step.

---

**Powered by Manohar Solanki**
GenZ Laundry POS v4.0.0 - Enterprise Edition