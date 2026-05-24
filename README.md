# MTL Commerce - Hệ thống Thương mại điện tử Mỹ Tho Laptop

Hệ thống B2B e-commerce platform cho Mỹ Tho Laptop, bao gồm Medusa backend, Next.js admin dashboard, và AI-powered content automation.

## Mục lục

- [Kiến trúc](#kiến-trúc)
- [Cấu trúc Project](#cấu-trúc-project)
- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Build từ Source](#build-từ-source)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Database Setup](#database-setup)
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
│   Port: 3000          │   │   Port: 8000 (future) │
│   Port: 3000          │   │                       │
└───────────┬───────────┘   └───────────┬───────────┘
            │                           │
            │  REST API                 │  Store API
            ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Medusa Backend (Node.js)                       │
│               Port: 9000                                     │
│  ┌──────────────┬──────────────┬───────────────────────┐  │
│  │  Admin API   │  Store API   │  Custom Modules       │  │
│  │  /admin/*    │  /store/*    │  Company, Quote,      │  │
│  │              │              │  Approval             │  │
│  └──────────────┴──────────────┴───────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Admin Dashboard (React)                  │  │
│  │              Medusa UI v2 + Custom Components         │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐
│   PostgreSQL        │   │   Redis (Cache)     │
│   Port: 5432        │   │   Port: 6379         │
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
│   │   │   │   │   ├── ai-generator/    # AI viết bài
│   │   │   │   │   ├── ai-playground/   # AI Prompt Studio
│   │   │   │   │   ├── calendar/       # Lịch đăng bài
│   │   │   │   │   ├── templates/      # Content templates
│   │   │   │   │   └── library/        # Thư viện nội dung
│   │   │   │   ├── products/           # Quản lý sản phẩm
│   │   │   │   │   ├── categories/
│   │   │   │   │   ├── brands/
│   │   │   │   │   ├── tags/
│   │   │   │   │   └── attributes/
│   │   │   │   ├── orders/             # Quản lý đơn hàng (tương lai)
│   │   │   │   ├── customers/         # Quản lý khách hàng (tương lai)
│   │   │   │   └── settings/
│   │   │   └── api/                   # API routes
│   │   │       ├── ai/                # AI APIs
│   │   │       │   ├── generate/      # Generation + streaming
│   │   │       │   ├── providers/     # AI provider management
│   │   │       │   ├── settings/      # AI routing settings
│   │   │       │   ├── system-prompts/
│   │   │       │   ├── brand-voices/
│   │   │       │   ├── prompt-rules/
│   │   │       │   ├── task-routes/   # Task → Provider routing
│   │   │       │   ├── usage-stats/
│   │   │       │   └── playground/
│   │   │       ├── medusa/            # Medusa proxy API
│   │   │       ├── content/           # Content management APIs
│   │   │       └── debug/
│   │   ├── components/
│   │   │   ├── ui/                    # Shadcn UI components
│   │   │   ├── layout/                # Admin layout components
│   │   │   ├── products/              # Product components
│   │   │   └── ai/                    # AI components
│   │   │       └── studio/            # AI Studio UI
│   │   ├── lib/
│   │   │   ├── ai/                    # AI routing engine, prompt engine
│   │   │   ├── content/               # Content management
│   │   │   │   ├── db/               # DB operations
│   │   │   │   └── migration/        # WooCommerce migration
│   │   │   └── products/             # Product utilities
│   │   ├── services/                  # API services
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── store/                     # Zustand stores
│   │   ├── types/                     # TypeScript types
│   │   └── public/
│   │       └── wp-content/uploads/    # Migrated WordPress media
│   │
│   └── backend-ui/
│       ├── apps/
│       │   ├── backend/               # Medusa Backend
│       │   │   ├── src/
│       │   │   │   ├── admin/        # Custom admin components/routes
│       │   │   │   ├── api/          # Custom API routes
│       │   │   │   │   ├── admin/    # Admin custom endpoints
│       │   │   │   │   ├── store/    # Store custom endpoints
│       │   │   │   │   └── middlewares/
│       │   │   │   ├── modules/      # Custom Medusa modules
│       │   │   │   │   ├── company/  # Company management
│       │   │   │   │   ├── quote/    # B2B Quote system
│       │   │   │   │   └── approval/ # Approval workflow
│       │   │   │   ├── links/        # Module links
│       │   │   │   ├── workflows/    # Medusa workflows
│       │   │   │   ├── jobs/         # Scheduled jobs
│       │   │   │   └── subscribers/   # Event subscribers
│       │   │   └── medusa-config.ts  # Medusa configuration
│       │   │
│       │   └── storefront/            # Future storefront (placeholder)
│       │
│       └── pnpm-workspace.yaml        # Backend workspace config
│
├── packages/                    # (Reserved for shared packages)
├── docs/                       # Feature documentation
│   └── features/
│       ├── website_ui_plan.md
│       ├── website_ui_design_system.md
│       ├── website_ui_medusa_integration.md
│       └── migration/
│
├── docker-compose-prod.yml      # Production Docker Compose
├── docker-compose.yml           # Development Docker Compose
├── deploy.sh                   # One-command deploy script
├── database.sql                 # Full database schema
├── .env.prod.example           # Production env template
├── pnpm-lock.yaml              # pnpm lock file
├── pnpm-workspace.yaml         # pnpm workspace config
├── turbo.json                  # Turborepo config
└── Agent.md                    # AI Agent instructions
```

---

## Quick Start

### Yêu cầu

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **PostgreSQL** >= 14
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
cp .env.prod.example .env.local
# Chỉnh sửa .env.local với giá trị thật
```

### Development

```bash
# Chạy tất cả apps (cần PostgreSQL + Redis đang chạy)
pnpm dev

# Hoặc chạy riêng từng app:
pnpm dev:admin    # Admin UI: http://localhost:3000
pnpm dev:backend  # Backend: http://localhost:9000
```

---

## Docker Deployment

### Phương án 1: Build từ Source (Khuyến nghị)

Build images từ source code trên server, đảm bảo phiên bản mới nhất.

**Yêu cầu:**
- Docker >= 24.0
- Docker Compose >= 2.20
- Server có RAM >= 2GB
- Disk >= 10GB

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
cp .env.prod.example .env.prod
nano .env.prod   # Chỉnh sửa các giá trị:
                 # - DATABASE_URL
                 # - REDIS_URL
                 # - JWT_SECRET
                 # - COOKIE_SECRET
                 # - NEXT_PUBLIC_MEDUSA_BACKEND_URL

# 4. Build và chạy
docker compose -f docker-compose-prod.yml --env-file .env.prod up -d --build

# 5. Kiểm tra trạng thái
docker compose -f docker-compose-prod.yml ps

# 6. Xem logs
docker compose -f docker-compose-prod.yml logs -f
```

**Sau khi containers healthy:**
- Admin UI: `http://your-server:3000`
- Backend: `http://your-server:9000`
- Admin Dashboard: `http://your-server:9000/app`

### Phương án 2: Dùng Deploy Script (Nhanh nhất)

```bash
# 1. Copy và sửa deploy script
cp deploy.sh deploy.prod.sh
nano deploy.prod.sh
# Điền các giá trị:
#   - DATABASE_URL
#   - REDIS_URL
#   - JWT_SECRET
#   - COOKIE_SECRET

# 2. Chạy deploy
chmod +x deploy.prod.sh
./deploy.prod.sh
```

### Phương án 3: Build Docker Image từ Source trên local

Build image local và push lên registry của bạn:

```bash
# Build Admin UI image
cd apps/admin-ui
docker build -t your-registry/mtl-admin:latest .

# Build Backend image
cd apps/backend-ui
docker build -t your-registry/mtl-backend:latest -f apps/backend/Dockerfile .

# Push lên registry
docker push your-registry/mtl-admin:latest
docker push your-registry/mtl-backend:latest
```

### Phương án 4: Docker Hub Images (Tương lai)

Hiện tại project chưa publish public images lên Docker Hub. Để publish:

```bash
# Login Docker Hub
docker login

# Tag và push images
docker tag mtl-admin:latest your-dockerhub-username/mtl-commerce-admin:latest
docker tag mtl-backend:latest your-dockerhub-username/mtl-commerce-backend:latest

docker push your-dockerhub-username/mtl-commerce-admin:latest
docker push your-dockerhub-username/mtl-commerce-backend:latest
```

---

## Build từ Source

### Admin UI

```bash
cd apps/admin-ui

# Development build
pnpm build

# Production build (standalone output)
pnpm build

# Output ở .next/standalone/
```

### Backend

```bash
cd apps/backend-ui/apps/backend

# Build Medusa
pnpm build

# Output ở .medusa/server/
```

### Toàn bộ Monorepo

```bash
# Từ root
pnpm build

# Hoặc build riêng
pnpm build:admin   # Chỉ admin-ui
pnpm build:backend # Chỉ backend
```

---

## Cấu hình môi trường

### Root `.env.prod`

```env
# Node Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://mytholaptop_user:password@postgres-host:5432/mytholaptop

# Redis
REDIS_URL=redis://redis:6379
REDIS_PORT=6379

# Backend
BACKEND_PORT=9000
JWT_SECRET=your-random-secret-min-32-chars
COOKIE_SECRET=your-random-secret-min-32-chars

# CORS - Thêm domain thật khi production
STORE_CORS=http://localhost:8000,http://localhost:3000
ADMIN_CORS=http://localhost:5173,http://localhost:3000,https://admin.mtl.vn
AUTH_CORS=http://localhost:5173,http://localhost:3000,http://localhost:9000,https://admin.mtl.vn

# Admin UI
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://backend.mtl.vn
ADMIN_PORT=3000
```

### Admin UI `.env.example` → `.env.local`

```env
# Database (cho migration script)
DATABASE_URL=postgresql://postgres:password@host:5432/mytholaptop

# Medusa Backend
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_ADMIN_API_KEY=your_medusa_admin_api_key_here

# WooCommerce (cho migration)
WOOCOMMERCE_CONSUMER_KEY=your_woo_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_woo_consumer_secret
NEXT_PUBLIC_WORDPRESS_API_URL=https://your-store.com/wp-json
```

---

## Database Setup

### 1. Tạo Database

```sql
-- Kết nối PostgreSQL
psql -U postgres

-- Tạo database
CREATE DATABASE mytholaptop;

-- Tạo user
CREATE USER mytholaptop_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mytholaptop TO mytholaptop_user;

-- Grant schema permissions
\c mytholaptop
GRANT ALL ON SCHEMA public TO mytholaptop_user;
```

### 2. Import Schema

```bash
# Từ root project
psql -U mytholaptop_user -d mytholaptop -f database.sql
```

### 3. Seed Default Data (Optional)

Sau khi backend chạy, chạy seed scripts để tạo:
- Default AI providers (OpenAI, Gemini, etc.)
- Default system prompts
- Sample content templates

---

## Tính năng chính

### Admin Dashboard
- [x] Dashboard tổng quan
- [x] Quản lý sản phẩm (CRUD, filter, sort)
- [x] Quản lý danh mục (parent/child tree)
- [x] Quản lý thương hiệu
- [x] Quản lý tags và attributes
- [x] Responsive layout (mobile-first)
- [x] Dark/light mode

### AI Content Studio
- [x] Kết nối nhiều AI Providers (OpenAI, Gemini, Anthropic, Groq, Ollama)
- [x] AI Task Routing - gán task type với provider + system prompt
- [x] Brand Voices - quản lý giọng điệu thương hiệu
- [x] System Prompt Templates
- [x] AI Playground - test prompts trực tiếp
- [x] Streaming generation
- [x] Content templates
- [x] Calendar đăng bài

### Content Types
- [x] Facebook post
- [x] Website post (SEO article)
- [x] Video script
- [x] Image prompt
- [x] Product description
- [x] Zalo message
- [x] Email marketing

### Medusa Backend
- [x] Medusa v2.15.3
- [x] Custom modules (Company, Quote, Approval)
- [x] B2B workflows
- [x] CORS configured
- [x] Redis caching
- [x] JWT authentication

### Migration
- [x] WooCommerce → Medusa migration
- [x] WordPress media deduplication
- [x] Product sync với deduplication
- [x] Image migration từ URL
- [x] Category mapping
- [x] Brand mapping
- [x] Progress tracking
- [x] Dry-run mode

### Docker & Deployment
- [x] Multi-stage Docker builds
- [x] Production docker-compose
- [x] Health checks
- [x] Redis container
- [x] Deploy script

---

## Scripts

### Root Scripts

```bash
pnpm dev              # Chạy tất cả apps
pnpm dev:admin       # Chỉ admin-ui (port 3000)
pnpm dev:backend     # Chỉ backend (port 9000)
pnpm build           # Build tất cả
pnpm build:admin     # Build admin-ui
pnpm build:backend   # Build backend
pnpm lint            # Lint tất cả
pnpm clean           # Xóa build outputs
```

### Admin UI Scripts

```bash
pnpm db:push                   # Push Prisma schema
pnpm migration:migrate          # Chạy migration
pnpm migration:status           # Xem trạng thái migration
pnpm migration:stats           # Thống kê dữ liệu
pnpm migration:dry-run         # Preview migration
```

---

## Development

### Cấu trúc API

**Admin UI API:**
- `GET/POST /api/ai/providers` - Quản lý AI providers
- `GET/PUT /api/ai/settings/all` - Lấy/cập nhật toàn bộ AI config
- `POST /api/ai/generate/stream` - Generate content với streaming
- `GET/POST /api/medusa/*` - Proxy đến Medusa backend
- `GET/POST /api/content/*` - Content management

**Backend API:**
- `POST /admin/*` - Admin API
- `GET/POST /store/*` - Store API
- Custom endpoints trong `src/api/`

### Quy tắc Git

```bash
# Feature branch
git checkout -b feature/ten-tinh-nang

# Commit
git commit -m "feat: mô tả ngắn gọn"

# Push
git push origin feature/ten-tinh-nang

# Merge vào main (qua PR)
```

### Quy tắc Code

- TypeScript strict mode
- Functional components (React)
- Shadcn UI components
- Zustand cho state management
- React Query cho data fetching
- Tailwind CSS cho styling
- Vietnamese comments

---

## Cấu hình Nginx (Production)

```nginx
server {
    listen 80;
    server_name admin.mtl.vn;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name backend.mtl.vn;

    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Troubleshooting

### Container không start

```bash
# Xem logs chi tiết
docker compose -f docker-compose-prod.yml logs backend
docker compose -f docker-compose-prod.yml logs admin-ui

# Kiểm tra health
docker compose -f docker-compose-prod.yml ps

# Restart
docker compose -f docker-compose-prod.yml restart
```

### Lỗi kết nối Database

```bash
# Kiểm tra PostgreSQL
docker compose -f docker-compose-prod.yml logs redis

# Kiểm tra network
docker network ls
docker network inspect mytholaptop-v3_mtl-commerce-prod_default
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
