# Start All Services Script
# This script stops any running services first, then starts all services

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================="
Write-Host "Restarting Prompt Duel Application"
Write-Host "========================================="

# Check Claude Code login status
Write-Host ""
Write-Host "Checking Claude Code authentication..."
$ClaudeCreds = Join-Path $env:USERPROFILE ".claude\.credentials.json"
if (Test-Path $ClaudeCreds) {
    Write-Host "Claude Code: LOGGED IN" -ForegroundColor Green
    Write-Host "  Credentials found at: $ClaudeCreds"
} else {
    Write-Host "Claude Code: NOT LOGGED IN" -ForegroundColor Red
    Write-Host "  Run 'claude login' to authenticate before starting the game."
    Write-Host ""
    $choice = Read-Host "Continue anyway? (y/N)"
    if ($choice -ne "y" -and $choice -ne "Y") {
        Write-Host "Aborted. Please run 'claude login' first."
        exit 1
    }
}
Write-Host ""

# Stop any existing services first
Write-Host ""
Write-Host "Stopping any existing services..."
try {
    & "$ScriptDir\stop-all.ps1"
} catch {
    Write-Host "No services were running or stop encountered an error (continuing...)"
}

# Force kill any processes still on our ports
Write-Host ""
Write-Host "Cleaning up ports 3000, 3001, 5173..."
$ports = @(3000, 3001, 5173)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        if ($procId -and $procId -ne 0) {
            try {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host "  Killed process $procId on port $port"
            } catch {
                # Process already stopped
            }
        }
    }
}
Write-Host "  Ports cleaned up"

Write-Host ""
Write-Host "========================================="
Write-Host "Starting Prompt Duel Application"
Write-Host "========================================="

# Start backend
Write-Host ""
& "$ScriptDir\start-backend.ps1"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 2

# Start Claude Code Server
Write-Host ""
& "$ScriptDir\start-claude-code-server.ps1"

# Wait a moment for Claude Code Server to initialize
Start-Sleep -Seconds 1

# Start frontend
Write-Host ""
& "$ScriptDir\start-frontend.ps1"

Write-Host ""
Write-Host "========================================="
Write-Host "All services started!"
Write-Host "========================================="
Write-Host "Backend:            http://localhost:3000"
Write-Host "Claude Code Server: ws://localhost:3001"
Write-Host "Frontend:           http://localhost:5173"
Write-Host ""
Write-Host "To stop all services, run: .\scripts\stop-all.ps1"
