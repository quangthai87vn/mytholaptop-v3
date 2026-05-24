# 1. Sửa code bình thường trong apps/admin-ui

# 2. Build lại container (không xóa volume)
docker-compose up --build admin-ui

# Hoặc build lại tất cả
docker-compose up --build

Tip: Muốn dev nhanh mà không cần build lại Docker mỗi lần, có thể chạy npm run dev trực tiếp ở port khác (VD: 3001) trong khi Docker chạy production build.





# Stop và xóa container cũ
docker-compose down
# Rebuild lại với context nhỏ hơn
docker-compose up --build admin-ui



-----------------------------
BACKEND : pnpm dev
