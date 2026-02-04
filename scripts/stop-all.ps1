# Stop All Services Script
# This script stops all services (frontend, claude-code-server, backend)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================="
Write-Host "Stopping Prompt Duel Application"
Write-Host "========================================="

# Stop frontend
Write-Host ""
& "$ScriptDir\stop-frontend.ps1"

# Stop Claude Code Server
Write-Host ""
& "$ScriptDir\stop-claude-code-server.ps1"

# Stop backend
Write-Host ""
& "$ScriptDir\stop-backend.ps1"

Write-Host ""
Write-Host "========================================="
Write-Host "All services stopped!"
Write-Host "========================================="
