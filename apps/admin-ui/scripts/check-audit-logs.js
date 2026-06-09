/**
 * Check pm_audit_logs columns
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
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'pm_audit_logs'
      ORDER BY ordinal_position
    `);
    console.log('pm_audit_logs columns:');
    result.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
