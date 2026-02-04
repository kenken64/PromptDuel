# Start Claude Code Server Script
# This script starts the Claude Code WebSocket terminal server

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Join-Path $ScriptDir "..\claude-code-server"
$PidFile = Join-Path $ServerDir ".claude-code-server.pid"
$LogDir = Join-Path $ServerDir "logs"

Write-Host "Starting Claude Code Server..."

# Check if server is already running
if (Test-Path $PidFile) {
    $Pid = Get-Content $PidFile
    $Process = Get-Process -Id $Pid -ErrorAction SilentlyContinue
    if ($Process) {
        Write-Host "Claude Code Server is already running with PID $Pid"
        exit 0
    } else {
        Write-Host "Removing stale PID file"
        Remove-Item $PidFile
    }
}

# Navigate to server directory
Set-Location $ServerDir

# Create logs directory if it doesn't exist
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Claude Code Server dependencies..."
    npm install
}

# Start the server in the background
Write-Host "Starting Claude Code Server..."
$LogFile = Join-Path $LogDir "claude-code-server.log"
$Process = Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory $ServerDir -RedirectStandardOutput $LogFile -RedirectStandardError "$LogFile.err" -PassThru -WindowStyle Hidden

$Process.Id | Out-File -FilePath $PidFile -NoNewline

Write-Host "Claude Code Server started with PID $($Process.Id)"
Write-Host "Logs available at: $LogFile"
Write-Host "Claude Code Server running at ws://localhost:3001"
