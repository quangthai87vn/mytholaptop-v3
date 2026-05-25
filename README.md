# MTL Commerce - Hệ thống Thương mại điện tử Mỹ Tho Laptop

Hệ thống B2B e-commerce platform cho Mỹ Tho Laptop, bao gồm Medusa backend, Next.js admin dashboard, và AI-powered content automation.

## Mục lục

- [Kiến trúc](#kiến-trúc)
- [Cấu trúc Project](#cấu-trúc-project)
- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Build từ Source](#build-từ-source)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Tính năng chính](#tính-năng-chính)
- [Scripts](#scripts)
- [Development](#development)

---

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                              ▼
┌───────────────────────┐   ┌───────────────────────┐
│   Admin UI (Next.js)  │   │   Storefront (Next.js) │
│   Port: 7004          │   │   Port: 8000 (future) │
└───────────┬───────────┘   └───────────┬───────────┘
            │                           │
            │  REST API                 │  Store API
            ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Medusa Backend (Node.js)                       │
│               Port: 7003                                     │
│  ┌──────────────┬──────────────┬───────────────────────┐  │
│  │  Admin API   │  Store API   │  Custom Modules       │  │
│  │  /admin/*    │  /store/*   │  Company, Quote,      │  │
│  │              │              │  Approval             │  │
│  └──────────────┴──────────────┴───────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐
│   PostgreSQL         │   │   Redis (Cache)     │
│   (External Server)  │   │   Docker Container  │
└─────────────────────┘   └─────────────────────┘
```

## Cấu trúc Project

```
mytholaptop-v3/
├── apps/
│   ├── admin-ui/           # Next.js Admin Dashboard
│   │   ├── app/
│   │   │   ├── (admin)/           # Admin layout routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── content/        # AI Content Studio
│   │   │   │   ├── products/       # Quản lý sản phẩm
│   │   │   │   ├── customers/      # Quản lý khách hàng
│   │   │   │   ├── orders/        # Quản lý đơn hàng
│   │   │   │   ├── sales/         # Bán hàng
│   │   │   │   └── settings/
│   │   │   └── api/               # API routes
│   │   │       ├── ai/           # AI APIs
│   │   │       ├── medusa/        # Medusa proxy
│   │   │       └── content/       # Content management
│   │   ├── components/           # UI components
│   │   ├── lib/                  # Utilities & AI engine
│   │   └── public/               # Static assets (local only, not in git)
│   │
│   └── backend-ui/
│       └── apps/
│           ├── backend/          # Medusa Backend
│           │   ├── src/
│           │   │   ├── api/     # Custom API routes
│           │   │   ├── modules/  # Custom modules
│           │   │   └── medusa-config.ts
│           └── storefront/      # Future storefront
│
├── docker-compose-prod.yml       # Production Docker Compose (no postgres)
├── deploy.sh                     # Deploy script cho Linux/Mac
├── deploy.ps1                    # Deploy script cho Windows
├── .env.prod.example             # Production env template
└── README.md
```

---

## Quick Start

### Yêu cầu

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **PostgreSQL** >= 14 (external server)
- **Redis** >= 6
- **Docker** & **Docker Compose** (cho deployment)

### Cài đặt

```bash
# Clone repository
git clone https://github.com/quangthai87vn/mytholaptop-v3.git
cd mytholaptop-v3

# Cài pnpm global (nếu chưa có)
npm install -g pnpm@9

# Cài dependencies cho tất cả apps
pnpm install

# Copy và cấu hình .env
cp .env.prod.example .env
# Chỉnh sửa .env với giá trị thật
```

### Development

```bash
# Chạy tất cả apps (cần PostgreSQL + Redis đang chạy)
pnpm dev

# Hoặc chạy riêng từng app:
pnpm dev:admin    # Admin UI: http://localhost:7004
pnpm dev:backend  # Backend: http://localhost:7003
```

---

## Docker Hub Images

Các Docker images đã được publish lên Docker Hub:

```bash
# Admin UI
docker pull quangthai87/mytholaptopv3:admin-ui-latest

# Backend (Medusa)
docker pull quangthai87/mytholaptopv3:backend-latest

# Redis (official image)
docker pull redis:7-alpine
```

### Pull và chạy từ Docker Hub (Production với Domain)

```bash
# 1. SSH vào server
ssh your-server

# 2. Tạo thư mục project
mkdir -p mytholaptopv3 && cd mytholaptopv3

# 3. Pull images mới nhất
docker pull quangthai87/mytholaptopv3:admin-ui-latest
docker pull quangthai87/mytholaptopv3:backend-latest

# 4. Tạo file docker-compose.yml với network nội bộ
cat > docker-compose.yml << 'EOF'
x-project-name: &project_name mtl-commerce-prod

networks:
  mtl-network:
    driver: bridge

services:
  backend:
    image: quangthai87/mytholaptopv3:backend-latest
    container_name: mtl-backend
    networks:
      - mtl-network
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      STORE_CORS: ${STORE_CORS:-https://admin.mtl.vn}
      ADMIN_CORS: ${ADMIN_CORS:-https://admin.mtl.vn,https://backend.mtl.vn}
      AUTH_CORS: ${AUTH_CORS:-https://admin.mtl.vn,https://backend.mtl.vn}
      JWT_SECRET: ${JWT_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
      PORT: 9000
    expose:
      - "9000"
    volumes:
      - ./data:/app/data
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "9000"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 60s
    restart: unless-stopped

  admin-ui:
    image: quangthai87/mytholaptopv3:admin-ui-latest
    container_name: mtl-admin
    networks:
      - mtl-network
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      NEXT_TELEMETRY_DISABLED: 1
      NEXT_PUBLIC_MEDUSA_BACKEND_URL: ${NEXT_PUBLIC_MEDUSA_BACKEND_URL:-http://backend:9000}
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

# 5. Tạo file .env
cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://user:password@your-postgres-host:5432/mytholaptop
REDIS_URL=redis://redis:6379
JWT_SECRET=your-random-secret-min-32-chars
COOKIE_SECRET=your-random-secret-min-32-chars
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://backend.mtl.vn
EOF

# 6. Chạy containers
docker compose up -d

# 7. Kiểm tra trạng thái
docker compose ps

# 8. Xem logs
docker compose logs -f
```

**Services (Internal Network):**
- Backend: `http://backend:9000` (container network)
- Admin UI: `http://admin-ui:3000` (container network)
- Redis: `redis://redis:6379` (container network)

**Public URLs (qua Reverse Proxy):**
- Backend API: `https://backend.mtl.vn`
- Admin Dashboard: `https://admin.mtl.vn`

---

## Reverse Proxy Setup (Nginx)

Vì containers không expose port ra ngoài, cần reverse proxy để route domain.

### Cài đặt Nginx

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx

# Cấu hình Nginx cho backend.mtl.vn
sudo nano /etc/nginx/sites-available/backend.mtl.vn
```

### Cấu hình Nginx

```nginx
# /etc/nginx/sites-available/backend.mtl.vn
server {
    listen 80;
    server_name backend.mtl.vn;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# /etc/nginx/sites-available/admin.mtl.vn
server {
    listen 80;
    server_name admin.mtl.vn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Kích hoạt và restart

```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/backend.mtl.vn /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.mtl.vn /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# SSL Certificate (Let's Encrypt)
sudo certbot --nginx -d backend.mtl.vn -d admin.mtl.vn
```

---

## DNS Configuration

Cần tạo DNS records cho domain:

| Type | Name | Value |
|------|------|-------|
| A | backend.mtl.vn | YOUR_SERVER_IP |
| A | admin.mtl.vn | YOUR_SERVER_IP |

---

## Docker Deployment

### Build và chạy (Local Build)

**Yêu cầu:**
- Docker >= 24.0
- Docker Compose >= 2.20
- PostgreSQL external server
- Reverse Proxy (Nginx) để route domain
- Server có RAM >= 2GB, Disk >= 5GB

**Các bước:**

```bash
# 1. SSH vào server
ssh your-server

# 2. Clone hoặc pull code mới nhất
git clone https://github.com/quangthai87vn/mytholaptop-v3.git
cd mytholaptop-v3
git checkout main
git pull

# 3. Copy và cấu hình file môi trường
cp .env.prod.example .env
nano .env   # Chỉnh sửa các giá trị:
            # - DATABASE_URL (PostgreSQL external)
            # - JWT_SECRET
            # - COOKIE_SECRET
            # - NEXT_PUBLIC_MEDUSA_BACKEND_URL (https://backend.mtl.vn)

# 4. Build và chạy
docker compose -f docker-compose-prod.yml --env-file .env up -d

# 5. Kiểm tra trạng thái
docker compose -f docker-compose-prod.yml ps

# 6. Xem logs
docker compose -f docker-compose-prod.yml logs -f
```

**Services (Internal):**
- Backend: `http://backend:9000`
- Admin UI: `http://admin-ui:3000`
- Redis: `redis://redis:6379`

### Dùng Deploy Script

```bash
# Linux/Mac
chmod +x deploy.sh
./deploy.sh

# Windows PowerShell
.\deploy.ps1
```

### Database External

**Lưu ý quan trọng:** PostgreSQL **KHÔNG** được include trong docker-compose. Bạn cần:

1. **Tự cài PostgreSQL** trên server hoặc dùng **database server có sẵn**
2. Cập nhật `DATABASE_URL` trong `.env`:

```env
DATABASE_URL=postgresql://user:password@your-postgres-host:5432/mytholaptop
```

3. Import database schema nếu cần:

```bash
psql -U your_user -d mytholaptop -f database.sql
```

---

## Build từ Source

### Admin UI

```bash
cd apps/admin-ui
pnpm install
pnpm build
# Output: .next/standalone/
```

### Backend

```bash
cd apps/backend-ui/apps/backend
pnpm install
pnpm build
# Output: .medusa/server/
```

### Toàn bộ Monorepo

```bash
pnpm install
pnpm build
```

---

## Cấu hình môi trường

### `.env` (Production)

```env
# Node Environment
NODE_ENV=production

# Database (External PostgreSQL)
DATABASE_URL=postgresql://mytholaptop_user:password@postgres-host:5432/mytholaptop

# Redis (Container)
REDIS_URL=redis://redis:7005
REDIS_PORT=7005

# Backend
BACKEND_PORT=7003
JWT_SECRET=your-random-secret-min-32-chars
COOKIE_SECRET=your-random-secret-min-32-chars

# CORS
STORE_CORS=http://localhost:8000,http://localhost:7004
ADMIN_CORS=http://localhost:7004,https://admin.mtl.vn
AUTH_CORS=http://localhost:7004,http://localhost:7003,https://admin.mtl.vn

# Admin UI
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://backend.mtl.vn
ADMIN_PORT=7004
```

---

## Tính năng chính

### Admin Dashboard
- [x] Dashboard tổng quan
- [x] Quản lý sản phẩm (CRUD, filter, sort)
- [x] Quản lý danh mục (parent/child tree)
- [x] Quản lý thương hiệu, tags, attributes
- [x] Responsive layout (mobile-first)

### AI Content Studio
- [x] Multi-provider AI (OpenAI, Gemini, Anthropic, Groq, Ollama)
- [x] AI Task Routing
- [x] Brand Voices
- [x] System Prompt Templates
- [x] AI Playground
- [x] Streaming generation
- [x] Content templates & calendar

### Medusa Backend
- [x] Medusa v2.15.3
- [x] Custom modules (Company, Quote, Approval)
- [x] JWT authentication
- [x] Redis caching

### Migration
- [x] WooCommerce → Medusa migration
- [x] WordPress media deduplication
- [x] Product sync

### Docker Deployment
- [x] Multi-stage builds
- [x] Production docker-compose
- [x] Health checks
- [x] Redis container

---

## Scripts

```bash
pnpm dev              # Chạy tất cả apps
pnpm dev:admin       # Admin UI (port 7004)
pnpm dev:backend     # Backend (port 7003)
pnpm build           # Build tất cả
pnpm build:admin     # Build admin-ui
pnpm build:backend   # Build backend
pnpm lint            # Lint tất cả
pnpm clean           # Xóa build outputs
```

---

## Troubleshooting

### Container không start

```bash
# Xem logs
docker compose -f docker-compose-prod.yml logs backend
docker compose -f docker-compose-prod.yml logs admin-ui

# Kiểm tra health
docker compose -f docker-compose-prod.yml ps

# Restart
docker compose -f docker-compose-prod.yml restart
```

### Lỗi Build

```bash
# Xóa cache
docker builder prune -a

# Rebuild không cache
docker compose -f docker-compose-prod.yml build --no-cache
```

---

## License

MIT - Mỹ Tho Laptop
