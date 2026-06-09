/**
 * P8.2.14 Debug Script
 * node scripts/debug-staff-api.js
 */

const { Pool } = require("pg");

const DATABASE_URL = "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL, timeout: 10000 });

  try {
    // 1. Check admin_users
    console.log("\n=== 1. admin_users ===");
    const users = await pool.query(
      `SELECT id, email, full_name, role, status, created_at
       FROM admin_users ORDER BY created_at DESC LIMIT 20`
    );
    console.log(`Found ${users.rows.length} users:`);
    users.rows.forEach((u) =>
      console.log(`  [${u.role}] ${u.email} | "${u.full_name}" | status=${u.status} | id=${u.id}`)
    );

    // 2. Check admin_sessions
    console.log("\n=== 2. admin_sessions (active) ===");
    const sessions = await pool.query(
      `SELECT s.id, s.user_id, u.email, u.role, s.expires_at
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.user_id
       WHERE s.expires_at > NOW() ORDER BY s.created_at DESC LIMIT 10`
    );
    console.log(`Found ${sessions.rows.length} active sessions:`);
    sessions.rows.forEach((s) =>
      console.log(`  user_id=${s.user_id} email=${s.email} role=${s.role} expires=${s.expires_at}`)
    );

    // 3. Check admin_roles
    console.log("\n=== 3. admin_roles ===");
    try {
      const roles = await pool.query(`SELECT code, name, role_type, is_active FROM admin_roles`);
      console.log(`Found ${roles.rows.length} roles:`);
      roles.rows.forEach((r) =>
        console.log(`  ${r.code} | ${r.name} | type=${r.role_type} | active=${r.is_active}`)
      );
    } catch (e) {
      console.log(`admin_roles error: ${e.message}`);
    }

    // 4. Check intern permissions
    console.log("\n=== 4. intern permissions ===");
    try {
      const perms = await pool.query(
        `SELECT rp.permission FROM admin_role_permissions rp
         JOIN admin_roles r ON r.code = rp.role_code
         WHERE r.code = 'intern' LIMIT 20`
      );
      console.log(`Found ${perms.rows.length} permissions for 'intern':`);
      perms.rows.forEach((p) => console.log(`  - ${p.permission}`));
    } catch (e) {
      console.log(`admin_role_permissions error: ${e.message}`);
    }

    // 5. Check CSRF tokens table
    console.log("\n=== 5. admin_csrf_tokens ===");
    try {
      const csrf = await pool.query(
        `SELECT token, user_id, expires_at FROM admin_csrf_tokens
         WHERE expires_at > NOW() ORDER BY created_at DESC LIMIT 5`
      );
      console.log(`Found ${csrf.rows.length} valid CSRF tokens`);
      csrf.rows.forEach((t) => console.log(`  user_id=${t.user_id} expires=${t.expires_at}`));
    } catch (e) {
      console.log(`csrf_tokens error: ${e.message}`);
    }

    // 6. Check admin_users columns
    console.log("\n=== 6. admin_users columns ===");
    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'admin_users' ORDER BY ordinal_position`
    );
    cols.rows.forEach((c) => console.log(`  ${c.column_name} (${c.data_type})`));

    console.log("\n✅ Done");
  } catch (e) {
    console.error("❌ Error:", e.message);
    if (e.code) console.error("   PG code:", e.code);
  } finally {
    await pool.end();
  }
}

main();
