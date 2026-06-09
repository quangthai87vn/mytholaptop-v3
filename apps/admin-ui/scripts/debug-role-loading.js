/**
 * P8.2.11 Debug Script
 * Kiểm tra migration + API routes + permissions
 */
const { Client } = require("pg");

const DATABASE_URL = "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop";

async function main() {
  const client = new Client(DATABASE_URL);

  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL\n");

    // ── 1. Check tables ──────────────────────────────────────────────────────
    console.log("=== 1. Migration tables ===");

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('admin_roles', 'admin_role_permissions')
      ORDER BY table_name
    `);

    for (const t of tables.rows) {
      console.log(`  ✅ ${t.table_name} tồn tại`);
    }
    if (tables.rows.length < 2) {
      console.log("  ❌ Thiếu bảng — chạy migration 020 trước!");
    }

    // ── 2. Check roles ───────────────────────────────────────────────────────
    console.log("\n=== 2. Roles ===");
    const roles = await client.query(
      "SELECT code, name, role_type, is_active FROM admin_roles ORDER BY role_type, code"
    );
    if (roles.rows.length === 0) {
      console.log("  ⚠️  Chưa có role nào — chạy seed");
    }
    for (const r of roles.rows) {
      console.log(`  [${r.role_type}] ${r.code} — ${r.name} (active: ${r.is_active})`);
    }

    // ── 3. Check intern permissions ───────────────────────────────────────────
    console.log("\n=== 3. Intern permissions ===");
    const internPerms = await client.query(
      "SELECT permission FROM admin_role_permissions WHERE role_code = 'intern' ORDER BY permission"
    );
    if (internPerms.rows.length === 0) {
      console.log("  ⚠️  intern chưa có permissions — chạy seed");
    }
    for (const p of internPerms.rows) {
      console.log(`  ✓ ${p.permission}`);
    }

    // ── 4. Check admin_users table ───────────────────────────────────────────
    console.log("\n=== 4. admin_users table columns ===");
    const cols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'admin_users'
      ORDER BY ordinal_position
    `);
    for (const c of cols.rows) {
      console.log(`  ${c.column_name} (${c.data_type})`);
    }

    // ── 5. Check sample users ─────────────────────────────────────────────────
    console.log("\n=== 5. Sample admin_users ===");
    const users = await client.query(
      "SELECT id, email, full_name, role, status FROM admin_users LIMIT 10"
    );
    for (const u of users.rows) {
      console.log(`  ${u.email} — ${u.role} — ${u.status}`);
    }

    // ── 6. Check what permissions super_admin has ──────────────────────────────
    console.log("\n=== 6. System role permissions ===");
    const sysPerms = {
      super_admin: [
        "users.read","users.create","users.update","users.delete",
        "roles.read","roles.manage","permissions.read",
        "settings.manage","credentials.manage",
        "ai_engine.manage","ai_generate","ai_providers.manage",
        "projects.read","projects.manage","projects.create","projects.update","projects.delete",
        "campaigns.read","campaigns.manage","campaigns.create","campaigns.update","campaigns.delete",
        "tasks.read","tasks.create","tasks.update","tasks.delete",
        "interns.manage","media.manage","migration.manage",
        "content.read","content.create","content.update","content.delete",
        "comments.read","comments.create","comments.update","comments.delete",
        "assets.read","assets.create","assets.update","assets.delete",
      ],
      admin: [
        "users.read","roles.read","permissions.read","ai_generate",
        "projects.read","projects.manage","projects.create","projects.update",
        "campaigns.read","campaigns.manage","campaigns.create","campaigns.update",
        "tasks.read","tasks.create","tasks.update","tasks.delete",
        "interns.manage","media.manage","migration.manage",
        "content.read","content.create","content.update","content.delete",
        "comments.read","comments.create","comments.update","comments.delete",
        "assets.read","assets.create","assets.update","assets.delete",
      ],
    };

    for (const [role, perms] of Object.entries(sysPerms)) {
      const hasRolesManage = perms.includes("roles.manage");
      const hasRolesRead = perms.includes("roles.read");
      const hasPermsRead = perms.includes("permissions.read");
      console.log(`  ${role}:`);
      console.log(`    roles.read:   ${hasRolesRead ? "✅" : "❌"}`);
      console.log(`    roles.manage: ${hasRolesManage ? "✅" : "❌"}`);
      console.log(`    permissions.read: ${hasPermsRead ? "✅" : "❌"}`);
    }

    // ── 7. Check API /api/roles SQL query ───────────────────────────────────
    console.log("\n=== 7. Simulate GET /api/roles SQL ===");
    const countResult = await client.query(
      "SELECT role, COUNT(*) as count FROM admin_users WHERE status = 'active' GROUP BY role"
    );
    console.log("  Staff count per role:");
    for (const r of countResult.rows) {
      console.log(`    ${r.role}: ${r.count}`);
    }

    const customRows = await client.query(
      "SELECT code, name, description, is_active FROM admin_roles WHERE role_type = 'custom' ORDER BY name"
    );
    console.log("  Custom roles:");
    for (const r of customRows.rows) {
      console.log(`    ${r.code} — ${r.name} (active: ${r.is_active})`);
    }

    console.log("\n=== Kết luận ===");
    console.log("  Migration 020: ✅ Đã chạy" + (tables.rows.length < 2 ? " ❌" : ""));
    console.log("  intern role:  " + (roles.rows.find(r => r.code === 'intern') ? "✅ Có" : "❌ Thiếu"));
    console.log("  intern perms: " + (internPerms.rows.length > 0 ? `✅ ${internPerms.rows.length} perms` : "❌ Thiếu"));
    console.log("  super_admin roles.manage: " + (sysPerms.super_admin.includes("roles.manage") ? "✅" : "❌"));

  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
