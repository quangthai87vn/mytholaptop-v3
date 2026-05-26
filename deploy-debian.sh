#!/bin/bash
# ============================================================
# MTL Commerce - Auto Deploy (Debian VPS)
# ============================================================
# Một lệnh duy nhất: chmod +x deploy.sh && ./deploy.sh
#
# Script sẽ tự động:
#   1. Cài Docker (nếu chưa có)
#   2. Cài Redis container (nếu chưa có)
#   3. Tạo Docker network (nếu chưa có)
#   4. Pull images từ Docker Hub (public)
#   5. Chạy Backend + Admin UI
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
REDIS_NAME="mtl-redis"
NETWORK_NAME="mtl-net"

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
# 1. Kiểm tra & cài Docker
# ============================================================
install_docker() {
    log "Cài Docker..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker --now
    sudo usermod -aG docker "$USER"
    ok "Docker đã cài xong"
}

if ! command -v docker &> /dev/null; then
    warn "Docker chưa có. Bắt đầu cài..."
    install_docker
elif ! docker info &> /dev/null; then
    warn "Docker daemon không chạy. Thử khởi động..."
    sudo systemctl start docker || sudo service docker start || true
fi
DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
ok "Docker $DOCKER_VERSION"

# ============================================================
# 2. Load biến môi trường từ .env
# ============================================================
log "Đọc biến môi trường từ $ENV_FILE..."

if [[ ! -f "$ENV_FILE" ]]; then
    fail "Không tìm thấy file $ENV_FILE. Copy .env.prod.example → .env và chỉnh sửa."
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

# Giá trị mặc định
NODE_ENV="${NODE_ENV:-production}"
COOKIE_SAME_SITE="${COOKIE_SAME_SITE:-none}"
COOKIE_SECURE="${COOKIE_SECURE:-true}"
COOKIE_DOMAIN="${COOKIE_DOMAIN:-}"
NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

ok "Tất cả biến môi trường hợp lệ"

# ============================================================
# 3. Tạo Docker network
# ============================================================
log "Thiết lập Docker network..."
if ! docker network inspect "$NETWORK_NAME" &> /dev/null; then
    docker network create "$NETWORK_NAME" > /dev/null 2>&1
    ok "Network '$NETWORK_NAME' đã tạo"
else
    ok "Network '$NETWORK_NAME' đã tồn tại"
fi

# ============================================================
# 4. Cài Redis nếu REDIS_URL là redis://redis:xxx
# ============================================================
if [[ "$REDIS_URL" == redis://redis:* ]]; then
    REDIS_HOST=$(echo "$REDIS_URL" | sed 's|redis://redis:\([0-9]*\).*|\1|')
    REDIS_HOST="${REDIS_HOST:-6379}"

    if ! docker ps --format '{{.Names}}' | grep -q "^${REDIS_NAME}$"; then
        log "Cài Redis container..."
        docker run -d \
            --name "$REDIS_NAME" \
            --restart unless-stopped \
            --network "$NETWORK_NAME" \
            -p "${REDIS_HOST}:6379" \
            redis:alpine > /dev/null 2>&1
        ok "Redis container đã chạy"
    else
        ok "Redis container đã tồn tại"
    fi
else
    ok "REDIS_URL sử dụng Redis external (không cần container)"
fi

# ============================================================
# 5. Stop containers cũ nếu có
# ============================================================
log "Dọn containers cũ..."

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
# 6. Pull images (public - không cần login)
# ============================================================
log "Pull images từ Docker Hub..."
log "Pull: $BACKEND_IMAGE"
if ! docker pull "$BACKEND_IMAGE:$IMAGE_TAG"; then
    fail "Pull backend-ui thất bại. Kiểm tra tên image trên Docker Hub."
fi
ok "Pull backend-ui thành công"

log "Pull: $ADMIN_IMAGE"
if ! docker pull "$ADMIN_IMAGE:$IMAGE_TAG"; then
    fail "Pull admin-ui thất bại. Kiểm tra tên image trên Docker Hub."
fi
ok "Pull admin-ui thành công"

# ============================================================
# 7. Chạy Backend (Medusa)
# ============================================================
log "Chạy Backend (Medusa)..."

docker run -d \
    --name "$BACKEND_NAME" \
    --restart unless-stopped \
    --network "$NETWORK_NAME" \
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
# 8. Chạy Admin UI (Next.js)
# ============================================================
log "Chạy Admin UI (Next.js)..."

docker run -d \
    --name "$ADMIN_NAME" \
    --restart unless-stopped \
    --network "$NETWORK_NAME" \
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
# 9. Chờ và kiểm tra health
# ============================================================
echo ""
log "Chờ services khởi động (15 giây)..."
sleep 15

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
echo "  docker logs -f $BACKEND_NAME     # Xem logs backend"
echo "  docker logs -f $ADMIN_NAME       # Xem logs admin-ui"
echo "  ./deploy.sh                      # Chạy lại (update)"
echo "  docker stop $BACKEND_NAME $ADMIN_NAME $REDIS_NAME  # Dừng tất cả"
echo "  docker rm $BACKEND_NAME $ADMIN_NAME $REDIS_NAME    # Xóa container"
