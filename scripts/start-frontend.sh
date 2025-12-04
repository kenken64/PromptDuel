#!/bin/bash

# Start Frontend Script
# This script starts the React/Vite frontend development server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"
PID_FILE="$FRONTEND_DIR/.frontend.pid"

echo "Starting Prompt Duel Frontend..."

# Check if frontend is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Frontend is already running with PID $PID"
        exit 0
    else
        echo "Removing stale PID file"
        rm "$PID_FILE"
    fi
fi

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start the frontend in the background
echo "Starting Vite server..."
nohup npm run dev > logs/frontend.log 2>&1 &
echo $! > "$PID_FILE"

echo "Frontend started with PID $(cat $PID_FILE)"
echo "Logs available at: $FRONTEND_DIR/logs/frontend.log"
echo "Frontend running at http://localhost:5173"
