#!/bin/bash

# Stop Claude Code Server Script
# This script stops the Claude Code WebSocket terminal server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../claude-code-server"
PID_FILE="$SERVER_DIR/.claude-code-server.pid"

echo "Stopping Claude Code Server..."

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "Claude Code Server is not running (no PID file found)"
    exit 0
fi

PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "Claude Code Server is not running (process $PID not found)"
    rm "$PID_FILE"
    exit 0
fi

# Kill the process
echo "Stopping Claude Code Server process $PID..."
kill "$PID"

# Wait for process to stop
for i in {1..10}; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo "Claude Code Server stopped successfully"
        rm "$PID_FILE"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
if ps -p "$PID" > /dev/null 2>&1; then
    echo "Force stopping Claude Code Server..."
    kill -9 "$PID"
    rm "$PID_FILE"
    echo "Claude Code Server force stopped"
else
    rm "$PID_FILE"
    echo "Claude Code Server stopped"
fi
