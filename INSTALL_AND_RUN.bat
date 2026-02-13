@echo off
cls
echo ========================================
echo   GenZ Laundry - Install and Run
echo ========================================
echo.

echo [1/2] Installing dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: Installation failed!
    echo Please check your internet connection.
    pause
    exit /b 1
)

echo.
echo [2/2] Starting development server...
echo.
echo The app will open at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
