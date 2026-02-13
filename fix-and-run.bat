@echo off
echo Installing dependencies...
call npm install qrcode @types/qrcode

echo.
echo Building the application...
call npm run build

echo.
echo Starting the application...
call npm run dev

pause
