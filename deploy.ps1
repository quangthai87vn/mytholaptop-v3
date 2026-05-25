# =============================================
# MTL Commerce - Deploy Script for Windows (PowerShell)
# =============================================
# Usage:
#   1. Edit các giá trị biến bên dưới nếu cần
#   2. Run: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "===== MTL Commerce Deploy =====" -ForegroundColor Cyan

# --- Config (sửa các giá trị bên dưới nếu cần) ---
$env:NODE_ENV = "production"
$env:DATABASE_URL = "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop"
$env:REDIS_URL = "redis://redis:6379"
$env:JWT_SECRET = "supersecret_dev_local_2026"
$env:COOKIE_SECRET = "supersecret_dev_local_2026"
$env:STORE_CORS = "http://localhost:7004,https://admin.mtl.vn"
$env:ADMIN_CORS = "http://localhost:7003,http://localhost:7004,https://admin.mtl.vn"
$env:AUTH_CORS = "http://localhost:7003,http://localhost:7004,https://admin.mtl.vn"
$env:NEXT_PUBLIC_MEDUSA_BACKEND_URL = "http://backend:9000"
$env:BACKEND_PORT = "9000"
$env:ADMIN_PORT = "3000"
$env:REDIS_PORT = "6379"
# ------------------------------

Write-Host "`nBuilding and starting containers..." -ForegroundColor Yellow

# Build và start containers
docker compose -f docker-compose-prod.yml --env-file .env up -d --build

# Wait for services
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check status
Write-Host "`n===== Container Status =====" -ForegroundColor Cyan
docker compose -f docker-compose-prod.yml ps

# Check logs
Write-Host "`n===== Backend Logs (last 20 lines) =====" -ForegroundColor Cyan
docker compose -f docker-compose-prod.yml logs --tail=20 backend

Write-Host "`n===== Admin UI Logs (last 20 lines) =====" -ForegroundColor Cyan
docker compose -f docker-compose-prod.yml logs --tail=20 admin-ui

Write-Host "`n===== Done! =====" -ForegroundColor Green
Write-Host "Services should be available at:" -ForegroundColor Green
Write-Host "  - Backend: http://localhost:7003"
Write-Host "  - Admin UI: http://localhost:7004"
Write-Host "  - Redis: localhost:7005"
