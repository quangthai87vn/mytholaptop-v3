# Mytholaptop Production Deployment

## Docker Hub Images

- **Backend**: `quangthai87/mytholaptopv3:backend-latest`
- **Admin UI**: `quangthai87/mytholaptopv3:admin-ui-latest`

## Pull và Chạy với .env

```bash
# Cách 1: Pull images
docker compose -f docker-compose-prod.yml pull

# Cách 2: Pull và chạy 1 lệnh
docker compose -f docker-compose-prod.yml --env-file .env up -d
```

## Environment Variables (.env)

```env
# Database (PostgreSQL External)
DATABASE_URL=postgresql://user:password@postgresql.mtl.vn:7000/mytholaptop

# Redis
REDIS_URL=redis://redis:6379

# CORS - Thêm domain production vào đây
ADMIN_CORS=http://localhost:7003,http://localhost:7004,https://backend.mtl.vn
AUTH_CORS=http://localhost:7003,http://localhost:7004,https://backend.mtl.vn
STORE_CORS=http://localhost:7004,https://store.mtl.vn

# Security
JWT_SECRET=your-super-secret-jwt-key
COOKIE_SECRET=your-super-secret-cookie-key

# Backend URL cho Admin UI
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://backend:9000
```

## Cookie Settings

### Local Development (HTTP)

Nếu chạy local với HTTP, đã có `AUTH_COOKIE_SECURE=false` trong docker-compose-prod.yml:

```yaml
AUTH_COOKIE_SECURE: "false"
```

### Production (HTTPS)

Nếu chạy trên domain với HTTPS (`backend.mtl.vn`), **KHÔNG cần** set `AUTH_COOKIE_SECURE` (mặc định là `true`):

```yaml
# Xóa hoặc comment dòng này khi chạy production HTTPS
# AUTH_COOKIE_SECURE: "false"
```

Cookie sẽ có settings:
- `secure: true` ✅ (yêu cầu HTTPS)
- `sameSite: "none"` ✅ (cho phép cross-site cookies)

## Tạo User Admin

```bash
docker compose -f docker-compose-prod.yml exec backend npx medusa user -e "admin@mtl.vn" -p "Admin@123456"
```

## Kiểm tra Logs

```bash
# Backend logs
docker compose -f docker-compose-prod.yml logs backend

# Admin UI logs
docker compose -f docker-compose-prod.yml logs admin-ui

# Redis logs
docker compose -f docker-compose-prod.yml logs redis
```

## Rebuild và Deploy

```bash
# Rebuild images
docker compose -f docker-compose-prod.yml build

# Push lên Docker Hub (cần login trước)
docker push quangthai87/mytholaptopv3:backend-latest
docker push quangthai87/mytholaptopv3:admin-ui-latest

# Pull và chạy trên server production
docker compose -f docker-compose-prod.yml down
docker compose -f docker-compose-prod.yml pull
docker compose -f docker-compose-prod.yml up -d
```

## Troubleshooting

### Xóa Redis Sessions (nếu login có vấn đề)

```bash
docker compose -f docker-compose-prod.yml exec redis redis-cli FLUSHALL
```

### Kiểm tra Redis Sessions

```bash
docker compose -f docker-compose-prod.yml exec redis redis-cli KEYS "*"
```

### Kiểm tra Environment Variables

```bash
docker compose -f docker-compose-prod.yml exec backend env | grep -E "AUTH|COOKIE|CORS"
```

## Production Checklist

- [ ] HTTPS enabled cho domain (`backend.mtl.vn`)
- [ ] `AUTH_COOKIE_SECURE` không set hoặc set `true`
- [ ] Domain được thêm vào `ADMIN_CORS` và `AUTH_CORS`
- [ ] Database PostgreSQL external accessible
- [ ] Redis running và healthy
