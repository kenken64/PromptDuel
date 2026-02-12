# Start All Services Script
# This script stops any running services first, then starts all services

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================="
Write-Host "Restarting Prompt Duel Application"
Write-Host "========================================="

# Check AI Provider login status
Write-Host ""
Write-Host "Checking AI Provider authentication..."
$ClaudeCreds = Join-Path $env:USERPROFILE ".claude\.credentials.json"
$ClaudeServerEnv = Join-Path $ScriptDir "..\ai-code-server\.env"
$hasApiKey = $false

# Check for API key in .env file
if (Test-Path $ClaudeServerEnv) {
    $envContent = Get-Content $ClaudeServerEnv -Raw
    if ($envContent -match "ANTHROPIC_API_KEY=sk-") {
        $hasApiKey = $true
    }
}

if (Test-Path $ClaudeCreds) {
    Write-Host "AI Provider: LOGGED IN" -ForegroundColor Green
    Write-Host "  Credentials found at: $ClaudeCreds"
} elseif ($hasApiKey) {
    Write-Host "AI Provider: API KEY CONFIGURED" -ForegroundColor Green
    Write-Host "  Using ANTHROPIC_API_KEY from ai-code-server/.env"
} else {
    Write-Host "AI Provider: NOT LOGGED IN" -ForegroundColor Red
    Write-Host "  Run 'claude login' or set ANTHROPIC_API_KEY in ai-code-server/.env"
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
Write-Host "Installing Dependencies"
Write-Host "========================================="

Write-Host ""
Write-Host "Installing backend dependencies..."
Push-Location "$ScriptDir\..\backend"
bun install
Pop-Location
Write-Host "Backend dependencies installed."

Write-Host ""
Write-Host "Installing AI Code Server dependencies..."
Push-Location "$ScriptDir\..\ai-code-server"
npm install
Pop-Location
Write-Host "AI Code Server dependencies installed."

Write-Host ""
Write-Host "Installing frontend dependencies..."
Push-Location "$ScriptDir\..\frontend"
bun install
Pop-Location
Write-Host "Frontend dependencies installed."

Write-Host ""
Write-Host "========================================="
Write-Host "Starting Prompt Duel Application"
Write-Host "========================================="

# Start backend
Write-Host ""
& "$ScriptDir\start-backend.ps1"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 2

# Start AI Code Server
Write-Host ""
& "$ScriptDir\start-ai-code-server.ps1"

# Wait a moment for AI Code Server to initialize
Start-Sleep -Seconds 1

# Start frontend
Write-Host ""
& "$ScriptDir\start-frontend.ps1"

Write-Host ""
Write-Host "========================================="
Write-Host "All services started!"
Write-Host "========================================="
Write-Host "Backend:            http://localhost:3000"
Write-Host "AI Code Server: ws://localhost:3001"
Write-Host "Frontend:           http://localhost:5173"
Write-Host ""
Write-Host "To stop all services, run: .\scripts\stop-all.ps1"
