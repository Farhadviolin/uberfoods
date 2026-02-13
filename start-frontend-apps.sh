#!/bin/bash

echo "🎨 Starting UberFoods Frontend Applications"
echo "==========================================="

# Function to start app in background
start_app() {
    local name=$1
    local dir=$2
    local port=$3

    echo "Starting $name on port $port..."
    cd "$dir" || exit 1

    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found in $dir"
        return 1
    fi

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies for $name..."
        npm install
    fi

    # Start the app
    npm run dev > "../../logs/${name}.log" 2>&1 &

    cd - > /dev/null
    echo "✅ $name started (PID: $!)"
}

# Create logs directory
mkdir -p logs

# Start all frontend apps
start_app "customer-web" "frontend/customer-web" "3001"
start_app "admin-panel" "frontend/admin-panel" "3002"
start_app "restaurant-web" "frontend/restaurant-web" "3003"
start_app "driver-app" "frontend/driver-app" "3004"

echo ""
echo "🎉 All frontend applications are starting!"
echo ""
echo "📊 Check logs in ./logs/ directory"
echo "🛑 To stop all: pkill -f 'vite' && pkill -f 'react-scripts'"
