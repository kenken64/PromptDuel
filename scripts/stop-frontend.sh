#!/bin/bash

# Stop Frontend Script
# This script stops the React/Vite frontend development server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"
PID_FILE="$FRONTEND_DIR/.frontend.pid"

echo "Stopping Prompt Duel Frontend..."

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "Frontend is not running (no PID file found)"
    exit 0
fi

PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "Frontend is not running (process $PID not found)"
    rm "$PID_FILE"
    exit 0
fi

# Kill the process
echo "Stopping frontend process $PID..."
kill "$PID"

# Wait for process to stop
for i in {1..10}; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo "Frontend stopped successfully"
        rm "$PID_FILE"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
if ps -p "$PID" > /dev/null 2>&1; then
    echo "Force stopping frontend..."
    kill -9 "$PID"
    rm "$PID_FILE"
    echo "Frontend force stopped"
else
    rm "$PID_FILE"
    echo "Frontend stopped"
fi
