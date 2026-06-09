/**
 * Run 020_admin_roles_crud.sql migration
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const DATABASE_URL = "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop";

async function main() {
  const client = new Client(DATABASE_URL);

  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL");

    const sqlPath = path.join(__dirname, "..", "sql/workspace/020_admin_roles_crud.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("📦 Running migration: 020_admin_roles_crud.sql");
    await client.query(sql);
    console.log("✅ Migration completed successfully");

    // Verify: check roles table
    const { rows } = await client.query(
      "SELECT code, name, role_type FROM admin_roles ORDER BY role_type, code"
    );
    console.log("\n📋 Roles in database:");
    for (const r of rows) {
      console.log(`  [${r.role_type}] ${r.code} — ${r.name}`);
    }

    // Verify: check intern permissions
    const perms = await client.query(
      "SELECT permission FROM admin_role_permissions WHERE role_code = 'intern' ORDER BY permission"
    );
    console.log("\n🔑 Intern permissions:");
    for (const p of perms.rows) {
      console.log(`  ✓ ${p.permission}`);
    }

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
