#!/bin/bash

# Stop AI Code Server Script
# This script stops the AI Code Generation WebSocket server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../ai-code-server"
PID_FILE="$SERVER_DIR/.ai-code-server.pid"

echo "Stopping AI Code Server..."

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "AI Code Server is not running (no PID file found)"
    exit 0
fi

PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "AI Code Server is not running (process $PID not found)"
    rm "$PID_FILE"
    exit 0
fi

# Kill the process
echo "Stopping AI Code Server process $PID..."
kill "$PID"

# Wait for process to stop
for i in {1..10}; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo "AI Code Server stopped successfully"
        rm "$PID_FILE"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
if ps -p "$PID" > /dev/null 2>&1; then
    echo "Force stopping AI Code Server..."
    kill -9 "$PID"
    rm "$PID_FILE"
    echo "AI Code Server force stopped"
else
    rm "$PID_FILE"
    echo "AI Code Server stopped"
fi
