#!/bin/bash

echo "🚀 Starting LabSyncPro with Comprehensive Timetable System"
echo "=========================================================="

# Kill any existing processes on our ports
echo "🔄 Cleaning up existing processes..."
lsof -ti:5174 | xargs kill -9 2>/dev/null || true
lsof -ti:5002 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "✅ Cleanup completed"

# Start the backend server
echo "🖥️  Starting backend server..."
cd server
node index.js &
SERVER_PID=$!
cd ..

# Wait a moment for server to start
sleep 3

# Start the frontend
echo "🌐 Starting frontend..."
cd client
npm run dev &
CLIENT_PID=$!
cd ..

echo ""
echo "🎉 LabSyncPro is starting up!"
echo ""
echo "📍 Frontend: http://localhost:5174"
echo "📍 Backend:  http://localhost:5002"
echo ""
echo "🔑 Login Credentials:"
echo "   Admin:      admin@labsyncpro.com / admin123"
echo "   Instructor: instructor@labsyncpro.com / admin123"
echo "   Student:    student@labsyncpro.com / admin123"
echo ""
echo "✨ New Features Added:"
echo "   📅 Comprehensive Timetable System with Version Control"
echo "   ⏰ Period Time Management with WEF Date Functionality"
echo "   📊 Weekly and Calendar Views"
echo "   📤 Export to PDF/CSV with Print Support"
echo "   🔄 Schedule Conflict Detection"
echo "   📈 Timetable Statistics and Analytics"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down LabSyncPro..."
    kill $SERVER_PID 2>/dev/null || true
    kill $CLIENT_PID 2>/dev/null || true
    lsof -ti:5174 | xargs kill -9 2>/dev/null || true
    lsof -ti:5002 | xargs kill -9 2>/dev/null || true
    echo "✅ Shutdown complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
