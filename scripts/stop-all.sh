#!/bin/bash

# Stop All Services Script
# This script stops both backend and frontend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "Stopping Prompt Duel Application"
echo "========================================="

# Stop frontend
echo ""
bash "$SCRIPT_DIR/stop-frontend.sh"

# Stop Claude Code Server
echo ""
bash "$SCRIPT_DIR/stop-claude-code-server.sh"

# Stop backend
echo ""
bash "$SCRIPT_DIR/stop-backend.sh"

echo ""
echo "========================================="
echo "All services stopped!"
echo "========================================="
