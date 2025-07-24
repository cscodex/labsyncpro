#!/bin/bash

echo "🔄 Restarting LabSyncPro System..."

# Kill any existing processes on ports 5002 and 5174
echo "🛑 Stopping existing processes..."
lsof -ti:5002 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true

# Install missing dependencies
echo "📦 Installing missing dependencies..."
cd server
npm install uuid
cd ..

# Start the application
echo "🚀 Starting LabSyncPro..."
npm run dev

echo "✅ System restart completed!"
