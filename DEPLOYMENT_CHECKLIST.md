# ✅ GenZ Laundry POS - Deployment Checklist

## Pre-Deployment Setup

### 🔧 Environment Configuration
- [ ] MongoDB Atlas cluster created and configured
- [ ] Database user created with read/write permissions
- [ ] IP whitelist configured (0.0.0.0/0 for global access)
- [ ] Connection string copied to `server/.env`

### 🔐 Security Setup
- [ ] Strong admin password set (12+ characters)
- [ ] JWT secret generated (32+ random characters)
- [ ] Admin email configured
- [ ] CORS origin set to production domain

### 📦 Dependencies
- [ ] Node.js 18+ installed
- [ ] All npm packages 