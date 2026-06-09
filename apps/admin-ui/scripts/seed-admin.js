/**
 * Seed script: Tạo hoặc reset admin user cho development
 *
 * Cách dùng:
 *   node scripts/seed-admin.js
 *
 * Với biến môi trường:
 *   ADMIN_EMAIL=admin@mtl.vn ADMIN_PASSWORD=Mtl@2026! node scripts/seed-admin.js
 *
 * Reset password nếu đã có user:
 *   RESET_ADMIN_PASSWORD=true node scripts/seed-admin.js
 *   node scripts/seed-admin.js --reset
 *
 * Lưu ý: KHÔNG commit password thật vào source code.
 */

const path = require('path');
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

// bcryptjs từ node_modules của project
const bcrypt = require(path.join(projectRoot, 'node_modules/bcryptjs'));

// pg client
const { Client } = require(path.join(projectRoot, 'node_modules', 'pg'));

// ─── Default dev credentials ───────────────────────────────────────────────
const DEFAULT_EMAIL = 'admin@mtl.vn';
const DEFAULT_PASSWORD = 'Mtl@2026!';
const DEFAULT_NAME = 'MTL Admin';
const DEFAULT_ROLE = 'super_admin';

// ─── Env overrides ───────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || DEFAULT_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_FULL_NAME || DEFAULT_NAME;
const ADMIN_ROLE = process.env.ADMIN_ROLE || DEFAULT_ROLE;
const RESET_PASSWORD = process.env.RESET_ADMIN_PASSWORD === 'true';

// ─── Arg parsing ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isReset = args.includes('--reset') || args.includes('-r');

async function main() {
  const connectionString = process.env.DATABASE_URL
    || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n========================================');
    console.log('   MTL Admin UI — Admin Seed Script');
    console.log('========================================\n');

    // ── 1. Check existing user ───────────────────────────────────────
    const { rows: existing } = await client.query(
      'SELECT id, email, full_name, role, status FROM admin_users WHERE email = $1',
      [ADMIN_EMAIL.toLowerCase()]
    );

    if (existing.length > 0) {
      const user = existing[0];

      if (isReset || RESET_PASSWORD) {
        // Reset password + update info
        console.log(`[Seed] User found: ${user.email} (id: ${user.id})`);
        console.log(`[Seed] Resetting password...`);
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        await client.query(
          'UPDATE admin_users SET password_hash = $1, full_name = $2, role = $3, status = $4 WHERE id = $5',
          [passwordHash, ADMIN_NAME, ADMIN_ROLE, 'active', user.id]
        );
        console.log('[Seed] Password reset OK');
      } else {
        console.log(`[Seed] User ALREADY EXISTS:`);
        console.log(`  Email:  ${user.email}`);
        console.log(`  ID:     ${user.id}`);
        console.log(`  Role:   ${user.role}`);
        console.log(`  Name:   ${user.full_name}`);
        console.log(`  Status: ${user.status}`);
        console.log('\n[Seed] Password NOT reset.');
        console.log('[Seed] To reset password, run:');
        console.log('  RESET_ADMIN_PASSWORD=true node scripts/seed-admin.js');
        console.log('  node scripts/seed-admin.js --reset');
        await client.end();
        return;
      }
    } else {
      // ── 2. Create new user ────────────────────────────────────────
      console.log(`[Seed] No user found. Creating new admin...`);
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await client.query(
        `INSERT INTO admin_users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)`,
        [ADMIN_EMAIL.toLowerCase(), passwordHash, ADMIN_NAME, ADMIN_ROLE]
      );
      console.log('[Seed] User created OK!');
    }

    // ── 3. Show credentials ─────────────────────────────────────────
    console.log('\n========================================');
    console.log('   DEV LOGIN CREDENTIALS');
    console.log('========================================');
    console.log(`   URL:      http://localhost:3000/login`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Name:     ${ADMIN_NAME}`);
    console.log(`   Role:     ${ADMIN_ROLE}`);
    console.log('========================================');
    console.log('\n  ✅ Admin user ready!');
    console.log('  Redirect sau login: /workspace\n');

    if (ADMIN_EMAIL !== DEFAULT_EMAIL || process.env.ADMIN_PASSWORD) {
      console.log('========================================');
      console.log('  Using env var credentials (not defaults)');
      console.log('========================================\n');
    } else {
      console.log('  ⚠️  Using DEV defaults — change password after first login!');
      console.log('  SECURITY REMINDER:');
      console.log('  - Đổi mật khẩu ngay sau khi đăng nhập lần đầu');
      console.log('  - Production: dùng ADMIN_EMAIL + ADMIN_PASSWORD env vars');
      console.log('  - Không commit password thật vào source code');
      console.log('========================================\n');
    }

    await client.end();
  } catch (err) {
    console.error('\n[Seed] ERROR:', err.message);
    if (err.code) console.error('[Seed] Code:', err.code);
    try { await client.end(); } catch {}
    process.exit(1);
  }
}

main();
