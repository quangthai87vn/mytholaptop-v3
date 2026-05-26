# MTL Commerce

Hệ thống B2B e-commerce platform cho Mỹ Tho Laptop, bao gồm Medusa backend, Next.js admin dashboard, và AI-powered content automation.

---

## Mục lục

- [Kiến trúc](#kiến-trúc)
- [Cấu trúc Project](#cấu-trúc-project)
- [Docker Hub](#docker-hub)
- [Pull & Chạy trên máy khác](#pull--chạy-trên-máy-khác)
- [Build & Push Docker Images](#build--push-docker-images)
- [Development Local](#development-local)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)

---

## Kiến trúc

```
Client (Browser)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│                    Docker Network                       │
│                                                        │
│   ┌───────────────┐    ┌───────────────┐              │
│   │  Admin UI     │    │   Backend     │              │
│   │  Next.js :3000│◄──►│  Medusa :9000│              │
│   └───────────────┘    └───────┬───────┘              │
│                                │                       │
│   ┌───────────────┐            │                       │
│   │    Redis      │◄───────────┘                       │
│   │  redis:6379   │                                    │
│   └───────────────┘                                    │
└───────────────────────────────────────────────────────┘
        │
        ▼
  Nginx Reverse Proxy
        │
        ├── https://admin.mtl.vn   (Admin UI)
        └── https://backend.mtl.vn (Backend API)
```

---

## Cấu trúc Project

```
mytholaptop-v3/
├── apps/
│   ├── admin-ui/               # Next.js Admin Dashboard (port 3000)
│   │   ├── app/               # App Router
│   │   │   ├── api/           # API routes (ai, medusa, content...)
│   │   │   └── (admin)/       # Admin pages
│   │   ├── components/         # UI components
│   │   ├── lib/               # Utilities, AI engine
│   │   ├── Dockerfile          # Production Dockerfile
│   │   └── settings.json      # App config (gitignored)
│   │
│   └── backend-ui/
│       └── apps/
│           └── backend/         # Medusa Backend (port 9000)
│               ├── src/
│               │   ├── api/    # Custom API routes
│               │   ├── modules/ # Custom modules (Company, Quote...)
│               │   └── migrations/
│               └── Dockerfile  # Production Dockerfile
│
├── docker-compose-dev.yml      # Dev compose (local)
├── deploy.ps1                 # Deploy script (Windows)
├── deploy-debian.sh           # Deploy script (Linux/Debian)
├── push_docker_hub.ps1        # Build & push images to Docker Hub
└── .env                       # Env config (gitignored)
```

---

## Docker Hub

Repository: [quangthai87/mytholaptopv3](https://hub.docker.com/r/quangthai87/mytholaptopv3)

Tags có sẵn:

| Tag | Mô tả |
|-----|--------|
| `admin-ui` | Next.js Admin Dashboard |
| `backend-ui` | Medusa Backend |
| `latest` | Tham chiếu alias cho tag mới nhất |

**Image URL:** `docker.io/quangthai87/mytholaptopv3:<tag>`

---

## Pull & Chạy trên máy khác

Có 2 cách để chạy trên máy Debian:

- **[Cách 1: Script tự động (Khuyến nghị)](#cách-1-script-tự-động)** — Pull + Run 1 lệnh duy nhất
- **[Cách 2: Docker Compose](#cách-2-docker-compose)** — Cấu hình chi tiết hơn

---

### Cách 1: Script tự động

Script `deploy-debian.sh` tự động pull image từ Docker Hub và chạy cả 2 container chỉ với 1 lệnh.

#### Yêu cầu

- Docker đã cài trên Debian
- File `.env` chứa biến môi trường
- Đã đẩy image lên Docker Hub (`push_docker_hub.ps1`)

#### Các bước

**1. Copy file sang máy Debian**

```bash
scp deploy-debian.sh .env.prod.example root@your-debian:/opt/mtl/
```

**2. SSH vào Debian, chuẩn bị file .env**

```bash
ssh root@your-debian
cd /opt/mtl

# Tạo .env từ template
cp .env.prod.example .env

# Sửa DATABASE_URL cho đúng với server của bạn
nano .env
```

**3. Chạy script**

```bash
chmod +x deploy-debian.sh
./deploy-debian.sh
```

Script sẽ tự động:
- Check Docker
- Load biến môi trường từ `.env`
- Stop container cũ (nếu có)
- Login Docker Hub
- Pull cả 2 image (`backend-ui`, `admin-ui`)
- Run container với đầy đủ biến môi trường
- Check health và hiển thị logs

**4. Kết quả**

| Service | URL |
|---------|-----|
| Backend (Medusa) | http://localhost:7003 |
| Admin UI (Next.js) | http://localhost:7004 |

**Lệnh hữu ích sau khi chạy:**

```bash
docker logs -f mtl-backend      # Xem logs backend
docker logs -f mtl-admin-ui     # Xem logs admin-ui
docker stop mtl-backend mtl-admin-ui   # Dừng cả 2
docker rm mtl-backend mtl-admin-ui     # Xóa container
```

#### Biến môi trường cần có trong `.env`

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis URL (docker internal) |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `COOKIE_SECRET` | ✅ | Cookie signing secret |
| `ADMIN_CORS` | ✅ | CORS cho admin |
| `AUTH_CORS` | ✅ | CORS cho auth |
| `STORE_CORS` | ✅ | CORS cho store |
| `COOKIE_SAME_SITE` | | Cookie same site (mặc định: none) |
| `COOKIE_SECURE` | | Cookie secure (mặc định: true) |
| `COOKIE_DOMAIN` | | Cookie domain |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | ✅ | Backend URL |
| `DOCKER_HUB_USERNAME` | | Username Docker Hub (mặc định: quangthai87) |
| `IMAGE_TAG` | | Tag image (mặc định: latest) |

---

### Cách 2: Docker Compose

#### Yêu cầu

- Docker >= 24.0
- Docker Compose >= 2.20
- PostgreSQL >= 14 (external server, không có trong compose)
- Domain đã trỏ DNS (nếu dùng production)

### Các bước

#### 1. SSH vào server

```bash
ssh your-server
```

#### 2. Tạo thư mục project

```bash
mkdir -p mytholaptopv3 && cd mytholaptopv3
```

#### 3. Tạo file `.env`

```bash
cat > .env << 'EOF'
NODE_ENV=production
DOCKER_HUB_USERNAME=quangthai87

# PostgreSQL - Thay đổi theo server của bạn
DATABASE_URL=postgresql://user:password@your-postgres-host:5432/mytholaptop

# Redis - Dùng container trong compose
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-random-secret-min-32-chars
COOKIE_SECRET=your-random-secret-min-32-chars

# Backend URL - Domain của backend
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://backend.mtl.vn
EOF
```

#### 4. Tạo file `docker-compose.yml`

```bash
cat > docker-compose.yml << 'EOF'
name: mtl-commerce-prod

networks:
  mtl-network:
    driver: bridge

services:
  backend:
    image: quangthai87/mytholaptopv3:backend-ui
    container_name: mtl-backend
    networks:
      - mtl-network
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      ADMIN_CORS: "https://admin.mtl.vn"
      AUTH_CORS: "https://admin.mtl.vn"
      STORE_CORS: "https://admin.mtl.vn"
      JWT_SECRET: ${JWT_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
      PORT: 9000
    expose:
      - "9000"
    volumes:
      - ./data/backend:/app/data
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "9000"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 60s
    restart: unless-stopped

  admin-ui:
    image: quangthai87/mytholaptopv3:admin-ui
    container_name: mtl-admin
    networks:
      - mtl-network
    environment:
      NODE_ENV: production
      NEXT_TELEMETRY_DISABLED: 1
      NEXT_PUBLIC_MEDUSA_BACKEND_URL: http://backend:9000
      DATABASE_URL: ${DATABASE_URL}
    expose:
      - "3000"
    volumes:
      - ./data/admin:/app/data
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "3000"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 60s
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: mtl-redis
    networks:
      - mtl-network
    volumes:
      - mtl-redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped

volumes:
  mtl-redis-data:
EOF
```

#### 5. Chạy containers

```bash
docker compose up -d

# Kiểm tra trạng thái
docker compose ps

# Xem logs
docker compose logs -f
```

#### 6. Cài đặt Nginx Reverse Proxy

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx

# Backend proxy
sudo nano /etc/nginx/sites-available/backend.mtl.vn
```

```nginx
server {
    listen 80;
    server_name backend.mtl.vn;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Admin proxy
sudo nano /etc/nginx/sites-available/admin.mtl.vn
```

```nginx
server {
    listen 80;
    server_name admin.mtl.vn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/backend.mtl.vn /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.mtl.vn /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL certificate
sudo certbot --nginx -d backend.mtl.vn -d admin.mtl.vn
```

#### 7. Cập nhật Docker images

```bash
# Pull images mới nhất
docker compose pull

# Restart với image mới
docker compose up -d
```

---

## Build & Push Docker Images

> Chỉ chạy trên máy đã có code mới nhất. Mỗi lần build đều compile lại từ đầu (`--no-cache`).

### Yêu cầu

- Docker Desktop đang chạy
- Đã login Docker Hub: `docker login`
- Đã tạo repository `mytholaptopv3` trên Docker Hub
- `DOCKER_HUB_USERNAME=quangthai87` trong `.env`

### Các bước

#### 1. Cấu hình username (nếu chưa có)

```powershell
# Thêm vào .env ở project root
DOCKER_HUB_USERNAME=quangthai87
```

#### 2. Chạy script

```powershell
# Push tất cả (default tag: latest)
.\push_docker_hub.ps1

# Push tất cả với tag tùy chọn
.\push_docker_hub.ps1 all v1.0.0

# Push từng service
.\push_docker_hub.ps1 admin-ui
.\push_docker_hub.ps1 backend-ui
```

#### 3. Kiểm tra trên Docker Hub

Sau khi push thành công, vào https://hub.docker.com/r/quangthai87/mytholaptopv3 sẽ thấy 2 tags: `admin-ui` và `backend-ui`.

### Trên máy khác - Pull image mới

```bash
docker compose pull
docker compose up -d
```

---

## Development Local

### Yêu cầu

- Node.js >= 20.0.0
- pnpm >= 9.0.0 (`npm install -g pnpm@9`)
- PostgreSQL >= 14
- Redis >= 6

### Setup

```bash
# Clone repository
git clone https://github.com/quangthai87vn/mytholaptop-v3.git
cd mytholaptop-v3

# Cài dependencies
pnpm install

# Copy và chỉnh sửa .env
cp apps/admin-ui/.env apps/admin-ui/.env.local
# Hoặc dùng docker-compose-dev.yml cho dev
```

### Chạy dev server

```bash
# Tất cả apps
pnpm dev

# Riêng từng app
pnpm dev:admin    # Admin UI: http://localhost:7004
pnpm dev:backend  # Backend: http://localhost:7003
```

### Docker dev (không cần cài Node)

```bash
docker compose -f docker-compose-dev.yml up -d
# Admin UI: http://localhost:7004
# Backend: http://localhost:7003
# Redis: localhost:6379
```

---

## Cấu hình môi trường

### `.env` (Production)

```env
NODE_ENV=production
DOCKER_HUB_USERNAME=quangthai87

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/mytholaptop

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-random-secret-min-32-chars
COOKIE_SECRET=your-random-secret-min-32-chars

# URLs
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://backend.mtl.vn
```

### Database Schema

Backend tự động chạy migrations khi start. Đảm bảo PostgreSQL có database `mytholaptop` đã tồn tại:

```sql
CREATE DATABASE mytholaptop;
```

---

## Scripts

### PowerShell (Windows)

```powershell
.\push_docker_hub.ps1              # Push Docker Hub (all)
.\push_docker_hub.ps1 admin-ui    # Push admin-ui only
.\push_docker_hub.ps1 backend-ui  # Push backend-ui only
.\push_docker_hub.ps1 all v1.0.0  # Push với tag

.\deploy.ps1                       # Deploy production
```

### Bash (Linux/Debian)

```bash
./deploy-debian.sh                   # Deploy production (pull + run)
```

### pnpm

```bash
pnpm dev              # Tất cả apps
pnpm dev:admin       # Admin UI
pnpm dev:backend     # Backend
pnpm build           # Build tất cả
pnpm lint            # Lint
```

---

## Troubleshooting

### Container không start

```bash
# Xem logs
docker compose logs backend
docker compose logs admin-ui

# Kiểm tra trạng thái
docker compose ps

# Restart
docker compose restart
```

### Lỗi build

```bash
# Xóa toàn bộ builder cache
docker builder prune -a

# Rebuild không cache
docker compose build --no-cache
```

### Lỗi database

```bash
# Kiểm tra kết nối PostgreSQL
docker compose exec backend nc -zv your-postgres-host 5432

# Chạy migrations thủ công
docker compose exec backend medusa migrations run
```

### Pull Docker Hub thất bại (rate limit)

```bash
# Login Docker Hub (tăng rate limit)
docker login

# Retry pull
docker compose pull
```

---

## License

MIT - Mỹ Tho Laptop
