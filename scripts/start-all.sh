#!/bin/bash

# Start All Services Script
# This script starts both backend and frontend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "Starting Prompt Duel Application"
echo "========================================="

# Start backend
echo ""
bash "$SCRIPT_DIR/start-backend.sh"

# Wait a moment for backend to initialize
sleep 2

# Start frontend
echo ""
bash "$SCRIPT_DIR/start-frontend.sh"

echo ""
echo "========================================="
echo "All services started!"
echo "========================================="
echo "Backend:  http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""
echo "To stop all services, run: ./scripts/stop-all.sh"
