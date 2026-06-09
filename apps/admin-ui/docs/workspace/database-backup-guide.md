# Hướng Dẫn Backup Database PostgreSQL

**Database:** mytholaptop
**Host:** postgresql.mtl.vn:7000
**Ngày tạo:** 26/05/2026

---

## 1. Backup Toàn Bộ Database

### Cách 1: Dùng pg_dump (Khuyến nghị)

```bash
# Backup toàn bộ database
pg_dump -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop -F c -b -v -f backup_mytholaptop_$(date +%Y%m%d_%H%M%S).dump

# Backup toàn bộ database (tất cả schemas)
pg_dump -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop -F plain -b -v -f backup_mytholaptop_$(date +%Y%m%d_%H%M%S).sql
```

### Cách 2: Dùng Docker (Nếu không có pg_dump cục bộ)

```bash
# Chạy container tạm để backup
docker run --rm \
  -v $(pwd):/backup \
  postgres:16 \
  pg_dump -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop \
  -F c -b -v -f /backup/backup_mytholaptop_$(date +%Y%m%d_%H%M%S).dump
```

---

## 2. Backup Chỉ Tables Quan Trọng

```bash
# Backup chỉ workspace tables (không backup toàn bộ)
pg_dump -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop \
  -t pm_tasks \
  -t pm_projects \
  -t pm_campaigns \
  -t pm_media_workflows \
  -t pm_ai_suggestions \
  -t pm_workflow_stages \
  -t pm_workflow_comments \
  -t pm_interns \
  -F plain -b -v \
  -f backup_workspace_only_$(date +%Y%m%d_%H%M%S).sql
```

---

## 3. Backup Script Tự Động

Tạo file `backup-db.sh`:

```bash
#!/bin/bash
# backup-db.sh

HOST="postgresql.mtl.vn"
PORT="7000"
USER="mytholaptop_user"
DATABASE="mytholaptop"
BACKUP_DIR="./backups"

mkdir -p $BACKUP_DIR

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${DATABASE}_${TIMESTAMP}"

echo "Starting backup: $FILENAME"

pg_dump -h $HOST -p $PORT -U $USER -d $DATABASE \
  -F c -b -v \
  -f "${BACKUP_DIR}/${FILENAME}.dump"

if [ $? -eq 0 ]; then
  echo "Backup completed: ${BACKUP_DIR}/${FILENAME}.dump"

  # Xóa backup cũ hơn 7 ngày
  find $BACKUP_DIR -name "backup_*.dump" -mtime +7 -delete
  echo "Old backups cleaned up"
else
  echo "Backup FAILED!"
  exit 1
fi
```

Chạy:
```bash
chmod +x backup-db.sh
./backup-db.sh
```

---

## 4. PowerShell (Windows)

```powershell
# Backup toàn bộ database
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "backup_mytholaptop_$timestamp.dump"

pg_dump -h "postgresql.mtl.vn" -p 7000 -U mytholaptop_user -d mytholaptop -F c -b -v -f $filename

# Hoặc dùng Docker
docker run --rm -v "${PWD}:/backup" postgres:16 pg_dump -h "postgresql.mtl.vn" -p 7000 -U mytholaptop_user -d mytholaptop -F c -b -v -f "/backup/$filename"
```

---

## 5. Kiểm Tra Backup

```bash
# Liệt kê các backup
ls -la backups/

# Kiểm tra kích thước backup
ls -lh backups/*.dump

# Restore từ backup (NGUY HIỂM - chỉ dùng để test)
pg_restore -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop -v --single-transaction backups/backup_mytholaptop_YYYYMMDD_HHMMSS.dump
```

---

## 6. Trước Khi Chạy Migration

**BẮT BUỘC** backup trước khi chạy migration 008:

```bash
# 1. Backup trước
pg_dump -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop -F c -b -v -f pre_migration_008_backup_$(date +%Y%m%d_%H%M%S).dump

# 2. Verify backup tồn tại
ls -lh pre_migration*.dump

# 3. Mới chạy migration
```

---

## 7. Khôi Phục Nếu Migration Thất Bại

```bash
# Dừng app
# npm run stop  # hoặc docker-compose down

# Restore backup
pg_restore -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop --clean --if-exists -v pre_migration_008_backup_20260526_120000.dump

# Verify data
psql -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop -c "SELECT COUNT(*) FROM pm_tasks;"
psql -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop -c "SELECT COUNT(*) FROM pm_media_workflows;"

# Khởi động lại app
# npm run dev
```

---

*Lưu ý: Thay thế credentials nếu cần. Giữ backup ở nơi an toàn.*
