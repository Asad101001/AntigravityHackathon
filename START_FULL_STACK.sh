#!/bin/bash

# Admin Dashboard - Complete Setup Script
# This script sets up and starts both backend and admin dashboard

echo "🚀 Asaaniyat Admin Dashboard Setup"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Setup Backend
echo ""
echo "📦 Setting up Backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Start Backend (background)
echo "🔌 Starting backend server..."
npm start &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Setup Admin Dashboard
echo ""
echo "📱 Setting up Admin Dashboard..."
cd ../admin\ dashboard
if [ ! -d "node_modules" ]; then
    echo "Installing admin dashboard dependencies..."
    npm install
fi

# Start Admin Dashboard
echo "🎨 Starting admin dashboard..."
npm run dev

echo ""
echo "✅ Setup complete!"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:3001"
