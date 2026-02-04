# Stop Claude Code Server Script
# This script stops the Claude Code WebSocket terminal server

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Join-Path $ScriptDir "..\claude-code-server"
$PidFile = Join-Path $ServerDir ".claude-code-server.pid"

Write-Host "Stopping Claude Code Server..."

# Check if PID file exists
if (-not (Test-Path $PidFile)) {
    Write-Host "Claude Code Server is not running (no PID file found)"
    exit 0
}

$ProcessId = Get-Content $PidFile
$Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue

# Check if process is running
if (-not $Process) {
    Write-Host "Claude Code Server is not running (process $ProcessId not found)"
    Remove-Item $PidFile
    exit 0
}

# Kill the process
Write-Host "Stopping Claude Code Server process $ProcessId..."
Stop-Process -Id $ProcessId -Force

# Wait for process to stop
$timeout = 10
for ($i = 0; $i -lt $timeout; $i++) {
    $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $Process) {
        Write-Host "Claude Code Server stopped successfully"
        Remove-Item $PidFile
        exit 0
    }
    Start-Sleep -Seconds 1
}

# Check one more time and clean up
$Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
if ($Process) {
    Write-Host "Force stopping Claude Code Server..."
    Stop-Process -Id $ProcessId -Force
}
Remove-Item $PidFile
Write-Host "Claude Code Server stopped"
