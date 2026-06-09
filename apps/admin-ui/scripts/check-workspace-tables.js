/**
 * Check existing workspace tables
 */
const { Client } = require('pg');

function parseDatabaseUrl(url) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';
const dbConfig = parseDatabaseUrl(dbUrl);

const client = new Client({
  ...dbConfig,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // List all workspace-related tables
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'pm_%'
         OR table_name LIKE 'admin_%'
         OR table_name LIKE 'wc_%'
      ORDER BY table_name
    `);

    console.log('Workspace tables found:');
    result.rows.forEach(row => console.log(' -', row.table_name));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
