/**
 * P8.2.16 Debug Script
 * node scripts/debug-role-constraint.js
 */

const { Pool } = require("pg");

const DATABASE_URL = "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL, timeout: 10000 });

  try {
    // 1. Check admin_users table constraints
    console.log("\n=== 1. admin_users constraints ===");
    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'admin_users'::regclass
    `);
    console.log(`Found ${constraints.rows.length} constraints:`);
    constraints.rows.forEach((c) =>
      console.log(`  ${c.conname}: ${c.definition}`)
    );

    // 2. Check admin_users data
    console.log("\n=== 2. admin_users data ===");
    const users = await pool.query(
      `SELECT id, email, full_name, role, status FROM admin_users ORDER BY created_at`
    );
    console.log(`Found ${users.rows.length} users:`);
    users.rows.forEach((u) =>
      console.log(`  [${u.role}] ${u.email} | "${u.full_name}" | status=${u.status}`)
    );

    // 3. Try INSERT intern to verify the error
    console.log("\n=== 3. Try INSERT intern (should fail with CHECK constraint) ===");
    try {
      const result = await pool.query(`
        INSERT INTO admin_users (email, password_hash, full_name, role, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ["test.intern.debug@mtl.vn", "dummy_hash_for_debug", "Test Intern Debug", "intern", "active"]);
      console.log(`INSERT succeeded: ${result.rows[0].id}`);
      // Clean up
      await pool.query("DELETE FROM admin_users WHERE id = $1", [result.rows[0].id]);
    } catch (e) {
      console.log(`INSERT failed: code=${e.code} constraint=${e.constraint || "none"}`);
      console.log(`  detail: ${e.detail}`);
    }

    // 4. Try INSERT admin (should succeed)
    console.log("\n=== 4. Try INSERT admin (should succeed) ===");
    try {
      const result = await pool.query(`
        INSERT INTO admin_users (email, password_hash, full_name, role, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ["test.admin.debug@mtl.vn", "dummy_hash_for_debug", "Test Admin Debug", "admin", "active"]);
      console.log(`INSERT succeeded: ${result.rows[0].id}`);
      await pool.query("DELETE FROM admin_users WHERE id = $1", [result.rows[0].id]);
      console.log("  (cleaned up)");
    } catch (e) {
      console.log(`INSERT failed: code=${e.code} constraint=${e.constraint || "none"}`);
    }

    console.log("\n✅ Done");
  } catch (e) {
    console.error("❌ Error:", e.message);
  } finally {
    await pool.end();
  }
}

main();
