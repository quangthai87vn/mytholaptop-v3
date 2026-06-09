/**
 * Migration script: Tạo bảng admin_users + admin_sessions
 *
 * Cách dùng:
 *   node scripts/run-auth-migration.js
 *
 * Hoặc để seed admin luôn sau migration:
 *   node scripts/run-auth-migration.js --seed
 *   ADMIN_EMAIL=admin@mtl.vn ADMIN_PASSWORD=Mtl@2026! node scripts/run-auth-migration.js --seed
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const doSeed = args.includes('--seed');

  const connectionString = process.env.DATABASE_URL
    || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('[Migration] Connected to PostgreSQL');
    console.log('[Migration] URL:', connectionString.replace(/:[^:@]+@/, ':***@'));

    // 1. Check existing tables
    const { rows: existingTables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('admin_users', 'admin_sessions')
      ORDER BY table_name
    `);

    const hasAdminUsers = existingTables.some(t => t.table_name === 'admin_users');
    const hasAdminSessions = existingTables.some(t => t.table_name === 'admin_sessions');

    console.log('\n[Migration] Checking existing tables...');
    console.log(`  admin_users:   ${hasAdminUsers ? 'EXISTS' : 'MISSING'}`);
    console.log(`  admin_sessions: ${hasAdminSessions ? 'EXISTS' : 'MISSING'}`);

    if (hasAdminUsers && hasAdminSessions) {
      console.log('\n[Migration] Tables already exist. Nothing to do.');
    } else {
      // 2. Run migration
      const migrationPath = path.join(process.cwd(), 'sql/workspace/011_admin_auth.sql');
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      // Strip comments and guidance notes for migration
      const cleanSql = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();

      console.log('\n[Migration] Running 011_admin_auth.sql...');
      await client.query(cleanSql);
      console.log('[Migration] Done!');
    }

    // 3. Verify
    const { rows: verifyTables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('admin_users', 'admin_sessions')
      ORDER BY table_name
    `);
    console.log('\n[Migration] Verification:');
    verifyTables.forEach(r => console.log(`  ✓ ${r.table_name}`));

    // 4. Show current users
    const { rows: users } = await client.query(
      'SELECT id, email, full_name, role, status FROM admin_users ORDER BY created_at'
    );
    console.log('\n[Migration] Current admin users:', users.length);
    users.forEach(u => console.log(`  - ${u.email} | ${u.role} | ${u.status}`));

    await client.end();

    // 5. Auto-seed if requested
    if (doSeed) {
      console.log('\n[Migration] Proceeding to seed admin user...');
      const seedPath = path.join(process.cwd(), 'scripts/seed-admin.js');
      const { spawn } = require('child_process');
      const env = { ...process.env };
      spawn('node', [seedPath], { stdio: 'inherit', env, cwd: process.cwd() });
    } else {
      console.log('\n[Migration] To seed admin user, run:');
      console.log('  node scripts/seed-admin.js');
      console.log('  ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-admin.js');
    }

  } catch (err) {
    console.error('[Migration] ERROR:', err.message);
    if (err.code) console.error('[Migration] Code:', err.code);
    try { await client.end(); } catch {}
    process.exit(1);
  }
}

main();
