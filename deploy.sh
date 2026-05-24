#!/bin/bash
# =============================================
# MTL Commerce - Deploy Script for Debian
# =============================================
# Usage:
#   1. Copy file: cp deploy.sh deploy.prod.sh
#   2. Edit deploy.prod.sh và điền giá trị thật
#   3. Chmod: chmod +x deploy.prod.sh
#   4. Run: ./deploy.prod.sh

set -e

echo "===== MTL Commerce Deploy ====="

# --- Config (sửa các giá trị bên dưới) ---
DATABASE_URL="postgresql://mytholaptop_user:YOUR_PASSWORD@YOUR_POSTGRES_HOST:5432/mytholaptop"
REDIS_URL="redis://redis:6379"
JWT_SECRET="change-me-to-random-secret"
COOKIE_SECRET="change-me-to-random-secret"
# ------------------------------

# Create .env file for docker-compose
cat > .env.prod << EOF
NODE_ENV=production
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}
STORE_CORS=http://localhost:8000,http://localhost:3000
ADMIN_CORS=http://localhost:5173,http://localhost:3000,https://admin.mtl.vn
AUTH_CORS=http://localhost:5173,http://localhost:3000,http://localhost:9000,http://127.0.0.1:3000,https://admin.mtl.vn
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://backend.mtl.vn
BACKEND_PORT=9000
ADMIN_PORT=3000
REDIS_PORT=6379
EOF

echo ".env.prod created"

# Pull latest code
echo "Pulling latest code..."
git pull

# Build và start containers
echo "Building and starting containers..."
docker compose -f docker-compose-prod.yml --env-file .env.prod up -d --build

# Wait for services
echo "Waiting for services to be healthy..."
sleep 10

# Check status
echo ""
echo "===== Container Status ====="
docker compose -f docker-compose-prod.yml ps

# Check logs
echo ""
echo "===== Backend Logs (last 20 lines) ====="
docker compose -f docker-compose-prod.yml logs --tail=20 backend

echo ""
echo "===== Admin UI Logs (last 20 lines) ====="
docker compose -f docker-compose-prod.yml logs --tail=20 admin-ui

echo ""
echo "Done! Services should be available at:"
echo "  - Backend: http://localhost:9000"
echo "  - Admin UI: http://localhost:3000"
