# =============================================
# MTL Commerce - Deploy Script for Windows (PowerShell)
# =============================================
# Usage:
#   1. Ensure .env file exists with required variables
#   2. Run: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "===== MTL Commerce Deploy =====" -ForegroundColor Cyan

# --- Load environment variables from .env file ---
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found. Please create it from .env.dev or .env.prod.example" -ForegroundColor Red
    exit 1
}

Write-Host "Loading environment from $envFile..." -ForegroundColor Yellow
Get-Content $envFile | Where-Object { $_ -match "^[A-Za-z_].*=" } | ForEach-Object {
    $parts = $_.Split("=", 2)
    if ($parts.Length -eq 2) {
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$env:NODE_ENV = "production"

Write-Host "NODE_ENV: $env:NODE_ENV" -ForegroundColor Gray
Write-Host "DATABASE_URL: $($env:DATABASE_URL -replace '://([^:]+):([^@]+)@', '://$1:***@'))" -ForegroundColor Gray

Write-Host "`nBuilding and starting containers..." -ForegroundColor Yellow

# Build và start containers
docker compose --env-file .env up -d --build

# Wait for services
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check status
Write-Host "`n===== Container Status =====" -ForegroundColor Cyan
docker compose ps

# Check logs
Write-Host "`n===== Backend Logs (last 20 lines) =====" -ForegroundColor Cyan
docker compose logs --tail=20 backend

Write-Host "`n===== Admin UI Logs (last 20 lines) =====" -ForegroundColor Cyan
docker compose logs --tail=20 admin-ui

Write-Host "`n===== Done! =====" -ForegroundColor Green
Write-Host "Services should be available at:" -ForegroundColor Green
Write-Host "  - Backend: http://localhost:7003"
Write-Host "  - Admin UI: http://localhost:7004"
Write-Host "  - Redis: localhost:7005"
