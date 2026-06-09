/**
 * Seed script: Tạo admin user đầu tiên
 *
 * Cách dùng:
 *   npx tsx scripts/seed-admin.ts
 *
 * Hoặc với biến môi trường:
 *   ADMIN_EMAIL=admin@mtl.vn ADMIN_PASSWORD=Mtl@2026! npx tsx scripts/seed-admin.ts
 *
 * Lưu ý: KHÔNG commit password thật vào source code.
 */

const DEFAULT_EMAIL = process.env.ADMIN_EMAIL ?? "admin@mtl.vn";
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD ?? "Mtl@2026!";
const DEFAULT_NAME = process.env.ADMIN_NAME ?? "Quản Trị Viên";
const DEFAULT_ROLE = process.env.ADMIN_ROLE ?? "super_admin";

async function main() {
  console.log("=== Admin Seed Script ===");
  console.log(`Email: ${DEFAULT_EMAIL}`);
  console.log(`Role: ${DEFAULT_ROLE}`);

  // Dynamic import để đảm bảo chỉ chạy ở server-side
  const bcrypt = await import("bcryptjs");
  const { query } = await import("@/lib/db");

  // 1. Check nếu admin đã tồn tại
  const { rows: existing } = await query<{ id: string; email: string }>(
    "SELECT id, email FROM admin_users WHERE email = $1",
    [DEFAULT_EMAIL.toLowerCase()]
  );

  if (existing.length > 0) {
    console.log(`\n[SKIP] Admin ${DEFAULT_EMAIL} đã tồn tại (id: ${existing[0].id})`);
    console.log("Muốn reset password? Xóa user và chạy lại script.");
    return;
  }

  // 2. Hash password
  console.log("\nĐang hash password...");
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, saltRounds);
  console.log("Hash xong!");

  // 3. Insert admin user
  const { rows } = await query<{
    id: string;
    email: string;
    full_name: string;
    role: string;
  }>(
    `INSERT INTO admin_users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role`,
    [DEFAULT_EMAIL.toLowerCase(), passwordHash, DEFAULT_NAME, DEFAULT_ROLE]
  );

  const admin = rows[0];

  console.log("\n✅ Đã tạo admin user thành công!");
  console.log("─".repeat(40));
  console.log(`ID:       ${admin.id}`);
  console.log(`Email:    ${admin.email}`);
  console.log(`Name:     ${admin.full_name}`);
  console.log(`Role:     ${admin.role}`);
  console.log("─".repeat(40));
  console.log("\n⚠️  Bảo mật:");
  console.log("  - KHÔNG commit file này với password thật");
  console.log("  - Đặt ADMIN_EMAIL, ADMIN_PASSWORD qua biến môi trường");
  console.log("  - Đổi password ngay sau lần đăng nhập đầu tiên");
  console.log("\n🎉 Sẵn sàng đăng nhập tại /login");
}

main().catch((err) => {
  console.error("\n❌ Lỗi:", err);
  process.exit(1);
});
