# Start AI Code Server Script
# This script starts the AI Code Generation WebSocket server

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Join-Path $ScriptDir "..\ai-code-server"
$PidFile = Join-Path $ServerDir ".ai-code-server.pid"
$LogDir = Join-Path $ServerDir "logs"

Write-Host "Starting AI Code Server..."

# Check if server is already running
if (Test-Path $PidFile) {
    $Pid = Get-Content $PidFile
    $Process = Get-Process -Id $Pid -ErrorAction SilentlyContinue
    if ($Process) {
        Write-Host "AI Code Server is already running with PID $Pid"
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
    Write-Host "Installing AI Code Server dependencies..."
    npm install
}

# Start the server in the background
Write-Host "Starting AI Code Server..."
$LogFile = Join-Path $LogDir "ai-code-server.log"
# Merge stderr into stdout so all logs (including errors) appear in one file
$Process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c node index.js > `"$LogFile`" 2>&1" -WorkingDirectory $ServerDir -PassThru -WindowStyle Hidden

$Process.Id | Out-File -FilePath $PidFile -NoNewline

Write-Host "AI Code Server started with PID $($Process.Id)"
Write-Host "Logs available at: $LogFile"
Write-Host "AI Code Server running at ws://localhost:3001"
