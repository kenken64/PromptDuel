#!/bin/bash

# Start All Services Script
# This script stops any running services first, then starts all services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "Restarting Prompt Duel Application"
echo "========================================="

# Check Claude Code login status
echo ""
echo "Checking Claude Code authentication..."
CLAUDE_CREDS="$HOME/.claude/.credentials.json"
if [ -f "$CLAUDE_CREDS" ]; then
    echo -e "\033[32m✓ Claude Code: LOGGED IN\033[0m"
    echo "  Credentials found at: $CLAUDE_CREDS"
else
    echo -e "\033[31m✗ Claude Code: NOT LOGGED IN\033[0m"
    echo "  Run 'claude login' to authenticate before starting the game."
    echo ""
    read -p "Continue anyway? (y/N): " choice
    if [[ ! "$choice" =~ ^[Yy]$ ]]; then
        echo "Aborted. Please run 'claude login' first."
        exit 1
    fi
fi
echo ""

# Stop any existing services first
echo ""
echo "Stopping any existing services..."
bash "$SCRIPT_DIR/stop-all.sh" || true

# Force kill any processes still on our ports
echo ""
echo "Cleaning up ports 3000, 3001, 5173..."
if command -v netstat &> /dev/null; then
    for port in 3000 3001 5173; do
        pids=$(netstat -ano 2>/dev/null | grep ":$port " | grep "LISTENING" | awk '{print $5}' | sort -u)
        for pid in $pids; do
            if [ -n "$pid" ] && [ "$pid" != "0" ]; then
                taskkill //F //PID $pid 2>/dev/null && echo "  Killed process $pid on port $port" || true
            fi
        done
    done
fi
echo "  Ports cleaned up"

echo ""
echo "========================================="
echo "Starting Prompt Duel Application"
echo "========================================="

# Start backend
echo ""
bash "$SCRIPT_DIR/start-backend.sh"

# Wait a moment for backend to initialize
sleep 2

# Start Claude Code Server
echo ""
bash "$SCRIPT_DIR/start-claude-code-server.sh"

# Wait a moment for Claude Code Server to initialize
sleep 1

# Start frontend
echo ""
bash "$SCRIPT_DIR/start-frontend.sh"

echo ""
echo "========================================="
echo "All services started!"
echo "========================================="
echo "Backend:            http://localhost:3000"
echo "Claude Code Server: ws://localhost:3001"
echo "Frontend:           http://localhost:5173"
echo ""
echo "To stop all services, run: ./scripts/stop-all.sh"
