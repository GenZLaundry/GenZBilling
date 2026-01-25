@echo off
echo 🚀 GenZ Laundry POS Deployment Starting...

REM Check if .env exists
if not exist "server\.env" (
    echo ❌ Error: server\.env file not found!
    echo Please create server\.env with your environment variables
    pause
    exit /b 1
)

echo ✅ Environment file found

REM Install and build frontend
echo 📦 Installing frontend dependencies...
npm install

echo 🔨 Building frontend...
npm run build

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd server
npm install
cd ..

REM Install thermal server dependencies
echo 📦 Installing thermal server dependencies...
cd thermal-print-server
npm install
cd ..

echo 🎉 Deployment preparation complete!
echo.
echo 🚀 To start the application:
echo 1. Frontend: npm run preview (or serve dist folder)
echo 2. Backend: cd server ^&^& npm start
echo 3. Thermal Server: cd thermal-print-server ^&^& npm start
echo.
echo 🐳 Or use Docker: docker-compose up --build
echo.
echo Powered by Manohar Solanki
pause