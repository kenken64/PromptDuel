# Start Backend Script
# This script starts the Elysia/Bun backend server

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "..\backend"
$PidFile = Join-Path $BackendDir ".backend.pid"
$LogDir = Join-Path $BackendDir "logs"

Write-Host "Starting Prompt Duel Backend..."

# Check if backend is already running
if (Test-Path $PidFile) {
    $Pid = Get-Content $PidFile
    $Process = Get-Process -Id $Pid -ErrorAction SilentlyContinue
    if ($Process) {
        Write-Host "Backend is already running with PID $Pid"
        exit 0
    } else {
        Write-Host "Removing stale PID file"
        Remove-Item $PidFile
    }
}

# Navigate to backend directory
Set-Location $BackendDir

# Create logs directory if it doesn't exist
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..."
    bun install
}

# Check if database exists, if not, push schema
if (-not (Test-Path "sqlite.db")) {
    Write-Host "Setting up database..."
    bun run db:push
}

# Start the backend in the background
Write-Host "Starting Bun server..."
$LogFile = Join-Path $LogDir "backend.log"
$Process = Start-Process -FilePath "bun" -ArgumentList "run", "dev" -WorkingDirectory $BackendDir -RedirectStandardOutput $LogFile -RedirectStandardError "$LogFile.err" -PassThru -WindowStyle Hidden

$Process.Id | Out-File -FilePath $PidFile -NoNewline

Write-Host "Backend started with PID $($Process.Id)"
Write-Host "Logs available at: $LogFile"
Write-Host "Backend running at http://localhost:3000"
