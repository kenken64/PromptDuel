#!/bin/bash

# Start Claude Code Server Script
# This script starts the Claude Code WebSocket terminal server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../claude-code-server"
PID_FILE="$SERVER_DIR/.claude-code-server.pid"
LOG_DIR="$SERVER_DIR/logs"

echo "Starting Claude Code Server..."

# Check if server is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Claude Code Server is already running with PID $PID"
        exit 0
    else
        echo "Removing stale PID file"
        rm "$PID_FILE"
    fi
fi

# Navigate to server directory
cd "$SERVER_DIR"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing Claude Code Server dependencies..."
    npm install
fi

# Start the server in the background
echo "Starting Claude Code Server..."
nohup node index.js > "$LOG_DIR/claude-code-server.log" 2>&1 &
echo $! > "$PID_FILE"

echo "Claude Code Server started with PID $(cat $PID_FILE)"
echo "Logs available at: $LOG_DIR/claude-code-server.log"
echo "Claude Code Server running at ws://localhost:3001"
