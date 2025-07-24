#!/bin/bash

# LabSyncPro Restart Script
# This script kills existing processes and restarts the application

echo "🔄 LabSyncPro Restart Script"
echo "=============================="

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local process_name=$2
    
    echo "🔍 Checking for processes on port $port ($process_name)..."
    
    # Find and kill processes on the specified port
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo "⚠️  Found processes on port $port: $pids"
        echo "🔪 Killing processes..."
        kill -9 $pids 2>/dev/null
        sleep 2
        
        # Verify processes are killed
        local remaining=$(lsof -ti:$port 2>/dev/null)
        if [ -z "$remaining" ]; then
            echo "✅ Successfully killed $process_name processes on port $port"
        else
            echo "❌ Some processes may still be running on port $port"
        fi
    else
        echo "✅ No processes found on port $port"
    fi
}

# Function to kill Node.js processes by name
kill_node_processes() {
    echo "🔍 Checking for Node.js processes..."
    
    # Kill any existing node processes related to our app
    local node_pids=$(pgrep -f "node.*vite\|node.*nodemon\|node.*index.js" 2>/dev/null)
    
    if [ ! -z "$node_pids" ]; then
        echo "⚠️  Found Node.js processes: $node_pids"
        echo "🔪 Killing Node.js processes..."
        kill -9 $node_pids 2>/dev/null
        sleep 2
        echo "✅ Node.js processes killed"
    else
        echo "✅ No Node.js processes found"
    fi
}

# Function to check if required dependencies are installed
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    # Check if node_modules exist
    if [ ! -d "node_modules" ]; then
        echo "⚠️  Root node_modules not found, installing..."
        npm install
    fi
    
    if [ ! -d "client/node_modules" ]; then
        echo "⚠️  Client node_modules not found, installing..."
        cd client && npm install && cd ..
    fi
    
    if [ ! -d "server/node_modules" ]; then
        echo "⚠️  Server node_modules not found, installing..."
        cd server && npm install && cd ..
    fi
    
    echo "✅ Dependencies checked"
}

# Function to check environment variables
check_environment() {
    echo "🔍 Checking environment configuration..."
    
    if [ ! -f "server/.env" ]; then
        echo "⚠️  Server .env file not found!"
        echo "📝 Please create server/.env with your database configuration"
        echo "   Example:"
        echo "   DB_HOST=localhost"
        echo "   DB_PORT=5432"
        echo "   DB_NAME=labsyncpro"
        echo "   DB_USER=your_username"
        echo "   DB_PASSWORD=your_password"
        echo "   JWT_SECRET=your_jwt_secret"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Restart cancelled"
            exit 1
        fi
    else
        echo "✅ Environment file found"
    fi
}

# Main restart process
main() {
    echo "🚀 Starting LabSyncPro restart process..."
    echo ""
    
    # Step 1: Kill existing processes
    echo "📍 Step 1: Cleaning up existing processes"
    kill_port 5174 "Frontend (Vite)"
    kill_port 3000 "Backend (Express)"
    kill_port 5000 "Backend (Express)"
    kill_node_processes
    echo ""
    
    # Step 2: Check dependencies
    echo "📍 Step 2: Checking dependencies"
    check_dependencies
    echo ""
    
    # Step 3: Check environment
    echo "📍 Step 3: Checking environment"
    check_environment
    echo ""
    
    # Step 4: Start the application
    echo "📍 Step 4: Starting LabSyncPro"
    echo "🚀 Launching application..."
    echo ""
    echo "Frontend will be available at: http://localhost:5174"
    echo "Backend will be available at: http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop the application"
    echo ""
    
    # Start the application using the dev script
    npm run dev
}

# Handle script interruption
trap 'echo -e "\n\n🛑 Restart script interrupted"; exit 1' INT

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
    echo "❌ Error: This script must be run from the LabSyncPro root directory"
    echo "📁 Current directory: $(pwd)"
    echo "📁 Expected files: package.json, client/, server/"
    exit 1
fi

# Run the main function
main
