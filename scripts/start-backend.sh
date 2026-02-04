#!/bin/bash

# Start Backend Script
# This script starts the Elysia/Bun backend server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"
PID_FILE="$BACKEND_DIR/.backend.pid"

echo "Starting Prompt Duel Backend..."

# Check if backend is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Backend is already running with PID $PID"
        exit 0
    else
        echo "Removing stale PID file"
        rm "$PID_FILE"
    fi
fi

# Navigate to backend directory
cd "$BACKEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    bun install
fi

# Check if database exists, if not, set up schema
if [ ! -f "sqlite.db" ]; then
    echo "Setting up database..."
    bun run db:setup
fi

# Start the backend in the background
echo "Starting Bun server..."
nohup bun run dev > logs/backend.log 2>&1 &
echo $! > "$PID_FILE"

echo "Backend started with PID $(cat $PID_FILE)"
echo "Logs available at: $BACKEND_DIR/logs/backend.log"
echo "Backend running at http://localhost:3000"
