const { Client } = require('pg');

/**
 * P5.11: Dọn hardcoded secrets — chỉ dùng DATABASE_URL env var.
 * Nếu thiếu DATABASE_URL thì báo lỗi rõ ràng, không fallback.
 */
const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error('[check-db] FATAL: DATABASE_URL environment variable is not set.');
  console.error('[check-db] Example: postgresql://user:password@host:port/database');
  process.exit(1);
}

async function check() {
  const client = new Client({ connectionString: connStr });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Check tables
    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('admin_users', 'admin_sessions')
      ORDER BY table_name
    `);
    console.log('\n--- Tables ---');
    if (tables.length === 0) {
      console.log('admin_users: NOT FOUND');
      console.log('admin_sessions: NOT FOUND');
    } else {
      tables.forEach(r => console.log(' -', r.table_name, ': EXISTS'));
    }

    // Check admin_users
    console.log('\n--- admin_users ---');
    const { rows: users } = await client.query(
      'SELECT id, email, full_name, role, status, created_at, last_login_at FROM admin_users ORDER BY created_at'
    );
    if (users.length === 0) {
      console.log('No users found');
    } else {
      console.log(`Total: ${users.length} user(s)`);
      users.forEach(u => {
        console.log(` - ${u.email}`);
        console.log(`   ID: ${u.id}`);
        console.log(`   Name: ${u.full_name}`);
        console.log(`   Role: ${u.role}`);
        console.log(`   Status: ${u.status}`);
        console.log(`   Last login: ${u.last_login_at || 'never'}`);
        console.log(`   Created: ${u.created_at}`);
      });
    }

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    if (err.code) console.error('Code:', err.code);
    try { await client.end(); } catch {}
  }
}

check();
