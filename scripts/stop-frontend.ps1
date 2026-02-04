# Stop Frontend Script
# This script stops the React/Vite frontend development server

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ScriptDir "..\frontend"
$PidFile = Join-Path $FrontendDir ".frontend.pid"

Write-Host "Stopping Prompt Duel Frontend..."

# Check if PID file exists
if (-not (Test-Path $PidFile)) {
    Write-Host "Frontend is not running (no PID file found)"
    exit 0
}

$ProcessId = Get-Content $PidFile
$Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue

# Check if process is running
if (-not $Process) {
    Write-Host "Frontend is not running (process $ProcessId not found)"
    Remove-Item $PidFile
    exit 0
}

# Kill the process
Write-Host "Stopping frontend process $ProcessId..."
Stop-Process -Id $ProcessId -Force

# Wait for process to stop
$timeout = 10
for ($i = 0; $i -lt $timeout; $i++) {
    $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $Process) {
        Write-Host "Frontend stopped successfully"
        Remove-Item $PidFile
        exit 0
    }
    Start-Sleep -Seconds 1
}

# Check one more time and clean up
$Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
if ($Process) {
    Write-Host "Force stopping frontend..."
    Stop-Process -Id $ProcessId -Force
}
Remove-Item $PidFile
Write-Host "Frontend stopped"
