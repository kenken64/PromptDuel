# Stop Backend Script
# This script stops the Elysia/Bun backend server

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "..\backend"
$PidFile = Join-Path $BackendDir ".backend.pid"

Write-Host "Stopping Prompt Duel Backend..."

# Check if PID file exists
if (-not (Test-Path $PidFile)) {
    Write-Host "Backend is not running (no PID file found)"
    exit 0
}

$ProcessId = Get-Content $PidFile
$Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue

# Check if process is running
if (-not $Process) {
    Write-Host "Backend is not running (process $ProcessId not found)"
    Remove-Item $PidFile
    exit 0
}

# Kill the process
Write-Host "Stopping backend process $ProcessId..."
Stop-Process -Id $ProcessId -Force

# Wait for process to stop
$timeout = 10
for ($i = 0; $i -lt $timeout; $i++) {
    $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $Process) {
        Write-Host "Backend stopped successfully"
        Remove-Item $PidFile
        exit 0
    }
    Start-Sleep -Seconds 1
}

# Check one more time and clean up
$Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
if ($Process) {
    Write-Host "Force stopping backend..."
    Stop-Process -Id $ProcessId -Force
}
Remove-Item $PidFile
Write-Host "Backend stopped"
