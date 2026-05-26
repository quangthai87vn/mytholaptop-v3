#!/bin/bash
# ============================================================
# MTL Commerce - Pull & Run Docker Images on Debian
# ============================================================
# Cách dùng:
#   1. Copy file này và .env.prod.example sang máy Debian
#   2. Đổi tên .env.prod.example → .env và sửa thông tin bên trong
#   3. Chạy: chmod +x deploy.sh && ./deploy.sh
#
# Kết quả:
#   - Backend (Medusa) : http://localhost:7003
#   - Admin UI (Next.js): http://localhost:7004
# ============================================================

set -e

# --- Config ---
IMAGE_TAG="${IMAGE_TAG:-latest}"

BACKEND_IMAGE="mytholaptopv3/backend-ui"
ADMIN_IMAGE="mytholaptopv3/admin-ui"

BACKEND_PORT="${BACKEND_PORT:-7003}"
ADMIN_PORT="${ADMIN_PORT:-7004}"
BACKEND_NAME="mtl-backend"
ADMIN_NAME="mtl-admin-ui"

ENV_FILE="${ENV_FILE:-.env}"

# --- Màu ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1" >&2; exit 1; }

# ============================================================
# 1. Kiểm tra Docker
# ============================================================
log "Kiểm tra Docker..."
if ! command -v docker &> /dev/null; then
    fail "Docker chưa được cài đặt. Chạy: sudo apt install -y docker.io"
fi
DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
ok "Docker $DOCKER_VERSION"

# ============================================================
# 2. Load biến môi trường từ .env
# ============================================================
log "Đọc biến môi trường từ $ENV_FILE..."

if [[ ! -f "$ENV_FILE" ]]; then
    fail "Không tìm thấy file $ENV_FILE. Đổi tên .env.prod.example → .env"
fi

# Load từng biến cần thiết
source /dev/stdin <<<$(grep -E '^[A-Za-z_]' "$ENV_FILE" | sed 's/^/export /')

# Kiểm tra biến bắt buộc
REQUIRED_VARS=(
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET"
    "COOKIE_SECRET"
    "NEXT_PUBLIC_MEDUSA_BACKEND_URL"
    "ADMIN_CORS"
    "AUTH_CORS"
    "STORE_CORS"
)
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        fail "Thiếu biến bắt buộc: $var trong $ENV_FILE"
    fi
done

# Giá trị mặc định nếu không có
NODE_ENV="${NODE_ENV:-production}"
COOKIE_SAME_SITE="${COOKIE_SAME_SITE:-none}"
COOKIE_SECURE="${COOKIE_SECURE:-true}"
COOKIE_DOMAIN="${COOKIE_DOMAIN:-}"
NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

ok "Tất cả biến môi trường hợp lệ"

# ============================================================
# 3. Stop containers cũ nếu có
# ============================================================
log "Dọn containers cũ (nếu có)..."

stop_container() {
    local name=$1
    if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
        log "  Stopping container: $name"
        docker stop "$name" > /dev/null 2>&1 || true
        docker rm "$name" > /dev/null 2>&1 || true
    fi
}

stop_container "$BACKEND_NAME"
stop_container "$ADMIN_NAME"

# ============================================================
# 4. Pull images (images public - không cần login)
# ============================================================
log "Pull images từ Docker Hub public..."
if docker pull "$BACKEND_IMAGE:$IMAGE_TAG"; then
    ok "Pull backend-ui thành công"
else
    fail "Pull backend-ui thất bại"
fi

log "Pull image: $ADMIN_IMAGE"
if docker pull "$ADMIN_IMAGE:$IMAGE_TAG"; then
    ok "Pull admin-ui thành công"
else
    fail "Pull admin-ui thất bại"
fi

# ============================================================
# 5. Chạy Backend (Medusa)
# ============================================================
log "Chạy Backend (Medusa)..."

