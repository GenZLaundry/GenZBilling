@echo off
echo 🚀 Deploying GenZ Laundry POS to billing.genzlaundry.com
echo ==================================================

echo Step 1: Building frontend for production...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)

echo ✅ Frontend build successful

echo Step 2: Testing production build locally...
echo You can test at: http://localhost:4173
start npm run preview

echo.
echo 🎉 Build completed successfully!
echo.
echo Next steps for deployment:
echo 1. Push your code to GitHub
echo 2. Deploy backend to Railway.app
echo 3. Deploy frontend to Vercel.com
echo 4. Configure DNS: billing.genzlaundry.com → Vercel
echo.
echo See DOMAIN_DEPLOYMENT_GUIDE.md for detailed instructions
echo.
pause