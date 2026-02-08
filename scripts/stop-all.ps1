# Stop All Services Script
# This script stops all services (frontend, ai-code-server, backend)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================="
Write-Host "Stopping Prompt Duel Application"
Write-Host "========================================="

# Stop frontend
Write-Host ""
& "$ScriptDir\stop-frontend.ps1"

# Stop AI Code Server
Write-Host ""
& "$ScriptDir\stop-ai-code-server.ps1"

# Stop backend
Write-Host ""
& "$ScriptDir\stop-backend.ps1"

Write-Host ""
Write-Host "========================================="
Write-Host "All services stopped!"
Write-Host "========================================="
