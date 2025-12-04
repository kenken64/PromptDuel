#!/bin/bash

# Status Script
# This script checks the status of backend and frontend services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID_FILE="$SCRIPT_DIR/../backend/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/../frontend/.frontend.pid"

echo "========================================="
echo "Prompt Duel Service Status"
echo "========================================="

# Check backend status
echo ""
echo "Backend:"
if [ -f "$BACKEND_PID_FILE" ]; then
    PID=$(cat "$BACKEND_PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "  Status: RUNNING"
        echo "  PID: $PID"
        echo "  URL: http://localhost:3000"
    else
        echo "  Status: STOPPED (stale PID file)"
    fi
else
    echo "  Status: STOPPED"
fi

# Check frontend status
echo ""
echo "Frontend:"
if [ -f "$FRONTEND_PID_FILE" ]; then
    PID=$(cat "$FRONTEND_PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "  Status: RUNNING"
        echo "  PID: $PID"
        echo "  URL: http://localhost:5173"
    else
        echo "  Status: STOPPED (stale PID file)"
    fi
else
    echo "  Status: STOPPED"
fi

echo ""
echo "========================================="
