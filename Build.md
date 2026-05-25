# MTL Commerce - Build & Deployment Guide

Hướng dẫn chi tiết build, deploy và vận hành hệ thống MTL Commerce trên server Debian/Ubuntu.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Build Docker từ Source](#build-docker-từ-source)
- [Sử dụng Docker Compose](#sử-dụng-docker-compose)
- [Deploy Script](#deploy-script)
- [PostgreSQL Setup](#postgresql-setup)
- [Reverse Proxy (Nginx)](#reverse-proxy-nginx)
- [SSL Certificate](#ssl-certificate)
- [Health Check](#health-check)
- [Update / Rollback](#update--rollback)
- [Troubleshooting](#troubleshooting)

---

## Tổng quan

Hệ thống gồm 3 containers Docker:

| Container | Image | Port | Chức năng |
|-----------|-------|------|------------|
| `mtl-backend` | Build từ source | 9000 | Medusa Backend API + Admin UI |
| `mtl-admin` | Build từ source | 3000 | Next.js Admin Dashboard |
| `mtl-redis` | `redis:7-alpine` | 6379 | Cache & Session |

## Yêu cầu hệ thống

### Server tối thiểu

| Thành phần | Minimum | Recommended |
|------------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 GB | 4 GB |
| Disk | 10 GB | 20 GB |
| OS | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 22.04 LTS |

### Cài đặt Docker

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài Docker
curl -fsSL https://get.docker.com | sudo sh

# Cài Docker Compose
sudo apt install -y docker-compose

# Thêm user vào docker group
sudo usermod -aG docker $USER
newgrp docker

# Kiểm tra
docker --version
docker compose version
```

---

## Build Docker từ Source

### 1. Chuẩn bị server

```bash
# SSH vào server
ssh root@your-server-ip

# Tạo thư mục project
mkdir -p /opt/mtl-commerce
cd /opt/mtl-commerce

# Clone repository
git clone https://github.com/quangthai87/mytholaptop-v3.git .
git checkout main
```

### 2. Build Admin UI Image

```bash
cd /opt/mtl-commerce/apps/admin-ui

# Build image với tag
docker build \
  --build-arg NODE_ENV=production \
  -t mtl-admin:latest \
  -t mtl-admin:v1.0.0 \
  .

# Kiểm tra image
docker images | grep mtl-admin
```

### 3. Build Backend Image

```bash
cd /opt/mtl-commerce/apps/backend-ui

# Build image
docker build \
  -t mtl-backend:latest \
  -t mtl-backend:v1.0.0 \
  -f apps/backend/Dockerfile \
  .

# Kiểm tra image
docker images | grep mtl-backend
```

### 4. Verify Images

```bash
docker run --rm mtl-admin:latest node --version
docker run --rm mtl-backend:latest node --version
```

---

## Sử dụng Docker Compose

### 1. Cấu hình Environment

```bash
cd /opt/mtl-commerce

# Copy template
cp .env.prod.example .env.prod

# Chỉnh sửa các giá trị
nano .env.prod
```

**Giá trị bắt buộc phải đổi:**

```env
# Database - IP của PostgreSQL server
# Nếu PostgreSQL chạy trên cùng server:
DATABASE_URL=postgresql://mytholaptop_user:YOUR_PASSWORD@host.docker.internal:5432/mytholaptop

# Nếu PostgreSQL chạy trên container khác trong cùng network:
DATABASE_URL=postgresql://mytholaptop_user:YOUR_PASSWORD@postgres:5432/mytholaptop

# Redis - trong cùng docker-compose
REDIS_URL=redis://redis:6379

# JWT Secret - BẮT BUỘC đổi sang giá trị ngẫu nhiên (>= 32 ký tự)
JWT_SECRET=your-super-secure-random-secret-here-change-me
COOKIE_SECRET=your-super-secure-random-secret-here-change-me

# Backend URL cho Admin UI
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://backend:9000
```

### 2. Chạy containers

```bash
# Build và chạy (lần đầu hoặc sau khi code thay đổi)
docker compose -f docker-compose-prod.yml --env-file .env.prod up -d --build

# Chỉ chạy (nếu images đã có)
docker compose -f docker-compose-prod.yml --env-file .env.prod up -d

# Kiểm tra trạng thái
docker compose -f docker-compose-prod.yml ps

# Xem logs
docker compose -f docker-compose-prod.yml logs -f
docker compose -f docker-compose-prod.yml logs --tail=50 backend
docker compose -f docker-compose-prod.yml logs --tail=50 admin-ui
```

### 3. Kiểm tra Health

```bash
# Kiểm tra tất cả containers healthy
docker compose -f docker-compose-prod.yml ps

# Health check thủ công
curl -f http://localhost:3000/api/health 2>/dev/null && echo "Admin OK"
curl -f http://localhost:9000/health 2>/dev/null && echo "Backend OK"
curl -f http://localhost:6379 2>/dev/null && echo "Redis OK"
```

**Expected output:**
```
NAME                STATUS
mtl-backend         running (healthy)
mtl-admin           running (healthy)
mtl-redis           running (healthy)
```

### 4. Dừng và dọn dẹp

```bash
# Dừng containers (giữ data)
docker compose -f docker-compose-prod.yml down

# Dừng và xóa volumes (XÓA HẾT DATA)
docker compose -f docker-compose-prod.yml down -v

# Xóa images
docker rmi mtl-admin:latest mtl-backend:latest
```

---

## Deploy Script

### Cách sử dụng

```bash
# 1. Copy và đổi tên
cp deploy.sh deploy.prod.sh

# 2. Sửa các giá trị trong script
nano deploy.prod.sh

# 3. Chạy
chmod +x deploy.prod.sh
./deploy.prod.sh
```

### Script thực hiện

1. Tạo file `.env.prod` từ config trong script
2. `git pull` lấy code mới nhất
3. `docker compose up --build -d` build và chạy
4. Kiểm tra health và logs

---

## PostgreSQL Setup

### Cài đặt PostgreSQL (nếu chạy trên cùng server)

```bash
# Cài PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Bật và khởi động
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Kiểm tra
sudo -u postgres psql -c "SELECT version();"
```

### Tạo Database và User

```bash
sudo -u postgres psql << EOF
-- Tạo database
CREATE DATABASE mytholaptop;

-- Tạo user
CREATE USER mytholaptop_user WITH PASSWORD 'your_secure_password';

-- Grant quyền
GRANT ALL PRIVILEGES ON DATABASE mytholaptop TO mytholaptop_user;

-- Grant schema
\c mytholaptop
GRANT ALL ON SCHEMA public TO mytholaptop_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mytholaptop_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mytholaptop_user;

-- Cho phép user tạo objects
ALTER USER mytholaptop_user CREATEDB;
EOF
```

### Import Schema

```bash
# Import database schema
psql -U mytholaptop_user -d mytholaptop -h localhost -f /opt/mtl-commerce/database.sql

# Kiểm tra
psql -U mytholaptop_user -d mytholaptop -h localhost -c "\dt"
```

### PostgreSQL trong Docker (Thay thế)

Nếu muốn PostgreSQL cũng chạy trong Docker:

```yaml
# Thêm vào docker-compose-prod.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: mtl-postgres
    environment:
      POSTGRES_DB: mytholaptop
      POSTGRES_USER: mytholaptop_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - mtl-postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mytholaptop_user -d mytholaptop"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mtl-postgres-data:
```

Và cập nhật `DATABASE_URL`:
```env
DATABASE_URL=postgresql://mytholaptop_user:YOUR_PASSWORD@postgres:5432/mytholaptop
```

---

## Reverse Proxy (Nginx)

### Cài đặt Nginx

```bash
sudo apt install -y nginx

# Bật và khởi động
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Cấu hình Admin UI

```bash
sudo nano /etc/nginx/sites-available/admin.mtl.vn
```

```nginx
server {
    listen 80;
    server_name admin.mtl.vn;

    # Redirect HTTP sang HTTPS (sau khi có SSL)
    # return 301 https://$server_name$request_uri;

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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Blocking access to sensitive paths
    location ~ /\.env {
        deny all;
    }
}
```

### Cấu hình Backend

```bash
sudo nano /etc/nginx/sites-available/backend.mtl.vn
```

```nginx
server {
    listen 80;
    server_name backend.mtl.vn;

    # CORS headers cho Medusa
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin Dashboard proxy
    location /app {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Enable sites

```bash
sudo ln -s /etc/nginx/sites-available/admin.mtl.vn /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/backend.mtl.vn /etc/nginx/sites-enabled/

# Xóa default site
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL Certificate

### Sử dụng Certbot (Let's Encrypt)

```bash
# Cài Certbot
sudo apt install -y certbot python3-certbot-nginx

# Lấy certificate cho Admin
sudo certbot --nginx -d admin.mtl.vn

# Lấy certificate cho Backend
sudo certbot --nginx -d backend.mtl.vn

# Auto-renewal (đã cài sẵn)
sudo systemctl status certbot.timer
```

### Test SSL

```bash
# Kiểm tra SSL certificate
curl -I https://admin.mtl.vn
curl -I https://backend.mtl.vn
```

---

## Health Check

### Script kiểm tra tự động

```bash
nano /opt/mtl-commerce/health-check.sh
```

```bash
#!/bin/bash
ALERT_EMAIL="admin@mtl.vn"
FAILED=0

# Check Admin UI
if ! curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo "[FAIL] Admin UI không phản hồi"
    FAILED=1
else
    echo "[OK] Admin UI"
fi

# Check Backend
if ! curl -sf http://localhost:9000/health > /dev/null 2>&1; then
    echo "[FAIL] Backend không phản hồi"
    FAILED=1
else
    echo "[OK] Backend"
fi

# Check Redis
if ! docker exec mtl-redis redis-cli ping > /dev/null 2>&1; then
    echo "[FAIL] Redis không phản hồi"
    FAILED=1
else
    echo "[OK] Redis"
fi

if [ $FAILED -eq 1 ]; then
    # Gửi alert (cấu hình email SMTP trước)
    # echo "MTL Commerce down!" | mail -s "ALERT: MTL Commerce Down" $ALERT_EMAIL
    exit 1
fi

echo "Tất cả services healthy"
exit 0
```

```bash
chmod +x /opt/mtl-commerce/health-check.sh

# Chạy thủ công
/opt/mtl-commerce/health-check.sh

# Thêm vào crontab (chạy mỗi 5 phút)
crontab -e
# */5 * * * * /opt/mtl-commerce/health-check.sh >> /var/log/mtl-health.log 2>&1
```

---

## Update / Rollback

### Update lên phiên bản mới

```bash
cd /opt/mtl-commerce

# Pull code mới
git pull origin main

# Rebuild và chạy
docker compose -f docker-compose-prod.yml --env-file .env.prod up -d --build

# Kiểm tra
docker compose -f docker-compose-prod.yml ps
docker compose -f docker-compose-prod.yml logs --tail=30
```

### Rollback về phiên bản cũ

```bash
cd /opt/mtl-commerce

# Quay lại commit cũ
git checkout v1.0.0  # hoặc commit hash

# Rebuild
docker compose -f docker-compose-prod.yml --env-file .env.prod up -d --build
```

### Tag phiên bản

```bash
# Tạo tag
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

---

## Troubleshooting

### Container không start

```bash
# Xem logs chi tiết
docker compose -f docker-compose-prod.yml logs backend
docker compose -f docker-compose-prod.yml logs admin-ui

# Kiểm tra exit code
docker compose -f docker-compose-prod.yml ps -a
```

### Lỗi "ECONNREFUSED"

Kiểm tra:
1. PostgreSQL đang chạy?
2. `DATABASE_URL` đúng format?
3. PostgreSQL cho phép kết nối từ Docker network?

```bash
# Sửa pg_hba.conf nếu cần
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Thêm: host all all 172.16.0.0/12 md5
sudo systemctl restart postgresql
```

### Lỗi "Module not found" Backend

```bash
# Rebuild không cache
docker compose -f docker-compose-prod.yml build --no-cache backend
docker compose -f docker-compose-prod.yml up -d backend
```

### Xóa toàn bộ và bắt đầu lại

```bash
cd /opt/mtl-commerce

# Dừng và xóa tất cả
docker compose -f docker-compose-prod.yml down -v
docker system prune -af

# Xóa database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS mytholaptop;"
sudo -u postgres psql -c "DROP USER IF EXISTS mytholaptop_user;"

# Import lại schema
psql -U mytholaptop_user -d mytholaptop -h localhost -f database.sql

# Rebuild
docker compose -f docker-compose-prod.yml --env-file .env.prod up -d --build
```

---

## Lệnh hữu ích

```bash
# Quản lý containers
docker compose -f docker-compose-prod.yml up -d           # Start
docker compose -f docker-compose-prod.yml down           # Stop
docker compose -f docker-compose-prod.yml restart        # Restart
docker compose -f docker-compose-prod.yml logs -f       # Logs realtime
docker compose -f docker-compose-prod.yml ps              # Status
docker compose -f docker-compose-prod.yml pull           # Pull images

# Quản lý disk
docker system df                           # Xem disk usage
docker system prune -af                    # Dọn không gian
docker volume ls                           # List volumes

# Shell vào container
docker exec -it mtl-backend sh
docker exec -it mtl-admin sh
docker exec -it mtl-redis redis-cli
```
