@echo off
REM Admin Dashboard - Complete Setup Script (Windows)
REM This script sets up and starts both backend and admin dashboard

echo 🚀 Asaaniyat Admin Dashboard Setup
echo ==================================

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version
echo ✅ NPM version:
npm --version

REM Setup Backend
echo.
echo 📦 Setting up Backend...
cd backend

if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
)

echo.
echo 🔌 Starting backend server...
start cmd /k npm start

REM Wait for backend to start
timeout /t 3 /nobreak

REM Setup Admin Dashboard
echo.
echo 📱 Setting up Admin Dashboard...
cd ..\admin dashboard

if not exist "node_modules" (
    echo Installing admin dashboard dependencies...
    call npm install
)

echo.
echo 🎨 Starting admin dashboard...
echo Open your browser to: http://localhost:5173
call npm run dev

pause
