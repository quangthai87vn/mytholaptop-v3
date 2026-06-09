/**
 * P8.2.16: Run migration 021_admin_users_role_intern.sql
 */
const { Pool } = require("pg");

const DATABASE_URL = "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL, timeout: 15000 });

  try {
    const client = await pool.connect();
    try {
      console.log("Running migration 021...");
      await client.query("BEGIN");

      // Statement 1: Drop old constraint
      await client.query(
        `ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check`
      );
      console.log("  ✅ Dropped old constraint");

      // Statement 2: Add new constraint with 'intern'
      await client.query(
        `ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer', 'intern'))`
      );
      console.log("  ✅ Added new constraint with 'intern'");

      await client.query("COMMIT");
      console.log("✅ Migration committed successfully.");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }

    // Verify: check updated constraint
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'admin_users'::regclass AND conname = 'admin_users_role_check'
    `);
    if (result.rows.length > 0) {
      console.log("\nConstraint after migration:");
      result.rows.forEach((r) => console.log(`  ${r.conname}: ${r.definition}`));
    }

    // Verify: test INSERT intern
    console.log("\nTesting INSERT intern...");
    try {
      const ins = await pool.query(`
        INSERT INTO admin_users (email, password_hash, full_name, role, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, role
      `, ["test.verify.intern@mtl.vn", "$2a$10$dummy", "Verification Intern", "intern", "active"]);
      console.log(`  ✅ INSERT intern succeeded: id=${ins.rows[0].id}`);
      await pool.query("DELETE FROM admin_users WHERE id = $1", [ins.rows[0].id]);
      console.log("  ✅ Cleanup done");
    } catch (e) {
      console.log(`  ❌ INSERT intern still fails: ${e.message}`);
    }

    console.log("\n✅ All done!");
  } catch (e) {
    console.error("❌ Migration failed:", e.message);
    if (e.code) console.error("   PG code:", e.code);
    if (e.detail) console.error("   PG detail:", e.detail);
  } finally {
    await pool.end();
  }
}

main();
