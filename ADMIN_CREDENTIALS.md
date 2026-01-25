# Admin Credentials Configuration

## Current Admin Credentials
Admin credentials are now stored securely in environment variables:
- **Username:** Set in `ADMIN_USERNAME` environment variable
- **Password:** Set in `ADMIN_PASSWORD` environment variable  
- **Email:** Set in `ADMIN_EMAIL` environment variable

## How to Change Admin Credentials

### Method 1: Edit Environment Variables (Recommended)
1. Open `server/.env` file
2. Find and modify these lines:
   ```env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=SecurePass123!
   ADMIN_EMAIL=admin@genzlaundry.com
   ```
3. Change the values to your desired credentials
4. Save the file
5. Restart the server: `npm start` in the `server` folder

### Method 2: Use Change Password API (Temporary - Until Server Restart)
1. Login to the admin panel
2. Use the change password feature in the admin dashboard
3. This will update the password in memory until the server is restarted
4. **Note:** This change is temporary and will revert to the `.env` value on server restart

## Environment Variables
The following environment variables control admin access:

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Admin login password | `admin123` |
| `ADMIN_EMAIL` | Admin email address | `admin@genzlaundry.com` |

## Security Features
- ✅ Credentials stored in environment variables (not in code)
- ✅ Password is automatically hashed with bcrypt (12 rounds)
- ✅ Device fingerprinting for enhanced security
- ✅ Rate limiting (5 attempts per 15 minutes)
- ✅ JWT tokens with 24-hour expiration
- ✅ Audit logging of all login attempts
- ✅ No account creation - only fixed admin account

## Important Security Notes
- **Never commit the `.env` file to version control**
- The `.env` file should be added to `.gitignore`
- Change default credentials immediately after setup
- Use strong passwords with mixed case, numbers, and symbols
- Only ONE admin account exists - no one can create additional accounts

## Default Login (Change These!)
- **URL:** http://localhost:3000
- **Username:** admin
- **Password:** SecurePass123!

**⚠️ IMPORTANT: Change the default credentials in the `.env` file immediately!**

## Production Deployment
For production environments:
1. Set environment variables on your server/hosting platform
2. Never use default credentials
3. Use strong, unique passwords
4. Consider using secrets management services
5. Regularly rotate credentials