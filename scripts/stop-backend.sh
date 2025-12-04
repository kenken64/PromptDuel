#!/bin/bash

# Stop Backend Script
# This script stops the Elysia/Bun backend server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"
PID_FILE="$BACKEND_DIR/.backend.pid"

echo "Stopping Prompt Duel Backend..."

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "Backend is not running (no PID file found)"
    exit 0
fi

PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "Backend is not running (process $PID not found)"
    rm "$PID_FILE"
    exit 0
fi

# Kill the process
echo "Stopping backend process $PID..."
kill "$PID"

# Wait for process to stop
for i in {1..10}; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo "Backend stopped successfully"
        rm "$PID_FILE"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
if ps -p "$PID" > /dev/null 2>&1; then
    echo "Force stopping backend..."
    kill -9 "$PID"
    rm "$PID_FILE"
    echo "Backend force stopped"
else
    rm "$PID_FILE"
    echo "Backend stopped"
fi
