# 🚀 Quick Deploy to billing.genzlaundry.com

## ⚡ 5-Minute Setup

### 1. Prepare Code (1 minute)
```bash
# Run the deployment script
# Windows:
deploy-to-domain.bat

# Linux/Mac:
chmod +x deploy-to-domain.sh
./deploy-to-domain.sh
```

### 2. Deploy Backend to Railway (2 minutes)
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Select your GenZ Laundry repository
5. **Settings**:
   - Root Directory: `server`
   - Start Command: `npm start`
6. **Variables** → Add all from `server/.env`:
   ```
   CORS_ORIGIN=https://billing.genzlaundry.com
   ```
7. **Deploy** → Copy the Railway URL (e.g., `https://xyz.railway.app`)

### 3. Update Frontend Config (30 seconds)
Edit `src/config.ts`:
```typescript
const config = {
  API_BASE_URL: 'https://YOUR-RAILWAY-URL.railway.app/api', // ← Update this
  THERMAL_SERVER_URL: 'http://localhost:3001',
  APP_NAME: 'GenZ Laundry POS',
  VERSION: '4.0.0',
  IS_PRODUCTION: import.meta.env.PROD,
  DOMAIN: 'billing.genzlaundry.com'
};
```

### 4. Deploy Frontend to Vercel (1 minute)
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. **Import Project** → Select your repository
4. **Configure**:
   - Framework: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Environment Variables**:
   ```
   VITE_API_URL=https://YOUR-RAILWAY-URL.railway.app/api
   ```
6. **Deploy** → Copy Vercel URL

### 5. Configure Domain (30 seconds)
1. **In Vercel**: Settings → Domains → Add `billing.genzlaundry.com`
2. **In Your Domain Provider**: Add CNAME record:
   ```
   Name: billing
   Value: cname.vercel-dns.com
   ```

### 6. Test Everything (30 seconds)
- Visit: `https://billing.genzlaundry.com`
- Login with: `sawai` / `SecurePass123!`
- Test billing, admin features

---

## 🎉 You're Live!

Your GenZ Laundry POS is now running at:
**https://billing.genzlaundry.com**

### What You Get:
- ✅ Professional custom domain
- ✅ Free SSL certificate
- ✅ 99.9% uptime
- ✅ Global CDN
- ✅ Automatic deployments
- ✅ $0/month hosting cost

### Thermal Printing:
- Still works locally on your computer
- Customers access the web app
- You print receipts from your local setup

---

## 🔧 Maintenance

### Auto-Deploy:
Every time you push to GitHub, both frontend and backend auto-deploy!

### Updates:
```bash
git add .
git commit -m "Update features"
git push origin main
# ↑ This triggers automatic deployment
```

### Monitoring:
- Railway Dashboard: Backend logs & metrics
- Vercel Dashboard: Frontend analytics
- MongoDB Atlas: Database monitoring

---

**🎊 Congratulations! Your POS system is now live on the internet!**

*Powered by Manohar Solanki*