docker run -d \
    --name "$BACKEND_NAME" \
    --restart unless-stopped \
    -p "${BACKEND_PORT}:9000" \
    -e NODE_ENV="$NODE_ENV" \
    -e DATABASE_URL="$DATABASE_URL" \
    -e REDIS_URL="$REDIS_URL" \
    -e JWT_SECRET="$JWT_SECRET" \
    -e COOKIE_SECRET="$COOKIE_SECRET" \
    -e ADMIN_CORS="$ADMIN_CORS" \
    -e AUTH_CORS="$AUTH_CORS" \
    -e STORE_CORS="$STORE_CORS" \
    -e COOKIE_SAME_SITE="$COOKIE_SAME_SITE" \
    -e COOKIE_SECURE="$COOKIE_SECURE" \
    -e COOKIE_DOMAIN="$COOKIE_DOMAIN" \
    -e PORT=9000 \
    "$BACKEND_IMAGE:$IMAGE_TAG"

ok "Backend đang chạy trên http://localhost:${BACKEND_PORT}"

# ============================================================
# 6. Chạy Admin UI (Next.js)
# ============================================================
log "Chạy Admin UI (Next.js)..."

docker run -d \
    --name "$ADMIN_NAME" \
    --restart unless-stopped \
    -p "${ADMIN_PORT}:3000" \
    -e NODE_ENV="$NODE_ENV" \
    -e DATABASE_URL="$DATABASE_URL" \
    -e REDIS_URL="$REDIS_URL" \
    -e JWT_SECRET="$JWT_SECRET" \
    -e COOKIE_SECRET="$COOKIE_SECRET" \
    -e ADMIN_CORS="$ADMIN_CORS" \
    -e AUTH_CORS="$AUTH_CORS" \
    -e STORE_CORS="$STORE_CORS" \
    -e COOKIE_SAME_SITE="$COOKIE_SAME_SITE" \
    -e COOKIE_SECURE="$COOKIE_SECURE" \
    -e COOKIE_DOMAIN="$COOKIE_DOMAIN" \
    -e NEXT_PUBLIC_MEDUSA_BACKEND_URL="$NEXT_PUBLIC_MEDUSA_BACKEND_URL" \
    -e NEXT_TELEMETRY_DISABLED="$NEXT_TELEMETRY_DISABLED" \
    -e PORT=3000 \
    "$ADMIN_IMAGE:$IMAGE_TAG"

ok "Admin UI đang chạy trên http://localhost:${ADMIN_PORT}"

# ============================================================
# 7. Chờ và kiểm tra health
# ============================================================
echo ""
log "Chờ services khởi động (10 giây)..."
sleep 10

echo ""
echo "========================================"
echo -e "${CYAN}  Container Status${NC}"
echo "========================================"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "mtl-|Names" || true

echo ""
echo "========================================"
echo -e "${CYAN}  URLs truy cập${NC}"
echo "========================================"
echo "  Backend  : http://localhost:${BACKEND_PORT}"
echo "  Admin UI : http://localhost:${ADMIN_PORT}"
echo ""

# Logs
echo "========================================"
echo -e "${CYAN}  Backend logs (10 dòng cuối)${NC}"
echo "========================================"
docker logs --tail 10 "$BACKEND_NAME" 2>&1 || true

echo ""
echo "========================================"
echo -e "${CYAN}  Admin UI logs (10 dòng cuối)${NC}"
echo "========================================"
docker logs --tail 10 "$ADMIN_NAME" 2>&1 || true

echo ""
ok "Hoàn tất!"
echo ""
echo "Lệnh hữu ích:"
echo "  docker logs -f $BACKEND_NAME   # Xem logs backend"
echo "  docker logs -f $ADMIN_NAME     # Xem logs admin-ui"
echo "  docker stop $BACKEND_NAME $ADMIN_NAME  # Dừng cả 2"
echo "  docker rm $BACKEND_NAME $ADMIN_NAME    # Xóa container"
