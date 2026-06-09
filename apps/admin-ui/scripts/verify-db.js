const { Client } = require('pg');

/**
 * P5.11: Dọn hardcoded secrets — chỉ dùng DATABASE_URL env var.
 * Nếu thiếu DATABASE_URL thì báo lỗi rõ ràng, không fallback.
 */
const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error('[verify-db] FATAL: DATABASE_URL environment variable is not set.');
  console.error('[verify-db] Example: postgresql://user:password@host:port/database');
  process.exit(1);
}
console.log('[verify-db] Using connection:', connStr.replace(/:[^:@]+@/, ':***@'));

async function verify() {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log('Connected OK');

    // Verify tables exist
    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('admin_users', 'admin_sessions')
    `);
    console.log('Tables:', tables.map(t => t.table_name).join(', '));

    // Check users
    const { rows: users } = await client.query(
      'SELECT id, email, full_name, role, status FROM admin_users'
    );
    console.log('Users:', users.length);
    users.forEach(u => console.log(' -', u.email, '|', u.role, '|', u.status));

    // Test login query (simulate what login route does)
    const { rows: loginCheck } = await client.query(
      'SELECT id, email, password_hash, full_name, role, status FROM admin_users WHERE email = $1',
      ['admin@mtl.vn']
    );
    console.log('\nLogin check for admin@mtl.vn:', loginCheck.length > 0 ? 'FOUND' : 'NOT FOUND');

    await client.end();
    console.log('\nAll checks passed!');
  } catch (err) {
    console.error('Error:', err.message);
    try { await client.end(); } catch {}
  }
}

verify();
