# Start Frontend Script
# This script starts the React/Vite frontend development server

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ScriptDir "..\frontend"
$PidFile = Join-Path $FrontendDir ".frontend.pid"
$LogDir = Join-Path $FrontendDir "logs"

Write-Host "Starting Prompt Duel Frontend..."

# Check if frontend is already running
if (Test-Path $PidFile) {
    $ProcessId = Get-Content $PidFile
    $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($Process) {
        Write-Host "Frontend is already running with PID $ProcessId"
        exit 0
    } else {
        Write-Host "Removing stale PID file"
        Remove-Item $PidFile
    }
}

# Navigate to frontend directory
Set-Location $FrontendDir

# Create logs directory if it doesn't exist
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..."
    npm install
}

# Start the frontend in the background using cmd
Write-Host "Starting Vite server..."
$LogFile = Join-Path $LogDir "frontend.log"
$Process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev > `"$LogFile`" 2>&1" -WorkingDirectory $FrontendDir -PassThru -WindowStyle Hidden

$Process.Id | Out-File -FilePath $PidFile -NoNewline

Write-Host "Frontend started with PID $($Process.Id)"
Write-Host "Logs available at: $LogFile"
Write-Host "Frontend running at http://localhost:5173"
